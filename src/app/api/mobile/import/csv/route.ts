import { NextResponse } from "next/server";
import { headers } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { TransactionType, CategoryType } from "@prisma/client";

export const runtime = "nodejs";

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
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decoded.userId;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV is empty" }, { status: 400 });
    }

    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());

    const idxDate = header.indexOf("date");
    const idxCategory = header.indexOf("category");
    const idxType = header.indexOf("type");
    const idxAmount = header.indexOf("amount");
    const idxDesc = header.indexOf("description");

    if (idxDate === -1 || idxCategory === -1 || idxType === -1 || idxAmount === -1) {
      return NextResponse.json(
        { error: "CSV must contain date, category, type, amount" },
        { status: 400 }
      );
    }

    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      if (cols.length < 4) {
        skipped++;
        continue;
      }

      const dateStr = (cols[idxDate] || "").trim();
      const categoryName = (cols[idxCategory] || "").trim() || "Без категории";
      const typeStr = (cols[idxType] || "").trim().toUpperCase();
      const amountStr = (cols[idxAmount] || "").trim();
      const desc = idxDesc !== -1 ? (cols[idxDesc] || "").trim() : "";

      const amount = parseFloat(amountStr.replace(",", "."));
      if (!dateStr || !amount || isNaN(amount)) {
        skipped++;
        continue;
      }

      if (typeStr !== "INCOME" && typeStr !== "EXPENSE") {
        skipped++;
        continue;
      }

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        skipped++;
        continue;
      }

      // находим или создаём категорию
      const category = await prisma.category.upsert({
        where: {
          // уникальность для пары userId+name можно сделать через @@unique
          // но здесь для простоты ищем вручную
          // временный workaround — ищем сначала
          id: "___dummy___", // не используется
        },
        update: {},
        create: {
          name: categoryName,
          type:
            typeStr === "INCOME"
              ? CategoryType.INCOME
              : CategoryType.EXPENSE,
          userId,
        },
      }).catch(async () => {
        // upsert с фиктивным id не сработает, поэтому сделаем так:
        const existing = await prisma.category.findFirst({
          where: { userId, name: categoryName },
        });
        if (existing) return existing;

        return prisma.category.create({
          data: {
            name: categoryName,
            type:
              typeStr === "INCOME"
                ? CategoryType.INCOME
                : CategoryType.EXPENSE,
            userId,
          },
        });
      });

      await prisma.transaction.create({
        data: {
          userId,
          categoryId: category.id,
          type: typeStr as TransactionType,
          amount,
          date,
          note: desc,
        },
      });

      imported++;
    }

    return NextResponse.json({ imported, skipped });
  } catch (e) {
    console.error("Import CSV error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
