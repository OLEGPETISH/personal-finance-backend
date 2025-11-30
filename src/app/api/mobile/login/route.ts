import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Проверяем это Google Sign-In или Email/Password
    if (body.idToken) {
      // Google Sign-In (твой существующий код)
      const googleRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${body.idToken}`
      );

      if (!googleRes.ok) {
        return NextResponse.json(
          { error: "Invalid Google token" },
          { status: 401 }
        );
      }

      const data = (await googleRes.json()) as any;
      const email = data.email as string | undefined;
      const name = data.name as string | undefined;

      if (!email) {
        return NextResponse.json(
          { error: "No email in token" },
          { status: 401 }
        );
      }

      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: name ?? "User",
          },
        });
      }

      const backendToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: "30d",
      });

      return NextResponse.json({
        token: backendToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    }

    // Email/Password Login
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing email or password" },
        { status: 400 }
      );
    }

    // Находим пользователя
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Проверяем пароль
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Генерируем JWT
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
    console.error("Login error:", err);
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}