import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.auth import Actor
from app.core.errors import ApiError
from app.models.solicitacoes import Solicitacao
from app.models.vagas import Agendamento
from app.modulos.solicitacoes import repositorio as repo
from tests.conftest import ANA, ATEND_A, ATEND_B, CLINICA_A, CLINICA_B, EVA


def actor(db, conta):
    from app.models.usuarios import Usuario, VinculoClinica
    u = db.scalar(select(Usuario).where(Usuario.conta_demo == conta))
    v = {x.clinica_id: x.funcao for x in db.scalars(select(VinculoClinica).where(VinculoClinica.usuario_id == u.id))}
    return Actor(u.id, u.papel, u.nome_exibicao, v)


def test_paciente_ve_so_os_proprios_pedidos(db):
    ana, eva = actor(db, ANA), actor(db, EVA)
    ids_ana = {s.id for s in repo.listar(db, ana)}
    assert ids_ana and all(s.paciente_id == ana.usuario_id for s in repo.listar(db, ana))
    assert ids_ana.isdisjoint({s.id for s in repo.listar(db, eva)})


def test_funcionario_ve_so_pedidos_da_propria_clinica(db):
    a, b = actor(db, ATEND_A), actor(db, ATEND_B)
    assert all(s.clinica_id == CLINICA_A for s in repo.listar(db, a))
    assert all(s.clinica_id == CLINICA_B for s in repo.listar(db, b))
    assert repo.listar(db, a) and repo.listar(db, b)


def test_acesso_cruzado_e_404(db):
    pedido_de_b = next(s for s in repo.listar(db, actor(db, ATEND_B)))
    for intruso in (actor(db, ATEND_A), actor(db, EVA if pedido_de_b.paciente_id != actor(db, EVA).usuario_id else ANA)):
        with pytest.raises(ApiError) as e:
            repo.obter(db, intruso, pedido_de_b.id)
        assert e.value.status == 404 and e.value.codigo == "nao_encontrado"
        with pytest.raises(ApiError):
            repo.eventos(db, intruso, pedido_de_b.id)


def test_historico_de_pedido_proprio(db):
    ana = actor(db, ANA)
    pedido = repo.listar(db, ana)[0]
    evs = repo.eventos(db, ana, pedido.id)
    assert evs and evs[0].tipo == "criada" and evs[0].autor_usuario_id == ana.usuario_id


def test_vaga_nao_aceita_dois_agendamentos_ativos(db):
    base = db.scalar(select(Agendamento).where(Agendamento.estado == "agendado"))
    outro = db.scalars(select(Solicitacao).where(Solicitacao.id != base.solicitacao_id)).first()
    db.add(Agendamento(vaga_id=base.vaga_id, solicitacao_id=outro.id, paciente_id=outro.paciente_id,
                       clinica_id=base.clinica_id, estado="agendado", confirmado_por=base.confirmado_por,
                       confirmado_em=base.confirmado_em))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
