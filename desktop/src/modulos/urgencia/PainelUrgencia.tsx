import React, { useCallback, useEffect, useState } from 'react';
import type { ClienteUrgenciaPainel, RelatoUrgencia } from './api';

interface Props {
  cliente: ClienteUrgenciaPainel;
  /** Só `profissional` vê os botões de avaliação; o servidor também valida (403). */
  funcao: 'atendimento' | 'profissional' | 'coordenacao';
}

export function PainelUrgencia({ cliente, funcao }: Props) {
  const [itens, setItens] = useState<RelatoUrgencia[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [obs, setObs] = useState<Record<string, string>>({});

  const carregar = useCallback(() => {
    cliente.listar().then(setItens).catch((e: Error) => setErro(e.message));
  }, [cliente]);
  useEffect(carregar, [carregar]);

  async function avaliar(id: string, c: 'urgencia_confirmada' | 'sem_urgencia') {
    try {
      await cliente.avaliar(id, c, obs[id]);
      setErro(null);
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <section aria-labelledby="t-urg">
      <h2 id="t-urg">Relatos de urgência <small>(demonstração · dados fictícios)</small></h2>
      <p>
        Avaliação de profissional da clínica. Não é diagnóstico. Urgência grave deve ser orientada ao
        SAMU 192 sem esperar fila. Relato não confirmado não gera penalidade.
      </p>
      {erro && <p role="alert">{erro}</p>}
      <ul>
        {itens.map((r) => (
          <li key={r.id}>
            <strong>{r.rotulo}</strong> · {new Date(r.criado_em).toLocaleString('pt-BR')}
            {r.avaliacao ? (
              <span> · {r.avaliacao.classificacao === 'urgencia_confirmada' ? 'Urgência confirmada' : 'Sem urgência'}
                {r.avaliacao.observacao_administrativa ? ` · ${r.avaliacao.observacao_administrativa}` : ''}</span>
            ) : funcao === 'profissional' ? (
              <div>
                <label>Observação administrativa (sem dados clínicos){' '}
                  <input maxLength={500} value={obs[r.id] ?? ''} onChange={(e) => setObs({ ...obs, [r.id]: e.target.value })} />
                </label>
                <button onClick={() => avaliar(r.id, 'urgencia_confirmada')}>Confirmar urgência</button>
                <button onClick={() => avaliar(r.id, 'sem_urgencia')}>Sem urgência</button>
              </div>
            ) : (
              <em> · aguardando um profissional</em>
            )}
          </li>
        ))}
      </ul>
      {itens.length === 0 && <p>Nenhum relato no momento.</p>}
    </section>
  );
}
