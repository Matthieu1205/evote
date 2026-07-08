import { defineConfig } from 'prisma/config';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://user:password@localhost:5432/evote',
  },
});
