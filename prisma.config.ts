import { defineConfig } from "@prisma/config";
import dotenv from "dotenv";

// Загружаем .env.local вручную
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
});
