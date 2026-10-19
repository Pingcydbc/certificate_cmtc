import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const recipient = await prisma.recipient.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            template: {
              include: {
                elements: true,
              },
            },
          },
        },
      },
    });

    if (!recipient) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลผู้รับเกียรติบัตร' }, { status: 404 });
    }

    return NextResponse.json({ success: true, recipient });
  } catch (error: any) {
    console.error('Error fetching recipient:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch recipient' },
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
    await prisma.recipient.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'ลบรายชื่อสำเร็จ' });
  } catch (error: any) {
    console.error('Error deleting recipient:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete recipient' },
      { status: 500 }
    );
  }
}
