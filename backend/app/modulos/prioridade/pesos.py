"""Pesos ilustrativos versionados em pesos/<versao>.json. Trocar a versão: PESOS_VERSAO=demo-0.2."""
import json
import os
from dataclasses import dataclass, field
from pathlib import Path

DIR = Path(__file__).parent / "pesos"
VERSAO_PADRAO = "odonto-2.0"
OBRIGATORIOS = {
    "socioeconomico": {"peso", "faixas", "desconhecido"},
    "necessidade_academica": {"peso", "valor_se_correspondente"},
    "tempo_espera": {"peso", "pontos_por_dia", "teto_dias"},
    "falta_verificada": {"peso", "valor_por_falta_confirmada", "teto_faltas"},
}


# Blocos opcionais (versões antigas não têm): ausente = peso 0
OPCIONAIS = {
    "risco_clinico": {"peso", "valores"},
    "assiduidade": {"peso", "por_comparecimento", "teto_comparecimentos", "por_cancelamento_antecipado",
                    "teto_cancelamentos"},
    "deficiencia": {"peso", "valor"},
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
    risco_clinico: dict = field(default_factory=lambda: {"peso": 0.0, "valores": {}})
    assiduidade: dict = field(default_factory=lambda: {"peso": 0.0, "por_comparecimento": 0, "teto_comparecimentos": 0,
                                                       "por_cancelamento_antecipado": 0, "teto_cancelamentos": 0})
    deficiencia: dict = field(default_factory=lambda: {"peso": 0.0, "valor": 0})


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
    for bloco, chaves in OPCIONAIS.items():
        if bloco in dados and chaves - set(dados[bloco]):
            raise PesosInvalidos(f"Pesos {versao}: bloco '{bloco}' sem {sorted(chaves - set(dados[bloco]))}")
    extras = {b: dados[b] for b in OPCIONAIS if b in dados}
    return Pesos(versao, dados["aviso"], *(dados[b] for b in OBRIGATORIOS), **extras)
