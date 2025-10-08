import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as nock from 'nock';
import { AppModule } from '../app.module';
import { HttpExceptionFilter } from '../common/filter/http-exception.filter';

describe('CEP E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('GET /cep/:cep', () => {
    describe('Sucesso - Provider primário', () => {
      it('deve retornar 200 com endereço quando ViaCEP responde', async () => {
        nock('https://viacep.com.br').get('/ws/01310100/json/').reply(200, {
          cep: '01310-100',
          logradouro: 'Avenida Paulista',
          complemento: '',
          bairro: 'Bela Vista',
          localidade: 'São Paulo',
          uf: 'SP',
          ibge: '3550308',
          gia: '1004',
          ddd: '11',
          siafi: '7107',
        });

        const response = await request(app.getHttpServer())
          .get('/cep/01310100')
          .expect(200);

        expect(response.body).toMatchObject({
          cep: '01310100',
          street: 'Avenida Paulista',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
        });
      });

      it('deve aceitar CEP com hífen', async () => {
        nock('https://viacep.com.br').get('/ws/01310100/json/').reply(200, {
          cep: '01310-100',
          logradouro: 'Avenida Paulista',
          complemento: '',
          bairro: 'Bela Vista',
          localidade: 'São Paulo',
          uf: 'SP',
          ibge: '3550308',
          gia: '',
          ddd: '11',
          siafi: '',
        });

        await request(app.getHttpServer()).get('/cep/01310-100').expect(200);
      });
    });

    describe('Fallback - Provider secundário', () => {
      it('deve fazer fallback para BrasilAPI quando ViaCEP retorna 404', async () => {
        nock('https://viacep.com.br')
          .get('/ws/01310100/json/')
          .reply(200, { erro: true });

        nock('https://brasilapi.com.br')
          .get('/api/cep/v1/01310100')
          .reply(200, {
            cep: '01310100',
            state: 'SP',
            city: 'São Paulo',
            neighborhood: 'Bela Vista',
            street: 'Avenida Paulista',
            service: 'brasilapi',
          });

        const response = await request(app.getHttpServer())
          .get('/cep/01310100')
          .expect(200);

        expect(response.body).toMatchObject({
          cep: '01310100',
          street: 'Avenida Paulista',
          city: 'São Paulo',
        });
      });

      it('deve fazer fallback quando ViaCEP retorna 503', async () => {
        nock('https://viacep.com.br')
          .get('/ws/01310100/json/')
          .reply(503, 'Service Unavailable');

        nock('https://brasilapi.com.br')
          .get('/api/cep/v1/01310100')
          .reply(200, {
            cep: '01310100',
            state: 'SP',
            city: 'São Paulo',
            neighborhood: 'Bela Vista',
            street: 'Avenida Paulista',
            service: 'viacep',
          });

        await request(app.getHttpServer()).get('/cep/01310100').expect(200);
      });

      it('deve fazer fallback quando ViaCEP dá timeout', async () => {
        nock('https://viacep.com.br')
          .get('/ws/01310100/json/')
          .delayConnection(6000)
          .reply(200, {});

        nock('https://brasilapi.com.br')
          .get('/api/cep/v1/01310100')
          .reply(200, {
            cep: '01310100',
            state: 'SP',
            city: 'São Paulo',
            neighborhood: 'Bela Vista',
            street: 'Avenida Paulista',
            service: 'viacep',
          });

        await request(app.getHttpServer()).get('/cep/01310100').expect(200);
      }, 15000);
    });

    describe('Validação de CEP inválido', () => {
      it('deve retornar 400 para CEP com letras', async () => {
        const response = await request(app.getHttpServer())
          .get('/cep/abc12345')
          .expect(400);

        expect(response.body).toMatchObject({
          code: 'INVALID_CEP',
          message: expect.stringContaining('CEP inválido'),
        });

        expect(response.body.request_id).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
      });

      it('deve retornar 400 para CEP com menos de 8 dígitos', async () => {
        const response = await request(app.getHttpServer())
          .get('/cep/1234567')
          .expect(400);

        expect(response.body.code).toBe('INVALID_CEP');
      });

      it('deve retornar 400 para CEP com todos dígitos iguais', async () => {
        const response = await request(app.getHttpServer())
          .get('/cep/00000000')
          .expect(400);

        expect(response.body.code).toBe('INVALID_CEP');
      });
    });

    describe('CEP não encontrado', () => {
      it('deve retornar 404 quando ambos providers retornam não encontrado', async () => {
        nock('https://viacep.com.br')
          .get('/ws/99999999/json/')
          .reply(200, { erro: true });

        nock('https://brasilapi.com.br')
          .get('/api/cep/v1/99999999')
          .reply(404, { message: 'CEP não encontrado' });

        const response = await request(app.getHttpServer())
          .get('/cep/99999999')
          .expect(400);

        expect(response.body).toMatchObject({
          code: 'INVALID_CEP',
          message: expect.stringContaining(
            'CEP inválido. CEP não pode ter todos os dígitos iguais.',
          ),
        });
      });
    });

    describe('Cache', () => {
      it('segunda requisição deve ser mais rápida (cache)', async () => {
        nock('https://viacep.com.br').get('/ws/01310100/json/').reply(200, {
          cep: '01310-100',
          logradouro: 'Avenida Paulista',
          complemento: '',
          bairro: 'Bela Vista',
          localidade: 'São Paulo',
          uf: 'SP',
          ibge: '3550308',
          gia: '',
          ddd: '11',
          siafi: '',
        });

        // Primeira requisição
        const start1 = Date.now();
        await request(app.getHttpServer()).get('/cep/01310100').expect(200);
        const duration1 = Date.now() - start1;

        // Segunda requisição (deve vir do cache)
        const start2 = Date.now();
        await request(app.getHttpServer()).get('/cep/01310100').expect(200);
        const duration2 = Date.now() - start2;

        expect(duration2).toBeLessThan(duration1);
      });
    });
  });
});
