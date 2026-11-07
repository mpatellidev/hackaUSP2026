// Perguntas do perfil feitas no início do chat (fluxo fixo, sem IA, para ser previsível).
import type { Deficiencia, Escolaridade, FaixaEtaria, ProfileIn } from "../api/client";

export interface Option {
  label: string;
  value: string;
}

export interface Step {
  key: keyof ProfileIn;
  question: string;
  options: Option[];
  multi?: boolean;
  /** Opções que, se marcadas, desmarcam as demais (ex.: "Nenhuma"). */
  exclusive?: string[];
}

export const PROFILE_STEPS: Step[] = [
  {
    key: "escolaridade",
    question: "Até que ano você estudou?",
    options: [
      { label: "Não terminei o ensino fundamental", value: "fundamental_incompleto" satisfies Escolaridade },
      { label: "Ensino fundamental completo", value: "fundamental_completo" satisfies Escolaridade },
      { label: "Ensino médio completo", value: "medio_completo" satisfies Escolaridade },
      { label: "Faculdade completa", value: "superior_completo" satisfies Escolaridade },
      { label: "Pós-graduação", value: "pos_graduacao" satisfies Escolaridade },
      { label: "Prefiro não dizer", value: "prefiro_nao_dizer" satisfies Escolaridade },
    ],
  },
  {
    key: "faixa_etaria",
    question: "Qual é a sua idade?",
    options: [
      { label: "Até 17 anos", value: "ate_17" satisfies FaixaEtaria },
      { label: "18 a 29 anos", value: "18_29" satisfies FaixaEtaria },
      { label: "30 a 59 anos", value: "30_59" satisfies FaixaEtaria },
      { label: "60 anos ou mais", value: "60_mais" satisfies FaixaEtaria },
      { label: "Prefiro não dizer", value: "prefiro_nao_dizer" satisfies FaixaEtaria },
    ],
  },
  {
    key: "deficiencias",
    question:
      "Você tem alguma deficiência ou dificuldade que eu deva considerar? Pode marcar mais de uma e depois tocar em Continuar.",
    multi: true,
    exclusive: ["nenhuma", "prefiro_nao_dizer"],
    options: [
      { label: "Visual (cegueira ou baixa visão)", value: "visual" satisfies Deficiencia },
      { label: "Auditiva (surdez)", value: "auditiva" satisfies Deficiencia },
      { label: "Motora", value: "motora" satisfies Deficiencia },
      { label: "Dificuldade para entender textos", value: "intelectual" satisfies Deficiencia },
      { label: "Autismo (TEA)", value: "tea" satisfies Deficiencia },
      { label: "Nenhuma", value: "nenhuma" satisfies Deficiencia },
      { label: "Prefiro não dizer", value: "prefiro_nao_dizer" satisfies Deficiencia },
    ],
  },
  {
    key: "prefere_audio",
    question: "Você gostaria de receber explicações em áudio também?",
    options: [
      { label: "Sim, quero áudio", value: "true" },
      { label: "Não, só texto", value: "false" },
    ],
  },
];

export function buildProfile(answers: Partial<Record<keyof ProfileIn, string | string[]>>): ProfileIn {
  return {
    escolaridade: answers.escolaridade as Escolaridade,
    faixa_etaria: answers.faixa_etaria as FaixaEtaria,
    deficiencias: (answers.deficiencias as Deficiencia[] | undefined) ?? [],
    prefere_audio: answers.prefere_audio === "true",
  };
}

export const CONTINUE = { label: "Continuar com esses dados", value: "__continuar__" };
export const UPDATE = { label: "Atualizar meus dados", value: "__atualizar__" };
