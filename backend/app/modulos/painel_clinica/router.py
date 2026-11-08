from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import Actor, require_funcionario
from app.core.db import get_db
from app.modulos.painel_clinica import service
from app.modulos.painel_clinica.schemas import AtualizarClinicaIn, ListaPedidosDoPainel
from app.modulos.solicitacoes import service as solicitacoes
from app.modulos.solicitacoes.schemas import ClinicaOut

router = APIRouter(tags=["painel da clínica"])


@router.get("/painel-clinica/pedidos", response_model=ListaPedidosDoPainel,
            summary="Pedidos da clínica do token, com o nome de exibição do paciente (funcionário)")
def listar_pedidos(actor: Actor = Depends(require_funcionario), db: Session = Depends(get_db)):
    itens = service.pedidos(db, actor)
    return {"itens": itens, "total": len(itens)}


@router.patch("/clinicas/{clinica_id}", response_model=ClinicaOut,
              summary="Atualizar contato e recebimento de pedidos da própria clínica (atendimento ou coordenação)")
def atualizar_clinica(clinica_id: str, body: AtualizarClinicaIn, actor: Actor = Depends(require_funcionario),
                      db: Session = Depends(get_db)):
    clinica = service.atualizar_clinica(db, actor, clinica_id, body.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(clinica)
    return solicitacoes.clinica_json(clinica)
