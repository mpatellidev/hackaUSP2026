"""Regras de cenários e interesses. Armazenamento em memória (protótipo); trocar por tabelas na #2."""
import threading
import unicodedata
import uuid
from datetime import datetime, timezone
from typing import Optional

from .models import Cenario, InteresseCenario


def _norm(t: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", t.casefold()) if unicodedata.category(c) != "Mn").strip()


def agora() -> datetime:
    return datetime.now(timezone.utc)


class RepositorioCenarios:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self.cenarios: dict[str, Cenario] = {}
        self.interesses: dict[str, InteresseCenario] = {}

    # ---- cenários -----------------------------------------------------
    def listar(self, *, clinica_id: Optional[str] = None, somente_ativos: bool = False,
               cidade: Optional[str] = None, interesse: Optional[str] = None) -> list[Cenario]:
        with self._lock:
            itens = list(self.cenarios.values())
        if clinica_id:
            itens = [c for c in itens if c.clinica_id == clinica_id]
        if somente_ativos:
            itens = [c for c in itens if c.estado == "ativo"]
        if cidade:
            itens = [c for c in itens if _norm(c.cidade) == _norm(cidade)]
        if interesse:  # interesse autodeclarado = área/especialidade que a pessoa escolheu
            itens = [c for c in itens if _norm(c.especialidade) == _norm(interesse)]
        return sorted(itens, key=lambda c: (c.publicado_em, c.id), reverse=True)

    def obter(self, cenario_id: str) -> Optional[Cenario]:
        with self._lock:
            return self.cenarios.get(cenario_id)

    def criar(self, clinica_id: str, dados: dict) -> Cenario:
        c = Cenario(id=str(uuid.uuid4()), clinica_id=clinica_id, publicado_em=agora(), **dados)
        with self._lock:
            self.cenarios[c.id] = c
        return c

    def atualizar(self, cenario: Cenario, dados: dict) -> Cenario:
        with self._lock:
            for k, v in dados.items():
                setattr(cenario, k, v)
        return cenario

    # ---- interesses ---------------------------------------------------
    def interesse_do_paciente(self, cenario_id: str, paciente_id: str) -> Optional[InteresseCenario]:
        with self._lock:
            return next((i for i in self.interesses.values()
                         if i.cenario_id == cenario_id and i.paciente_id == paciente_id), None)

    def registrar_interesse(self, cenario_id: str, paciente_id: str) -> tuple[InteresseCenario, bool]:
        """Devolve (interesse, criado). Idempotente: repetir não duplica; reativa se retirado."""
        with self._lock:
            i = self.interesse_do_paciente(cenario_id, paciente_id)
            if i is None:
                i = InteresseCenario(str(uuid.uuid4()), cenario_id, paciente_id, "registrado", agora(), agora())
                self.interesses[i.id] = i
                return i, True
            if i.estado == "retirado":
                i.estado, i.atualizado_em = "registrado", agora()
            return i, False

    def retirar_interesse(self, cenario_id: str, paciente_id: str) -> Optional[InteresseCenario]:
        with self._lock:
            i = self.interesse_do_paciente(cenario_id, paciente_id)
            if i and i.estado == "registrado":
                i.estado, i.atualizado_em = "retirado", agora()
            return i

    def interesses_do_cenario(self, cenario_id: str) -> list[InteresseCenario]:
        with self._lock:
            return sorted((i for i in self.interesses.values() if i.cenario_id == cenario_id),
                          key=lambda i: (i.criado_em, i.id))


repo = RepositorioCenarios()


def compatibilidade_academica(paciente_id: str, clinica_id: str, especialidade: Optional[str] = None,
                              r: RepositorioCenarios = repo) -> dict:
    """Sinal de entrada para o score (#13): paciente tem interesse `registrado` em cenário `ativo`
    da clínica (e da especialidade, se informada). NÃO é prioridade clínica nem diagnóstico."""
    for c in r.listar(clinica_id=clinica_id, somente_ativos=True):
        if especialidade and c.especialidade != especialidade:
            continue
        i = r.interesse_do_paciente(c.id, paciente_id)
        if i and i.estado == "registrado":
            return {"correspondente": True, "cenario_id": c.id}
    return {"correspondente": False, "cenario_id": None}
