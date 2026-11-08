"""Emergência odontológica declarada pelo paciente. NÃO cria agendamento: mostra a clínica de urgência ABERTA mais
próxima (e 2 ou 3 alternativas), com telefone e rota. Sinais graves: pronto-socorro ou SAMU 192 (texto fixo)."""
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import Actor, require_paciente
from app.core.db import get_db
from app.core.time import utc_now
from app.models.clinicas import Clinica
from app.modulos.perfil.models import PerfilUsuario
from app.modulos.solicitacoes import service as solicitacoes
from app.modulos.solicitacoes.localizacao import distancia_km
from app.modulos.solicitacoes.schemas import ClinicaOut

router = APIRouter(tags=["emergência"])
FUSO = ZoneInfo("America/Sao_Paulo")
DIAS = ("seg", "ter", "qua", "qui", "sex", "sab", "dom")
SINAIS_GRAVES = [
    "Sangramento que não para",
    "Inchaço no rosto ou no pescoço que dificulta respirar ou engolir",
    "Febre alta junto com a dor ou o inchaço",
    "Pancada forte no rosto, com desmaio ou confusão",
]
ORIENTACAO_GRAVE = "Se tiver algum desses sinais, vá agora a um pronto-socorro ou ligue 192 (SAMU). Não espere a clínica."


def aberta(horario: dict, agora: datetime) -> tuple[bool, str | None]:
    """(aberta agora, fecha às) no horário de São Paulo. "24:00" = até a meia-noite."""
    local = agora.astimezone(FUSO)
    faixa = (horario or {}).get(DIAS[local.weekday()])
    if not faixa:
        return False, None
    abre, fecha = faixa
    hhmm = local.strftime("%H:%M")
    return abre <= hhmm < fecha, fecha


def clinicas_abertas(db: Session, lat: float | None, lng: float | None, agora: datetime) -> list[dict]:
    saida = []
    for c in db.scalars(select(Clinica).where(Clinica.atende_urgencia.is_(True))):
        ok, fecha = aberta(c.horario_urgencia, agora)
        if not ok:
            continue
        km = round(distancia_km(lat, lng, c.latitude, c.longitude), 1) if None not in (lat, lng, c.latitude, c.longitude) else None
        saida.append({"clinica": {**solicitacoes.clinica_json(c), "distancia_km": km}, "distancia_km": km,
                      "aberta_ate": "24 horas" if fecha == "24:00" else fecha})
    return sorted(saida, key=lambda x: (x["distancia_km"] is None, x["distancia_km"] or 0, x["clinica"]["nome"]))


class UrgenciaAbertaOut(BaseModel):
    clinica: ClinicaOut
    distancia_km: float | None
    aberta_ate: str | None


class EmergenciaOut(BaseModel):
    principal: UrgenciaAbertaOut | None
    alternativas: list[UrgenciaAbertaOut]
    usou_localizacao: bool
    sinais_graves: list[str]
    orientacao_grave: str
    samu: str
    aviso: str


@router.get("/emergencia", response_model=EmergenciaOut,
            summary="Emergência: clínica de urgência aberta mais próxima (não cria agendamento)")
def emergencia(lat: float | None = Query(default=None, ge=-90, le=90), lng: float | None = Query(default=None, ge=-180, le=180),
               actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    if lat is None or lng is None:
        p = db.get(PerfilUsuario, actor.usuario_id)
        lat, lng = (p.latitude, p.longitude) if p else (None, None)
    lista = clinicas_abertas(db, lat, lng, utc_now())
    return {"principal": lista[0] if lista else None, "alternativas": lista[1:4], "usou_localizacao": lat is not None,
            "sinais_graves": SINAIS_GRAVES, "orientacao_grave": ORIENTACAO_GRAVE, "samu": "192",
            "aviso": "Isto não marca consulta. Ligue antes de ir, se puder. Só aparecem clínicas abertas agora com urgência."
            if lista else "Nenhuma clínica parceira de urgência está aberta agora. Procure um pronto-socorro ou ligue 192 (SAMU)."}
