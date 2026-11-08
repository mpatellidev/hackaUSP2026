from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth import Actor, require_paciente
from app.core.db import get_db
from app.core.time import utc_now
from app.models.clinicas import Clinica
from app.models.vagas import Vaga
from app.modulos.perfil.models import PerfilUsuario
from app.modulos.ranqueamento import service
from app.modulos.solicitacoes import service as solicitacoes
from app.modulos.solicitacoes.schemas import ClinicaOut

router = APIRouter(tags=["ranqueamento"])

AVISO = "Sugestão automática para ajudar na escolha. Você escolhe a clínica; a clínica analisa e confirma."


class SugestaoOut(BaseModel):
    clinica: ClinicaOut
    pontos: float
    distancia_km: float | None
    motivos: list[str]
    criterios: dict[str, float]


class SugestoesOut(BaseModel):
    itens: list[SugestaoOut]
    total: int
    usou_localizacao: bool
    versao_config: str
    aviso: str


def candidatas(db: Session, especialidade: str | None) -> list[service.Candidata]:
    agora = utc_now()
    q = select(Vaga.clinica_id, func.count()).where(Vaga.estado == "aberta", Vaga.inicio > agora)
    if especialidade:
        q = q.where(Vaga.especialidade == especialidade)
    livres = dict(db.execute(q.group_by(Vaga.clinica_id)).all())
    return [service.Candidata(
        clinica_id=c.id, nome=c.nome, recebendo_pedidos=c.recebendo_pedidos, especialidades=tuple(c.especialidades),
        latitude=c.latitude, longitude=c.longitude, tipo_instituicao=c.tipo_instituicao,
        transportes=tuple(c.transportes or []), turnos=tuple(c.turnos or []), acessivel=c.acessivel,
        horarios_livres=livres.get(c.id, 0)) for c in db.scalars(select(Clinica))]


def preferencias_do_paciente(db: Session, paciente_id: str, lat: float | None = None,
                             lng: float | None = None) -> service.Preferencias:
    p = db.get(PerfilUsuario, paciente_id)
    return service.Preferencias(
        latitude=lat if lat is not None else (p.latitude if p else None),
        longitude=lng if lng is not None else (p.longitude if p else None),
        preferencia_instituicao=p.preferencia_instituicao if p else None,
        distancia_max_km=p.distancia_max_km if p else None,
        transportes=tuple(p.transportes or []) if p else (), turnos=tuple(p.turnos or []) if p else (),
        precisa_acessibilidade=bool(p and p.precisa_acessibilidade))


@router.get("/universidades/sugestoes", response_model=SugestoesOut,
            summary="Clínicas-escola sugeridas para mim (distância, preferência, transporte, turno e vagas)")
def sugestoes(especialidade: str | None = Query(default=None, max_length=80),
              lat: float | None = Query(default=None, ge=-90, le=90), lng: float | None = Query(default=None, ge=-180, le=180),
              actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    prefs = preferencias_do_paciente(db, actor.usuario_id, lat, lng)
    resultados = service.ranquear(prefs, candidatas(db, especialidade), especialidade)
    clinicas = {c.id: c for c in db.scalars(select(Clinica))}
    itens = [{"clinica": {**solicitacoes.clinica_json(clinicas[r.clinica_id]), "distancia_km": r.distancia_km},
              "pontos": r.pontos, "distancia_km": r.distancia_km, "motivos": r.motivos, "criterios": r.criterios}
             for r in resultados]
    return {"itens": itens, "total": len(itens), "usou_localizacao": prefs.latitude is not None,
            "versao_config": service.config()["versao"], "aviso": AVISO}


class HorarioProximoOut(BaseModel):
    vaga_id: str
    especialidade: str
    inicio: str


class ComparacaoItemOut(BaseModel):
    clinica: ClinicaOut
    distancia_km: float | None
    proximos_horarios: list[HorarioProximoOut]


class ComparacaoOut(BaseModel):
    itens: list[ComparacaoItemOut]
    total: int
    usou_localizacao: bool


@router.get("/clinicas-comparacao", response_model=ComparacaoOut,
            summary="Comparar clínicas: distância até o paciente, valor, tipo, especialidades e próximos horários livres")
def comparacao(lat: float | None = Query(default=None, ge=-90, le=90), lng: float | None = Query(default=None, ge=-180, le=180),
               actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    from app.core.time import to_sp_iso
    from app.modulos.solicitacoes.localizacao import distancia_km
    prefs = preferencias_do_paciente(db, actor.usuario_id, lat, lng)
    agora = utc_now()
    itens = []
    for c in db.scalars(select(Clinica).where(Clinica.recebendo_pedidos.is_(True)).order_by(Clinica.nome)):
        km = (round(distancia_km(prefs.latitude, prefs.longitude, c.latitude, c.longitude), 1)
              if None not in (prefs.latitude, prefs.longitude, c.latitude, c.longitude) else None)
        vagas = db.scalars(select(Vaga).where(Vaga.clinica_id == c.id, Vaga.estado == "aberta", Vaga.inicio > agora)
                           .order_by(Vaga.inicio).limit(3))
        itens.append({"clinica": {**solicitacoes.clinica_json(c), "distancia_km": km}, "distancia_km": km,
                      "proximos_horarios": [{"vaga_id": v.id, "especialidade": v.especialidade, "inicio": to_sp_iso(v.inicio)} for v in vagas]})
    return {"itens": itens, "total": len(itens), "usou_localizacao": prefs.latitude is not None}
