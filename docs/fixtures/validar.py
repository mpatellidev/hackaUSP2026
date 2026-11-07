#!/usr/bin/env python3
"""Valida a integridade das fixtures de demonstração (somente biblioteca padrão).

Uso: python3 docs/fixtures/validar.py
Confere: UUIDs, horários ISO 8601 com fuso, vocabulário de estados e referências entre arquivos.
"""
import json
import re
import sys
from datetime import datetime
from pathlib import Path

AQUI = Path(__file__).parent
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
ESTADOS_SOLICITACAO = {"enviada", "em_analise", "precisa_contato", "indisponivel",
                       "aguardando_confirmacao", "agendada", "concluida"}
ESTADOS_VAGA = {"aberta", "preenchida", "cancelada"}
ESTADOS_INTERESSE = {"registrado", "confirmado", "nao_selecionado", "retirado"}
FUNCOES = {"atendimento", "profissional", "coordenacao"}
erros = []


def carregar(nome):
    return json.loads((AQUI / f"{nome}.json").read_text(encoding="utf-8"))


def itens(nome, chave="itens"):
    return carregar(nome)[chave]


def checar(cond, msg):
    if not cond:
        erros.append(msg)


def iso_com_fuso(valor):
    try:
        return datetime.fromisoformat(valor).tzinfo is not None
    except (TypeError, ValueError):
        return False


def varrer(obj, caminho):
    """Todo campo *_id/id deve ser UUID v4; todo campo *_em/inicio/fim deve ser ISO com fuso."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if v is not None and isinstance(v, str) and (k == "id" or k.endswith("_id")
                                                         or k in ("criado_por", "confirmado_por", "registrada_por")):
                checar(UUID.match(v), f"{caminho}.{k}: UUID inválido ({v})")
            if v is not None and isinstance(v, str) and (k.endswith("_em") or k in ("inicio", "fim")):
                checar(iso_com_fuso(v), f"{caminho}.{k}: horário sem fuso ou inválido ({v})")
            varrer(v, f"{caminho}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            varrer(v, f"{caminho}[{i}]")


for arq in sorted(AQUI.glob("*.json")):
    dados = json.loads(arq.read_text(encoding="utf-8"))
    checar("_aviso" in dados, f"{arq.name}: falta _aviso de dados fictícios")
    varrer(dados, arq.name)

usuarios = {u["id"]: u for u in itens("usuarios")}
clinicas = {c["id"] for c in itens("clinicas")}
solicitacoes = {s["id"]: s for s in itens("solicitacoes")}
vagas = {v["id"]: v for v in itens("vagas")}
ids = [x["id"] for nome in ("usuarios", "clinicas", "solicitacoes", "vagas", "eventos", "interesses")
       for x in itens(nome)]
checar(len(ids) == len(set(ids)), "IDs duplicados entre arquivos")

for c in itens("contas-demo"):
    checar(c["usuario_id"] in usuarios, f"conta-demo {c['conta']}: usuário inexistente")
for v in itens("vinculos"):
    checar(usuarios[v["usuario_id"]].get("funcao") == v["funcao"], f"vínculo {v['id']}: função inconsistente")
    checar(v["clinica_id"] in clinicas, f"vínculo {v['id']}: clínica inexistente")
    checar(v["funcao"] in FUNCOES, f"vínculo {v['id']}: função fora do vocabulário")
for s in solicitacoes.values():
    checar(s["estado"] in ESTADOS_SOLICITACAO, f"solicitação {s['id']}: estado inválido")
    checar(s["clinica_id"] in clinicas, f"solicitação {s['id']}: clínica inexistente")
    checar(usuarios.get(s["paciente_id"], {}).get("papel") == "paciente", f"solicitação {s['id']}: paciente inválido")
    if s["solicitacao_origem_id"]:
        checar(s["solicitacao_origem_id"] in solicitacoes, f"solicitação {s['id']}: origem inexistente")
        origem = solicitacoes[s["solicitacao_origem_id"]]
        checar(origem["estado"] == "indisponivel", f"solicitação {s['id']}: origem deveria estar indisponivel")
        checar(origem["paciente_id"] == s["paciente_id"], f"solicitação {s['id']}: origem de outro paciente")
checar({s["estado"] for s in solicitacoes.values()} == ESTADOS_SOLICITACAO, "fixtures devem cobrir os 7 estados")

ultimo = {}
for e in itens("eventos"):
    checar(e["solicitacao_id"] in solicitacoes, f"evento {e['id']}: solicitação inexistente")
    ultimo[e["solicitacao_id"]] = e["estado_novo"]
for sid, s in solicitacoes.items():
    checar(ultimo.get(sid) == s["estado"], f"solicitação {sid}: último evento ({ultimo.get(sid)}) != estado ({s['estado']})")

for v in vagas.values():
    checar(v["estado"] in ESTADOS_VAGA and v["clinica_id"] in clinicas, f"vaga {v['id']}: inválida")
confirmados = {}
for i in itens("interesses"):
    checar(i["estado"] in ESTADOS_INTERESSE, f"interesse {i['id']}: estado inválido")
    checar(i["vaga_id"] in vagas and i["solicitacao_id"] in solicitacoes, f"interesse {i['id']}: referência inexistente")
    if i["estado"] == "confirmado":
        confirmados[i["vaga_id"]] = confirmados.get(i["vaga_id"], 0) + 1
checar(all(n == 1 for n in confirmados.values()), "no máximo um interesse confirmado por vaga")
for vid, v in vagas.items():
    checar((v["estado"] == "preenchida") == (confirmados.get(vid) == 1), f"vaga {vid}: estado incompatível com confirmações")
for a in itens("agendamentos"):
    checar(a["vaga_id"] in vagas and a["solicitacao_id"] in solicitacoes, f"agendamento {a['id']}: referência inexistente")

texto = "".join(p.read_text(encoding="utf-8") for p in AQUI.glob("*.json"))
checar(not re.search(r"\d{3}\.\d{3}\.\d{3}-\d{2}", texto), "possível CPF encontrado")
checar(not re.search(r"[\w.]+@[\w.]+\.\w+", texto), "possível e-mail encontrado")
checar(not re.search(r"(?i)senha|password|secret|token", texto.replace("SEM senha", "")), "possível segredo encontrado")

if erros:
    print("FALHOU:")
    for e in erros:
        print(" -", e)
    sys.exit(1)
print(f"OK: {len(list(AQUI.glob('*.json')))} arquivos de fixtures válidos.")
