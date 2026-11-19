import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeProjectAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const mode = searchParams.get('mode') || 'data';
    const organizationParam = searchParams.get('organization') ?? '__ALL__';

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId จำเป็นต้องระบุ' },
        { status: 400 }
      );
    }

    const auth = await authorizeProjectAccess(request, projectId);
    if (auth.error) return auth.error;

    if (mode === 'groups') {
      const rawGroups = await prisma.recipient.groupBy({
        by: ['organization'],
        where: { projectId },
        _count: { _all: true },
      });

      const groups = rawGroups
        .map((g) => ({
          key: g.organization && g.organization.trim() ? g.organization : '__EMPTY__',
          label: g.organization && g.organization.trim() ? g.organization : 'ไม่ระบุสังกัด / ชีต',
          count: g._count._all,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'th'));

      const totalCount = groups.reduce((acc, g) => acc + g.count, 0);

      return NextResponse.json({
        success: true,
        groups,
        totalCount,
      });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        template: {
          include: {
            elements: true,
          },
        },
      },
    });

    if (!project || !project.template) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลโครงการหรือแม่แบบเกียรติบัตร' },
        { status: 404 }
      );
    }

    const recipientWhere: any = { projectId };
    if (organizationParam === '__EMPTY__') {
      recipientWhere.OR = [{ organization: null }, { organization: '' }];
    } else if (organizationParam !== '__ALL__') {
      recipientWhere.organization = organizationParam;
    }

    const recipients = await prisma.recipient.findMany({
      where: recipientWhere,
      orderBy: { certNumber: 'asc' },
      select: {
        id: true,
        certNumber: true,
        fullName: true,
        organization: true,
        note: true,
      },
    });

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        code: project.code,
        title: project.title,
        eventDate: project.eventDate,
        location: project.location,
      },
      template: project.template,
      recipients,
    });
  } catch (error: any) {
    console.error('Error fetching batch certificate data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถโหลดข้อมูลสำหรับสร้าง PDF ได้' },
      { status: 500 }
    );
  }
}
