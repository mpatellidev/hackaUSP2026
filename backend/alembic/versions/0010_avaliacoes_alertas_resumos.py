"""avaliacoes, alertas e resumos compartilháveis (demo)

Revision ID: 0010
Revises: 0009
"""
from alembic import op
import sqlalchemy as sa

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "avaliacoes_clinica",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("clinica_id", sa.String(), nullable=False),
        sa.Column("paciente_id", sa.String(), nullable=False),
        sa.Column("solicitacao_id", sa.String(), nullable=False),
        sa.Column("nota", sa.Integer(), nullable=False),
        sa.Column("comentario", sa.String(), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["clinica_id"], ["clinicas.id"]),
        sa.ForeignKeyConstraint(["paciente_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["solicitacao_id"], ["solicitacoes.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("solicitacao_id"),
    )
    op.create_index("ix_avaliacoes_clinica_clinica_id", "avaliacoes_clinica", ["clinica_id"])
    op.create_table(
        "alertas_preferencia",
        sa.Column("usuario_id", sa.String(), nullable=False),
        sa.Column("receber", sa.Boolean(), nullable=False),
        sa.Column("ligacao", sa.Boolean(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("usuario_id"),
    )
    op.create_table(
        "alertas",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("paciente_id", sa.String(), nullable=False),
        sa.Column("vaga_id", sa.String(), nullable=False),
        sa.Column("clinica_id", sa.String(), nullable=False),
        sa.Column("evento_origem", sa.String(), nullable=False),
        sa.Column("lido", sa.Boolean(), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["paciente_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["vaga_id"], ["vagas.id"]),
        sa.ForeignKeyConstraint(["clinica_id"], ["clinicas.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("paciente_id", "vaga_id"),
    )
    op.create_index("ix_alertas_paciente_id", "alertas", ["paciente_id"])
    op.create_table(
        "resumos",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("paciente_id", sa.String(), nullable=False),
        sa.Column("clinica_autora_id", sa.String(), nullable=False),
        sa.Column("campos", sa.JSON(), nullable=False),
        sa.Column("criado_por", sa.String(), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["paciente_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["clinica_autora_id"], ["clinicas.id"]),
        sa.ForeignKeyConstraint(["criado_por"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_resumos_paciente_id", "resumos", ["paciente_id"])
    op.create_table(
        "resumos_compartilhamentos",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("resumo_id", sa.String(), nullable=False),
        sa.Column("clinica_destino_id", sa.String(), nullable=False),
        sa.Column("campos_compartilhados", sa.JSON(), nullable=False),
        sa.Column("finalidade", sa.String(), nullable=False),
        sa.Column("aceite", sa.String(), nullable=False),
        sa.Column("aceito_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revogado_em", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["resumo_id"], ["resumos.id"]),
        sa.ForeignKeyConstraint(["clinica_destino_id"], ["clinicas.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_resumos_compartilhamentos_resumo_id", "resumos_compartilhamentos", ["resumo_id"])
    op.create_index("ix_resumos_compartilhamentos_clinica_destino_id", "resumos_compartilhamentos", ["clinica_destino_id"])
    op.create_table(
        "resumos_eventos_acesso",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("resumo_id", sa.String(), nullable=False),
        sa.Column("usuario_id", sa.String(), nullable=False),
        sa.Column("clinica_id", sa.String(), nullable=True),
        sa.Column("tipo", sa.String(), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["resumo_id"], ["resumos.id"]),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["clinica_id"], ["clinicas.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_resumos_eventos_acesso_resumo_id", "resumos_eventos_acesso", ["resumo_id"])


def downgrade() -> None:
    for tabela in ("resumos_eventos_acesso", "resumos_compartilhamentos", "resumos", "alertas", "alertas_preferencia",
                   "avaliacoes_clinica"):
        op.drop_table(tabela)
