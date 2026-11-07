"""Portas de entrada desacopladas das frentes #18 (perfil), #14 (urgência) e #11 (cenários).
Hoje: implementações DEMO que leem fixtures. Na integração (#10) troque get_fontes() por
implementações reais; o serviço e o router não mudam."""
import json
from pathlib import Path
from typing import Protocol

FIX = Path(__file__).resolve().parents[4] / "docs" / "fixtures"


def _json(nome: str) -> dict:
    return json.loads((FIX / nome).read_text(encoding="utf-8"))


class Fontes(Protocol):
    demo: bool

    def faixa_renda(self, paciente_id: str) -> str | None: ...
    def urgencia(self, solicitacao_id: str) -> str: ...  # avaliada | autodeclarada | nenhuma
    def cenario_correspondente(self, clinica_id: str, especialidade: str) -> bool: ...


class FontesDemo:
    demo = True

    def __init__(self) -> None:
        self._perfis = {p["usuario_id"]: p for p in _json("perfis.json")["itens"]}
        u = _json("urgencias.json")
        confirmados = {a["relato_id"] for a in u["avaliacoes"] if a["classificacao"] == "urgencia_confirmada"}
        self._avaliadas = {r["solicitacao_id"] for r in u["relatos"] if r["id"] in confirmados}
        self._pendentes = {r["solicitacao_id"] for r in u["relatos"]
                           if r["estado"] == "aguardando_avaliacao" and r["solicitacao_id"]}
        self._cenarios = [c for c in _json("cenarios.json")["itens"] if c["estado"] == "ativo"]

    def faixa_renda(self, paciente_id: str) -> str | None:
        socio = (self._perfis.get(paciente_id) or {}).get("socioeconomico") or {}
        return socio.get("faixa_renda_familiar") if socio.get("informado") else None

    def urgencia(self, solicitacao_id: str) -> str:
        if solicitacao_id in self._avaliadas:
            return "avaliada"
        return "autodeclarada" if solicitacao_id in self._pendentes else "nenhuma"

    def cenario_correspondente(self, clinica_id: str, especialidade: str) -> bool:
        return any(c["clinica_id"] == clinica_id and c["especialidade"] == especialidade for c in self._cenarios)


def get_fontes() -> Fontes:
    return FontesDemo()
