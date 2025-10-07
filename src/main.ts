import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptors';
import { LoggingInterceptor } from './common/interceptors/logging.interceptors';
import configuration from './config/configuration';
import { HttpExceptionFilter } from './common/filter/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configObj = configuration();

  // Pipes globais de validação
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Interceptors globais
  app.useGlobalInterceptors(
    new RequestIdInterceptor(),
    new LoggingInterceptor(),
  );

  // Configurar filtro de exceção global
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger
  if (configObj.enableSwagger) {
    const docConfig = new DocumentBuilder()
      .setTitle('CEP Service')
      .setDescription('API de consulta de CEP com provedores externos')
      .setVersion('1.0.0')
      .addTag('cep', 'Operações relacionadas à consulta de CEP')
      .build();
    const document = SwaggerModule.createDocument(app, docConfig);
    SwaggerModule.setup(configObj.swaggerPath, app, document);
  }

  const port = configObj.port;
  await app.listen(port);
  new Logger('Bootstrap').log(
    `🚀 Application is running on: http://localhost:${port}`,
  );
  new Logger('Bootstrap').log(
    `📚 Swagger available at: http://localhost:${port}${configObj.swaggerPath}`,
  );
}
bootstrap().catch((error) => {
  new Logger('Bootstrap').error('Failed to start application', error);
  process.exit(1);
});
