import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { renderCertificatePng, renderCertificatePdf } from '@/lib/certRenderer';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recipientId = searchParams.get('recipientId');
    const format = (searchParams.get('format') || 'png').toLowerCase();
    const isDownload = searchParams.get('download') === 'true';

    if (!recipientId) {
      return NextResponse.json({ success: false, error: 'recipientId is required' }, { status: 400 });
    }

    const recipient = await prisma.recipient.findUnique({
      where: { id: recipientId },
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

    if (!recipient || !recipient.project || !recipient.project.template) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลเกียรติบัตรหรือแม่แบบ' },
        { status: 404 }
      );
    }

    const project = recipient.project;
    const template = recipient.project.template!;

    const renderParams = {
      template: {
        backgroundImage: template.backgroundImage,
        width: template.width,
        height: template.height,
        elements: template.elements.map((el) => ({
          id: el.id,
          elementType: el.elementType,
          fieldKey: el.fieldKey,
          defaultValue: el.defaultValue,
          posX: el.posX,
          posY: el.posY,
          fontSize: el.fontSize,
          fontFamily: el.fontFamily,
          fontColor: el.fontColor,
          textAlign: el.textAlign,
          lineHeight: el.lineHeight,
          maxWidth: el.maxWidth,
          fontWeight: el.fontWeight,
          fontStyle: el.fontStyle,
          isUnderline: el.isUnderline,
          letterSpacing: el.letterSpacing,
          opacity: el.opacity,
          width: el.width,
          height: el.height,
        })),
      },
      recipient: {
        id: recipient.id,
        certNumber: recipient.certNumber,
        fullName: recipient.fullName,
        organization: recipient.organization,
        note: recipient.note,
        issuedDate: recipient.issuedDate,
      },
      project: {
        id: project.id,
        code: project.code,
        title: project.title,
        description: project.description,
        eventDate: project.eventDate,
        location: project.location,
      },
    };

    const safeFilename = encodeURIComponent(
      `certificate-${recipient.certNumber.replace(/[^a-zA-Z0-9_\u0E00-\u0E7F-]/g, '_')}`
    );

    if (format === 'pdf') {
      const pdfBuffer = await renderCertificatePdf(renderParams);
      const disposition = isDownload
        ? `attachment; filename="${safeFilename}.pdf"; filename*=UTF-8''${safeFilename}.pdf`
        : `inline; filename="${safeFilename}.pdf"`;

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': disposition,
          'Content-Length': pdfBuffer.length.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // Default: PNG
    const pngBuffer = await renderCertificatePng(renderParams);
    const disposition = isDownload
      ? `attachment; filename="${safeFilename}.png"; filename*=UTF-8''${safeFilename}.png`
      : `inline; filename="${safeFilename}.png"`;

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': disposition,
        'Content-Length': pngBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error rendering certificate:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to render certificate' },
      { status: 500 }
    );
  }
}
