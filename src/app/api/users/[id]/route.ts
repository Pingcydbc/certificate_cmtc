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

// 1. PUT /api/users/[id] - Update user name, role, or reset password (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getAdminSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (สำหรับผู้ดูแลระบบ Admin เท่านั้น)' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { name, role, password } = body;

    const targetUser = await prisma.adminUser.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'ไม่พบผู้ใช้งานนี้ในระบบ' }, { status: 404 });
    }

    const updateData: any = {};
    if (name !== undefined) {
      updateData.name = name?.trim() || null;
    }

    if (role && (role === 'admin' || role === 'user')) {
      // If demoting from admin to user, check that it's not the last admin
      if (targetUser.role === 'admin' && role === 'user') {
        const adminCount = await prisma.adminUser.count({ where: { role: 'admin' } });
        if (adminCount <= 1) {
          return NextResponse.json(
            { success: false, error: 'ไม่สามารถเปลี่ยนสถานะได้ เนื่องจากต้องมี Admin อย่างน้อย 1 บัญชี' },
            { status: 400 }
          );
        }
      }
      updateData.role = role;
    }

    if (password && password.trim()) {
      if (password.trim().length < 4) {
        return NextResponse.json({ success: false, error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร' }, { status: 400 });
      }
      updateData.password = hashPassword(password.trim());
    }

    const updatedUser = await prisma.adminUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'อัปเดตข้อมูลผู้ใช้งานเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

// 2. DELETE /api/users/[id] - Delete a user (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getAdminSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (สำหรับผู้ดูแลระบบ Admin เท่านั้น)' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Prevent self-deletion
    if (id === session.adminId) {
      return NextResponse.json(
        { success: false, error: 'ไม่สามารถลบบัญชีของตนเองที่กำลังล็อกอินใช้งานอยู่ได้' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.adminUser.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'ไม่พบผู้ใช้งานนี้ในระบบ' }, { status: 404 });
    }

    // Prevent deleting the last admin
    if (targetUser.role === 'admin') {
      const adminCount = await prisma.adminUser.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, error: 'ไม่สามารถลบได้ เนื่องจากต้องมีผู้ดูแลระบบ (Admin) อย่างน้อย 1 บัญชี' },
          { status: 400 }
        );
      }
    }

    await prisma.adminUser.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `ลบผู้ใช้งาน "${targetUser.username}" เรียบร้อยแล้ว`,
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}
