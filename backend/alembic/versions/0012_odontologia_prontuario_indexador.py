"""odontologia: CPF, endereço e preferências, universidades, trilha, prontuário, indexador e notificações

Também converte os códigos de especialidade antigos (médicos) para os odontológicos nos dados existentes.

Revision ID: 0012
Revises: 0011
"""
import json

from alembic import op
import sqlalchemy as sa

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None

MAPA_ESPECIALIDADES = {
    "ginecologia_obstetricia": "estomatologia", "clinica_geral": "clinica_integrada", "cardiologia": "periodontia",
    "dermatologia": "dentistica", "pediatria": "odontopediatria", "ortopedia": "cirurgia",
    "oftalmologia": "protese", "saude_mental": "endodontia",
}
LISTA_VAZIA = sa.text("'[]'")


def _converter_especialidades() -> None:
    con = op.get_bind()
    for tabela in ("solicitacoes", "vagas", "cenarios", "profissionais"):
        for antigo, novo in MAPA_ESPECIALIDADES.items():
            con.execute(sa.text(f"UPDATE {tabela} SET especialidade = :novo WHERE especialidade = :antigo"),
                        {"novo": novo, "antigo": antigo})
    for cid, esp in con.execute(sa.text("SELECT id, especialidades FROM clinicas")).fetchall():
        lista = esp if isinstance(esp, list) else json.loads(esp or "[]")
        convertida = [MAPA_ESPECIALIDADES.get(e, e) for e in lista]
        if convertida != lista:
            con.execute(sa.text("UPDATE clinicas SET especialidades = :e WHERE id = :id"),
                        {"e": json.dumps(convertida), "id": cid})


