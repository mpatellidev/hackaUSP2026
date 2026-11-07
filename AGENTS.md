# AGENTS.md — regras para pessoas e IAs

UHealth conecta pessoas de baixa renda a **clínicas-escola de saúde** (medicina e áreas da saúde, não só uma especialidade). Protótipo de hackathon com **dados 100% fictícios**.

## Leia primeiro
1. `README.md` · 2. `docs/contratos-mvp.md` · 3. `docs/fronteiras.md` · 4. a sua issue no GitHub.

## Regras do produto (não negociáveis)
- O app **não diagnostica, não prescreve, não garante vaga** e **não substitui emergência** (SAMU 192, texto estático, sem depender de rede/IA).
- Verificação e priorização clínica são **humanas**. Urgência **avaliada** por profissional vem **sempre antes** de score/falta. Relato de urgência **nunca** é punido.
- O **paciente escolhe** antes de ir para outra clínica; nada de cascata automática.
- Pedido ≠ interesse ≠ agendamento ≠ alerta. Só mostre "agendada" se o backend confirmou.
- Papel e `clinica_id` vêm do **servidor** (token), nunca do cliente. Auth atual é **demo**, não segura.
- Rotule mock/demo/simulado na UI e na API. Não prometa o que não existe (push, prontuário real, ligação automática).
- Não fixe o produto em odontologia: `especialidade` é um campo.

## Regras de código e repositório
- Branch e PR próprios (`feat/<n>-<assunto>`); não edite arquivos de outras frentes; use fixtures de `docs/fixtures/` (não mude IDs existentes).
- Sem segredos, tokens ou dados pessoais reais. `.env.example` sem valores secretos.
- Textos de usuário em pt-BR, simples, acessíveis. Siga o estilo do código vizinho.
- Registre no PR: o que foi implementado, como executar, limitações.
