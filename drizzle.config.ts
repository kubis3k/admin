import { defineConfig } from "drizzle-kit";

// DATABASE_URL musí ukazovat na Neon Postgres instanci.
// Založ ji v Neon konzoli / přes MCP a dej connection string do .env.local
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
