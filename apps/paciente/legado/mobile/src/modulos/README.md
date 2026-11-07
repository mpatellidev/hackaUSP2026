# Módulos mobile — guia de integração

O esqueleto (navegação, tema, adaptador de API) é da #5. Cada frente trabalha **só** na própria pasta:

| Pasta | Issue |
|---|---|
| `src/modulos/acompanhamento/` | #6 — alternativas, escolha de outra clínica, vagas e interesse |
| `src/modulos/cenarios/` | #12 |
| `src/modulos/urgencia/` | #14 |
| `src/modulos/avaliacoes/` | #16 |
| `src/modulos/alertas/` | #17 |
| `src/modulos/perfil/` | #18 |
| `src/modulos/acessibilidade/` | #9 |

## 1. Exporte `rotas.ts`
```ts
// src/modulos/urgencia/rotas.ts
import type { RotaModulo } from '../../navegacao/tipos';
import { TelaRelatoUrgencia } from './TelaRelatoUrgencia';

export const rotas: RotaModulo[] = [
  { nome: 'Urgencia.Relato', componente: TelaRelatoUrgencia, titulo: 'Relatar urgência' },
  // aba inferior própria (use com moderação):
  // { nome: 'Alertas.Lista', componente: TelaAlertas, titulo: 'Alertas', aba: { rotulo: 'Alertas', icone: 'notifications' } },
];
```
- `nome` único, prefixado pelo módulo (`Modulo.Tela`). Abrir: `navigation.navigate('Urgencia.Relato', { ... })`.
- Sem `aba`: a tela entra na pilha e, se tiver `titulo`, ganha atalho em *Ajustes › Mais*.
- `icone`: nome do [MaterialIcons](https://icons.expo.fyi) (`@expo/vector-icons`).

## 2. Peça a inclusão no ponto de montagem
No seu PR, descreva a linha a acrescentar em `src/navegacao/modulos.ts` (dono #5):
```ts
import { rotas as urgencia } from '../modulos/urgencia/rotas';
export const ROTAS_MODULOS: RotaModulo[] = [...urgencia];
```
Nada mais na navegação muda.

### Rotas que o esqueleto já espera
- `Acompanhamento.Alternativas` (#6), params `{ solicitacaoId }`: quando registrada, o andamento de um pedido `indisponivel` mostra "Ver clínicas sugeridas" no lugar de "Ver outras clínicas". A tela deve mostrar o que será compartilhado e só criar pedido **depois** da escolha do paciente (contrato §6).

## 3. API e mock
- Cliente do seu módulo em `src/api/<modulo>.ts`, usando `chamar` (já trata token, erro `{erro:{codigo,mensagem}}` e fallback):
  ```ts
  import { chamar } from './cliente';
  import { mockUrgencias } from '../modulos/urgencia/mock';
  export const apiUrgencias = {
    criar: (dados: NovoRelato) => chamar<Relato>('/urgencias', { metodo: 'POST', corpo: dados, mock: () => mockUrgencias.criar(dados) }),
  };
  ```
- Mock em `src/modulos/<m>/mock/`. O aviso de origem no topo da tela já mostra *mock* automaticamente.
- Nunca envie `paciente_id`, `papel` ou `clinica_id` para autorizar: vêm do token.

## 4. Reuse
- `import { Botao, Cartao, Texto, Aviso, Opcao, Tela, Carregando, ErroComRetry, useCarregar, abrirDiscador } from '../../componentes';`
- `useTema()` (cores, `fs()` para tamanho de letra escalado), `useSessao()` (usuário, cidade).
- Textos fixos de segurança em `src/textos/avisos.ts` (ex.: emergência 192).

## Regras (AGENTS.md)
Sem diagnóstico, sem prometer vaga, "agendada" só quando o backend confirmar, urgência nunca punida, mock sempre rotulado, textos pt-BR simples.
