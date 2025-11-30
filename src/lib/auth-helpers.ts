// src/lib/auth-helpers.ts
import { headers } from "next/headers";
import jwt from "jsonwebtoken";

export async function getUserIdFromToken(): Promise<string | null> {
  try {
    const h = await headers();
    const authHeader = h.get("authorization");
    
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("❌ No Bearer token");
      return null;
    }

    const token = authHeader.replace("Bearer ", "");
    
    console.log("🔑 Verifying token with SECRET:", process.env.JWT_SECRET?.substring(0, 10) + "...");
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    console.log("✅ Token valid! UserId:", decoded.userId);
    
    return decoded.userId;
  } catch (error) {
    console.error("❌ Token verification error:", error);
    return null;
  }
}