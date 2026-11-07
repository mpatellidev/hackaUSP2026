"""Armazenamento em memória (modo demonstrativo), carregado das fixtures.

A #2 pode trocar por PostgreSQL implementando a mesma interface.
"""
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Protocol
from uuid import UUID

from .models import Avaliacao, Relato

FIXTURES = Path(__file__).resolve().parents[4] / "docs" / "fixtures"


class RepositorioUrgencia(Protocol):
    def salvar_relato(self, r: Relato) -> None: ...
    def obter_relato(self, id: UUID) -> Optional[Relato]: ...
    def listar_relatos(self) -> list[Relato]: ...
    def salvar_avaliacao(self, a: Avaliacao) -> None: ...
    def avaliacao_do_relato(self, relato_id: UUID) -> Optional[Avaliacao]: ...
    def clinica_da_solicitacao(self, solicitacao_id: UUID) -> Optional[UUID]: ...
    def paciente_da_solicitacao(self, solicitacao_id: UUID) -> Optional[UUID]: ...


def _lj(nome: str) -> dict:
    return json.loads((FIXTURES / nome).read_text(encoding="utf-8"))


class RepositorioMemoria:
    def __init__(self) -> None:
        self._relatos: dict[UUID, Relato] = {}
        self._avaliacoes: dict[UUID, Avaliacao] = {}  # por relato_id
        self._solicitacoes: dict[UUID, tuple[UUID, UUID]] = {}  # id -> (paciente, clinica)

    @classmethod
    def das_fixtures(cls) -> "RepositorioMemoria":
        repo = cls()
        for s in _lj("solicitacoes.json")["itens"]:
            repo._solicitacoes[UUID(s["id"])] = (UUID(s["paciente_id"]), UUID(s["clinica_id"]))
        u = _lj("urgencias.json")
        for r in u["relatos"]:
            repo.salvar_relato(Relato(
                UUID(r["id"]), UUID(r["paciente_id"]),
                UUID(r["solicitacao_id"]) if r["solicitacao_id"] else None,
                r["estado"], datetime.fromisoformat(r["criado_em"]),
            ))
        for a in u["avaliacoes"]:
            repo.salvar_avaliacao(Avaliacao(
                UUID(a["id"]), UUID(a["relato_id"]), UUID(a["avaliador_usuario_id"]),
                a["classificacao"], a["observacao_administrativa"],
                datetime.fromisoformat(a["avaliado_em"]),
            ))
        return repo

    def salvar_relato(self, r: Relato) -> None:
        self._relatos[r.id] = r

    def obter_relato(self, id: UUID) -> Optional[Relato]:
        return self._relatos.get(id)

    def listar_relatos(self) -> list[Relato]:
        return sorted(self._relatos.values(), key=lambda r: (r.criado_em, str(r.id)), reverse=True)

    def salvar_avaliacao(self, a: Avaliacao) -> None:
        self._avaliacoes[a.relato_id] = a

    def avaliacao_do_relato(self, relato_id: UUID) -> Optional[Avaliacao]:
        return self._avaliacoes.get(relato_id)

    def clinica_da_solicitacao(self, solicitacao_id: UUID) -> Optional[UUID]:
        s = self._solicitacoes.get(solicitacao_id)
        return s[1] if s else None

    def paciente_da_solicitacao(self, solicitacao_id: UUID) -> Optional[UUID]:
        s = self._solicitacoes.get(solicitacao_id)
        return s[0] if s else None
