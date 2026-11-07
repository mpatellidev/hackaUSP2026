"""Ferramentas (chamada de funções) que a IA pode usar, ligadas aos dados REAIS do backend.

Regras do contrato que valem aqui:
- Quem age é sempre o paciente do token (Actor); nada de paciente_id vindo da IA.
- Leituras de pedidos passam por app.repositories.solicitacoes (já escopadas).
- Pedido ≠ agendamento: a IA pode ENVIAR um pedido, nunca criar/remarcar/cancelar agendamento.
  "Agendada" só aparece quando o backend tem o estado `agendada`/Agendamento confirmado por funcionário.
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
from app.models.solicitacoes import ESTADOS_ATIVOS, EventoSolicitacao, Solicitacao
from app.models.vagas import Agendamento, Vaga
from app.modulos.acessibilidade.formatos import por_extenso
from app.modulos.acessibilidade.schemas import QuickReply
from app.repositories import solicitacoes as repo

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
    "clinica_geral": "clínica geral", "pediatria": "pediatria", "ginecologia_obstetricia": "ginecologia e obstetrícia",
    "cardiologia": "cardiologia", "dermatologia": "dermatologia", "ortopedia": "ortopedia",
    "oftalmologia": "oftalmologia", "saude_mental": "saúde mental", "odontologia": "odontologia",
    "fisioterapia": "fisioterapia", "nutricao": "nutrição",
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
           "especialidade": {"type": "string", "description": "Ex.: clinica_geral, pediatria. Vazio = todas."}},
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
                              "Ex.: 'Consulta de rotina de clínica geral'."}},
          ["clinica_id", "especialidade", "descricao_administrativa"]),
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


def nome_especialidade(e: str) -> str:
    return ESPECIALIDADE_NOME.get(e, e.replace("_", " "))


def _norm(s: str) -> str:
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().strip().casefold()


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


def enviar_pedido(db: Session, actor: Actor, clinica_id: str, especialidade: str, descricao: str) -> dict:
    """Cria a Solicitacao `enviada` + evento `criada` (contrato §4.3, §2).
    TODO(#3): quando o módulo de solicitações publicar o serviço de criação, chamar o serviço de lá."""
    clinica = db.get(Clinica, clinica_id)
    if clinica is None:
        raise nao_encontrado()
    if not clinica.recebendo_pedidos:
        raise ApiError(409, "clinica_sem_recebimento", "Esta clínica não está recebendo pedidos agora.",
                       {"clinica_id": clinica_id})
    if especialidade not in clinica.especialidades:
        raise ApiError(422, "validacao", "Esta clínica não atende essa especialidade.",
                       {"campos": ["especialidade"]})
    descricao = descricao.strip()
    if not descricao or len(descricao) > 280:
        raise ApiError(422, "validacao", "A descrição precisa ter entre 1 e 280 caracteres.",
                       {"campos": ["descricao_administrativa"]})
    duplicado = db.scalar(select(Solicitacao.id).where(
        Solicitacao.paciente_id == actor.usuario_id, Solicitacao.clinica_id == clinica_id,
        Solicitacao.especialidade == especialidade, Solicitacao.estado.in_(ESTADOS_ATIVOS)))
    if duplicado:
        raise ApiError(409, "solicitacao_duplicada",
                       "Você já tem um pedido em andamento nesta clínica para essa especialidade.",
                       {"solicitacao_id": duplicado})
    agora = utc_now()
    s = Solicitacao(paciente_id=actor.usuario_id, clinica_id=clinica_id, estado="enviada",
                    especialidade=especialidade, descricao_administrativa=descricao, criado_em=agora,
                    atualizado_em=agora)
    db.add(s)
    db.flush()
    db.add(EventoSolicitacao(solicitacao_id=s.id, tipo="criada", estado_anterior=None, estado_novo="enviada",
                             autor_usuario_id=actor.usuario_id, autor_papel=actor.papel, motivo=None,
                             criado_em=agora))
    db.flush()
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
                result = enviar_pedido(db, actor, args["clinica_id"], args["especialidade"],
                                       args["descricao_administrativa"])
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
