"""publico alvo em solicitacoes

Revision ID: 0004
Revises: 0003
"""
from alembic import op
import sqlalchemy as sa


revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("solicitacoes", schema=None) as batch_op:
        batch_op.add_column(sa.Column("publico_alvo", sa.String(), nullable=True))
    op.execute("""UPDATE solicitacoes
                  SET publico_alvo = CASE WHEN especialidade = 'pediatria' THEN 'criancas' ELSE 'adultos' END""")
    with op.batch_alter_table("solicitacoes", schema=None) as batch_op:
        batch_op.alter_column("publico_alvo", existing_type=sa.String(), nullable=False)


def downgrade() -> None:
    with op.batch_alter_table("solicitacoes", schema=None) as batch_op:
        batch_op.drop_column("publico_alvo")
