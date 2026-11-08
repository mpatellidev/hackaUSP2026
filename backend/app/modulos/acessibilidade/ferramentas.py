"""Ferramentas (chamada de funções) que a IA pode usar, ligadas aos dados REAIS do backend.

Regras do contrato que valem aqui:
- Quem age é sempre o paciente do token (Actor); nada de paciente_id vindo da IA.
- Leituras de pedidos passam por app.modulos.solicitacoes.repositorio (já escopadas).
- Pedido ≠ agendamento. "Agendada" só aparece quando a clínica confirmou.
- Toda ação com efeito (enviar pedido, pedir horário, cancelar, remarcar, aceitar encaminhamento, salvar dados,
  chamar atendente) só roda se a ÚLTIMA mensagem da pessoa for uma confirmação explícita. As ferramentas chamam os
  MESMOS serviços do painel: nenhuma regra de negócio mora aqui.
- O conteúdo do prontuário NUNCA vai para a IA (serviço externo): ela vê só o encaminhamento e o motivo.
"""
import json
import unicodedata
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import Actor
from app.core.errors import ApiError, nao_encontrado
from app.core.time import as_utc, to_sp_iso, utc_now
from app.models.clinicas import Clinica
from app.models.solicitacoes import ESTADOS_ATIVOS, Solicitacao
from app.models.vagas import Agendamento, Vaga
from app.modulos.acessibilidade.formatos import por_extenso
from app.modulos.acessibilidade.schemas import QuickReply
from app.modulos.solicitacoes import service as solicitacoes_service
from app.modulos.solicitacoes import repositorio as repo

ESTADO_EXPLICADO = {
    "enviada": "Pedido enviado. A clínica ainda vai olhar.",
    "em_analise": "A clínica está analisando o pedido.",
    "precisa_contato": "A clínica precisa falar com você antes de seguir.",
    "indisponivel": "A clínica não pode atender este pedido. Você pode escolher outra clínica, se quiser.",
    "aguardando_confirmacao": "Você mostrou interesse em uma vaga. Ainda falta a clínica confirmar.",
    "agendada": "Atendimento confirmado pela clínica.",
    "concluida": "Atendimento concluído.",
}
# Vocabulário v0 do contrato §4.2; valor desconhecido aparece como veio.
ESPECIALIDADE_NOME = {
    "triagem": "triagem (primeira avaliação)", "clinica_integrada": "clínica integrada (atendimento geral)",
    "dentistica": "dentística (restaurações e cáries)", "endodontia": "endodontia (canal)",
    "periodontia": "periodontia (gengiva)", "cirurgia": "cirurgia (extrações)", "protese": "prótese (dentadura e coroa)",
    "odontopediatria": "odontopediatria (crianças)", "estomatologia": "estomatologia (feridas na boca)",
    "ortodontia": "ortodontia (aparelho)",
}
AVISO_CLINICA = "Custo e serviços são informados pela clínica e dependem de confirmação da instituição."
AVISO_PEDIDO = "Pedido não é agendamento: a clínica ainda vai analisar. Não há garantia de vaga."


def _tool(name: str, description: str, properties: dict, required: list[str]) -> dict:
    return {
        "name": name,
        "description": description,
        "strict": True,
        "input_schema": {"type": "object", "properties": properties, "required": required,
                         "additionalProperties": False},
    }


