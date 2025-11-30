import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

// GET /api/transactions
export async function GET() {
  try {
    const h = await headers();
    const authHeader = h.get("authorization");
    
    console.log("=== GET /api/transactions ===");
    console.log("Auth header:", authHeader);
    console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);
    
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("❌ No Bearer token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    console.log("Token (first 20 chars):", token.substring(0, 20));
    
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
      console.log("✅ Token decoded:", decoded);
    } catch (err: any) {
      console.error("❌ JWT verify error:", err.message);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decoded.userId;
    console.log("✅ UserId:", userId);

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: { category: true },
      orderBy: [
  { date: "desc" },
  { createdAt: "desc" }
],
    });

    console.log(`✅ Found ${transactions.length} transactions`);
    
    return NextResponse.json(transactions);
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/transactions
export async function POST(req: Request) {
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
    const body = await req.json();

    const transaction = await prisma.transaction.create({
      data: {
        amount: body.amount,
        type: body.type || "EXPENSE",
        categoryId: body.categoryId,
        userId,
        date: body.date 
  ? new Date(body.date) 
  : new Date(),
        note: body.description || "",
      },
      include: { category: true },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}