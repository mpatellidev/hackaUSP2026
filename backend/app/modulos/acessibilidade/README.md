# Módulo `acessibilidade` — chat acessível (#9)

Assistente em conversa para **pacientes**. Ajuda a encontrar clínicas-escola, enviar um pedido e acompanhar pedidos e atendimentos confirmados. A forma de falar se adapta ao perfil de comunicação que a pessoa escolhe (escolaridade, idade, deficiência, áudio).

> Demonstração com dados fictícios. **Não diagnostica, não prescreve, não garante vaga.** Pedido ≠ agendamento: o chat **nunca** cria, muda ou cancela agendamento. Sinal grave → SAMU 192 (texto fixo no app e no prompt).

## Endpoints (`/api/v1`, token DEMO de paciente)
| Método | Caminho | O que faz |
|---|---|---|
| GET/PUT | `/acessibilidade/chat/perfil` | Perfil de comunicação do chat (404 se ainda não preenchido) |
| POST | `/acessibilidade/chat` | `{message, conversation_id?}` → `{modo: "demo", fonte, aviso, conversation_id, messages[], quick_replies[], ui_prefs}` |
| POST | `/acessibilidade/tts` | Gera áudio de um texto (`url: null` = o navegador fala) |
| GET | `/acessibilidade/audio/{hash}.mp3` | Arquivo gerado pelo TTS do servidor (sem token; nome imprevisível) |

Funcionário recebe `403`. Erros no formato do contrato (`{"erro": {...}}`); IA fora do ar → `503 servico_indisponivel`.

## Ferramentas da IA (`ferramentas.py`)
Todas agem como o paciente do token e leem pelos repositórios escopados:
`buscar_clinicas`, `listar_meus_pedidos`, `ver_historico_do_pedido`, `listar_meus_agendamentos` (só os confirmados pela clínica), `enviar_pedido` (cria `Solicitacao` `enviada` + evento `criada`, com `clinica_sem_recebimento` e `solicitacao_duplicada`), `explicar_em_audio`, `oferecer_opcoes`.

`enviar_pedido` segue o contrato §4.3; quando a #3 publicar o serviço de criação de pedidos, ele deve passar a chamá-lo (há um `TODO(#3)`).

## Motores de IA (`LLM_PROVIDER`)
| Valor | O que é |
|---|---|
| `mock` (padrão) | Sem rede e sem chave. Respostas automáticas por palavra-chave, usando as mesmas ferramentas (dados reais do banco). Não envia pedidos. |
| `gemini` | Google Gemini (`GEMINI_API_KEY`), com modelos reserva se o principal estiver sobrecarregado |
| `claude` | Anthropic Claude (`ANTHROPIC_API_KEY`) |

Chaves ficam só no `.env` do backend. Veja `backend/.env.example`.

## Tabelas (migração `0003_acessibilidade_chat`)
`chat_perfis` (1 por usuário), `chat_conversas`, `chat_mensagens` (só-anexar, no formato nativo do provedor; conversas de provedores diferentes não se misturam).

## Testes
`uv run pytest -q app/modulos/acessibilidade` — usam o banco e a auth DEMO reais; a IA é o mock ou um fake roteirizado (sem rede).

## Limitações
- O perfil de comunicação usa escolaridade e idade para ajustar a linguagem. Isso conflita com o contrato §9.2 ("sem inferir por idade/escolaridade"): **decisão pendente do time**.
- O perfil do chat é separado do `Perfil` da #18; quando ele existir, as preferências de `acessibilidade` podem alimentar o chat.
- O mock não entende frases livres; para enviar pedidos pelo chat é preciso Gemini ou Claude.
- Áudio no servidor só com `TTS_PROVIDER=openai`; o padrão é a voz do navegador.
