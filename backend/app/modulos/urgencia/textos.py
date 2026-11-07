"""Textos estáticos de urgência.

Espelham `TEXTO_EMERGENCIA` de `app/packages/ui` (componente `CartaoEmergencia`). O app embute o texto: ele NÃO
depende desta API, de rede, de IA, de vaga ou de fila para orientar emergência.

PENDENTE: revisão clínica/jurídica antes de qualquer uso real. Protótipo.
"""

SAMU = "192"

ORIENTACAO_EMERGENCIA = (
    "Se você ou alguém perto de você está com falta de ar forte, dor forte no peito, "
    "desmaio, sangramento que não para, convulsão, confusão repentina ou risco de vida, "
    "ligue 192 (SAMU) ou vá agora ao pronto-socorro mais próximo. "
    "Não espere resposta da clínica-escola nem vaga."
)

ROTULO_AGUARDANDO = "Aguardando avaliação"

AVISO_RELATO = (
    "Seu relato foi registrado e será visto por um profissional da clínica. "
    "Isso não é um atendimento, não garante contato imediato e não é um diagnóstico. "
    "Se for grave, ligue 192 (SAMU) agora."
)

AVISO_DEMO = (
    "Protótipo demonstrativo com dados fictícios. Os textos de emergência ainda "
    "precisam de validação clínica antes de qualquer uso real."
)
