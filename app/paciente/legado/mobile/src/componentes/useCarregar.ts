import { useCallback, useEffect, useRef, useState } from 'react';

import { mensagemDeErro } from '../api';

/** Carrega dados com estados de carregando/erro e função de atualizar. */
export function useCarregar<T>(buscar: () => Promise<T>, deps: unknown[] = []) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const ultima = useRef(0);

  const executar = useCallback(async (modo: 'inicial' | 'atualizar') => {
    const id = ++ultima.current;
    modo === 'inicial' ? setCarregando(true) : setAtualizando(true);
    setErro(null);
    try {
      const r = await buscar();
      if (id === ultima.current) setDados(r);
    } catch (e) {
      if (id === ultima.current) setErro(mensagemDeErro(e));
    } finally {
      if (id === ultima.current) {
        setCarregando(false);
        setAtualizando(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    executar('inicial');
  }, [executar]);

  return {
    dados,
    erro,
    carregando,
    atualizando,
    atualizar: () => executar('atualizar'),
    recarregar: () => executar('inicial'),
  };
}
