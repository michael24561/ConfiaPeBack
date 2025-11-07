import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import swaggerDocument from '../../docs/swagger.json';

export const setupSwagger = (app: Application) => {
  // Swagger UI options
  const options = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'ConfiaPE API Docs',
  };

  // Swagger route
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));

  console.log('📚 Swagger docs disponibles en /api-docs');
};
