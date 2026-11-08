"""receitas, clínicas (valor, funcionamento, urgência), CRO e dados sensíveis do perfil

Revision ID: 0013
Revises: 0012
"""
from alembic import op
import sqlalchemy as sa

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None

OBJ_VAZIO = sa.text("'{}'")


def upgrade() -> None:
    for nome, tipo in (("acessibilidade_info", sa.String()), ("como_chegar", sa.String()), ("valor_consulta", sa.Float())):
        op.add_column("clinicas", sa.Column(nome, tipo, nullable=True))
    op.add_column("clinicas", sa.Column("horarios_funcionamento", sa.JSON(), nullable=False, server_default=OBJ_VAZIO))
    op.add_column("clinicas", sa.Column("atende_urgencia", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("clinicas", sa.Column("horario_urgencia", sa.JSON(), nullable=False, server_default=OBJ_VAZIO))
    op.add_column("usuarios", sa.Column("cro", sa.String(), nullable=True))
    op.add_column("perfis", sa.Column("possui_deficiencia", sa.Boolean(), nullable=True))
    op.add_column("perfis", sa.Column("tipo_deficiencia", sa.String(), nullable=True))
    op.add_column("perfis", sa.Column("consentimento_sensivel_em", sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        "receitas",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("paciente_id", sa.String(), nullable=False),
        sa.Column("clinica_id", sa.String(), nullable=False),
        sa.Column("solicitacao_id", sa.String(), nullable=True),
        sa.Column("agendamento_id", sa.String(), nullable=True),
        sa.Column("instituicao", sa.String(), nullable=False),
        sa.Column("conteudo_cifrado", sa.String(), nullable=False),
        sa.Column("autor_id", sa.String(), nullable=False),
        sa.Column("estado", sa.String(), nullable=False),
        sa.Column("assinado_por", sa.String(), nullable=True),
        sa.Column("assinante_nome", sa.String(), nullable=True),
        sa.Column("assinante_cro", sa.String(), nullable=True),
        sa.Column("assinado_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["paciente_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["clinica_id"], ["clinicas.id"]),
        sa.ForeignKeyConstraint(["solicitacao_id"], ["solicitacoes.id"]),
        sa.ForeignKeyConstraint(["agendamento_id"], ["agendamentos.id"]),
        sa.ForeignKeyConstraint(["autor_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["assinado_por"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_receitas_paciente_id", "receitas", ["paciente_id"])


def downgrade() -> None:
    op.drop_table("receitas")
    with op.batch_alter_table("perfis") as lote:
        for c in ("consentimento_sensivel_em", "tipo_deficiencia", "possui_deficiencia"):
            lote.drop_column(c)
    with op.batch_alter_table("usuarios") as lote:
        lote.drop_column("cro")
    with op.batch_alter_table("clinicas") as lote:
        for c in ("horario_urgencia", "atende_urgencia", "horarios_funcionamento", "valor_consulta", "como_chegar",
                  "acessibilidade_info"):
            lote.drop_column(c)
