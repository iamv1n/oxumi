import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import path from "node:path";
import { AppModule } from "./app.module";
import { AppConfig } from "./config";
import { PhoneWsAdapter } from "./telephony/phone-ws.adapter";

async function bootstrap(): Promise<void> {
  try {
    process.loadEnvFile(path.resolve(process.cwd(), "../../.env"));
  } catch {
    // No .env file; rely on the real environment.
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Behind a load balancer the client address is in X-Forwarded-For.
  if (process.env.TRUST_PROXY) app.set("trust proxy", 1);
  const config = app.get(AppConfig);
  // Credentials on, so the browser sends the session cookie from the web app.
  app.enableCors({ origin: config.webOrigin, credentials: true });
  app.useWebSocketAdapter(new PhoneWsAdapter(app));
  await app.listen(config.port);
}

void bootstrap();
