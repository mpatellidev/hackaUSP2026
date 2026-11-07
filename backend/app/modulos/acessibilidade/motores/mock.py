"""Motor MOCK (padrão, contrato §11): sem rede, sem chave, respostas determinísticas.

Reconhece palavras-chave simples e usa as MESMAS ferramentas da IA, então mostra dados reais do
banco (fictícios). Não envia pedidos: isso exige entender a conversa, o que só a IA faz.
Todo retorno sai com `fonte: "mock"` e a interface rotula como demonstração."""
import json
import unicodedata

from app.modulos.acessibilidade.motores.base import StoredMessage, ToolExecutor, TurnResult

EMERGENCIA = ("Se for uma emergência, ligue agora para o SAMU, número 192, ou vá ao pronto-socorro mais "
              "próximo. Este app não substitui atendimento de urgência.")
SINAIS_GRAVES = ("emergencia", "urgencia", "urgente", "dor no peito", "falta de ar", "nao consigo respirar",
                 "desmai", "sangramento", "sangrando", "convuls", "infarto", "avc", "suicid", "me machucar",
                 "me matar")
CIDADES = {"sao paulo": "São Paulo", "campinas": "Campinas"}
MENU = [
    {"rotulo": "Ver clínicas", "valor": "Quais clínicas existem?"},
    {"rotulo": "Meus pedidos", "valor": "Como estão meus pedidos?"},
    {"rotulo": "Atendimentos confirmados", "valor": "Quais são meus agendamentos?"},
]
INTRO = ("Estou no modo de demonstração, com respostas automáticas. Posso mostrar clínicas, seus pedidos "
         "e os atendimentos que a clínica já confirmou.")


def _qtd(n: int, singular: str, plural: str) -> str:
    return f"{n} {singular if n == 1 else plural}"


def _norm(s: str) -> str:
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().casefold()


def _clinicas(data: dict) -> str:
    if not data["clinicas"]:
        return "Não encontrei clínicas com esse filtro."
    linhas = []
    for i, c in enumerate(data["clinicas"], 1):
        status = "recebendo pedidos" if c["recebendo_pedidos"] else "não está recebendo pedidos agora"
        linhas.append(f"{i}. {c['nome']}, em {c['cidade']}: {status}. Telefone {c['telefone']}.")
    return (f"Encontrei {_qtd(data['total'], 'clínica', 'clínicas')}:\n" + "\n".join(linhas) + f"\n\n{data['aviso']}")


def _pedidos(data: dict) -> str:
    if not data["pedidos"]:
        return "Você ainda não tem pedidos."
    linhas = [f"{i}. {p['clinica']}, {p['especialidade_nome']}: {p['estado_explicado']}"
              for i, p in enumerate(data["pedidos"], 1)]
    return f"Você tem {_qtd(data['total'], 'pedido', 'pedidos')}:\n" + "\n".join(linhas)


def _agendamentos(data: dict) -> str:
    if not data["agendamentos"]:
        return "Você ainda não tem atendimento confirmado pela clínica. " + data["observacao"]
    linhas = [f"{i}. {a['clinica']}, {a['especialidade_nome']}: {a['quando']}." for i, a in enumerate(data["agendamentos"], 1)]
    return ("Atendimentos confirmados pela clínica:\n" + "\n".join(linhas) + "\n\n" + data["observacao"])


class MockEngine:
    provider = "mock"

    def run_turn(self, base_system: str, dynamic_system: str, history: list[StoredMessage], user_text: str,
                 execute_tool: ToolExecutor) -> TurnResult:
        t = _norm(user_text)

        def call(name: str, args: dict | None = None) -> dict:
            out, is_error = execute_tool(name, args or {})
            data = json.loads(out)
            return {"_erro": data.get("erro", "Não consegui consultar agora.")} if is_error else data

        if any(s in t for s in SINAIS_GRAVES):
            text = EMERGENCIA
        elif "agendad" in t or "agendament" in t or "confirmad" in t:
            data = call("listar_meus_agendamentos")
            text = data.get("_erro") or _agendamentos(data)
        elif "pedido" in t or "solicita" in t or "status" in t:
            data = call("listar_meus_pedidos")
            text = data.get("_erro") or _pedidos(data)
        elif "clinica" in t:
            cidade = next((nome for chave, nome in CIDADES.items() if chave in t), "")
            data = call("buscar_clinicas", {"cidade": cidade, "especialidade": ""})
            text = data.get("_erro") or _clinicas(data)
        else:
            text = INTRO + " O que você quer ver?"
            if "enviar" in t or "marcar" in t:
                text = ("Neste modo de demonstração eu não envio pedidos. Veja as clínicas e fale com elas "
                        "pelo telefone. " + text)
        call("oferecer_opcoes", {"opcoes": MENU})
        return TurnResult(texts=[text],
                          new_messages=[StoredMessage("user", user_text), StoredMessage("assistant", text)])
