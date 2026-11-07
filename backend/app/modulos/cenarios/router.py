"""Endpoints de cenários acadêmicos (contrato §9.1). Prefixo /api/v1 é aplicado em app/main.py."""
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.auth import Actor, get_actor
from app.core.db import get_db
from app.core.errors import acesso_negado, nao_encontrado
from app.core.time import to_sp
from app.modulos.cenarios import service
from app.modulos.cenarios.models import Cenario, InteresseCenario
from app.modulos.cenarios.repositorio import RepositorioCenarios
from app.modulos.cenarios.schemas import (CenarioAtualizar, CenarioCriar, CenarioSaida, CompatibilidadeAcademica,
                                          InteresseSaida, ListaCenarios, ListaInteresses)

router = APIRouter(prefix="/cenarios", tags=["cenarios"])

_VAZIO_PACIENTE = ("Nenhum cenário ativo encontrado para esse filtro. Tente outra cidade ou área, "
                   "ou volte mais tarde.")
_VAZIO_CLINICA = "Sua clínica ainda não publicou cenários."


def obter_repo(db: Session = Depends(get_db)) -> RepositorioCenarios:
    return RepositorioCenarios(db)


def _saida(c: Cenario, meu_interesse: str | None = None) -> CenarioSaida:
    return CenarioSaida(
        id=c.id, clinica_id=c.clinica_id, titulo=c.titulo, descricao_leiga=c.descricao_leiga,
        requisitos=c.requisitos, publico=c.publico, cidade=c.cidade, uf=c.uf, especialidade=c.especialidade,
        estado=c.estado, publicado_em=to_sp(c.publicado_em), meu_interesse=meu_interesse)


def _saida_interesse(i: InteresseCenario) -> InteresseSaida:
    return InteresseSaida(id=i.id, cenario_id=i.cenario_id, paciente_id=i.paciente_id,
                          estado=i.estado, criado_em=to_sp(i.criado_em))


@router.get("", response_model=ListaCenarios)
def listar(cidade: str | None = Query(None), interesse: str | None = Query(None),
           actor: Actor = Depends(get_actor), repo: RepositorioCenarios = Depends(obter_repo)):
    if actor.papel == "paciente":
        itens = repo.listar(somente_ativos=True, cidade=cidade, interesse=interesse)
        saida = []
        for c in itens:
            i = repo.interesse_do_paciente(c.id, actor.usuario_id)
            saida.append(_saida(c, i.estado if i else None))
        vazio = _VAZIO_PACIENTE
    else:
        service.exigir_funcionario(actor)
        itens = repo.listar(clinica_ids=actor.clinica_ids, cidade=cidade, interesse=interesse)
        saida, vazio = [_saida(c) for c in itens], _VAZIO_CLINICA
    return ListaCenarios(itens=saida, total=len(saida), mensagem_vazia=None if saida else vazio)


@router.post("", response_model=CenarioSaida, status_code=201)
def criar(corpo: CenarioCriar, actor: Actor = Depends(get_actor), repo: RepositorioCenarios = Depends(obter_repo)):
    clinica_id = service.clinica_da_coordenacao(actor)
    saida = _saida(repo.criar(clinica_id, corpo.model_dump()))
    repo.db.commit()
    return saida


# Antes de /{cenario_id} para não ser capturado como ID.
@router.get("/compatibilidade", response_model=CompatibilidadeAcademica)
def compatibilidade(paciente_id: str = Query(...), especialidade: str | None = Query(None),
                    actor: Actor = Depends(get_actor), repo: RepositorioCenarios = Depends(obter_repo)):
    """Sinal de entrada para o score (#13), limitado às clínicas do funcionário. Sem prioridade clínica."""
    service.exigir_funcionario(actor)
    return service.compatibilidade_academica(repo, paciente_id, actor.clinica_ids, especialidade)


@router.get("/{cenario_id}", response_model=CenarioSaida)
def obter(cenario_id: str, actor: Actor = Depends(get_actor), repo: RepositorioCenarios = Depends(obter_repo)):
    c = service.cenario_visivel(repo, actor, cenario_id)
    i = repo.interesse_do_paciente(c.id, actor.usuario_id) if actor.papel == "paciente" else None
    return _saida(c, i.estado if i else None)


@router.patch("/{cenario_id}", response_model=CenarioSaida)
def atualizar(cenario_id: str, corpo: CenarioAtualizar, actor: Actor = Depends(get_actor),
              repo: RepositorioCenarios = Depends(obter_repo)):
    service.clinica_da_coordenacao(actor)
    c = service.cenario_visivel(repo, actor, cenario_id)
    if not actor.tem_funcao(c.clinica_id, "coordenacao"):
        raise acesso_negado("Apenas a coordenação da clínica gerencia cenários.")
    saida = _saida(repo.atualizar(c, corpo.model_dump(exclude_unset=True, exclude_none=True)))
    repo.db.commit()
    return saida


@router.post("/{cenario_id}/interesses", response_model=InteresseSaida, status_code=201)
def registrar_interesse(cenario_id: str, resposta: Response, actor: Actor = Depends(get_actor),
                        repo: RepositorioCenarios = Depends(obter_repo)):
    service.exigir_paciente(actor)
    c = service.cenario_visivel(repo, actor, cenario_id)
    i, criado = repo.registrar_interesse(c.id, actor.usuario_id)
    repo.db.commit()
    if not criado:
        resposta.status_code = 200  # repetir é idempotente
    return _saida_interesse(i)


@router.delete("/{cenario_id}/interesses", response_model=InteresseSaida)
def retirar_interesse(cenario_id: str, actor: Actor = Depends(get_actor),
                      repo: RepositorioCenarios = Depends(obter_repo)):
    service.exigir_paciente(actor)
    c = repo.obter(cenario_id)  # retirar vale mesmo se o cenário foi pausado depois
    i = repo.retirar_interesse(c.id, actor.usuario_id) if c else None
    if i is None:
        raise nao_encontrado("Não encontramos este cenário.")
    repo.db.commit()
    return _saida_interesse(i)


@router.get("/{cenario_id}/interesses", response_model=ListaInteresses)
def listar_interesses(cenario_id: str, actor: Actor = Depends(get_actor),
                      repo: RepositorioCenarios = Depends(obter_repo)):
    service.exigir_funcionario(actor)
    c = service.cenario_visivel(repo, actor, cenario_id)
    itens = [_saida_interesse(i) for i in repo.interesses_do_cenario(c.id)]
    return ListaInteresses(itens=itens, total=len(itens))