TOOLS: list[dict] = [
    _tool("buscar_clinicas",
          "Lista clínicas-escola de saúde, com especialidades, público, custo informado, telefone e se estão "
          "recebendo pedidos. Use cidade vazia para todas as cidades e especialidade vazia para todas.",
          {"cidade": {"type": "string", "description": "Ex.: São Paulo. Vazio = todas."},
           "especialidade": {"type": "string", "description": "Ex.: clinica_integrada, odontopediatria. Vazio = todas."}},
          ["cidade", "especialidade"]),
    _tool("listar_meus_pedidos",
          "Lista os pedidos de atendimento da pessoa, com o estado de cada um explicado em linguagem simples.",
          {}, []),
    _tool("ver_historico_do_pedido",
          "Mostra o histórico (o que aconteceu, quando e o motivo administrativo) de um pedido da pessoa.",
          {"solicitacao_id": {"type": "string", "description": "id do pedido (de listar_meus_pedidos)"}},
          ["solicitacao_id"]),
    _tool("listar_meus_agendamentos",
          "Lista os atendimentos que a clínica JÁ CONFIRMOU para a pessoa (dia, horário e clínica).",
          {}, []),
    _tool("enviar_pedido",
          "Envia um pedido de atendimento a uma clínica. NÃO é agendamento. Use SOMENTE depois que a pessoa "
          "confirmar explicitamente a clínica, a especialidade e a descrição.",
          {"clinica_id": {"type": "string", "description": "id da clínica (de buscar_clinicas)"},
           "especialidade": {"type": "string", "description": "uma das especialidades da clínica"},
           "descricao_administrativa": {
               "type": "string",
               "description": "Frase curta e geral (até 280 caracteres), sem sintomas, exames ou diagnósticos. "
                              "Ex.: 'Avaliação de rotina dos dentes'."}},
          ["clinica_id", "especialidade", "descricao_administrativa"]),
    _tool("sugerir_universidades",
          "Clínicas-escola de odontologia sugeridas para a pessoa (distância, preferência pública/privada, transporte, "
          "turno e vagas), da melhor para a pior, com os motivos. Use antes de pedir atendimento.",
          {"especialidade": {"type": "string", "description": "Ex.: triagem, endodontia. Vazio = qualquer."}},
          ["especialidade"]),
    _tool("ver_horarios_livres",
          "Horários livres de uma clínica para uma especialidade (para escolher, remarcar ou mostrar opções).",
          {"clinica_id": {"type": "string"}, "especialidade": {"type": "string"}}, ["clinica_id", "especialidade"]),
    _tool("pedir_atendimento",
          "Agenda: envia o pedido à clínica com o contato e reserva o horário escolhido (a clínica confirma). Especialidade "
          "'triagem' = começo da trilha de cuidado. SOMENTE depois do 'sim' a um resumo com clínica, dia, hora e valor.",
          {"clinica_id": {"type": "string"}, "especialidade": {"type": "string"},
           "descricao_administrativa": {"type": "string", "description": "Frase curta, sem sintomas detalhados"},
           "telefone_contato": {"type": "string", "description": "Com DDD"},
           "vaga_id": {"type": "string", "description": "Horário escolhido (de ver_horarios_livres) ou vazio"}},
          ["clinica_id", "especialidade", "descricao_administrativa", "telefone_contato", "vaga_id"]),
    _tool("comparar_clinicas",
          "Compara as clínicas parceiras: distância até o endereço da pessoa, valor (ou gratuito), pública/privada, "
          "especialidades e próximos horários livres. Use para ajudar a escolher onde agendar.",
          {"ordenar_por": {"type": "string", "enum": ["distancia", "valor", "data"]}}, ["ordenar_por"]),
    _tool("acionar_emergencia",
          "EMERGÊNCIA (dor forte, dente quebrado, inchaço): mostra a clínica de urgência ABERTA mais próxima e alternativas, "
          "com telefone e endereço. Não marca consulta. Use na hora, sem pedir confirmação.",
          {}, []),
    _tool("ver_minhas_receitas",
          "Receitas assinadas pela clínica (remédio, dose, como usar, frequência, duração, orientações). Explique em "
          "linguagem simples SEM mudar nada e sem recomendar outros remédios.",
          {}, []),
    _tool("ver_meu_prontuario",
          "Resumo do prontuário (tipo de registro, data, clínica, se foi validado e o tratamento indicado). O texto clínico "
          "não é enviado: para detalhes, a pessoa vê no app ou pergunta à clínica.",
          {}, []),
    _tool("ver_meu_perfil", "Dados do perfil da pessoa (cidade, contato, endereço, preferências, se informou renda/deficiência).", {}, []),
    _tool("salvar_perfil",
          "Edita o perfil: cidade, contato preferido, faixa de renda e deficiência. Renda e deficiência são dados sensíveis: "
          "só salve com a autorização explícita da pessoa (consentimento=true). SOMENTE depois do 'sim'.",
          {"cidade": {"type": "string"}, "contato_preferido": {"type": "string", "enum": ["app", "telefone", ""]},
           "faixa_renda": {"type": "string", "enum": ["ate_1_salario_minimo", "1_a_2_salarios_minimos", "2_a_3_salarios_minimos",
                                                     "acima_de_3_salarios_minimos", "nao_informar"]},
           "possui_deficiencia": {"type": "string", "enum": ["sim", "nao", "nao_informar"]},
           "tipo_deficiencia": {"type": "string", "enum": ["visual", "auditiva", "motora", "intelectual", "tea", "outra", ""]},
           "consentimento": {"type": "boolean"}},
          ["cidade", "contato_preferido", "faixa_renda", "possui_deficiencia", "tipo_deficiencia", "consentimento"]),
    _tool("ver_avisos", "Avisos recentes da pessoa (pedido enviado, horário confirmado, nova receita, encaminhamento).", {}, []),
    _tool("marcar_avisos_como_lidos", "Marca todos os avisos como lidos. SOMENTE depois do 'sim'.", {}, []),
    _tool("ver_alertas_de_vaga", "Alertas de vaga e se a pessoa quer recebê-los.", {}, []),
    _tool("configurar_alertas_de_vaga", "Liga ou desliga os alertas de vaga. SOMENTE depois do 'sim'.",
          {"receber": {"type": "boolean"}}, ["receber"]),
    _tool("ver_alternativas", "Outras clínicas para um pedido que a clínica não pôde receber.",
          {"solicitacao_id": {"type": "string"}}, ["solicitacao_id"]),
    _tool("enviar_para_outra_clinica", "Envia o pedido recusado para uma das alternativas. SOMENTE depois do 'sim'.",
          {"solicitacao_id": {"type": "string"}, "clinica_destino_id": {"type": "string"}}, ["solicitacao_id", "clinica_destino_id"]),
    _tool("avaliar_clinica", "Avalia a clínica de um atendimento concluído (nota de 1 a 5). SOMENTE depois do 'sim'.",
          {"solicitacao_id": {"type": "string"}, "nota": {"type": "integer"}, "comentario": {"type": "string"}},
          ["solicitacao_id", "nota", "comentario"]),
    _tool("cancelar_agendamento",
          "Cancela um atendimento confirmado (sem penalidade se for antes do horário). SOMENTE depois do 'sim'.",
          {"agendamento_id": {"type": "string"}}, ["agendamento_id"]),
    _tool("remarcar_agendamento",
          "Troca um atendimento confirmado por outro horário livre da mesma clínica (a clínica confirma o novo). "
          "SOMENTE depois do 'sim'.",
          {"agendamento_id": {"type": "string"}, "vaga_id": {"type": "string"}}, ["agendamento_id", "vaga_id"]),
    _tool("ver_meus_encaminhamentos",
          "Encaminhamentos para outra universidade (quando a atual não pode tratar o caso), com o motivo simples.",
          {}, []),
    _tool("responder_encaminhamento",
          "Aceita ou recusa um encaminhamento. Aceitar libera o diagnóstico para a nova clínica e pede o horário "
          "separado. SOMENTE depois do 'sim' a um resumo que diga isso.",
          {"referenciamento_id": {"type": "string"}, "aceitar": {"type": "boolean"}}, ["referenciamento_id", "aceitar"]),
    _tool("ver_minha_prioridade",
          "Score da pessoa e como é calculado (gravidade avaliada + comparecimento), para explicar de forma educativa.",
          {}, []),
    _tool("salvar_endereco_e_preferencias",
          "Salva CEP, número, preferência (publica/privada/tanto_faz), transportes, turnos e distância máxima. "
          "SOMENTE depois do 'sim'.",
          {"cep": {"type": "string"}, "numero": {"type": "string"},
           "preferencia_instituicao": {"type": "string", "enum": ["publica", "privada", "tanto_faz"]},
           "transportes": {"type": "array", "items": {"type": "string", "enum": ["a_pe", "onibus", "metro", "trem", "carro"]}},
           "turnos": {"type": "array", "items": {"type": "string", "enum": ["manha", "tarde", "noite"]}},
           "distancia_max_km": {"type": "number"}},
          ["cep", "numero", "preferencia_instituicao", "transportes", "turnos", "distancia_max_km"]),
    _tool("falar_com_atendente",
          "Avisa a equipe da clínica que a pessoa quer falar com uma pessoa e devolve os telefones. Use quando pedir "
          "atendente humano ou quando você não conseguir ajudar. SOMENTE depois do 'sim'.",
          {"mensagem": {"type": "string", "description": "Recado curto ou vazio"}}, ["mensagem"]),
    _tool("explicar_em_audio",
          "Envia um áudio falado junto com a sua resposta, para explicar algo importante. "
          "Escreva o texto como fala natural.",
          {"texto": {"type": "string", "description": "O que será falado no áudio"}},
          ["texto"]),
    _tool("oferecer_opcoes",
          "Mostra botões de resposta rápida para a pessoa escolher, em vez de digitar.",
          {"opcoes": {"type": "array", "description": "Até 6 opções",
                      "items": {"type": "object",
                                "properties": {
                                    "rotulo": {"type": "string", "description": "Texto curto exibido no botão"},
                                    "valor": {"type": "string", "description": "Mensagem enviada ao tocar"}},
                                "required": ["rotulo", "valor"], "additionalProperties": False}}},
          ["opcoes"]),
]


