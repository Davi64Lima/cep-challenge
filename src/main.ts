import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptors';
import { LoggingInterceptor } from './common/interceptors/logging.interceptors';
import configuration from './config/configuration';
import { HttpExceptionFilter } from './common/filter/http-exception.filter';
import { swaggerConfig } from './swagger/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configObj = configuration();

  // Interceptors globais
  app.useGlobalInterceptors(
    new RequestIdInterceptor(),
    new LoggingInterceptor(),
  );

  // Pipes globais de validação
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Configurar filtro de exceção global
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger
  if (configObj.enableSwagger) {
    const docConfig = new DocumentBuilder()
      .setTitle('CEP API')
      .setDescription(
        'API REST que consulta informações de CEP alternando entre ViaCEP e BrasilAPI com sistema de fallback automático.',
      )
      .setVersion('1.0')
      .addTag('Health', 'Verificação de saúde da API')
      .setContact(
        'Davi Lima ',
        'https://github.com/Davi64lima/cep-challenge',
        'devdavi64lima@gmail.com',
      )
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addServer('http://localhost:3000', 'Ambiente de Desenvolvimento') // TODO: URL do ambiente de desenvolvimento
      .addServer('https://api.seudominio.com', 'Ambiente de Produção') // TODO: URL do ambiente de produção
      .build();

    const document = SwaggerModule.createDocument(app, docConfig);

    SwaggerModule.setup('docs', app, document, swaggerConfig);
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
