"""Endpoints de cenários acadêmicos (contrato §9.1). Prefixo /api/v1 é aplicado por quem monta o app."""
from datetime import timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query, Response

from . import service
from .deps import Sessao, exigir_coordenacao, exigir_funcionario, exigir_paciente, obter_sessao
from .erros import nao_encontrado
from .models import Cenario, InteresseCenario
from .schemas import (CenarioAtualizar, CenarioCriar, CenarioSaida, CompatibilidadeAcademica,
                      InteresseSaida, ListaCenarios, ListaInteresses)

router = APIRouter(prefix="/cenarios", tags=["cenarios"])

_BRT = timezone(timedelta(hours=-3))  # America/Sao_Paulo (sem horário de verão atual)
_VAZIO_PACIENTE = ("Nenhum cenário ativo encontrado para esse filtro. Tente outra cidade ou área, "
                   "ou volte mais tarde.")
_VAZIO_CLINICA = "Sua clínica ainda não publicou cenários."


def _saida(c: Cenario, meu_interesse: Optional[str] = None) -> CenarioSaida:
    return CenarioSaida(**{**c.__dict__, "publicado_em": c.publicado_em.astimezone(_BRT)},
                        meu_interesse=meu_interesse)


def _saida_interesse(i: InteresseCenario) -> InteresseSaida:
    return InteresseSaida(id=i.id, cenario_id=i.cenario_id, paciente_id=i.paciente_id,
                          estado=i.estado, criado_em=i.criado_em.astimezone(_BRT))


def _cenario_visivel(cenario_id: str, s: Sessao) -> Cenario:
    """Paciente enxerga só ativos; funcionário só os da própria clínica. Fora disso: 404."""
    c = service.repo.obter(cenario_id)
    if c is None:
        raise nao_encontrado()
    if s.papel == "paciente" and c.estado != "ativo":
        raise nao_encontrado()
    if s.papel == "funcionario" and c.clinica_id != s.clinica_id:
        raise nao_encontrado()
    return c


@router.get("", response_model=ListaCenarios)
def listar(cidade: Optional[str] = Query(None), interesse: Optional[str] = Query(None),
           s: Sessao = Depends(obter_sessao)):
    if s.papel == "paciente":
        itens = service.repo.listar(somente_ativos=True, cidade=cidade, interesse=interesse)
        saida = []
        for c in itens:
            i = service.repo.interesse_do_paciente(c.id, s.usuario_id)
            saida.append(_saida(c, i.estado if i else None))
        vazio = _VAZIO_PACIENTE
    else:
        exigir_funcionario(s)
        itens = service.repo.listar(clinica_id=s.clinica_id, cidade=cidade, interesse=interesse)
        saida, vazio = [_saida(c) for c in itens], _VAZIO_CLINICA
    return ListaCenarios(itens=saida, total=len(saida), mensagem_vazia=None if saida else vazio)


@router.post("", response_model=CenarioSaida, status_code=201)
def criar(corpo: CenarioCriar, s: Sessao = Depends(obter_sessao)):
    exigir_coordenacao(s)
    return _saida(service.repo.criar(s.clinica_id, corpo.model_dump()))


# Antes de /{cenario_id} para não ser capturado como ID.
@router.get("/compatibilidade", response_model=CompatibilidadeAcademica)
def compatibilidade(paciente_id: str = Query(...), especialidade: Optional[str] = Query(None),
                    s: Sessao = Depends(obter_sessao)):
    """Sinal de entrada para o score (#13), limitado à clínica do funcionário. Sem prioridade clínica."""
    exigir_funcionario(s)
    return service.compatibilidade_academica(paciente_id, s.clinica_id, especialidade)


@router.get("/{cenario_id}", response_model=CenarioSaida)
def obter(cenario_id: str, s: Sessao = Depends(obter_sessao)):
    c = _cenario_visivel(cenario_id, s)
    i = service.repo.interesse_do_paciente(c.id, s.usuario_id) if s.papel == "paciente" else None
    return _saida(c, i.estado if i else None)


@router.patch("/{cenario_id}", response_model=CenarioSaida)
def atualizar(cenario_id: str, corpo: CenarioAtualizar, s: Sessao = Depends(obter_sessao)):
    exigir_coordenacao(s)
    c = _cenario_visivel(cenario_id, s)
    return _saida(service.repo.atualizar(c, corpo.model_dump(exclude_unset=True, exclude_none=True)))


@router.post("/{cenario_id}/interesses", response_model=InteresseSaida, status_code=201)
def registrar_interesse(cenario_id: str, resposta: Response, s: Sessao = Depends(obter_sessao)):
    exigir_paciente(s)
    c = _cenario_visivel(cenario_id, s)
    i, criado = service.repo.registrar_interesse(c.id, s.usuario_id)
    if not criado:
        resposta.status_code = 200  # repetir é idempotente
    return _saida_interesse(i)


@router.delete("/{cenario_id}/interesses", response_model=InteresseSaida)
def retirar_interesse(cenario_id: str, s: Sessao = Depends(obter_sessao)):
    exigir_paciente(s)
    c = service.repo.obter(cenario_id)  # retirar vale mesmo se o cenário foi pausado depois
    i = service.repo.retirar_interesse(c.id, s.usuario_id) if c else None
    if i is None:
        raise nao_encontrado()
    return _saida_interesse(i)


@router.get("/{cenario_id}/interesses", response_model=ListaInteresses)
def listar_interesses(cenario_id: str, s: Sessao = Depends(obter_sessao)):
    exigir_funcionario(s)
    c = _cenario_visivel(cenario_id, s)
    itens = [_saida_interesse(i) for i in service.repo.interesses_do_cenario(c.id)]
    return ListaInteresses(itens=itens, total=len(itens))