@dataclass
class ToolContext:
    db: Session
    actor: Actor
    audios: list[str] = field(default_factory=list)
    quick_replies: list[QuickReply] = field(default_factory=list)
    mensagem_usuario: str = ""  # o que a PESSOA digitou nesta rodada (não o que a IA gerou)


def nome_especialidade(e: str) -> str:
    return ESPECIALIDADE_NOME.get(e, e.replace("_", " "))


def _norm(s: str) -> str:
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().strip().casefold()


# O prompt manda pedir confirmação; o servidor CONFERE: só envia pedido se a pessoa acabou de confirmar.
# Protege contra a IA agir sozinha (alucinação ou texto colado com instruções escondidas).
_CONFIRMACOES = ("sim", "s", "confirmo", "confirmar", "confirmado", "ok", "okay", "isso", "claro", "certo",
                 "beleza", "envia", "enviar", "envie", "manda", "mande")
_CONFIRMACOES_FRASE = ("pode enviar", "pode mandar", "pode sim", "quero enviar", "quero sim")


def eh_confirmacao(texto: str) -> bool:
    """Mensagem curta que COMEÇA confirmando ("Sim", "Sim, pode enviar", "Confirmo", "Pode enviar")."""
    t = " ".join(_norm(texto).replace(",", " ").replace(".", " ").replace("!", " ").split())
    if not t or len(t) > 80:
        return False
    return t.split()[0] in _CONFIRMACOES or t.startswith(_CONFIRMACOES_FRASE)


