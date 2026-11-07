"""cenarios: cenarios academicos e interesses persistidos

Revision ID: 0006
Revises: 0005
"""
from alembic import op
import sqlalchemy as sa


revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cenarios",
        sa.Column("clinica_id", sa.String(), nullable=False),
        sa.Column("titulo", sa.String(), nullable=False),
        sa.Column("descricao_leiga", sa.String(), nullable=False),
        sa.Column("requisitos", sa.JSON(), nullable=False),
        sa.Column("publico", sa.String(), nullable=True),
        sa.Column("cidade", sa.String(), nullable=False),
        sa.Column("uf", sa.String(), nullable=False),
        sa.Column("especialidade", sa.String(), nullable=False),
        sa.Column("estado", sa.String(), nullable=False),
        sa.Column("publicado_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["clinica_id"], ["clinicas.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("cenarios", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_cenarios_clinica_id"), ["clinica_id"], unique=False)

    op.create_table(
        "cenarios_interesses",
        sa.Column("cenario_id", sa.String(), nullable=False),
        sa.Column("paciente_id", sa.String(), nullable=False),
        sa.Column("estado", sa.String(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["cenario_id"], ["cenarios.id"]),
        sa.ForeignKeyConstraint(["paciente_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cenario_id", "paciente_id"),
    )
    with op.batch_alter_table("cenarios_interesses", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_cenarios_interesses_cenario_id"), ["cenario_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("cenarios_interesses", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_cenarios_interesses_cenario_id"))
    op.drop_table("cenarios_interesses")
    with op.batch_alter_table("cenarios", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_cenarios_clinica_id"))
    op.drop_table("cenarios")
