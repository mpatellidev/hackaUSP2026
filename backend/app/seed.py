"""Seed idempotente com dados 100% fictícios (lê docs/fixtures, fixtures estáveis da #1).
Uso: uv run python -m app.seed   (pode rodar várias vezes: IDs fixos, upsert por id)."""
import json

from sqlalchemy.orm import Session

from app.core.auth import hash_senha_demo
from app.core.cripto import cifrar, decifrar, hash_cpf
from app.core.config import get_settings
from app.core.db import SessionLocal
from app.core.time import parse_aware
from app.models.clinicas import Clinica
from app.models.solicitacoes import EventoSolicitacao, Solicitacao
from app.models.usuarios import Usuario, VinculoClinica
from app.modulos.alertas import seed as alertas_seed
from app.modulos.avaliacoes import seed as avaliacoes_seed
from app.modulos.cenarios import seed as cenarios_seed
from app.modulos.indexador import seed as indexador_seed
from app.modulos.perfil import seed as perfil_seed
from app.modulos.prioridade import seed as prioridade_seed
from app.modulos.profissionais import seed as profissionais_seed
from app.modulos.prontuario import seed as prontuario_seed
from app.modulos.receitas import seed as receitas_seed
from app.modulos.resumos import seed as resumos_seed
from app.modulos.urgencia import seed as urgencia_seed
from app.models.vagas import Agendamento, InteresseVaga, Vaga
from app.core.config import FIXTURES_DIR

DATA = FIXTURES_DIR


def _load(name: str) -> list[dict]:
    return json.loads((DATA / f"{name}.json").read_text(encoding="utf-8"))["itens"]


def _dt(row: dict, *keys: str) -> dict:
    return {k: parse_aware(row[k]) if row.get(k) else None for k in keys}


def run(db: Session) -> dict[str, int]:
    for r in _load("clinicas"):
        db.merge(Clinica(id=r["id"], nome=r["nome"], cidade=r["cidade"], uf=r["uf"], publico=r["publico"],
                         especialidades=r["especialidades"], custo_informado=r["custo_informado"],
                         recebendo_pedidos=r["recebendo_pedidos"], telefone=r["telefone"],
                         endereco=r.get("endereco"), bairro=r.get("bairro"), cep=r.get("cep"),
                         latitude=r.get("latitude"), longitude=r.get("longitude"), universidade=r.get("universidade"),
                         tipo_instituicao=r.get("tipo_instituicao"), turnos=r.get("turnos", []),
                         transportes=r.get("transportes", []), acessivel=r.get("acessivel"),
                         acessibilidade_info=r.get("acessibilidade_info"), como_chegar=r.get("como_chegar"),
                         valor_consulta=r.get("valor_consulta"), horarios_funcionamento=r.get("horarios_funcionamento", {}),
                         atende_urgencia=r.get("atende_urgencia", False), horario_urgencia=r.get("horario_urgencia", {})))
    usuarios_fixture = _load("usuarios")
    for r in usuarios_fixture:
        atual = db.get(Usuario, r["id"])
        cpf_cifrado = None
        if r.get("cpf"):  # cifrado novo só se mudou (Fernet muda a cada vez)
            ok = atual and atual.cpf_cifrado and decifrar(atual.cpf_cifrado) == r["cpf"]
            cpf_cifrado = atual.cpf_cifrado if ok else cifrar(r["cpf"])
        db.merge(Usuario(id=r["id"], papel=r["papel"], nome_exibicao=r["nome_exibicao"],
                         conta_demo=r["conta_demo"], email=r.get("email"), ativo=r.get("ativo", True),
                         cpf_hash=hash_cpf(r["cpf"]) if r.get("cpf") else None, cpf_cifrado=cpf_cifrado,
                         cro=r.get("cro")))
    db.flush()
    # Senha inicial (DEMO_SENHA do .env) só para os usuários das fixtures. Contas criadas pelo cadastro
    # têm senha própria e NUNCA são tocadas aqui (o iniciar.ps1 roda o seed a cada início).
    alvo = hash_senha_demo(get_settings().demo_senha)
    ids_fixture = [r["id"] for r in usuarios_fixture]
    for u in db.query(Usuario).filter(Usuario.id.in_(ids_fixture), Usuario.senha_hash.is_distinct_from(alvo)):
        u.senha_hash = alvo  # trocar DEMO_SENHA e rodar o seed de novo atualiza a senha inicial
    for r in _load("vinculos"):
        db.merge(VinculoClinica(id=r["id"], usuario_id=r["usuario_id"], clinica_id=r["clinica_id"], funcao=r["funcao"]))
    for r in sorted(_load("solicitacoes"), key=lambda x: x["criado_em"]):
        db.merge(Solicitacao(id=r["id"], paciente_id=r["paciente_id"], clinica_id=r["clinica_id"], estado=r["estado"],
                             especialidade=r["especialidade"], publico_alvo=r["publico_alvo"],
                             descricao_administrativa=r["descricao_administrativa"],
                             solicitacao_origem_id=r["solicitacao_origem_id"], **_dt(r, "criado_em", "atualizado_em")))
        db.flush()
    for r in _load("eventos"):
        db.merge(EventoSolicitacao(id=r["id"], solicitacao_id=r["solicitacao_id"], tipo=r["tipo"],
                                   estado_anterior=r["estado_anterior"], estado_novo=r["estado_novo"],
                                   autor_usuario_id=r["autor_usuario_id"], autor_papel=r["autor_papel"],
                                   motivo=r["motivo"], **_dt(r, "criado_em")))
    contagens: dict[str, int] = profissionais_seed.run(db)  # antes das vagas: Vaga.profissional_id
    for r in _load("vagas"):
        db.merge(Vaga(id=r["id"], clinica_id=r["clinica_id"], especialidade=r["especialidade"], estado=r["estado"],
                      criado_por=r["criado_por"], profissional_id=r.get("profissional_id"),
                      **_dt(r, "inicio", "fim", "criado_em")))
    db.flush()
    for r in _load("interesses"):
        db.merge(InteresseVaga(id=r["id"], vaga_id=r["vaga_id"], solicitacao_id=r["solicitacao_id"],
                               paciente_id=r["paciente_id"], estado=r["estado"], **_dt(r, "criado_em")))
    for r in _load("agendamentos"):
        db.merge(Agendamento(id=r["id"], vaga_id=r["vaga_id"], solicitacao_id=r["solicitacao_id"],
                             paciente_id=r["paciente_id"], clinica_id=r["clinica_id"], estado=r["estado"],
                             desfecho=r.get("desfecho", "pendente"), confirmado_por=r["confirmado_por"], **_dt(r, "confirmado_em")))
    db.commit()
    for modulo in (prioridade_seed, urgencia_seed, cenarios_seed, perfil_seed, avaliacoes_seed, alertas_seed, resumos_seed,
                   indexador_seed, prontuario_seed, receitas_seed):  # ordem: dependem dos dados acima
        contagens |= modulo.run(db)
    return contagens | {m.__tablename__: db.query(m).count()
            for m in (Clinica, Usuario, VinculoClinica, Solicitacao, EventoSolicitacao, Vaga, InteresseVaga, Agendamento)}


if __name__ == "__main__":
    with SessionLocal() as s:
        for tabela, n in run(s).items():
            print(f"{tabela}: {n}")
