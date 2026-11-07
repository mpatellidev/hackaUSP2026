"""Acesso ao banco do módulo de cenários (filtros sem acento/caixa feitos em Python: SQLite não tem unaccent)."""
import unicodedata

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.time import utc_now
from app.modulos.cenarios.models import Cenario, InteresseCenario


def _norm(t: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", t.casefold()) if unicodedata.category(c) != "Mn").strip()


class RepositorioCenarios:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ---- cenários -----------------------------------------------------
    def listar(self, *, clinica_ids: set[str] | None = None, somente_ativos: bool = False,
               cidade: str | None = None, interesse: str | None = None) -> list[Cenario]:
        q = select(Cenario)
        if clinica_ids is not None:
            q = q.where(Cenario.clinica_id.in_(clinica_ids or {""}))
        if somente_ativos:
            q = q.where(Cenario.estado == "ativo")
        itens = list(self.db.scalars(q))
        if cidade:
            itens = [c for c in itens if _norm(c.cidade) == _norm(cidade)]
        if interesse:  # interesse autodeclarado = área/especialidade que a pessoa escolheu
            itens = [c for c in itens if _norm(c.especialidade) == _norm(interesse)]
        return sorted(itens, key=lambda c: (c.publicado_em.replace(tzinfo=None), c.id), reverse=True)

    def obter(self, cenario_id: str) -> Cenario | None:
        return self.db.get(Cenario, cenario_id)

    def criar(self, clinica_id: str, dados: dict) -> Cenario:
        c = Cenario(clinica_id=clinica_id, publicado_em=utc_now(), **dados)
        self.db.add(c)
        self.db.flush()
        return c

    def atualizar(self, cenario: Cenario, dados: dict) -> Cenario:
        for k, v in dados.items():
            setattr(cenario, k, v)
        self.db.flush()
        return cenario

    # ---- interesses ---------------------------------------------------
    def interesse_do_paciente(self, cenario_id: str, paciente_id: str) -> InteresseCenario | None:
        return self.db.scalar(select(InteresseCenario).where(
            InteresseCenario.cenario_id == cenario_id, InteresseCenario.paciente_id == paciente_id))

    def registrar_interesse(self, cenario_id: str, paciente_id: str) -> tuple[InteresseCenario, bool]:
        """Devolve (interesse, criado). Idempotente: repetir não duplica; reativa se retirado."""
        i = self.interesse_do_paciente(cenario_id, paciente_id)
        agora = utc_now()
        if i is None:
            i = InteresseCenario(cenario_id=cenario_id, paciente_id=paciente_id, estado="registrado",
                                 criado_em=agora, atualizado_em=agora)
            self.db.add(i)
            self.db.flush()
            return i, True
        if i.estado == "retirado":
            i.estado, i.atualizado_em = "registrado", agora
            self.db.flush()
        return i, False

    def retirar_interesse(self, cenario_id: str, paciente_id: str) -> InteresseCenario | None:
        i = self.interesse_do_paciente(cenario_id, paciente_id)
        if i and i.estado == "registrado":
            i.estado, i.atualizado_em = "retirado", utc_now()
            self.db.flush()
        return i

    def interesses_do_cenario(self, cenario_id: str) -> list[InteresseCenario]:
        return list(self.db.scalars(select(InteresseCenario).where(InteresseCenario.cenario_id == cenario_id)
                                    .order_by(InteresseCenario.criado_em, InteresseCenario.id)))
