"""urgencia: relatos e avaliacoes persistidos

Revision ID: 0005
Revises: 0004
"""
from alembic import op
import sqlalchemy as sa


revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "urgencia_relatos",
        sa.Column("paciente_id", sa.String(), nullable=False),
        sa.Column("solicitacao_id", sa.String(), nullable=True),
        sa.Column("estado", sa.String(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["paciente_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["solicitacao_id"], ["solicitacoes.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("urgencia_relatos", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_urgencia_relatos_paciente_id"), ["paciente_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_urgencia_relatos_solicitacao_id"), ["solicitacao_id"], unique=False)

    op.create_table(
        "urgencia_avaliacoes",
        sa.Column("relato_id", sa.String(), nullable=False),
        sa.Column("avaliador_usuario_id", sa.String(), nullable=False),
        sa.Column("classificacao", sa.String(), nullable=False),
        sa.Column("observacao_administrativa", sa.String(), nullable=True),
        sa.Column("avaliado_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["avaliador_usuario_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["relato_id"], ["urgencia_relatos.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("relato_id"),
    )


def downgrade() -> None:
    op.drop_table("urgencia_avaliacoes")
    with op.batch_alter_table("urgencia_relatos", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_urgencia_relatos_solicitacao_id"))
        batch_op.drop_index(batch_op.f("ix_urgencia_relatos_paciente_id"))
    op.drop_table("urgencia_relatos")
