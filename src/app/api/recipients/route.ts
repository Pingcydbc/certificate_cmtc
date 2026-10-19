import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const query = searchParams.get('query') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '20'));

    const where: any = {};
    if (projectId) {
      where.projectId = projectId;
    }

    if (query.trim()) {
      const q = query.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { certNumber: { contains: q, mode: 'insensitive' } },
        { organization: { contains: q, mode: 'insensitive' } },
        { note: { contains: q, mode: 'insensitive' } },
        { project: { title: { contains: q, mode: 'insensitive' } } },
        { project: { code: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, recipients] = await Promise.all([
      prisma.recipient.count({ where }),
      prisma.recipient.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { certNumber: 'asc' },
        include: {
          project: {
            select: {
              id: true,
              code: true,
              title: true,
              eventDate: true,
              location: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      recipients,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error: any) {
    console.error('Error fetching recipients:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch recipients' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, certNumber, fullName, organization, note } = body;

    if (!projectId || !certNumber || !fullName) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูล projectId, certNumber และ fullName จำเป็นต้องระบุ' },
        { status: 400 }
      );
    }

    // Clean whitespace
    const cleanedName = fullName.trim().replace(/\s+/g, ' ');

    const recipient = await prisma.recipient.create({
      data: {
        projectId,
        certNumber: certNumber.trim(),
        fullName: cleanedName,
        organization: organization?.trim() || null,
        note: note?.trim() || null,
      },
      include: {
        project: true,
      },
    });

    return NextResponse.json({ success: true, recipient }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating recipient:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create recipient' },
      { status: 500 }
    );
  }
}
