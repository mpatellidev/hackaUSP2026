"""Indexador: decide se o tratamento fica na universidade ou é referenciado, e registra TUDO para auditoria.

Regra (para cada procedimento necessário da triagem/plano validado):
- a clínica precisa ensinar o procedimento no semestre vigente (escopo didático) com complexidade suficiente;
- precisa ter vaga aberta na especialidade.
Se a clínica de origem atende tudo: "mantido". Senão, as outras parceiras aptas são ranqueadas (ranqueamento) e a
melhor recebe um referenciamento com a próxima vaga reservada, que só vale depois que o paciente confirma (a
confirmação também é o consentimento para levar o diagnóstico). Urgência avaliada continua passando à frente na fila.
"""
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import Actor
from app.core.errors import ApiError, nao_encontrado
from app.core.time import to_sp_iso, utc_now
from app.models.clinicas import Clinica
from app.models.solicitacoes import Solicitacao
from app.models.vagas import Vaga
from app.modulos.indexador.models import DecisaoIndexador, EscopoDidatico, Referenciamento
from app.modulos.notificacoes.service import notificar
from app.modulos.prontuario.models import AcessoProntuario, RegistroProntuario
from app.modulos.ranqueamento import service as ranqueamento
from app.modulos.ranqueamento.router import candidatas, preferencias_do_paciente

VERSAO = "indexador-1.0"
# Catálogo de procedimentos: especialidade e complexidade (1 básico · 2 intermediário · 3 avançado)
PROCEDIMENTOS: dict[str, tuple[str, int]] = {
    "avaliacao_inicial": ("triagem", 1), "restauracao_resina": ("dentistica", 1), "faceta_resina": ("dentistica", 3),
    "raspagem_supragengival": ("periodontia", 1), "raspagem_subgengival": ("periodontia", 2),
    "canal_unirradicular": ("endodontia", 2), "canal_multirradicular": ("endodontia", 3),
    "extracao_simples": ("cirurgia", 1), "extracao_terceiro_molar": ("cirurgia", 3),
    "protese_total": ("protese", 2), "coroa_unitaria": ("protese", 3),
    "aplicacao_fluor": ("odontopediatria", 1), "restauracao_dente_de_leite": ("odontopediatria", 2),
    "biopsia_lesao_bucal": ("estomatologia", 2),
}
MOTIVO_SIMPLES = {
    "adequado": "A clínica ensina esse tratamento neste semestre e tem vaga.",
    "sem_vaga": "A clínica não tem vaga para esse tratamento agora.",
    "fora_do_escopo": "A clínica não ensina esse tratamento neste semestre.",
    "excede_limite_didatico": "O tratamento é mais complexo do que a clínica atende na graduação.",
}


def semestre_atual(agora: datetime | None = None) -> str:
    d = agora or utc_now()
    return f"{d.year}.{1 if d.month <= 6 else 2}"


def avaliar_clinica(db: Session, clinica_id: str, especialidades: list[str], procedimentos: list[str]) -> str:
    """'adequado' ou o primeiro motivo que impede (fora_do_escopo, excede_limite_didatico, sem_vaga)."""
    escopo = {e.procedimento: e.complexidade_max for e in db.scalars(select(EscopoDidatico).where(
        EscopoDidatico.clinica_id == clinica_id, EscopoDidatico.semestre == semestre_atual(), EscopoDidatico.ativo))}
    for proc in procedimentos:
        if proc not in escopo:
            return "fora_do_escopo"
        if PROCEDIMENTOS.get(proc, ("", 1))[1] > escopo[proc]:
            return "excede_limite_didatico"
    for esp in especialidades:
        if proxima_vaga(db, clinica_id, esp) is None:
            return "sem_vaga"
    return "adequado"


def proxima_vaga(db: Session, clinica_id: str, especialidade: str) -> Vaga | None:
    return db.scalar(select(Vaga).where(Vaga.clinica_id == clinica_id, Vaga.especialidade == especialidade,
                                        Vaga.estado == "aberta", Vaga.inicio > utc_now()).order_by(Vaga.inicio, Vaga.id))


