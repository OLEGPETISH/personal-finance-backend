import { headers } from "next/headers";
import jwt from "jsonwebtoken";

export async function getUserId() {
  const h = await headers();
  const auth = h.get("authorization");

  if (!auth || !auth.startsWith("Bearer ")) return null;

  try {
    const token = auth.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return decoded.userId as string;
  } catch {
    return null;
  }
}