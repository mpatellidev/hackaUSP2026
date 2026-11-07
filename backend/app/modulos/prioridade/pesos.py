"""Pesos ilustrativos versionados em pesos/<versao>.json. Trocar a versão: PESOS_VERSAO=demo-0.2."""
import json
import os
from dataclasses import dataclass
from pathlib import Path

DIR = Path(__file__).parent / "pesos"
VERSAO_PADRAO = "demo-0.1"
OBRIGATORIOS = {
    "socioeconomico": {"peso", "faixas", "desconhecido"},
    "necessidade_academica": {"peso", "valor_se_correspondente"},
    "tempo_espera": {"peso", "pontos_por_dia", "teto_dias"},
    "falta_verificada": {"peso", "valor_por_falta_confirmada", "teto_faltas"},
}


class PesosInvalidos(ValueError):
    pass


@dataclass(frozen=True)
class Pesos:
    versao: str
    aviso: str
    socioeconomico: dict
    necessidade_academica: dict
    tempo_espera: dict
    falta_verificada: dict


def carregar(versao: str | None = None) -> Pesos:
    versao = versao or os.environ.get("PESOS_VERSAO", VERSAO_PADRAO)
    arquivo = DIR / f"{Path(versao).name}.json"
    if not arquivo.is_file():
        raise PesosInvalidos(f"Versão de pesos desconhecida: {versao!r}")
    dados = json.loads(arquivo.read_text(encoding="utf-8"))
    for bloco, chaves in OBRIGATORIOS.items():
        faltando = chaves - set(dados.get(bloco, {}))
        if faltando:
            raise PesosInvalidos(f"Pesos {versao}: bloco '{bloco}' sem {sorted(faltando)}")
    if dados.get("versao") != versao or not dados.get("aviso"):
        raise PesosInvalidos(f"Pesos {versao}: 'versao' e 'aviso' são obrigatórios e devem bater com o arquivo")
    return Pesos(versao, dados["aviso"], *(dados[b] for b in OBRIGATORIOS))
