import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getRequestSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10'));
    const search = searchParams.get('search') || '';
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const scope = searchParams.get('scope') || '';
    const minimal = searchParams.get('minimal') === 'true';

    const where: any = {};
    if (activeOnly && scope !== 'manage') {
      where.isActive = true;
    } else {
      const session = getRequestSession(request);
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' },
          { status: 401 }
        );
      }
      if (session.role !== 'admin') {
        where.createdById = session.adminId;
      }
    }
    if (search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
        {
          recipients: {
            some: {
              OR: [
                { fullName: { contains: q, mode: 'insensitive' } },
                { certNumber: { contains: q, mode: 'insensitive' } },
                { organization: { contains: q, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    if (minimal) {
      const projects = await prisma.project.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          code: true,
          title: true,
        },
      });

      return NextResponse.json(
        {
          success: true,
          projects,
        },
        {
          headers:
            activeOnly && scope !== 'manage'
              ? { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
              : undefined,
        }
      );
    }

    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          template: {
            select: {
              id: true,
              width: true,
              height: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              name: true,
              role: true,
            },
          },
          _count: {
            select: { recipients: true },
          },
          recipients: search.trim()
            ? {
                where: {
                  OR: [
                    { fullName: { contains: search.trim(), mode: 'insensitive' } },
                    { certNumber: { contains: search.trim(), mode: 'insensitive' } },
                    { organization: { contains: search.trim(), mode: 'insensitive' } },
                  ],
                },
                take: 5,
                select: {
                  id: true,
                  certNumber: true,
                  fullName: true,
                  organization: true,
                },
              }
            : false,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        success: true,
        projects,
        pagination: {
          total,
          totalPages,
          currentPage: page,
          limit,
        },
      },
      {
        headers:
          activeOnly && scope !== 'manage'
            ? { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
            : undefined,
      }
    );
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getRequestSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { code, title, description, eventDate, location, backgroundImage } = body;

    if (!code || !title) {
      return NextResponse.json(
        { success: false, error: 'รหัสโครงการและชื่อโครงการจำเป็นต้องระบุ' },
        { status: 400 }
      );
    }

    // Check duplicate code
    const existing = await prisma.project.findUnique({
      where: { code: code.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `รหัสโครงการ ${code} มีอยู่ในระบบแล้ว` },
        { status: 400 }
      );
    }

    const createdById = session.adminId;

    const project = await prisma.project.create({
      data: {
        code: code.trim(),
        title: title.trim(),
        description: description?.trim() || null,
        eventDate: eventDate?.trim() || null,
        location: location?.trim() || null,
        isActive: true,
        createdById: createdById,
        template: {
          create: {
            backgroundImage: backgroundImage || '/uploads/NSDV01.jpg',
            width: 990,
            height: 698,
            elements: {
              create: [
                {
                  elementType: 'dynamic',
                  fieldKey: 'certNumber',
                  defaultValue: `${code.trim()}-0001`,
                  posX: 910,
                  posY: 30,
                  fontSize: 16,
                  fontFamily: 'Prompt',
                  fontColor: '#374151',
                  textAlign: 'right',
                  lineHeight: 1.2,
                },
                {
                  elementType: 'dynamic',
                  fieldKey: 'fullName',
                  defaultValue: 'ชื่อ-นามสกุล ผู้รับเกียรติบัตร',
                  posX: 552,
                  posY: 312,
                  fontSize: 34,
                  fontFamily: 'Sarabun',
                  fontColor: '#000000',
                  textAlign: 'center',
                  lineHeight: 1.4,
                },
              ],
            },
          },
        },
      },
      include: {
        template: {
          include: { elements: true },
        },
      },
    });

    return NextResponse.json({ success: true, project }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create project' },
      { status: 500 }
    );
  }
}
