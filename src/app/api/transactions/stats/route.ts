import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import type { Transaction } from "@prisma/client";

export async function GET() {
  try {
    const h = await headers();
    const authHeader = h.get("authorization");
    
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (err) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decoded.userId;

    const transactions = await prisma.transaction.findMany({
      where: { userId },
    });

    let income = 0;
    let expense = 0;

    transactions.forEach((tx: Transaction) => {
      if (tx.type === "INCOME") income += tx.amount;
      else expense += tx.amount;
    });

    const balance = income - expense;

    return NextResponse.json({ income, expense, balance });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
