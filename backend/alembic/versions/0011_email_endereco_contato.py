"""login por e-mail, endereço e coordenadas das clínicas, contato do pedido

Revision ID: 0011
Revises: 0010
"""
from alembic import op
import sqlalchemy as sa

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None

COLUNAS_CLINICA = (("endereco", sa.String()), ("bairro", sa.String()), ("cep", sa.String()),
                   ("latitude", sa.Float()), ("longitude", sa.Float()))
COLUNAS_PEDIDO = ("para_quem", "nome_paciente", "telefone_contato")


def upgrade() -> None:
    # add_column simples (sem recriar tabela): no SQLite, recriar "usuarios" quebraria as chaves estrangeiras
    op.add_column("usuarios", sa.Column("email", sa.String(), nullable=True))
    op.create_index("uq_usuarios_email", "usuarios", ["email"], unique=True)
    for nome, tipo in COLUNAS_CLINICA:
        op.add_column("clinicas", sa.Column(nome, tipo, nullable=True))
    for nome in COLUNAS_PEDIDO:
        op.add_column("solicitacoes", sa.Column(nome, sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("solicitacoes") as lote:
        for nome in COLUNAS_PEDIDO:
            lote.drop_column(nome)
    with op.batch_alter_table("clinicas") as lote:
        for nome, _ in COLUNAS_CLINICA:
            lote.drop_column(nome)
    op.drop_index("uq_usuarios_email", table_name="usuarios")
    with op.batch_alter_table("usuarios") as lote:
        lote.drop_column("email")
