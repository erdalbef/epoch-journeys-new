import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { hashResetToken, validPassword } from "@/lib/auth/passwordReset";

export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    if (Number(req.headers.get("content-length") || 0) > 4096) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const body = await req.json();
    const token: unknown = body?.token;
    const password: unknown = body?.password;
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token) || !validPassword(password)) {
      return NextResponse.json({ error: "Invalid or expired link, or password must be 12-128 characters." }, { status: 400 });
    }
    const tokenHash = hashResetToken(token);
    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();
    const success = await db.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { tokenHash, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now },
      });
      if (claimed.count !== 1) return false;
      const reset = await tx.passwordResetToken.findUnique({ where: { tokenHash }, select: { userId: true } });
      if (!reset) return false;
      await tx.user.update({ where: { id: reset.userId }, data: {
        password: passwordHash, credentialVersion: { increment: 1 },
      } });
      await tx.passwordResetToken.deleteMany({ where: { userId: reset.userId, usedAt: null } });
      return true;
    });
    if (!success) return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Password reset error", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Unable to reset password." }, { status: 500 });
  }
}
