import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Stress Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const CONCURRENT_REQUESTS = 50;
  const TOTAL_REQUESTS = 500;

  it('should handle multiple concurrent CEP requests', async () => {
    const validCep = '01310-100';
    const promises: Promise<any>[] = [];

    console.log(
      `Starting stress test with ${CONCURRENT_REQUESTS} concurrent requests...`,
    );
    const startTime = Date.now();

    // Create batches of concurrent requests
    for (let batch = 0; batch < TOTAL_REQUESTS / CONCURRENT_REQUESTS; batch++) {
      const batchPromises: Promise<any>[] = [];

      for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
        batchPromises.push(
          request(app.getHttpServer())
            .get(`/cep/${validCep}`)
            .expect((res) => {
              expect([200, 404]).toContain(res.status);
            }),
        );
      }

      // Wait for current batch to complete before starting next
      const results = await Promise.allSettled(batchPromises);

      // Check for failures
      const failures = results.filter((result) => result.status === 'rejected');
      expect(failures.length).toBeLessThan(CONCURRENT_REQUESTS * 0.1); // Allow up to 10% failure rate

      promises.push(...batchPromises);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const requestsPerSecond = TOTAL_REQUESTS / (duration / 1000);

    console.log(`Stress test completed:`);
    console.log(`- Total requests: ${TOTAL_REQUESTS}`);
    console.log(`- Duration: ${duration}ms`);
    console.log(`- Requests per second: ${requestsPerSecond.toFixed(2)}`);

    expect(promises.length).toBe(TOTAL_REQUESTS);
  }, 120000); // 2 minute timeout

  it('should handle mixed valid and invalid CEP requests under load', async () => {
    const testCeps = [
      '01310-100', // valid
      '00000-000', // invalid
      '12345-678', // valid format
      'invalid', // invalid format
      '01310100', // valid without dash
    ];

    const promises: Promise<any>[] = [];
    const REQUESTS_PER_CEP = 20;

    for (const cep of testCeps) {
      for (let i = 0; i < REQUESTS_PER_CEP; i++) {
        promises.push(
          request(app.getHttpServer())
            .get(`/cep/${cep}`)
            .then((response) => ({
              cep,
              status: response.status,
              success: [200, 400, 404].includes(response.status),
              responseTime: response.header['x-response-time'] || 0,
            }))
            .catch((error) => ({
              cep,
              status: 500,
              success: false,
              error: error.message,
            })),
        );
      }
    }

    const results = await Promise.all(promises);

    // Group results by CEP
    const resultsByCep = results.reduce((acc, result) => {
      if (!acc[result.cep]) acc[result.cep] = [];
      acc[result.cep].push(result);
      return acc;
    }, {});

    // Verify consistency for each CEP
    Object.entries(resultsByCep).forEach(
      ([cep, cepResults]: [string, any[]]) => {
        const successRate =
          cepResults.filter((r) => r.success).length / cepResults.length;
        expect(successRate).toBeGreaterThan(0.9); // At least 90% success rate per CEP

        console.log(
          `CEP ${cep}: ${(successRate * 100).toFixed(1)}% success rate`,
        );
      },
    );

    const overallSuccessRate =
      results.filter((r) => r.success).length / results.length;
    console.log(
      `Overall success rate: ${(overallSuccessRate * 100).toFixed(1)}%`,
    );
    expect(overallSuccessRate).toBeGreaterThan(0.9);
  }, 60000);

  it('should maintain performance under sustained load', async () => {
    const validCep = '01310-100';
    const DURATION_MS = 15000; // 15 seconds
    const BATCH_SIZE = 10;
    const BATCH_DELAY = 200; // ms between batches

    const startTime = Date.now();
    const results: any[] = [];

    console.log('Starting sustained load test for 15 seconds...');

    while (Date.now() - startTime < DURATION_MS) {
      const batchStart = Date.now();

      const batchPromises = Array(BATCH_SIZE)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get(`/cep/${validCep}`)
            .then((response) => ({
              responseTime: Date.now() - batchStart,
              status: response.status,
              timestamp: Date.now(),
            }))
            .catch((error) => ({
              responseTime: Date.now() - batchStart,
              status: 500,
              error: error.message,
              timestamp: Date.now(),
            })),
        );

      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        console.warn('Batch failed:', error.message);
      }

      // Delay between batches to prevent overwhelming
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
    }

    const successfulRequests = results.filter((r) =>
      [200, 404].includes(r.status),
    );
    const averageResponseTime =
      successfulRequests.length > 0
        ? successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) /
          successfulRequests.length
        : 0;
    const successRate =
      results.length > 0 ? successfulRequests.length / results.length : 0;

    console.log(`Sustained load test results:`);
    console.log(`- Total requests: ${results.length}`);
    console.log(`- Success rate: ${(successRate * 100).toFixed(2)}%`);
    console.log(`- Average response time: ${averageResponseTime.toFixed(2)}ms`);

    expect(results.length).toBeGreaterThan(0);
    expect(successRate).toBeGreaterThan(0.8); // At least 80% success rate
    expect(averageResponseTime).toBeLessThan(10000); // Average response time under 10 seconds
  }, 20000);

  it('should handle error scenarios gracefully under load', async () => {
    const invalidCeps = ['invalid-cep', '123', 'abcde-fgh', '99999-999', ''];

    const promises: Promise<any>[] = [];
    const REQUESTS_PER_INVALID_CEP = 10;

    for (const cep of invalidCeps) {
      for (let i = 0; i < REQUESTS_PER_INVALID_CEP; i++) {
        promises.push(
          request(app.getHttpServer())
            .get(`/cep/${encodeURIComponent(cep)}`)
            .then((response) => ({
              cep,
              status: response.status,
              handled: [400, 404].includes(response.status),
            }))
            .catch((error) => ({
              cep,
              status: 500,
              handled: false,
              error: error.message,
            })),
        );
      }
    }

    const results = await Promise.all(promises);
    const handledErrors = results.filter((r) => r.handled).length;
    const handledRate = handledErrors / results.length;

    console.log(`Error handling test:`);
    console.log(`- Invalid requests: ${results.length}`);
    console.log(`- Properly handled: ${(handledRate * 100).toFixed(1)}%`);

    expect(handledRate).toBeGreaterThan(0.95); // At least 95% should be properly handled
  }, 30000);

  it('should not have memory leaks during extended operation', async () => {
    const validCep = '01310-100';
    const ITERATIONS = 100;
    const results: any[] = [];

    // Measure initial memory
    const initialMemory = process.memoryUsage();

    for (let i = 0; i < ITERATIONS; i++) {
      const response = await request(app.getHttpServer())
        .get(`/cep/${validCep}`)
        .catch((error) => ({ status: 500, error: error.message }));

      results.push(response);

      // Force garbage collection every 20 iterations if available
      if (i % 20 === 0 && global.gc) {
        global.gc();
      }
    }

    // Measure final memory
    const finalMemory = process.memoryUsage();
    const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
    const memoryGrowthMB = memoryGrowth / 1024 / 1024;

    console.log(`Memory usage test:`);
    console.log(
      `- Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    );
    console.log(
      `- Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    );
    console.log(`- Growth: ${memoryGrowthMB.toFixed(2)} MB`);

    const successfulRequests = results.filter((r) =>
      [200, 404].includes(r.status),
    ).length;
    expect(successfulRequests).toBeGreaterThan(ITERATIONS * 0.9);

    // Memory growth should be reasonable (less than 50MB for 100 requests)
    expect(memoryGrowthMB).toBeLessThan(50);
  }, 60000);
});
