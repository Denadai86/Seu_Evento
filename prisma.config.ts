// prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  datasource: {
    url: env("DATABASE_URL"),
    // Se você tiver uma DIRECT_URL (recomendado para Neon), use assim:
    // url: env("DIRECT_URL"),
  },

  // Opcional: configurações de migração
  migrations: {
    path: "prisma/migrations",
  },
});