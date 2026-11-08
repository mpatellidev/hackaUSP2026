# UHealth · Portal da clínica

Protótipo administrativo em português, desenvolvido em HTML, CSS e JavaScript puro a partir do arquivo **UHealth — Identidade e Design.html** fornecido. A pasta inicial não continha uma aplicação. Foram preservados o símbolo da marca, o verde petróleo, o turquesa, o amarelo, a tipografia Atkinson Hyperlegible incorporada e a organização por solicitações e triagem. Os títulos usam Lexend quando disponível, com fonte de sistema como alternativa.

## Abrir

- **`uhealth-admin.html`**: aplicação completa em um único arquivo; abra diretamente no navegador. Não precisa de instalação ou conexão.
- **`index.html` + `styles.css` + `app.js`**: a mesma aplicação com os arquivos separados para desenvolvimento.
- **`.frontend-design/uhealth-admin/2026-11-07-uhealth-admin.html`**: mockup de revisão independente, com as duas versões de tema e sem dependências externas.

Para servir localmente, execute `npm run dev` e abra `http://127.0.0.1:4173`. O servidor só expõe os arquivos públicos listados em `scripts/serve.js`.

## Telas e interações

- Solicitações: busca, filtros por situação e serviço, resumo do paciente e exportação CSV.
- Triagem: encaminhamento, seleção de paciente, registro de resultado, data e horário.
- Serviços e vagas: consultas, exames e tratamentos, com público atendido, critérios, disponibilidade e edição. Também permite adicionar um serviço e publicar vagas.
- Pacientes: lista da unidade, perfil, necessidades, barreiras relatadas e histórico administrativo.
- Configurações: identificação, endereço, contato e recebimento de novos pedidos.
- Duas clínicas demonstrativas, cada uma com pacientes, serviços, vagas e configurações próprios.
- Rotas compartilháveis, por exemplo `#/clinicas/centro/servicos` e `#/clinicas/escola/solicitacoes`.
- Layout responsivo, menu móvel, foco visível, labels e temas claro e escuro.

Todos os registros são fictícios. Alterações ficam apenas na memória durante a sessão e são reiniciadas ao recarregar a página. Não há backend, autenticação, prontuário nem envio de mensagens. A pausa de pedidos representa o estado administrativo; uma integração futura deverá aplicar a restrição na entrada de novas solicitações.

## Revisar o design

O mockup mostra o estado inicial de Solicitações nos temas claro e escuro. A navegação funcional está no arquivo da aplicação. Na revisão:

1. Ajuste as cores da identidade, o espaço entre linhas e os cantos dos componentes no painel lateral.
2. Clique nos títulos e descrições editáveis para alterar os textos; a alteração aparece nos dois temas.
3. Ative **Comentar**, clique em um elemento e salve a observação. Escolha o escopo apropriado.
4. Use **Exportar feedback**, copie o Markdown e cole no chat para aplicar as mudanças nos arquivos reais.
5. As setas nos cantos ampliam um tema. A revisão não salva mudanças após recarregar: exporte o feedback antes de fechar.

## Verificar e reconstruir

Node.js é necessário apenas para ferramentas de desenvolvimento. A aplicação não usa bibliotecas em tempo de execução.

```sh
npm install
npm run check
npm run build
npm test
```

`build` usa a estrutura comportamental da skill local `frontend-design` em `%USERPROFILE%/.codex/skills/frontend-design/assets/preview-template.html`. Atualiza a revisão e a aplicação autocontida a partir de `styles.css` e `app.js`. `jsdom` é usado somente nos testes de DOM; esses testes não substituem uma conferência visual em navegador.

As licenças das fontes incorporadas estão em `design/FONT-LICENSES.txt`.
