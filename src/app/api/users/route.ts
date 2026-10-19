import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySessionToken, ADMIN_COOKIE_NAME, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getAdminSession(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = verifySessionToken(token);
  if (!session || session.role !== 'admin') return null;
  return session;
}

// 1. GET /api/users - List all users (Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = getAdminSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (สำหรับผู้ดูแลระบบ Admin เท่านั้น)' },
        { status: 403 }
      );
    }

    const users = await prisma.adminUser.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { projects: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// 2. POST /api/users - Create a new user (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = getAdminSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (สำหรับผู้ดูแลระบบ Admin เท่านั้น)' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, password, name, role } = body;

    if (!username || !username.trim()) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกชื่อผู้ใช้งาน (Username)' }, { status: 400 });
    }

    if (!password || password.trim().length < 4) {
      return NextResponse.json({ success: false, error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const userRole = role === 'admin' ? 'admin' : 'user';

    // Check if username already exists
    const existing = await prisma.adminUser.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `ชื่อผู้ใช้งาน "${cleanUsername}" มีอยู่ในระบบแล้ว` },
        { status: 400 }
      );
    }

    const newUser = await prisma.adminUser.create({
      data: {
        username: cleanUsername,
        password: hashPassword(password.trim()),
        name: name?.trim() || null,
        role: userRole,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: newUser,
      message: `สร้างผู้ใช้งาน ${cleanUsername} สำเร็จ`,
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}