def _clinica_out(c: Clinica) -> dict:
    return {"id": c.id, "nome": c.nome, "cidade": c.cidade, "uf": c.uf, "publico": c.publico,
            "especialidades": c.especialidades, "custo_informado": c.custo_informado,
            "recebendo_pedidos": c.recebendo_pedidos, "telefone": c.telefone}


def buscar_clinicas(db: Session, cidade: str = "", especialidade: str = "") -> dict:
    itens = [c for c in db.scalars(select(Clinica).order_by(Clinica.nome))
             if (not cidade or _norm(c.cidade) == _norm(cidade))
             and (not especialidade or _norm(especialidade) in {_norm(e) for e in c.especialidades})]
    return {"clinicas": [_clinica_out(c) for c in itens], "total": len(itens), "aviso": AVISO_CLINICA,
            "dados": "fictícios (demonstração)"}


def listar_meus_pedidos(db: Session, actor: Actor) -> dict:
    nomes = {c.id: c.nome for c in db.scalars(select(Clinica))}
    pedidos = [{"id": s.id, "clinica": nomes.get(s.clinica_id, s.clinica_id), "especialidade": s.especialidade,
                "especialidade_nome": nome_especialidade(s.especialidade),
                "descricao": s.descricao_administrativa, "estado": s.estado,
                "estado_explicado": ESTADO_EXPLICADO.get(s.estado, s.estado),
                "enviado_em": por_extenso(s.criado_em), "pedido_de_origem_id": s.solicitacao_origem_id}
               for s in repo.listar(db, actor)]
    return {"pedidos": pedidos, "total": len(pedidos)}


def ver_historico(db: Session, actor: Actor, solicitacao_id: str) -> dict:
    eventos = repo.eventos(db, actor, solicitacao_id)  # fora do escopo -> 404
    return {"eventos": [{"tipo": e.tipo, "estado_anterior": e.estado_anterior, "estado_novo": e.estado_novo,
                         "quem": "você" if e.autor_papel == "paciente" else "clínica",
                         "motivo": e.motivo, "quando": por_extenso(e.criado_em)} for e in eventos]}


def listar_meus_agendamentos(db: Session, actor: Actor) -> dict:
    q = (select(Agendamento, Vaga, Clinica)
         .join(Vaga, Vaga.id == Agendamento.vaga_id).join(Clinica, Clinica.id == Agendamento.clinica_id)
         .where(Agendamento.paciente_id == actor.usuario_id, Agendamento.estado != "cancelado")
         .order_by(Vaga.inicio))
    itens = [{"id": a.id, "estado": a.estado, "clinica": c.nome, "telefone_clinica": c.telefone,
              "especialidade": v.especialidade,
              "especialidade_nome": nome_especialidade(v.especialidade), "inicio": to_sp_iso(v.inicio), "quando": por_extenso(v.inicio),
              "ja_passou": as_utc(v.inicio) < utc_now()}
             for a, v, c in db.execute(q).all()]
    return {"agendamentos": itens, "total": len(itens),
            "observacao": "Só aparecem atendimentos confirmados pela clínica. Para cancelar ou mudar, "
                          "ligue para a clínica."}


def _publico_do_pedido(clinica: Clinica, publico_alvo: str) -> str:
    """O chat não pergunta o público: usa o informado, ou o único da clínica, ou `adultos`."""
    if publico_alvo:
        return publico_alvo
    if len(clinica.publico) == 1 or "adultos" not in clinica.publico:
        return clinica.publico[0] if clinica.publico else "adultos"
    return "adultos"


def enviar_pedido(db: Session, actor: Actor, clinica_id: str, especialidade: str, descricao: str,
                  publico_alvo: str = "") -> dict:
    """Cria o pedido pelo serviço do módulo de solicitações (#3), que valida clínica, especialidade,
    público e duplicidade e grava o evento `criada` (contrato §4.3)."""
    clinica = db.get(Clinica, clinica_id)
    if clinica is None:
        raise nao_encontrado()
    descricao = descricao.strip()
    if not descricao or len(descricao) > 280:
        raise ApiError(422, "validacao", "A descrição precisa ter entre 1 e 280 caracteres.",
                       {"campos": ["descricao_administrativa"]})
    try:
        s = solicitacoes_service.criar(db, actor, clinica_id, especialidade,
                                       _publico_do_pedido(clinica, publico_alvo), descricao)
    except ApiError as exc:
        if exc.codigo == "solicitacao_duplicada":
            duplicado = db.scalar(select(Solicitacao.id).where(
                Solicitacao.paciente_id == actor.usuario_id, Solicitacao.clinica_id == clinica_id,
                Solicitacao.especialidade == especialidade, Solicitacao.estado.in_(ESTADOS_ATIVOS)))
            raise ApiError(409, "solicitacao_duplicada",
                           "Você já tem um pedido em andamento nesta clínica para essa especialidade.",
                           {"solicitacao_id": duplicado}) from exc
        raise
    return {"pedido": {"id": s.id, "clinica": clinica.nome, "especialidade": especialidade, "estado": s.estado,
                       "estado_explicado": ESTADO_EXPLICADO["enviada"]}, "aviso": AVISO_PEDIDO}


