# Módulo desktop: urgência (#14)

Exporta `PainelUrgencia` e `rotas` para a #7. `criarClienteApi()` usa o `http` do desktop (`VITE_API_URL` já inclui `/api/v1`) e fala com `/urgencias`. No modo mock, `criarClienteMock()`; `PainelUrgenciaRota` escolhe o cliente e passa a função do funcionário.
Botões de avaliação só para `funcao = profissional` (e o servidor devolve 403 para os demais).
Limitações: sem testes de componente até existir o esqueleto da #7; modo demo.
