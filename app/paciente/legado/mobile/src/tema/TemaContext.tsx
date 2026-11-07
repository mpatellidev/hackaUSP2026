import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { CORES, ESCALA, type Cores, type NomeTema, type PreferenciaTema, type TamanhoTexto } from './tokens';

const CHAVE = 'uhealth.acessibilidade';

interface ValorTema {
  cores: Cores;
  nome: NomeTema;
  preferencia: PreferenciaTema;
  tamanho: TamanhoTexto;
  escala: number;
  /** tamanho de fonte já escalado */
  fs: (base: number) => number;
  definirPreferencia: (p: PreferenciaTema) => void;
  definirTamanho: (t: TamanhoTexto) => void;
}

const Contexto = createContext<ValorTema | null>(null);

export function TemaProvider({ children }: { children: ReactNode }) {
  const sistema = useColorScheme();
  const [preferencia, setPreferencia] = useState<PreferenciaTema>('sistema');
  const [tamanho, setTamanho] = useState<TamanhoTexto>('normal');

  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then((v) => {
        if (!v) return;
        const salvo = JSON.parse(v);
        if (salvo.tema in CORES || salvo.tema === 'sistema') setPreferencia(salvo.tema);
        if (salvo.texto in ESCALA) setTamanho(salvo.texto);
      })
      .catch(() => {});
  }, []);

  const valor = useMemo<ValorTema>(() => {
    const nome: NomeTema = preferencia === 'sistema' ? (sistema === 'dark' ? 'escuro' : 'claro') : preferencia;
    const escala = ESCALA[tamanho];
    const salvar = (tema: PreferenciaTema, texto: TamanhoTexto) =>
      AsyncStorage.setItem(CHAVE, JSON.stringify({ tema, texto })).catch(() => {});
    return {
      cores: CORES[nome],
      nome,
      preferencia,
      tamanho,
      escala,
      fs: (base) => Math.round(base * escala),
      definirPreferencia: (p) => {
        setPreferencia(p);
        salvar(p, tamanho);
      },
      definirTamanho: (t) => {
        setTamanho(t);
        salvar(preferencia, t);
      },
    };
  }, [preferencia, tamanho, sistema]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTema() {
  const v = useContext(Contexto);
  if (!v) throw new Error('useTema precisa estar dentro de <TemaProvider>');
  return v;
}
