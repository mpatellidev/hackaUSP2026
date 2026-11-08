from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth import Actor, require_paciente
from app.core.db import get_db
from app.modulos.indexador import service
from app.modulos.solicitacoes.schemas import ClinicaOut

router = APIRouter(tags=["referenciamento"])

AVISO = ("O encaminhamento só vale depois que você confirma. Ao confirmar, você autoriza a nova clínica a ver o "
         "diagnóstico já feito, para não repetir exames.")


class CandidatoOut(BaseModel):
    nome: str
    apta: bool
    pontos: float | None
    motivo: str | None


class ReferenciamentoOut(BaseModel):
    id: str
    estado: str
    clinica_destino: ClinicaOut
    clinica_origem_nome: str | None
    horario_inicio: str | None
    motivo: str
    motivo_simples: str
    candidatos: list[CandidatoOut]
    solicitacao_destino_id: str | None
    criado_em: str
    respondido_em: str | None


class ListaReferenciamentos(BaseModel):
    itens: list[ReferenciamentoOut]
    total: int
    aviso: str


@router.get("/referenciamentos", response_model=ListaReferenciamentos, summary="Meus encaminhamentos para outra clínica")
def meus(actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    itens = service.listar(db, actor.usuario_id)
    return {"itens": itens, "total": len(itens), "aviso": AVISO}


@router.post("/referenciamentos/{ref_id}/aceitar", response_model=ReferenciamentoOut,
             summary="Confirmar o encaminhamento (consente levar o diagnóstico)")
def aceitar(ref_id: str, actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    saida = service.aceitar(db, actor, ref_id)
    db.commit()
    return saida


@router.post("/referenciamentos/{ref_id}/recusar", response_model=ReferenciamentoOut, summary="Recusar o encaminhamento")
def recusar(ref_id: str, actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    saida = service.recusar(db, actor, ref_id)
    db.commit()
    return saida