def decidir(db: Session, registro: RegistroProntuario) -> DecisaoIndexador:
    """Roda para triagem/plano VALIDADO. Idempotente por registro: não cria segundo referenciamento pendente."""
    pendente = db.scalar(select(Referenciamento).where(Referenciamento.paciente_id == registro.paciente_id,
                                                       Referenciamento.estado == "aguardando_paciente"))
    esp, procs = list(registro.especialidades or []), list(registro.procedimentos or [])
    motivo = avaliar_clinica(db, registro.clinica_id, esp, procs)
    base = dict(paciente_id=registro.paciente_id, solicitacao_id=registro.solicitacao_id,
                clinica_origem_id=registro.clinica_id, versao_config=VERSAO)
    if motivo == "adequado" or pendente is not None:
        decisao = DecisaoIndexador(**base, resultado="mantido" if motivo == "adequado" else "sem_destino",
                                   motivo=motivo if motivo == "adequado" else "referenciamento_pendente", candidatos=[])
        db.add(decisao)
        db.flush()
        return decisao

    prefs = preferencias_do_paciente(db, registro.paciente_id)
    outras = [c for c in candidatas(db, esp[0] if esp else None) if c.clinica_id != registro.clinica_id]
    avaliacao = {c.clinica_id: avaliar_clinica(db, c.clinica_id, esp, procs) for c in outras}
    aptas = [c for c in outras if avaliacao[c.clinica_id] == "adequado"]
    ranking = ranqueamento.ranquear(prefs, aptas, esp[0] if esp else None)
    lista = [{"clinica_id": r.clinica_id, "nome": r.nome, "pontos": r.pontos, "motivos": r.motivos, "apta": True}
             for r in ranking]
    lista += [{"clinica_id": c.clinica_id, "nome": c.nome, "pontos": None, "apta": False,
               "motivo": avaliacao[c.clinica_id]} for c in outras if avaliacao[c.clinica_id] != "adequado"]
    destino = ranking[0] if ranking else None
    decisao = DecisaoIndexador(**base, resultado="referenciado" if destino else "sem_destino", motivo=motivo,
                               clinica_destino_id=destino.clinica_id if destino else None, candidatos=lista)
    db.add(decisao)
    db.flush()
    if destino is None:
        notificar(db, registro.paciente_id, "Ainda procurando outra clínica",
                  f"{MOTIVO_SIMPLES[motivo]} Ainda não achamos outra clínica parceira com vaga. Avisamos quando houver.",
                  f"decisao:{decisao.id}")
        return decisao
    vaga = proxima_vaga(db, destino.clinica_id, esp[0])
    ref = Referenciamento(paciente_id=registro.paciente_id, decisao_id=decisao.id,
                          solicitacao_origem_id=registro.solicitacao_id, clinica_destino_id=destino.clinica_id,
                          vaga_id=vaga.id if vaga else None, estado="aguardando_paciente")
    db.add(ref)
    db.flush()
    notificar(db, registro.paciente_id, "Encontramos outra clínica para você",
              f"{MOTIVO_SIMPLES[motivo]} Separamos um horário na {destino.nome}. Seu diagnóstico vai junto, "
              "sem repetir exames. Confirme no app para valer.", f"referenciamento:{ref.id}")
    return decisao


# ---------- paciente ----------

def referenciamento_json(db: Session, r: Referenciamento) -> dict:
    from app.modulos.solicitacoes.service import clinica_json
    decisao = db.get(DecisaoIndexador, r.decisao_id)
    vaga = db.get(Vaga, r.vaga_id) if r.vaga_id else None
    origem = db.get(Clinica, decisao.clinica_origem_id)
    return {"id": r.id, "estado": r.estado, "clinica_destino": clinica_json(db.get(Clinica, r.clinica_destino_id)),
            "clinica_origem_nome": origem.nome if origem else None, "horario_inicio": to_sp_iso(vaga.inicio) if vaga else None,
            "motivo": decisao.motivo, "motivo_simples": MOTIVO_SIMPLES.get(decisao.motivo, ""),
            "candidatos": [{"nome": c["nome"], "apta": c["apta"], "pontos": c.get("pontos"),
                            "motivo": MOTIVO_SIMPLES.get(c.get("motivo", ""), "") if not c["apta"] else None}
                           for c in decisao.candidatos],
            "solicitacao_destino_id": r.solicitacao_destino_id, "criado_em": to_sp_iso(r.criado_em),
            "respondido_em": to_sp_iso(r.respondido_em) if r.respondido_em else None}