def run_tool(name: str, args: dict[str, Any], ctx: ToolContext) -> tuple[str, bool]:
    """Executa uma ferramenta. Retorna (conteúdo JSON, is_error)."""
    db, actor = ctx.db, ctx.actor
    try:
        match name:
            case "buscar_clinicas":
                result: Any = buscar_clinicas(db, args.get("cidade", ""), args.get("especialidade", ""))
            case "listar_meus_pedidos":
                result = listar_meus_pedidos(db, actor)
            case "ver_historico_do_pedido":
                result = ver_historico(db, actor, args["solicitacao_id"])
            case "listar_meus_agendamentos":
                result = listar_meus_agendamentos(db, actor)
            case "enviar_pedido":
                if not eh_confirmacao(ctx.mensagem_usuario):
                    return json.dumps({"erro": "A pessoa ainda não confirmou. Repita clínica, especialidade e "
                                               "descrição e peça um 'sim' antes de enviar.",
                                       "codigo": "confirmacao_necessaria"}, ensure_ascii=False), True
                result = enviar_pedido(db, actor, args["clinica_id"], args["especialidade"],
                                       args["descricao_administrativa"])
            case "sugerir_universidades" | "ver_horarios_livres" | "ver_meus_encaminhamentos" | "ver_minha_prioridade" \
                    | "comparar_clinicas" | "acionar_emergencia" | "ver_minhas_receitas" | "ver_meu_prontuario" \
                    | "ver_meu_perfil" | "ver_avisos" | "ver_alertas_de_vaga" | "ver_alternativas":
                result = _leitura(name, args, ctx)
            case "pedir_atendimento" | "cancelar_agendamento" | "remarcar_agendamento" | "responder_encaminhamento" \
                    | "salvar_endereco_e_preferencias" | "falar_com_atendente" | "salvar_perfil" | "marcar_avisos_como_lidos" \
                    | "configurar_alertas_de_vaga" | "enviar_para_outra_clinica" | "avaliar_clinica":
                if not eh_confirmacao(ctx.mensagem_usuario):
                    return json.dumps({"erro": "A pessoa ainda não confirmou. Resuma em linguagem simples o que vai "
                                               "acontecer e peça um 'sim' antes.", "codigo": "confirmacao_necessaria"},
                                      ensure_ascii=False), True
                result = _acao(name, args, ctx)
                db.commit()
            case "explicar_em_audio":
                ctx.audios.append(args["texto"].strip())
                result = {"ok": True, "info": "O áudio será enviado junto com a sua próxima mensagem."}
            case "oferecer_opcoes":
                ctx.quick_replies = [QuickReply(label=o["rotulo"], value=o["valor"]) for o in args["opcoes"][:6]]
                result = {"ok": True, "info": "Os botões serão exibidos abaixo da sua mensagem."}
            case _:
                return json.dumps({"erro": f"Ferramenta desconhecida: {name}"}), True
    except ApiError as exc:
        return json.dumps({"erro": exc.mensagem, "codigo": exc.codigo}, ensure_ascii=False), True
    except KeyError as exc:
        return json.dumps({"erro": f"Parâmetro obrigatório ausente: {exc}"}, ensure_ascii=False), True
    return json.dumps(result, ensure_ascii=False), False


# ---------- ferramentas novas: só chamam os serviços/rotas do painel (fonte única das regras) ----------

