import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeProjectAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const nationalIdRaw = searchParams.get('nationalId') || '';
    const query = searchParams.get('query') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '20'));
    const noCache = searchParams.get('noCache') === '1';

    const cleanNationalId = nationalIdRaw.replace(/[-\s]/g, '').trim();

    // Public search path: requires exact 13-digit National ID
    if (nationalIdRaw) {
      if (!/^\d{13}$/.test(cleanNationalId)) {
        return NextResponse.json({
          success: true,
          recipients: [],
          pagination: { total: 0, totalPages: 1, currentPage: page, limit },
        });
      }

      const publicWhere: any = {
        nationalId: cleanNationalId,
        project: { isActive: true },
      };
      if (projectId) {
        publicWhere.projectId = projectId;
      }

      const [total, recipients] = await Promise.all([
        prisma.recipient.count({ where: publicWhere }),
        prisma.recipient.findMany({
          where: publicWhere,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { issuedDate: 'desc' },
          select: {
            id: true,
            certNumber: true,
            fullName: true,
            organization: true,
            trainingLocation: true,
            trainingDate: true,
            signedDate: true,
            note: true,
            issuedDate: true,
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

      return NextResponse.json(
        {
          success: true,
          recipients,
          pagination: {
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            currentPage: page,
            limit,
          },
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
          },
        }
      );
    }

    // Admin / Owner management path: requires projectId + authorization
    if (!projectId) {
      return NextResponse.json({
        success: true,
        recipients: [],
        pagination: { total: 0, totalPages: 1, currentPage: page, limit },
      });
    }

    const auth = await authorizeProjectAccess(request, projectId);
    if (auth.error) return auth.error;

    const where: any = { projectId };

    if (query.trim()) {
      const tokens = query.trim().split(/\s+/).filter(Boolean);
      const normalizedString = tokens.join(' ');
      const cleanedDigits = query.replace(/[-\s]/g, '').trim();

      if (tokens.length === 1) {
        const token = tokens[0];
        where.OR = [
          { fullName: { contains: token, mode: 'insensitive' } },
          { certNumber: { contains: token, mode: 'insensitive' } },
          { nationalId: { contains: cleanedDigits || token, mode: 'insensitive' } },
          { organization: { contains: token, mode: 'insensitive' } },
          { trainingLocation: { contains: token, mode: 'insensitive' } },
          { note: { contains: token, mode: 'insensitive' } },
        ];
      } else {
        where.OR = [
          {
            AND: tokens.map((token) => ({
              fullName: { contains: token, mode: 'insensitive' },
            })),
          },
          { fullName: { contains: normalizedString, mode: 'insensitive' } },
          { certNumber: { contains: normalizedString, mode: 'insensitive' } },
          { organization: { contains: normalizedString, mode: 'insensitive' } },
          {
            AND: tokens.map((token) => ({
              OR: [
                { fullName: { contains: token, mode: 'insensitive' } },
                { certNumber: { contains: token, mode: 'insensitive' } },
                { organization: { contains: token, mode: 'insensitive' } },
              ],
            })),
          },
        ];
      }
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

    return NextResponse.json(
      {
        success: true,
        recipients,
        pagination: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          limit,
        },
      },
      {
        headers: {
          'Cache-Control':
            noCache || projectId
              ? 'no-store, must-revalidate'
              : 'public, s-maxage=30, stale-while-revalidate=120',
        },
      }
    );
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

    const auth = await authorizeProjectAccess(request, projectId);
    if (auth.error) return auth.error;

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

export async function DELETE(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId จำเป็นต้องระบุ' },
        { status: 400 }
      );
    }

    const auth = await authorizeProjectAccess(request, projectId);
    if (auth.error) return auth.error;

    const deleted = await prisma.recipient.deleteMany({
      where: { projectId },
    });

    return NextResponse.json({
      success: true,
      deletedCount: deleted.count,
      message: `ลบรายชื่อทั้งหมดในโครงการเรียบร้อยแล้ว (${deleted.count} รายชื่อ)`,
    });
  } catch (error: any) {
    console.error('Error clearing recipients:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to clear recipients' },
      { status: 500 }
    );
  }
}
