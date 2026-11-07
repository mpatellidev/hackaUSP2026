// Port de ui/tokens.css. Cor da marca #14BEB9 só como FUNDO com texto `naMarca` (escuro);
// nunca texto branco sobre ela nem ela como cor de texto. Para texto colorido use `link`.

export type NomeTema = 'claro' | 'escuro' | 'alto_contraste';
// Valores iguais a perfil.acessibilidade do contrato §9.2 (a #18 pode sincronizar com o servidor).
export type PreferenciaTema = 'sistema' | NomeTema;
export type TamanhoTexto = 'normal' | 'grande' | 'extra_grande';

export interface Cores {
  fundo: string;
  superficie: string;
  texto: string;
  apagado: string;
  linha: string;
  bordaForte: string;
  marca: string;
  naMarca: string;
  link: string;
  chipFundo: string;
  chipTexto: string;
  avisoFundo: string;
  avisoTexto: string;
  perigoFundo: string;
  perigoTexto: string;
  perigo: string;
  sol: string;
  foco: string;
}

const claro: Cores = {
  fundo: '#f4fbfb',
  superficie: '#ffffff',
  texto: '#0b2423',
  apagado: '#3f5958',
  linha: '#d2e5e4',
  bordaForte: '#6b8584',
  marca: '#14beb9',
  naMarca: '#0b2423',
  link: '#095f5c',
  chipFundo: '#e8f9f8',
  chipTexto: '#074644',
  avisoFundo: '#fff1cc',
  avisoTexto: '#5a3a00',
  perigoFundo: '#fbe3e0',
  perigoTexto: '#7a1712',
  perigo: '#b3261e',
  sol: '#ffb81c',
  foco: '#0b2423',
};

export const CORES: Record<NomeTema, Cores> = {
  claro,
  escuro: {
    ...claro,
    fundo: '#071b1b',
    superficie: '#0e2a2a',
    texto: '#e6f6f5',
    apagado: '#a6c7c5',
    linha: '#1f4443',
    bordaForte: '#3e7c79',
    link: '#5ad3cf',
    chipFundo: '#0b4f4c',
    chipTexto: '#c7f0ee',
    avisoFundo: '#3a2a00',
    avisoTexto: '#ffe3a1',
    perigoFundo: '#3a1411',
    perigoTexto: '#ffb4ab',
    perigo: '#ffb4ab',
    foco: '#ffffff',
  },
  alto_contraste: {
    ...claro,
    fundo: '#ffffff',
    superficie: '#ffffff',
    texto: '#000000',
    apagado: '#1a1a1a',
    linha: '#000000',
    bordaForte: '#000000',
    marca: '#004b49',
    naMarca: '#ffffff',
    link: '#00403e',
    chipFundo: '#ffffff',
    chipTexto: '#000000',
    avisoFundo: '#ffffff',
    avisoTexto: '#000000',
    perigoFundo: '#ffffff',
    perigoTexto: '#8a0000',
    perigo: '#8a0000',
    foco: '#000000',
  },
};

export const ESCALA: Record<TamanhoTexto, number> = { normal: 1, grande: 1.25, extra_grande: 1.6 };

export const ESPACO = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 } as const;

export const FONTES = {
  titulo: 'Lexend_700Bold',
  tituloMedio: 'Lexend_500Medium',
  corpo: 'AtkinsonHyperlegible_400Regular',
  corpoNegrito: 'AtkinsonHyperlegible_700Bold',
};

// Tamanhos base em px (multiplicados pela escala escolhida).
export const TAMANHO = { corpo: 16, apoio: 14, tituloCartao: 20, titulo: 28, botao: 18 };

export const ALVO_MINIMO = 48; // dp, alvo de toque (Android recomenda 48)
