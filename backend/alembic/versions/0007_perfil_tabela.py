"""perfil: perfil do paciente (cidade, contato, renda opcional, acessibilidade)

Revision ID: 0007
Revises: 0006
"""
from alembic import op
import sqlalchemy as sa


revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "perfis",
        sa.Column("usuario_id", sa.String(), nullable=False),
        sa.Column("cidade", sa.String(), nullable=True),
        sa.Column("uf", sa.String(), nullable=True),
        sa.Column("contato_preferido", sa.String(), nullable=True),
        sa.Column("socioeconomico", sa.JSON(), nullable=False),
        sa.Column("acessibilidade", sa.JSON(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("usuario_id"),
    )


def downgrade() -> None:
    op.drop_table("perfis")
