import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, type SwaggerCustomOptions, SwaggerModule } from "@nestjs/swagger";
import * as dotenv from "dotenv";

import { AppModule } from "./app.module";

dotenv.config({ path: ".env" });

async function bootstrap() {
  const app: NestExpressApplication = await NestFactory.create(AppModule, {
    cors: true,
  });

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix("api");

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Drug Store API")
    .setDescription("Patient history API for drug store.")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    deepScanRoutes: true,
  });
  const customOptions: SwaggerCustomOptions = {
    swaggerOptions: { persistAuthorization: false, docExpansion: "none" },
    customSiteTitle: "Drug Store API Documentation",
  };
  SwaggerModule.setup("docs", app, document, customOptions);

  const port = Number(process.env.PORT ?? 3051);
  await app.listen(port);
  console.log(`[API] http://localhost:${port}/docs`);
}
bootstrap();
