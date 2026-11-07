"""Traduz o perfil do usuário em (1) instruções para a IA e (2) preferências de interface.

Função pura e testável: não acessa banco nem rede.
"""

from dataclasses import dataclass

from app.modulos.acessibilidade.schemas import PerfilChatIn, UiPrefs

ESCOLARIDADE_LABEL = {
    "fundamental_incompleto": "Ensino fundamental incompleto",
    "fundamental_completo": "Ensino fundamental completo",
    "medio_completo": "Ensino médio completo",
    "superior_completo": "Ensino superior completo",
    "pos_graduacao": "Pós-graduação",
    "prefiro_nao_dizer": "Prefiro não dizer",
}
FAIXA_ETARIA_LABEL = {
    "ate_17": "Até 17 anos",
    "18_29": "18 a 29 anos",
    "30_59": "30 a 59 anos",
    "60_mais": "60 anos ou mais",
    "prefiro_nao_dizer": "Prefiro não dizer",
}
DEFICIENCIA_LABEL = {
    "visual": "Deficiência visual",
    "auditiva": "Deficiência auditiva / surdez",
    "motora": "Deficiência motora",
    "intelectual": "Deficiência intelectual ou dificuldade de compreensão",
    "tea": "Autismo (TEA)",
    "nenhuma": "Nenhuma",
    "prefiro_nao_dizer": "Prefiro não dizer",
}


@dataclass(frozen=True)
class Adaptation:
    prompt_instructions: str
    ui_prefs: UiPrefs
    use_audio: bool  # a IA deve acompanhar explicações importantes com áudio


def build_adaptation(profile: PerfilChatIn) -> Adaptation:
    rules: list[str] = []
    ui = UiPrefs()
    defs = set(profile.deficiencias)

    # --- Escolaridade ---
    if profile.escolaridade in ("fundamental_incompleto", "fundamental_completo"):
        rules += [
            "Use palavras do dia a dia. Evite termos técnicos, siglas e palavras difíceis.",
            "Escreva frases curtas (até 15 palavras) e no máximo 3 frases por mensagem.",
            "Quando precisar explicar algo, use um exemplo concreto.",
        ]
    elif profile.escolaridade == "medio_completo":
        rules.append("Use linguagem simples e direta, explicando qualquer termo menos comum.")
    elif profile.escolaridade in ("superior_completo", "pos_graduacao"):
        rules.append("Pode ser objetivo e usar linguagem padrão; mantenha as respostas concisas.")
    else:
        rules.append("Use linguagem simples e clara por padrão.")

    # --- Idade ---
    if profile.faixa_etaria == "60_mais":
        rules += [
            "Trate a pessoa com respeito e paciência (use 'o senhor'/'a senhora' só se ela preferir; "
            "na dúvida, use 'você').",
            "Faça um passo de cada vez e confirme se a pessoa entendeu antes de seguir.",
        ]
        ui.font_scale = max(ui.font_scale, 1.25)
    elif profile.faixa_etaria == "ate_17":
        rules.append("Use tom acolhedor e leve, sem gírias excessivas. Lembre que menores podem "
                     "precisar de um responsável para acompanhar o pedido.")

    # --- Deficiências ---
    if "visual" in defs:
        rules += [
            "A pessoa pode estar usando leitor de tela: não use emojis, tabelas, setas ou referências "
            "visuais ('clique no botão azul', 'veja abaixo').",
            "Escreva datas e horários por extenso (ex.: 'terça-feira, 12 de novembro, às 9 horas').",
            "Ao listar opções, numere-as e diga quantas são.",
        ]
        ui.auto_play_audio = True
        ui.font_scale = max(ui.font_scale, 1.5)
        ui.high_contrast = True
    if "auditiva" in defs:
        rules += [
            "A pessoa pode ter surdez: nunca dependa de áudio para transmitir informação; o texto deve "
            "ser completo por si só.",
            "Prefira frases em ordem direta e vocabulário simples (o português pode ser segunda língua "
            "para usuários de Libras).",
        ]
        ui.vlibras = True
    if "motora" in defs:
        rules.append("Minimize a necessidade de digitar: sempre ofereça opções clicáveis com a "
                     "ferramenta oferecer_opcoes, inclusive para 'sim'/'não'.")
    if "intelectual" in defs or "tea" in defs:
        rules += [
            "Use linguagem literal: sem metáforas, ironia, expressões figuradas ou duplo sentido.",
            "Faça apenas UMA pergunta por mensagem.",
            "Ao final de cada etapa importante, faça um resumo curto do que foi decidido.",
        ]
    if "intelectual" in defs:
        rules.append("Repita a informação principal (dia, hora e local) de forma simples.")

    use_audio = profile.prefere_audio or "visual" in defs
    if profile.prefere_audio and "auditiva" not in defs:
        ui.auto_play_audio = True
    if "auditiva" in defs:
        # Nunca tocar áudio sozinho para quem pode não ouvir; o botão continua disponível.
        ui.auto_play_audio = False

    if use_audio:
        rules.append("Esta pessoa se beneficia de áudio: use a ferramenta explicar_em_audio para "
                     "explicações importantes e para confirmar o envio de um pedido.")
    else:
        rules.append("Use a ferramenta explicar_em_audio apenas quando uma explicação for longa ou "
                     "complexa (ex.: o que significa o estado de um pedido).")

    perfil_desc = (
        f"Escolaridade: {ESCOLARIDADE_LABEL[profile.escolaridade]}. "
        f"Faixa etária: {FAIXA_ETARIA_LABEL[profile.faixa_etaria]}. "
        f"Deficiências informadas: "
        f"{', '.join(DEFICIENCIA_LABEL[d] for d in profile.deficiencias) or 'nenhuma informada'}. "
        f"Prefere áudio: {'sim' if profile.prefere_audio else 'não'}."
    )
    instructions = (
        "<perfil_do_usuario>\n" + perfil_desc + "\n</perfil_do_usuario>\n\n"
        "<como_adaptar_a_resposta>\n" + "\n".join(f"- {r}" for r in rules) + "\n</como_adaptar_a_resposta>"
    )
    return Adaptation(prompt_instructions=instructions, ui_prefs=ui, use_audio=use_audio)


def describe_profile(profile: PerfilChatIn) -> str:
    """Resumo legível do perfil (usado no 'continuar com os dados salvos?')."""
    defs = ", ".join(DEFICIENCIA_LABEL[d] for d in profile.deficiencias) or "Nenhuma informada"
    return (
        f"Escolaridade: {ESCOLARIDADE_LABEL[profile.escolaridade]}; "
        f"Idade: {FAIXA_ETARIA_LABEL[profile.faixa_etaria]}; "
        f"Deficiência: {defs}; "
        f"Áudio: {'sim' if profile.prefere_audio else 'não'}"
    )
