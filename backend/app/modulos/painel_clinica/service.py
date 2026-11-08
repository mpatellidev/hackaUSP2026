from sqlalchemy.orm import Session

from app.core.auth import Actor
from app.core.errors import acesso_negado, nao_encontrado
from app.models.clinicas import Clinica
from app.models.usuarios import Usuario
from app.modulos.solicitacoes import repositorio as repo_solicitacoes
from app.modulos.solicitacoes import service as solicitacoes

# Mesma regra do cadastro de profissionais: recepção e coordenação cuidam dos dados da unidade.
FUNCOES_QUE_EDITAM = ("atendimento", "coordenacao")


def pedidos(db: Session, actor: Actor) -> list[dict]:
    """Pedidos no escopo do token (reaproveita a listagem de solicitações) com o nome de exibição do paciente."""
    nomes: dict[str, str] = {}
    itens = []
    for s in repo_solicitacoes.listar(db, actor):
        if s.paciente_id not in nomes:
            usuario = db.get(Usuario, s.paciente_id)
            nomes[s.paciente_id] = usuario.nome_exibicao if usuario else "Paciente"
        itens.append({**solicitacoes.solicitacao_json(s), "paciente_nome_exibicao": nomes[s.paciente_id]})
    return itens


def atualizar_clinica(db: Session, actor: Actor, clinica_id: str, campos: dict) -> Clinica:
    if not actor.pode_na_clinica(clinica_id):
        raise nao_encontrado()
    if not actor.tem_funcao(clinica_id, *FUNCOES_QUE_EDITAM):
        raise acesso_negado("Só a recepção (atendimento) ou a coordenação podem alterar os dados da clínica.")
    clinica = solicitacoes.obter_clinica(db, clinica_id)
    for campo, valor in campos.items():
        setattr(clinica, campo, valor.strip() if isinstance(valor, str) else valor)
    return clinica
