// De onde vieram os últimos dados exibidos. A UI mostra isso num aviso fixo (regra: mock sempre rotulado).
//   api            → backend real (dados fictícios do seed)
//   mock           → modo mock configurado
//   mock_fallback  → modo api, mas a rota não existe ainda ou a rede falhou

export type OrigemDados = 'api' | 'mock' | 'mock_fallback';

type Ouvinte = (o: OrigemDados) => void;

let atual: OrigemDados | null = null;
const ouvintes = new Set<Ouvinte>();

export function registrarOrigem(o: OrigemDados) {
  if (atual === o) return;
  atual = o;
  ouvintes.forEach((f) => f(o));
}

export function origemAtual() {
  return atual;
}

export function ouvirOrigem(f: Ouvinte) {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
}
