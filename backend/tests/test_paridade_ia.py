"""Checklist automático: toda ação do painel do paciente tem uma ferramenta correspondente para a IA.

Percorre os routers do registro (app.registro.ROUTERS). Rota que exige paciente (require_paciente) e não está no mapa
ACOES_PAINEL nem em SEM_FERRAMENTA (com motivo) faz o teste falhar.
"""
from fastapi.routing import APIRoute

from app.core.auth import require_paciente
from app.modulos.acessibilidade.ferramentas import ACOES_PAINEL, SEM_FERRAMENTA, TOOLS
from app.registro import ROUTERS


def _usa(dependant, alvo) -> bool:
    return any(d.call is alvo or _usa(d, alvo) for d in dependant.dependencies)


ROTAS = [r for router in ROUTERS for r in router.routes if isinstance(r, APIRoute)]
TODAS = {(m, r.path) for r in ROTAS for m in r.methods}
DO_PACIENTE = {(m, r.path) for r in ROTAS if _usa(r.dependant, require_paciente) for m in r.methods - {"HEAD", "OPTIONS"}}


def test_o_checklist_enxerga_as_rotas():
    assert len(TODAS) > 80 and ("POST", "/solicitacoes") in DO_PACIENTE  # nunca passar "no vazio"


def test_toda_rota_exclusiva_do_paciente_tem_ferramenta_ou_motivo():
    sem_cobertura = sorted(DO_PACIENTE - set(ACOES_PAINEL) - set(SEM_FERRAMENTA))
    assert sem_cobertura == [], f"Rotas do paciente sem ferramenta para a IA: {sem_cobertura}"


def test_ferramentas_e_rotas_do_mapa_existem():
    nomes = {t["name"] for t in TOOLS}
    assert set(ACOES_PAINEL.values()) <= nomes
    assert set(ACOES_PAINEL) - TODAS == set() and set(SEM_FERRAMENTA) - TODAS == set()