def _leitura(name: str, args: dict[str, Any], ctx: ToolContext) -> Any:
    db, actor = ctx.db, ctx.actor
    if name == "sugerir_universidades":
        from app.modulos.ranqueamento.router import sugestoes
        r = sugestoes(especialidade=args.get("especialidade") or None, lat=None, lng=None, actor=actor, db=db)
        return {"sugestoes": [{"clinica_id": i["clinica"]["id"], "nome": i["clinica"]["nome"],
                               "universidade": i["clinica"]["universidade"], "tipo": i["clinica"]["tipo_instituicao"],
                               "distancia_km": i["distancia_km"], "motivos": i["motivos"], "telefone": i["clinica"]["telefone"]}
                              for i in r["itens"][:5]], "aviso": r["aviso"]}
    if name == "ver_horarios_livres":
        from app.modulos.vagas.service import horarios_livres
        return {"horarios": [{"vaga_id": h["vaga_id"], "quando": por_extenso(datetime_aware(h["inicio"]))}
                             for h in horarios_livres(db, args["clinica_id"], args.get("especialidade") or None)][:6]}
    if name == "ver_meus_encaminhamentos":
        from app.modulos.indexador.service import listar
        return {"encaminhamentos": [{"id": r["id"], "estado": r["estado"], "para": r["clinica_destino"]["nome"],
                                     "de": r["clinica_origem_nome"], "motivo": r["motivo_simples"],
                                     "horario": por_extenso(datetime_aware(r["horario_inicio"])) if r["horario_inicio"] else None}
                                    for r in listar(db, actor.usuario_id)]}
    if name == "comparar_clinicas":
        from app.modulos.ranqueamento.router import comparacao
        itens = comparacao(lat=None, lng=None, actor=actor, db=db)["itens"]
        chave = {"distancia": lambda i: (i["distancia_km"] is None, i["distancia_km"] or 0),
                 "valor": lambda i: i["clinica"]["valor_consulta"] or 0,
                 "data": lambda i: i["proximos_horarios"][0]["inicio"] if i["proximos_horarios"] else "9999"}[args.get("ordenar_por") or "distancia"]
        return {"clinicas": [{"clinica_id": i["clinica"]["id"], "nome": i["clinica"]["nome"], "tipo": i["clinica"]["tipo_instituicao"],
                              "valor": "gratuito" if not i["clinica"]["valor_consulta"] else f"R$ {i['clinica']['valor_consulta']:.2f}".replace(".", ","),
                              "distancia_km": i["distancia_km"], "especialidades": [nome_especialidade(e) for e in i["clinica"]["especialidades"]],
                              "proximos_horarios": [{"vaga_id": h["vaga_id"], "quando": por_extenso(datetime_aware(h["inicio"])),
                                                     "especialidade": nome_especialidade(h["especialidade"])} for h in i["proximos_horarios"]]}
                             for i in sorted(itens, key=chave)]}
    if name == "acionar_emergencia":
        from app.modulos.emergencia.router import emergencia
        r = emergencia(lat=None, lng=None, actor=actor, db=db)
        def resumo(x):
            c = x["clinica"]
            return {"nome": c["nome"], "endereco": f"{c['endereco']}, {c['bairro']}, {c['cidade']}", "telefone": c["telefone"],
                    "distancia_km": x["distancia_km"], "aberta_ate": x["aberta_ate"]}
        return {"principal": resumo(r["principal"]) if r["principal"] else None, "alternativas": [resumo(x) for x in r["alternativas"]],
                "sinais_graves": r["sinais_graves"], "orientacao_grave": r["orientacao_grave"], "aviso": r["aviso"]}
    if name == "ver_minhas_receitas":
        from app.modulos.receitas.service import do_paciente
        return {"receitas": [{"data": r["data_emissao"], "clinica": r["instituicao"], "itens": r["itens"], "orientacoes": r["orientacoes"],
                              "assinada_por": f"{r['assinante_nome']} ({r['assinante_cro']})"} for r in do_paciente(db, actor)],
                "regra": "Explique sem mudar dose nem frequência. Dúvida clínica: oriente a falar com a clínica."}
    if name == "ver_meu_prontuario":
        from app.modulos.prontuario.service import do_paciente
        regs = do_paciente(db, actor, actor.usuario_id)
        db.commit()  # o acesso fica registrado
        return {"registros": [{"tipo": r["tipo_rotulo"], "clinica": r["clinica_nome"], "data": r["criado_em"][:10],
                               "validado": bool(r["validado_por_nome"]), "tratamento_indicado": [nome_especialidade(e) for e in r["especialidades"]]}
                              for r in regs], "aviso": "O texto clínico fica no app (Meu cuidado > Meu prontuário)."}
    if name == "ver_meu_perfil":
        from app.modulos.perfil.service import obter
        p = obter(db, actor)
        return {k: p.get(k) for k in ("cidade", "uf", "contato_preferido", "cep", "bairro", "preferencia_instituicao", "transportes",
                                      "turnos", "distancia_max_km", "consentimento_dados_sensiveis", "possui_deficiencia", "cadastro_completo")} \
            | {"informou_renda": bool(p["socioeconomico"].get("informado"))}
    if name == "ver_avisos":
        from app.modulos.notificacoes.service import listar as avisos
        return {"avisos": avisos(db, actor.usuario_id)[:8]}
    if name == "ver_alertas_de_vaga":
        from app.modulos.alertas.router import listar as alertas, ver_preferencia
        return {"alertas": alertas(actor=actor, db=db), "preferencia": ver_preferencia(actor=actor, db=db)}
    if name == "ver_alternativas":
        from app.modulos.solicitacoes.router import listar_alternativas
        r = listar_alternativas(args["solicitacao_id"], actor=actor, db=db)
        return {"alternativas": [{"clinica_id": i["clinica"]["id"], "nome": i["clinica"]["nome"]} for i in r["itens"]], "aviso": r["aviso"]}
    from app.modulos.prioridade.fontes import FontesBanco
    from app.modulos.prioridade.router import meu_score
    return meu_score(actor=actor, db=db, fontes=FontesBanco(db))


def datetime_aware(iso: str):
    from datetime import datetime
    return datetime.fromisoformat(iso)


