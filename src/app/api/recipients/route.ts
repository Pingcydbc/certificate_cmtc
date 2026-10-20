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
      // Split query by one or more whitespace characters (handles multiple spacebars between words)
      const tokens = query.trim().split(/\s+/).filter(Boolean);
      const normalizedString = tokens.join(' ');

      if (tokens.length === 1) {
        const token = tokens[0];
        where.OR = [
          { fullName: { contains: token, mode: 'insensitive' } },
          { certNumber: { contains: token, mode: 'insensitive' } },
          { organization: { contains: token, mode: 'insensitive' } },
          { note: { contains: token, mode: 'insensitive' } },
          { project: { title: { contains: token, mode: 'insensitive' } } },
          { project: { code: { contains: token, mode: 'insensitive' } } },
        ];
      } else {
        // Multiple tokens, e.g. "กิตติพงษ์       สมใจ" with arbitrary spaces
        where.OR = [
          // 1. All tokens are found in fullName (matches regardless of space count in DB or user query)
          {
            AND: tokens.map((token) => ({
              fullName: { contains: token, mode: 'insensitive' },
            })),
          },
          // 2. Normalized single-space query matches any field
          { fullName: { contains: normalizedString, mode: 'insensitive' } },
          { certNumber: { contains: normalizedString, mode: 'insensitive' } },
          { organization: { contains: normalizedString, mode: 'insensitive' } },
          { project: { title: { contains: normalizedString, mode: 'insensitive' } } },
          { project: { code: { contains: normalizedString, mode: 'insensitive' } } },
          // 3. Or each token is found across recipient/project fields
          {
            AND: tokens.map((token) => ({
              OR: [
                { fullName: { contains: token, mode: 'insensitive' } },
                { certNumber: { contains: token, mode: 'insensitive' } },
                { organization: { contains: token, mode: 'insensitive' } },
                { project: { title: { contains: token, mode: 'insensitive' } } },
                { project: { code: { contains: token, mode: 'insensitive' } } },
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
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
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
