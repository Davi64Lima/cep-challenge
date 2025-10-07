export interface ProviderConfig {
  baseURL: string;
  timeout: number;
  retries?: number;
}

export interface ProvidersConfig {
  viacep: ProviderConfig;
  brasilapi: ProviderConfig;
}

export const providersConfig = (): { providers: ProvidersConfig } => ({
  providers: {
    viacep: {
      baseURL: process.env.VIACEP_BASE_URL || 'https://viacep.com.br/ws',
      timeout: parseInt(process.env.VIACEP_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.VIACEP_RETRIES || '0', 10),
    },
    brasilapi: {
      baseURL:
        process.env.BRASILAPI_BASE_URL || 'https://brasilapi.com.br/api/cep/v1',
      timeout: parseInt(process.env.BRASILAPI_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.BRASILAPI_RETRIES || '0', 10),
    },
  },
});
