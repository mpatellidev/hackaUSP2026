// Texto estático de emergência. Embutido no app: não depende de rede, IA, vaga ou fila.
// Espelha backend/app/modulos/urgencia/textos.py.
// PENDENTE: validação clínica/jurídica antes de qualquer uso real (protótipo).
export const SAMU = '192';

export const ORIENTACAO_EMERGENCIA =
  'Se você ou alguém perto de você está com falta de ar forte, dor forte no peito, desmaio, ' +
  'sangramento que não para, convulsão, confusão repentina ou risco de vida, ' +
  'ligue 192 (SAMU) ou vá agora ao pronto-socorro mais próximo. ' +
  'Não espere resposta da clínica-escola nem vaga.';

export const ROTULO_AGUARDANDO = 'Aguardando avaliação';

export const AVISO_RELATO =
  'Seu relato foi registrado e será visto por um profissional da clínica. ' +
  'Isso não é um atendimento, não garante contato imediato e não é um diagnóstico. ' +
  'Se for grave, ligue 192 (SAMU) agora.';

export const AVISO_DEMO =
  'Protótipo com dados fictícios. Os textos de emergência ainda precisam de validação clínica.';
