import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        template: {
          include: {
            elements: true,
          },
        },
        _count: {
          select: { recipients: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, error: 'ไม่พบโครงการ' }, { status: 404 });
    }

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { title, description, eventDate, location, isActive, code } = body;

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(code !== undefined && { code: code.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(eventDate !== undefined && { eventDate: eventDate?.trim() || null }),
        ...(location !== undefined && { location: location?.trim() || null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error: any) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { verifySessionToken, ADMIN_COOKIE_NAME } = await import('@/lib/auth');
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const session = token ? verifySessionToken(token) : null;

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' },
        { status: 401 }
      );
    }

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ success: false, error: 'ไม่พบโครงการนี้' }, { status: 404 });
    }

    // Check permissions: Admin can delete any project; User can ONLY delete projects they created
    if (session.role !== 'admin' && project.createdById !== session.adminId) {
      return NextResponse.json(
        {
          success: false,
          error: 'คุณไม่มีสิทธิ์ลบโครงการนี้ (เจ้าหน้าที่สามารถลบได้เฉพาะโครงการที่ตนเองเป็นผู้สร้างเท่านั้น)',
        },
        { status: 403 }
      );
    }

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'ลบโครงการสำเร็จ' });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete project' },
      { status: 500 }
    );
  }
}
