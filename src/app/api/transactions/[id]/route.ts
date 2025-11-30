// src/app/api/transactions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { headers } from "next/headers";

export const runtime = "nodejs";

// Универсальная функция получения userId
async function getUserIdFromHeaders() {
  try {
    const h = await headers();
    const authHeader = h.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return decoded.userId as string;
  } catch {
    return null;
  }
}

// ---- FIXED FOR NEXT.JS 15/16 ----
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromHeaders();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 🟢 Достаём id из Promise, как требует Next 16
  const { id: transactionId } = await context.params;

  try {
    // Проверяем, что транзакция существует и принадлежит пользователю
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!tx || tx.userId !== userId) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    await prisma.transaction.delete({
      where: { id: transactionId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete transaction error:", err);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}