def upgrade() -> None:
    # add_column simples: no SQLite, recriar tabelas com chaves estrangeiras quebraria a integridade
    op.add_column("usuarios", sa.Column("cpf_hash", sa.String(), nullable=True))
    op.add_column("usuarios", sa.Column("cpf_cifrado", sa.String(), nullable=True))
    op.create_index("uq_usuarios_cpf_hash", "usuarios", ["cpf_hash"], unique=True)

    op.add_column("clinicas", sa.Column("universidade", sa.String(), nullable=True))
    op.add_column("clinicas", sa.Column("tipo_instituicao", sa.String(), nullable=True))
    op.add_column("clinicas", sa.Column("turnos", sa.JSON(), nullable=False, server_default=LISTA_VAZIA))
    op.add_column("clinicas", sa.Column("transportes", sa.JSON(), nullable=False, server_default=LISTA_VAZIA))
    op.add_column("clinicas", sa.Column("acessivel", sa.Boolean(), nullable=True))

    op.add_column("solicitacoes", sa.Column("trilha", sa.String(), nullable=True))

    for nome, tipo in (("cep", sa.String()), ("logradouro", sa.String()), ("numero", sa.String()),
                       ("bairro", sa.String()), ("latitude", sa.Float()), ("longitude", sa.Float()),
                       ("preferencia_instituicao", sa.String()), ("distancia_max_km", sa.Float()),
                       ("modo_atendimento", sa.String())):
        op.add_column("perfis", sa.Column(nome, tipo, nullable=True))
    op.add_column("perfis", sa.Column("transportes", sa.JSON(), nullable=False, server_default=LISTA_VAZIA))
    op.add_column("perfis", sa.Column("turnos", sa.JSON(), nullable=False, server_default=LISTA_VAZIA))
    op.add_column("perfis", sa.Column("precisa_acessibilidade", sa.Boolean(), nullable=False, server_default=sa.false()))

    op.create_table(
        "prontuario_registros",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("paciente_id", sa.String(), nullable=False),
        sa.Column("clinica_id", sa.String(), nullable=False),
        sa.Column("solicitacao_id", sa.String(), nullable=True),
        sa.Column("tipo", sa.String(), nullable=False),
        sa.Column("risco_clinico", sa.String(), nullable=True),
        sa.Column("procedimentos", sa.JSON(), nullable=False),
        sa.Column("especialidades", sa.JSON(), nullable=False),
        sa.Column("conteudo_cifrado", sa.String(), nullable=False),
        sa.Column("autor_id", sa.String(), nullable=False),
        sa.Column("validado_por", sa.String(), nullable=True),
        sa.Column("validado_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["paciente_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["clinica_id"], ["clinicas.id"]),
        sa.ForeignKeyConstraint(["solicitacao_id"], ["solicitacoes.id"]),
        sa.ForeignKeyConstraint(["autor_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["validado_por"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_prontuario_registros_paciente_id", "prontuario_registros", ["paciente_id"])
    op.create_table(
        "prontuario_acessos",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("paciente_id", sa.String(), nullable=False),
        sa.Column("usuario_id", sa.String(), nullable=False),
        sa.Column("registro_id", sa.String(), nullable=True),
        sa.Column("clinica_id", sa.String(), nullable=True),
        sa.Column("acao", sa.String(), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["paciente_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["registro_id"], ["prontuario_registros.id"]),
        sa.ForeignKeyConstraint(["clinica_id"], ["clinicas.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_prontuario_acessos_paciente_id", "prontuario_acessos", ["paciente_id"])
    op.create_table(
        "escopo_didatico",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("clinica_id", sa.String(), nullable=False),
        sa.Column("semestre", sa.String(), nullable=False),
        sa.Column("especialidade", sa.String(), nullable=False),
        sa.Column("procedimento", sa.String(), nullable=False),
        sa.Column("complexidade_max", sa.Integer(), nullable=False),
        sa.Column("ativo", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["clinica_id"], ["clinicas.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_escopo_didatico_clinica_id", "escopo_didatico", ["clinica_id"])
    op.create_table(
        "decisoes_indexador",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("paciente_id", sa.String(), nullable=False),
        sa.Column("solicitacao_id", sa.String(), nullable=True),
        sa.Column("clinica_origem_id", sa.String(), nullable=False),
        sa.Column("clinica_destino_id", sa.String(), nullable=True),
        sa.Column("resultado", sa.String(), nullable=False),
        sa.Column("motivo", sa.String(), nullable=False),
        sa.Column("candidatos", sa.JSON(), nullable=False),
        sa.Column("versao_config", sa.String(), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["paciente_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["solicitacao_id"], ["solicitacoes.id"]),
        sa.ForeignKeyConstraint(["clinica_origem_id"], ["clinicas.id"]),
        sa.ForeignKeyConstraint(["clinica_destino_id"], ["clinicas.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_decisoes_indexador_paciente_id", "decisoes_indexador", ["paciente_id"])
    op.create_table(
        "referenciamentos",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("paciente_id", sa.String(), nullable=False),
        sa.Column("decisao_id", sa.String(), nullable=False),
        sa.Column("solicitacao_origem_id", sa.String(), nullable=True),
        sa.Column("solicitacao_destino_id", sa.String(), nullable=True),
        sa.Column("clinica_destino_id", sa.String(), nullable=False),
        sa.Column("vaga_id", sa.String(), nullable=True),
        sa.Column("estado", sa.String(), nullable=False),
        sa.Column("respondido_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["paciente_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["decisao_id"], ["decisoes_indexador.id"]),
        sa.ForeignKeyConstraint(["solicitacao_origem_id"], ["solicitacoes.id"]),
        sa.ForeignKeyConstraint(["solicitacao_destino_id"], ["solicitacoes.id"]),
        sa.ForeignKeyConstraint(["clinica_destino_id"], ["clinicas.id"]),
        sa.ForeignKeyConstraint(["vaga_id"], ["vagas.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_referenciamentos_paciente_id", "referenciamentos", ["paciente_id"])
    op.create_table(
        "notificacoes",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("usuario_id", sa.String(), nullable=False),
        sa.Column("canal", sa.String(), nullable=False),
        sa.Column("titulo", sa.String(), nullable=False),
        sa.Column("texto", sa.String(), nullable=False),
        sa.Column("estado", sa.String(), nullable=False),
        sa.Column("referencia", sa.String(), nullable=True),
        sa.Column("lida_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notificacoes_usuario_id", "notificacoes", ["usuario_id"])

    _converter_especialidades()


def downgrade() -> None:
    for tabela in ("notificacoes", "referenciamentos", "decisoes_indexador", "escopo_didatico",
                   "prontuario_acessos", "prontuario_registros"):
        op.drop_table(tabela)
    with op.batch_alter_table("perfis") as lote:
        for c in ("precisa_acessibilidade", "turnos", "transportes", "modo_atendimento", "distancia_max_km",
                  "preferencia_instituicao", "longitude", "latitude", "bairro", "numero", "logradouro", "cep"):
            lote.drop_column(c)
    with op.batch_alter_table("solicitacoes") as lote:
        lote.drop_column("trilha")
    with op.batch_alter_table("clinicas") as lote:
        for c in ("acessivel", "transportes", "turnos", "tipo_instituicao", "universidade"):
            lote.drop_column(c)
    op.drop_index("uq_usuarios_cpf_hash", table_name="usuarios")
    with op.batch_alter_table("usuarios") as lote:
        lote.drop_column("cpf_cifrado")
        lote.drop_column("cpf_hash")
