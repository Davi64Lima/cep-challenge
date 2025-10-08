# 🏢 CEP Challenge API

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)](https://swagger.io/)

> API REST robusta para consulta de CEP brasileiro com alternância aleatória entre provedores, fallback automático, cache inteligente e resiliência completa.

---

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Características](#-características)
- [Arquitetura](#️-arquitetura)
- [Tecnologias](#️-tecnologias)
- [Instalação](#-instalação)
- [Uso](#-uso)
- [Testes](#-testes)
- [API Endpoints](#-api-endpoints)
- [Tratamento de Erros](#️-tratamento-de-erros)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Docker](#-docker)
- [Roadmap](#️-roadmap)
- [Licença](#-licença)

---

## 🎯 Sobre o Projeto

API desenvolvida em **NestJS** que resolve o desafio de consultar CEPs brasileiros com alta disponibilidade e performance. Implementa estratégias avançadas de resiliência, incluindo:

- ✅ **Alternância aleatória** entre provedores (ViaCEP 70% / BrasilAPI 30%)
- ✅ **Fallback automático** em caso de falha
- ✅ **Cache inteligente** com TTL de 24 horas
- ✅ **Tratamento granular** de erros (404, 5xx, timeout)
- ✅ **Validação robusta** de CEP
- ✅ **Documentação Swagger** interativa
- ✅ **Health checks** completos
- ✅ **Request ID** para rastreabilidade

---

## ✨ Características

### 🔄 Distribuição de Carga Inteligente

```
70% → ViaCEP (provider primário)
30% → BrasilAPI (provider secundário)
```

- Seleção **probabilística** baseada em pesos configuráveis
- Ordem de fallback automática em caso de falha
- Logs detalhados de cada tentativa

### 🛡️ Resiliência Multi-Camada

```
Request → Validação → Cache? → Provider 1 → Provider 2 → Erro 404/503/504
                 ↓               ↓              ↓
              Cache Hit      Success        Success
```

**Estratégias implementadas:**

- ✅ Timeout configurável por provider (5s default)
- ✅ Diferenciação de erros (404 vs 5xx vs timeout)
- ✅ Fallback em cascata (até esgotar todos os providers)
- ✅ Cache para reduzir chamadas externas

### 📊 Tratamento de Erros Padronizado

Todos os erros seguem o formato **RFC 7807** (Problem Details):

```json
{
  "code": "CEP_NOT_FOUND",
  "message": "CEP não encontrado em nenhum dos provedores disponíveis",
  "details": {
    "cep": "99999999",
    "attempts": 2,
    "providers": ["ViaCEP", "BrasilAPI"]
  },
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-01-07T10:30:00.000Z",
  "path": "/api/v1/cep/99999999"
}
```

### 🚀 Performance e Cache

- **Cache em memória** com `cache-manager`
- **TTL padrão:** 24 horas (configurável via `.env`)
- **Máximo de itens:** 1000 (evita memory leak)
- **Hit rate esperado:** ~80% após warm-up

---

## 🏗️ Arquitetura

### Diagrama de Fluxo

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/v1/cep/01310100
       ▼
┌─────────────────────────────────────────────┐
│          CepController                      │
│  - Validação (CepValidationPipe)           │
│  - Normalização (remove hífen)              │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│          CepService                         │
│  1. Consulta cache                          │
│  2. Cache miss? → Seleciona providers       │
│  3. Tenta provider primário                 │
│  4. Falha? → Tenta secundário               │
│  5. Sucesso? → Grava no cache               │
└──────┬──────────────────────────────────────┘
       │
       ├─────────────────┬────────────────────┐
       ▼                 ▼                    ▼
┌──────────────┐  ┌──────────────┐   ┌──────────────┐
│ ViaCepProvider│  │BrasilApiProv.│   │   (Futuro)   │
│   (70%)      │  │   (30%)      │   │  OutroProvider│
└──────────────┘  └──────────────┘   └──────────────┘
```

### Camadas da Aplicação

```
src/
├── app.module.ts              # Módulo raiz
├── main.ts                    # Bootstrap da aplicação
│
├── cep/                       # Módulo de CEP (feature)
│   ├── cep.controller.ts      # Endpoints REST
│   ├── cep.service.ts         # Lógica de negócio
│   ├── cep.module.ts          # Configuração do módulo
│   │
│   ├── providers/             # Adapters para APIs externas
│   │   ├── viacep.provider.ts
│   │   ├── brasilapi.provider.ts
│   │   └── providerSelector.ts # Estratégia de seleção
│   │
│   ├── interfaces/            # Contratos
│   │   └── cep-provider.interface.ts
│   │
│   └── err/                   # Exceções customizadas
│       └── cep-exception.ts
│
├── common/                    # Código compartilhado
│   ├── dto/                   # Data Transfer Objects
│   ├── pipes/                 # Validação
│   ├── interceptors/          # Request ID, Logging
│   └── filter/                # Exception Filter global
│
├── config/                    # Configurações
│   ├── configuration.ts       # Variáveis de ambiente
│   ├── validation.ts          # Schema Joi
│   └── provider.config.ts     # Config dos providers
│
├── health/                    # Health checks
│   └── health.controller.ts
│
└── swagger/                   # Documentação API
    └── swagger.config.ts
```

---

## 🛠️ Tecnologias

| Tecnologia        | Versão | Uso                    |
| ----------------- | ------ | ---------------------- |
| **NestJS**        | ^11.0  | Framework principal    |
| **TypeScript**    | ^5.7   | Linguagem              |
| **Axios**         | ^1.12  | HTTP client            |
| **RxJS**          | ^7.8   | Programação reativa    |
| **Cache Manager** | ^7.2   | Cache em memória       |
| **Swagger**       | ^11.2  | Documentação API       |
| **Joi**           | ^18.0  | Validação de env       |
| **Jest**          | ^29.7  | Testes unitários       |
| **Nock**          | ^14.0  | Mock HTTP (testes E2E) |
| **Docker**        | -      | Containerização        |

---

## 📦 Instalação

### Pré-requisitos

- **Node.js** >= 18.x
- **Yarn** ou **npm**
- **Docker** (opcional)

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/Davi64lima/cep-challenge.git
cd cep-challenge

# 2. Instale as dependências
yarn install
# ou
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env

# 4. (Opcional) Ajuste as configurações em .env
# PORT, CACHE_TTL_SEC, HTTP_TIMEOUT_MS, etc.
```

---

## 🚀 Uso

### Desenvolvimento

```bash
# Modo watch (hot reload)
yarn start:dev

# Acessar aplicação
http://localhost:3000

# Acessar Swagger
http://localhost:3000/docs

# Health check
http://localhost:3000/health
```

### Produção

```bash
# Build
yarn build

# Executar
yarn start:prod

# ou
node dist/main.js
```

---

## 🧪 Testes

### Estrutura de Testes

```
test/
├── app.e2e-spec.ts                    # Testes E2E (nock)
│
src/
├── cep/
│   ├── cep.service.spec.ts            # Testes de integração
│   └── providers/test/
│       ├── viacep.provider.spec.ts    # Testes unitários
│       ├── brasilapi.provider.spec.ts
│       └── providerSelector.spec.ts
│
└── common/pipes/
    └── cep-validation.pipe.spec.ts    # Testes de validação
```

### Comandos

```bash
# Testes unitários
yarn test

# Testes E2E
yarn test:e2e

# Coverage
yarn test:cov

# Watch mode
yarn test:watch
```

### Exemplos de Testes

**Teste E2E com Nock:**

```typescript
it('deve fazer fallback para BrasilAPI quando ViaCEP falha', async () => {
  nock('https://viacep.com.br')
    .get('/ws/01310100/json/')
    .reply(503, 'Service Unavailable');

  nock('https://brasilapi.com.br')
    .get('/api/cep/v1/01310100')
    .reply(200, { cep: '01310100', street: 'Avenida Paulista', ... });

  await request(app.getHttpServer())
    .get('/api/v1/cep/01310100')
    .expect(200);
});
```

**Teste Unitário com Mock Determinístico:**

```typescript
it('deve selecionar ViaCEP quando random < 0.7', () => {
  const mockRandom = jest.fn().mockReturnValue(0.3);
  providerSelector.setRandomGenerator(mockRandom);

  const result = providerSelector.selectProviders([
    { provider: viaCep, weight: 70 },
    { provider: brasilApi, weight: 30 },
  ]);

  expect(result.ordered[0].name).toBe('ViaCEP');
});
```

---

## 📡 API Endpoints

### Base URL

```
http://localhost:3000
```

### Endpoints

#### `GET /api/v1/cep/:cep`

Consulta endereço por CEP.

**Request:**

```bash
curl -X GET http://localhost:3000/api/v1/cep/01310-100
```

**Response 200 (Sucesso):**

```json
{
  "cep": "01310-100",
  "street": "Avenida Paulista",
  "complement": "de 612 a 1510 - lado par",
  "neighborhood": "Bela Vista",
  "city": "São Paulo",
  "state": "SP",
  "source": "viacep",
  "fetched_at": "2025-10-08T14:30:00.000Z"
}
```

**Response 400 (CEP Inválido):**

```json
{
  "code": "INVALID_CEP",
  "message": "CEP inválido. O CEP deve conter 8 dígitos numéricos.",
  "details": {
    "received": "abc123",
    "expectedFormat": "12345-678 ou 12345678"
  },
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-10-08T10:30:00.000Z",
  "path": "/api/v1/cep/abc123"
}
```

#### `GET /health`

Verifica saúde da aplicação e dependências.

**Response:**

```json
{
  "status": "ok",
  "info": {
    "viacep": { "status": "up" },
    "brasilapi": { "status": "up" },
    "memory_heap": { "status": "up" },
    "memory_rss": { "status": "up" }
  }
}
```

#### `GET /docs`

Documentação Swagger interativa.

---

## ⚠️ Tratamento de Erros

### Códigos de Erro

| Código                 | HTTP Status | Descrição                | Ação             |
| ---------------------- | ----------- | ------------------------ | ---------------- |
| `INVALID_CEP`          | 400         | CEP com formato inválido | Corrigir formato |
| `CEP_NOT_FOUND`        | 404         | CEP não existe           | Verificar CEP    |
| `UPSTREAM_UNAVAILABLE` | 503         | Providers indisponíveis  | Tentar novamente |
| `GATEWAY_TIMEOUT`      | 504         | Timeout nos providers    | Tentar novamente |

### Fluxo de Decisão de Erro

```
Provider 1 falha → Código?
  ├─ CEP_NOT_FOUND (404) → Tentar Provider 2
  ├─ GATEWAY_TIMEOUT     → Tentar Provider 2
  └─ UPSTREAM_UNAVAILABLE (5xx) → Tentar Provider 2

Ambos falharam → Qual erro predominante?
  ├─ Todos 404 → Retornar CEP_NOT_FOUND
  ├─ Algum timeout → Retornar GATEWAY_TIMEOUT
  └─ Resto → Retornar UPSTREAM_UNAVAILABLE
```

---

## 🔧 Variáveis de Ambiente

```bash
# Aplicação
PORT=3000                          # Porta da aplicação
NODE_ENV=development               # Ambiente (development | test | production)

# ViaCEP
VIACEP_BASE_URL=https://viacep.com.br/ws
VIACEP_TIMEOUT=5000               # Timeout em ms
VIACEP_RETRIES=0                  # Tentativas de retry

# BrasilAPI
BRASILAPI_BASE_URL=https://brasilapi.com.br/api/cep/v1
BRASILAPI_TIMEOUT=5000
BRASILAPI_RETRIES=0

# HTTP Client
HTTP_TIMEOUT_MS=2000              # Timeout global

# Cache
ENABLE_CACHE=true                 # Ativar/desativar cache
CACHE_TTL_SEC=900                 # TTL do cache (15min)

# Observabilidade
LOG_LEVEL=info                    # fatal | error | warn | info | debug | trace
REQUEST_ID_HEADER=x-request-id    # Header para request ID

# Swagger
ENABLE_SWAGGER=true               # Ativar/desativar Swagger
SWAGGER_PATH=/docs                # Caminho do Swagger

# Health
HEALTH_PATH=/health               # Caminho do health check
```

---

## 🐳 Docker

### Build e execução

```bash
# Build da imagem
docker build -t cep-challenge .

# Executar container
docker run -p 3000:3000 --env-file .env cep-challenge
```

### Docker Compose

```bash
# Subir aplicação
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

---

## 🗺️ Roadmap

- [ ] **Adicionar novos providers** (ApiCEP, PostMon)
- [ ] **Implementar Redis** para cache distribuído
- [ ] **Métricas Prometheus** para monitoramento
- [ ] **Rate limiting** por IP
- [ ] **Circuit breaker** para providers
- [ ] **Retry exponencial** com backoff
- [ ] **GraphQL** como alternativa ao REST
- [ ] **Webhooks** para notificações de falha
- [ ] **Admin dashboard** para métricas

---

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo LICENSE para mais detalhes.

---

## 👤 Autor

**Davi Lima**

- GitHub: [@Davi64lima](https://github.com/Davi64lima)
- Email: devdavi64lima@gmail.com
- LinkedIn: [Davi Lima](https://linkedin.com/in/davi64lima)

---
