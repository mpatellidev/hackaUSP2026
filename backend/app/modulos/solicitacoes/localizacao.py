"""Distância entre o paciente e as clínicas, sem serviço externo (nada sai do servidor).

- Localização do aparelho (latitude/longitude): distância em linha reta (fórmula de Haversine).
- CEP: não há base de CEPs aqui, então o CEP vira o centro aproximado da sua região (pelos 3 primeiros
  dígitos) nas cidades atendidas. A distância é marcada como aproximada.
"""
from math import asin, cos, radians, sin, sqrt

RAIO_TERRA_KM = 6371.0

# (início, fim) dos 3 primeiros dígitos do CEP -> (latitude, longitude, região). Centros aproximados.
REGIOES_CEP: list[tuple[int, int, float, float, str]] = [
    (10, 15, -23.5489, -46.6388, "Centro de São Paulo"),
    (20, 29, -23.4850, -46.6300, "Zona Norte de São Paulo"),
    (30, 39, -23.5450, -46.5800, "Zona Leste de São Paulo"),
    (40, 49, -23.6100, -46.6600, "Zona Sul de São Paulo"),
    (50, 59, -23.5600, -46.7000, "Zona Oeste de São Paulo"),
    (80, 84, -23.5400, -46.4400, "Zona Leste de São Paulo"),
    (130, 131, -22.9056, -47.0608, "Campinas"),
]


class CepNaoAtendido(ValueError):
    pass


def so_digitos(cep: str) -> str:
    return "".join(ch for ch in cep if ch.isdigit())


def origem_do_cep(cep: str) -> tuple[float, float, str]:
    digitos = so_digitos(cep)
    if len(digitos) != 8:
        raise CepNaoAtendido("Digite os 8 números do CEP.")
    prefixo = int(digitos[:3])
    for inicio, fim, lat, lng, regiao in REGIOES_CEP:
        if inicio <= prefixo <= fim:
            return lat, lng, regiao
    raise CepNaoAtendido("Ainda não atendemos a região deste CEP. Use a localização do aparelho ou veja todas as clínicas.")


def distancia_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    dlat, dlng = radians(lat2 - lat1), radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    return 2 * RAIO_TERRA_KM * asin(sqrt(a))
