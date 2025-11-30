import { NextResponse } from "next/server";
import { CategoryType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

const DEFAULT_CATEGORIES: { name: string; type: CategoryType }[] = [
  { name: "Зарплата", type: CategoryType.INCOME },
  { name: "Фриланс", type: CategoryType.INCOME },
  { name: "Инвестиции", type: CategoryType.INCOME },

  { name: "Продукты", type: CategoryType.EXPENSE },
  { name: "Транспорт", type: CategoryType.EXPENSE },
  { name: "Развлечения", type: CategoryType.EXPENSE },
  { name: "Здоровье", type: CategoryType.EXPENSE },
  { name: "Одежда", type: CategoryType.EXPENSE },
  { name: "Образование", type: CategoryType.EXPENSE },
  { name: "Прочее", type: CategoryType.EXPENSE },
];


export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
  data: {
    email,
    name,
    password: hashedPassword,
  },
});

    // Создаем дефолтные категории
    await Promise.all(
  DEFAULT_CATEGORIES.map(async (cat) => {
    try {
      await prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type,   
          userId: user.id,
        },
      });
    } catch (e) {
      console.error("Failed to create category:", cat, e);
    }
  })
);


    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "30d",
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}