export const runtime = "nodejs";

import { handlers } from "@/auth";

// экспортируем методы, которые NextAuth сам создаёт
export const GET = handlers.GET;
export const POST = handlers.POST;
