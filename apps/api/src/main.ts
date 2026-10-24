import 'reflect-metadata';
import { createApp } from './create-app.js';

async function bootstrap() {
  const app = await createApp();
  await app.listen(Number(process.env.PORT ?? process.env.API_PORT ?? 3000));
}

void bootstrap();