def _acao(name: str, args: dict[str, Any], ctx: ToolContext) -> Any:
    db, actor = ctx.db, ctx.actor
    if name == "pedir_atendimento":
        from app.modulos.vagas.service import registrar_interesse
        clinica = db.get(Clinica, args["clinica_id"])
        if clinica is None:
            raise nao_encontrado()
        s = solicitacoes_service.criar(db, actor, clinica.id, args["especialidade"], _publico_do_pedido(clinica, ""),
                                       args["descricao_administrativa"].strip()[:280], "mim", None,
                                       args.get("telefone_contato") or None)
        horario = None
        if args.get("vaga_id"):
            v = registrar_interesse(db, actor, args["vaga_id"], s.id)
            horario = por_extenso(datetime_aware(v["inicio"]))
        return {"pedido_id": s.id, "clinica": clinica.nome, "horario_pedido": horario,
                "aviso": "Só é consulta marcada quando a clínica confirmar."}
    if name == "cancelar_agendamento":
        from app.modulos.agendamentos.service import cancelar
        r = cancelar(db, actor, args["agendamento_id"], "Cancelado pela assistente a pedido do paciente")
        return {"cancelado": True, "aviso": r["aviso"]}
    if name == "remarcar_agendamento":
        from app.modulos.agendamentos.router import RemarcarIn, remarcar
        return remarcar(args["agendamento_id"], RemarcarIn(vaga_id=args["vaga_id"]), actor=actor, db=db)
    if name == "responder_encaminhamento":
        from app.modulos.indexador.service import aceitar, recusar
        r = (aceitar if args["aceitar"] else recusar)(db, actor, args["referenciamento_id"])
        return {"estado": r["estado"], "clinica": r["clinica_destino"]["nome"], "pedido_id": r["solicitacao_destino_id"]}
    if name == "salvar_endereco_e_preferencias":
        from app.modulos.perfil import service as perfil
        from app.modulos.perfil.schemas import PerfilIn
        atual = perfil.obter(db, actor)
        dados = PerfilIn(**{**{k: atual.get(k) for k in ("cidade", "uf", "contato_preferido", "logradouro", "bairro",
                                                          "precisa_acessibilidade")},
                            "socioeconomico": atual["socioeconomico"], "acessibilidade": atual["acessibilidade"],
                            **{k: args[k] for k in ("cep", "numero", "preferencia_instituicao", "transportes", "turnos",
                                                    "distancia_max_km")}})
        r = perfil.salvar(db, actor, dados)
        return {"salvo": True, "cadastro_completo": r["cadastro_completo"]}
    if name == "salvar_perfil":
        from app.modulos.perfil import service as perfil
        from app.modulos.perfil.schemas import PerfilIn
        atual = perfil.obter(db, actor)
        renda = args.get("faixa_renda")
        socio = ({"informado": True, "faixa_renda_familiar": renda} if renda and renda != "nao_informar"
                 else {"informado": False, "prefiro_nao_informar": renda == "nao_informar"})
        defi = {"sim": True, "nao": False}.get(args.get("possui_deficiencia") or "")
        dados = PerfilIn(**{**{k: atual.get(k) for k in ("uf", "cep", "logradouro", "numero", "bairro", "latitude", "longitude",
                                                          "preferencia_instituicao", "distancia_max_km", "transportes", "turnos",
                                                          "precisa_acessibilidade")},
                            "cidade": args.get("cidade") or atual.get("cidade"), "contato_preferido": args.get("contato_preferido") or None,
                            "acessibilidade": atual["acessibilidade"], "socioeconomico": socio, "possui_deficiencia": defi,
                            "tipo_deficiencia": args.get("tipo_deficiencia") or None, "consentimento_dados_sensiveis": bool(args.get("consentimento"))})
        r = perfil.salvar(db, actor, dados)
        return {"salvo": True, "consentimento": r["consentimento_dados_sensiveis"]}
    if name == "marcar_avisos_como_lidos":
        from app.modulos.notificacoes.service import listar as avisos, marcar_lida
        for n in [a for a in avisos(db, actor.usuario_id) if not a["lida"]]:
            marcar_lida(db, actor.usuario_id, n["id"])
        return {"ok": True}
    if name == "configurar_alertas_de_vaga":
        from app.modulos.alertas.router import salvar_preferencia
        from app.modulos.alertas.schemas import PreferenciaIn
        return salvar_preferencia(PreferenciaIn(receber=bool(args["receber"]), ligacao=False), actor=actor, db=db)
    if name == "enviar_para_outra_clinica":
        from app.modulos.solicitacoes.router import encaminhar
        from app.modulos.solicitacoes.schemas import EncaminharIn
        r = encaminhar(args["solicitacao_id"], EncaminharIn(clinica_destino_id=args["clinica_destino_id"]), actor=actor, db=db)
        return {"novo_pedido_id": r["solicitacao"]["id"], "aviso": r["aviso"]}
    if name == "avaliar_clinica":
        from fastapi import Response as _Resp
        from app.modulos.avaliacoes.router import avaliar
        from app.modulos.avaliacoes.schemas import AvaliarIn
        return avaliar(AvaliarIn(solicitacao_id=args["solicitacao_id"], nota=int(args["nota"]), comentario=args.get("comentario") or None),
                       _Resp(), actor=actor, db=db)
    from app.modulos.notificacoes.router import AtendenteIn, atendente
    return atendente(AtendenteIn(mensagem=args.get("mensagem") or None), actor=actor, db=db)


