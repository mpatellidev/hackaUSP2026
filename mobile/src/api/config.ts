// Configuração vinda de variáveis EXPO_PUBLIC_* (ficam visíveis dentro do app: nada secreto aqui).

export type ModoConfigurado = 'mock' | 'api';

export const MODO_CONFIGURADO: ModoConfigurado =
  process.env.EXPO_PUBLIC_API_MODO === 'api' ? 'api' : 'mock';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
export const PREFIXO_API = '/api/v1';
