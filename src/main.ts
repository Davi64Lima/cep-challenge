import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptors';
import { LoggingInterceptor } from './common/interceptors/logging.interceptors';
import configuration from './config/configuration';

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

  // Swagger opcional
  if (configObj.enableSwagger) {
    const docConfig = new DocumentBuilder()
      .setTitle('CEP Service')
      .setDescription('API de consulta de CEP com provedores externos')
      .setVersion('1.0.0')
      .build();
    const document = SwaggerModule.createDocument(app, docConfig);
    SwaggerModule.setup(configObj.swaggerPath, app, document);
  }

  const port = configObj.port;
  await app.listen(port);
  new Logger('Bootstrap').log(`App running on http://localhost:${port}`);
}
bootstrap();