# ---------- paridade painel ↔ IA: cada endpoint que o paciente usa no painel tem uma ferramenta ----------
# (testado em tests/test_paridade_ia.py: rota de paciente sem ferramenta faz o teste falhar)
ACOES_PAINEL: dict[tuple[str, str], str] = {
    ("GET", "/perfil"): "ver_meu_perfil",
    ("PUT", "/perfil"): "salvar_perfil",
    ("GET", "/clinicas"): "buscar_clinicas",
    ("GET", "/clinicas/{clinica_id}"): "buscar_clinicas",
    ("GET", "/clinicas-comparacao"): "comparar_clinicas",
    ("GET", "/universidades/sugestoes"): "sugerir_universidades",
    ("GET", "/clinicas/{clinica_id}/horarios"): "ver_horarios_livres",
    ("GET", "/vagas"): "ver_horarios_livres",
    ("POST", "/solicitacoes"): "pedir_atendimento",
    ("POST", "/vagas/{vaga_id}/interesses"): "pedir_atendimento",
    ("GET", "/solicitacoes"): "listar_meus_pedidos",
    ("GET", "/solicitacoes/{solicitacao_id}"): "listar_meus_pedidos",
    ("GET", "/solicitacoes/{solicitacao_id}/eventos"): "ver_historico_do_pedido",
    ("GET", "/solicitacoes/{solicitacao_id}/alternativas"): "ver_alternativas",
    ("POST", "/solicitacoes/{solicitacao_id}/encaminhar"): "enviar_para_outra_clinica",
    ("GET", "/agendamentos"): "listar_meus_agendamentos",
    ("GET", "/agendamentos/{agendamento_id}"): "listar_meus_agendamentos",
    ("POST", "/agendamentos/{agendamento_id}/cancelar"): "cancelar_agendamento",
    ("POST", "/agendamentos/{agendamento_id}/remarcar"): "remarcar_agendamento",
    ("GET", "/referenciamentos"): "ver_meus_encaminhamentos",
    ("POST", "/referenciamentos/{ref_id}/aceitar"): "responder_encaminhamento",
    ("POST", "/referenciamentos/{ref_id}/recusar"): "responder_encaminhamento",
    ("GET", "/prontuario"): "ver_meu_prontuario",
    ("GET", "/prontuario/acessos"): "ver_meu_prontuario",
    ("GET", "/receitas"): "ver_minhas_receitas",
    ("GET", "/meu-score"): "ver_minha_prioridade",
    ("GET", "/notificacoes"): "ver_avisos",
    ("POST", "/notificacoes/{notificacao_id}/lida"): "marcar_avisos_como_lidos",
    ("POST", "/atendimento-humano"): "falar_com_atendente",
    ("GET", "/emergencia"): "acionar_emergencia",
    ("GET", "/alertas"): "ver_alertas_de_vaga",
    ("POST", "/alertas/{alerta_id}/lido"): "ver_alertas_de_vaga",
    ("GET", "/alertas/preferencia"): "ver_alertas_de_vaga",
    ("PUT", "/alertas/preferencia"): "configurar_alertas_de_vaga",
    ("POST", "/avaliacoes"): "avaliar_clinica",
    ("GET", "/avaliacoes"): "avaliar_clinica",
}
# Rotas de paciente que NÃO precisam de ferramenta (com o motivo)
SEM_FERRAMENTA: dict[tuple[str, str], str] = {
    ("PUT", "/perfil/modo"): "troca de modo é da interface (botão sempre visível)",
    ("GET", "/receitas/{receita_id}/pdf"): "arquivo para baixar; a IA mostra e explica a receita pelo ver_minhas_receitas",
    ("GET", "/acessibilidade/chat/perfil"): "é o próprio chat",
    ("PUT", "/acessibilidade/chat/perfil"): "é o próprio chat",
    ("POST", "/acessibilidade/chat"): "é o próprio chat",
    ("POST", "/acessibilidade/tts"): "é o próprio chat",
    ("POST", "/urgencias"): "substituído pelo fluxo de emergência (acionar_emergencia)",
    ("GET", "/urgencias"): "substituído pelo fluxo de emergência (acionar_emergencia)",
    ("GET", "/cenarios"): "sem tela no painel do paciente",
    ("GET", "/cenarios/compatibilidade"): "sem tela no painel do paciente",
    ("POST", "/cenarios/{cenario_id}/interesses"): "sem tela no painel do paciente",
    ("DELETE", "/cenarios/{cenario_id}/interesses"): "sem tela no painel do paciente",
    ("GET", "/resumos/{resumo_id}/compartilhamentos"): "resumos compartilháveis: sem tela no painel do paciente",
    ("GET", "/resumos/{resumo_id}/eventos"): "resumos compartilháveis: sem tela no painel do paciente",
    ("POST", "/resumos/{resumo_id}/compartilhamentos"): "resumos compartilháveis: sem tela no painel do paciente",
    ("POST", "/compartilhamentos/{compartilhamento_id}/revogar"): "resumos compartilháveis: sem tela no painel do paciente",
}
