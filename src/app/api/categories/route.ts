import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

async function getUserId(): Promise<string | null> {
  try {
    const h = await headers();
    const authHeader = h.get("authorization");
    
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return decoded.userId;
  } catch {
    return null;
  }
}

// GET /api/categories
export async function GET() {
  const userId = await getUserId();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      type: true, // <-- Убедись что это есть
    },
  });

  return NextResponse.json(categories);
}

// POST /api/categories
export async function POST(req: Request) {
  const userId = await getUserId();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const category = await prisma.category.create({
    data: {
      name: body.name,
      type: body.type, // <-- ОБЯЗАТЕЛЬНО
      userId,
    },
  });

  return NextResponse.json(category, { status: 201 });
}

// DELETE /api/categories/:id - нужен отдельный файл