import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/get-user";

export const runtime = "nodejs";

export async function DELETE() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { userId } }),
      prisma.category.deleteMany({ where: { userId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Clear error:", err);
    return NextResponse.json(
      { error: "Failed to clear data" },
      { status: 500 }
    );
  }
}
