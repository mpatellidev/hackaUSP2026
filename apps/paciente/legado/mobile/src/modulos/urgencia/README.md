# Módulo mobile: urgência (#14)

Exporta `TelaUrgencia` e `rotas` (`{nome: 'Urgencia', componente}`). A #5 registra a rota.

- **Integração:** `<TelaUrgencia cliente={criarClienteApi({baseUrl: EXPO_PUBLIC_API_URL, token})} solicitacaoId={...} />`.
- **Demo/offline:** `criarClienteMock()` (dados fictícios em memória).
- O bloco de emergência (SAMU 192) é texto estático, mostrado sempre, mesmo se a API falhar.
- Rótulo "Aguardando avaliação"; sem diagnóstico e sem promessa de contato.
- Pendente: validação clínica dos textos; testes de componente (dependem do esqueleto da #5).
