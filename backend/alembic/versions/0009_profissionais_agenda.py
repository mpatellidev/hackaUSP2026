"""profissionais: profissionais, agenda e Vaga.profissional_id

Revision ID: 0009
Revises: 0008
"""
from alembic import op
import sqlalchemy as sa

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "profissionais",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("clinica_id", sa.String(), nullable=False),
        sa.Column("nome_exibicao", sa.String(), nullable=False),
        sa.Column("especialidade", sa.String(), nullable=False),
        sa.Column("vinculo", sa.String(), nullable=False),
        sa.Column("ativo", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["clinica_id"], ["clinicas.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_profissionais_clinica_id", "profissionais", ["clinica_id"])
    op.create_table(
        "agenda_blocos",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("profissional_id", sa.String(), nullable=False),
        sa.Column("inicio", sa.DateTime(timezone=True), nullable=False),
        sa.Column("fim", sa.DateTime(timezone=True), nullable=False),
        sa.Column("estado", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["profissional_id"], ["profissionais.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agenda_blocos_profissional_id", "agenda_blocos", ["profissional_id"])
    with op.batch_alter_table("vagas") as lote:
        lote.add_column(sa.Column("profissional_id", sa.String(), nullable=True))
        lote.create_foreign_key("fk_vagas_profissional", "profissionais", ["profissional_id"], ["id"])


def downgrade() -> None:
    with op.batch_alter_table("vagas") as lote:
        lote.drop_constraint("fk_vagas_profissional", type_="foreignkey")
        lote.drop_column("profissional_id")
    op.drop_table("agenda_blocos")
    op.drop_table("profissionais")