def listar(db: Session, paciente_id: str) -> list[dict]:
    q = select(Referenciamento).where(Referenciamento.paciente_id == paciente_id)
    return [referenciamento_json(db, r) for r in db.scalars(q.order_by(Referenciamento.criado_em.desc()))]


def _meu(db: Session, actor: Actor, ref_id: str) -> Referenciamento:
    r = db.get(Referenciamento, ref_id)
    if r is None or r.paciente_id != actor.usuario_id:
        raise nao_encontrado()
    if r.estado != "aguardando_paciente":
        raise ApiError(409, "transicao_invalida", "Este encaminhamento já foi respondido.")
    return r


def aceitar(db: Session, actor: Actor, ref_id: str) -> dict:
    from app.modulos.solicitacoes import service as solicitacoes
    from app.modulos.vagas import service as vagas
    r = _meu(db, actor, ref_id)
    decisao = db.get(DecisaoIndexador, r.decisao_id)
    origem = db.get(Solicitacao, r.solicitacao_origem_id) if r.solicitacao_origem_id else None
    registros = list(db.scalars(select(RegistroProntuario).where(
        RegistroProntuario.paciente_id == actor.usuario_id, RegistroProntuario.validado_por.is_not(None))))
    especialidade = next((e for reg in registros for e in reg.especialidades), None) or "clinica_integrada"
    destino = db.get(Clinica, r.clinica_destino_id)
    publico = origem.publico_alvo if origem and origem.publico_alvo in destino.publico else destino.publico[0]
    pedido = solicitacoes.criar(
        db, actor, destino.id, especialidade, publico,
        f"Encaminhado pela {db.get(Clinica, decisao.clinica_origem_id).nome} com diagnóstico validado.",
        origem.para_quem if origem else "mim", origem.nome_paciente if origem else None,
        origem.telefone_contato if origem else None, trilha="estruturada")
    pedido.solicitacao_origem_id = origem.id if origem else None
    # Consentimento: o diagnóstico validado passa a ser visível para a clínica de destino (registrado)
    for reg in registros:
        db.add(AcessoProntuario(paciente_id=actor.usuario_id, usuario_id=actor.usuario_id, registro_id=reg.id,
                                clinica_id=destino.id, acao="compartilhamento"))
    horario = None
    vaga = db.get(Vaga, r.vaga_id) if r.vaga_id else None
    if vaga is None or vaga.estado != "aberta":
        vaga = proxima_vaga(db, destino.id, especialidade)
    if vaga is not None:
        vagas.registrar_interesse(db, actor, vaga.id, pedido.id)
        horario = vaga.inicio
    r.estado, r.respondido_em, r.solicitacao_destino_id = "aceito", utc_now(), pedido.id
    r.vaga_id = vaga.id if vaga else None
    quando = to_sp_iso(horario) if horario else ""
    texto = (f"Pedimos o horário de {quando[8:10]}/{quando[5:7]} às {quando[11:16]} na {destino.nome}. A clínica confirma."
             if horario else f"A {destino.nome} vai ligar para combinar o horário.")
    notificar(db, actor.usuario_id, "Encaminhamento confirmado", texto, f"referenciamento:{r.id}")
    db.flush()
    return referenciamento_json(db, r)


def recusar(db: Session, actor: Actor, ref_id: str) -> dict:
    r = _meu(db, actor, ref_id)
    r.estado, r.respondido_em = "recusado", utc_now()
    notificar(db, actor.usuario_id, "Encaminhamento recusado",
              "Tudo bem. Você continua na clínica atual. Se mudar de ideia, fale com a assistente.", f"referenciamento:{r.id}")
    db.flush()
    return referenciamento_json(db, r)
