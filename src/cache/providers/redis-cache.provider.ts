import { createClient, RedisClientType } from 'redis';
import { ICacheProvider } from '../interfaces/cache-provider.interface';
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { CacheConfig } from '../cache.config';

@Injectable()
export class RedisCacheProvider
  implements ICacheProvider, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisCacheProvider.name);
  private client: RedisClientType;
  private readonly ttl: number;
  private isConnected = false;

  constructor(private readonly config: CacheConfig) {
    this.ttl = config.ttl;

    this.client = createClient({
      url: config.redis?.url || 'redis://localhost:6379',
    });

    // Eventos de conexão
    this.client.on('connect', () => {
      this.logger.log('Conectando ao Redis...');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis conectado e pronto');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      this.logger.error('Erro no Redis:', error);
      this.isConnected = false;
    });

    this.client.on('end', () => {
      this.logger.warn('Conexão Redis encerrada');
      this.isConnected = false;
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log(
        `Redis cache provider inicializado com TTL: ${this.ttl}s`,
      );
    } catch (error) {
      this.logger.error('Falha ao conectar Redis:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.client.quit();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      this.logger.warn(`Redis desconectado. Cache MISS: ${key}`);
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        this.logger.debug(`Redis Cache HIT: ${key}`);
        return JSON.parse(value) as T;
      } else {
        this.logger.debug(`Redis Cache MISS: ${key}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Erro ao buscar chave ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn(`Redis desconectado. Não foi possível cachear: ${key}`);
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      const ttl = ttlSeconds || this.ttl;

      if (ttl > 0) {
        await this.client.setEx(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      this.logger.debug(`Redis Cache SET: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Erro ao definir chave ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.del(key);
      this.logger.debug(`Redis Cache DEL: ${key}`);
    } catch (error) {
      this.logger.error(`Erro ao deletar chave ${key}:`, error);
    }
  }

  async clear(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.flushDb();
      this.logger.log('Redis cache limpo');
    } catch (error) {
      this.logger.error('Erro ao limpar cache:', error);
    }
  }

  async has(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.error(`Erro ao verificar chave ${key}:`, error);
      return false;
    }
  }
}
