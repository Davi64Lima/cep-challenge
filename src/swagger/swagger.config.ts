import { SwaggerCustomOptions } from '@nestjs/swagger';

export const swaggerConfig: SwaggerCustomOptions = {
  customSiteTitle: 'CEP API - Documentação Interativa',
  customfavIcon: 'https://nestjs.com/img/logo-small.svg',
  customCss: `
    .swagger-ui .topbar { 
      background-color: #1a1a1a; 
    }
    .swagger-ui .topbar-wrapper img { 
      content: url('https://nestjs.com/img/logo-small.svg'); 
    }
    .swagger-ui .info .title { 
      color: #e0234e; 
    }
    .swagger-ui .scheme-container { 
      background: #fafafa; 
      box-shadow: 0 1px 2px 0 rgba(0,0,0,.15); 
    }
  `,
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true,
    showRequestDuration: true,
    syntaxHighlight: {
      activate: true,
      theme: 'monokai',
    },
    tryItOutEnabled: true,
  },
};
