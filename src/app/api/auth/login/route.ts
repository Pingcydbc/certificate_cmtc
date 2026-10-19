import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  ensureDefaultAdmin,
  ADMIN_COOKIE_NAME,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = (body.username || '').trim();
    const password = (body.password || '').trim();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน' },
        { status: 400 }
      );
    }

    await ensureDefaultAdmin();

    let admin = await prisma.adminUser.findUnique({
      where: { username },
    });

    const envUser = (process.env.ADMIN_USERNAME || 'admin').trim();
    const envPass = (process.env.ADMIN_PASSWORD || 'admin1234').trim();

    // Fallback if admin does not exist yet but matches env
    if (!admin && username.toLowerCase() === envUser.toLowerCase() && password === envPass) {
      admin = await prisma.adminUser.create({
        data: {
          username: envUser,
          password: hashPassword(envPass),
          name: 'ผู้ดูแลระบบ CMTC',
          role: 'admin',
        },
      });
    }

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, admin.password);
    if (!isValid) {
      // Also allow direct check if default password matches env and admin was freshly updated
      if (username.toLowerCase() === envUser.toLowerCase() && password === envPass) {
        // Reset password to match
        await prisma.adminUser.update({
          where: { id: admin.id },
          data: { password: hashPassword(envPass) },
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' },
          { status: 401 }
        );
      }
    }

    const token = createSessionToken(admin);

    const response = NextResponse.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      user: {
        id: admin.id,
        username: admin.username,
        name: admin.name || 'ผู้ดูแลระบบ',
        role: admin.role,
      },
    });

    // Set HTTP-only secure cookie
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}
