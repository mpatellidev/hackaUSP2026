"""auth: senha de demo (hash) nas contas

Revision ID: 0008
Revises: 0007
"""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("usuarios", sa.Column("senha_hash", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("usuarios") as lote:
        lote.drop_column("senha_hash")
