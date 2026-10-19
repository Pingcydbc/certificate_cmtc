import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const templatePath = path.join(process.cwd(), 'public', 'templates', 'certificate_recipient_template.xlsx');

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ success: false, error: 'ไม่พบไฟล์แม่แบบ' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(templatePath);
    const filename = 'certificate_template_cmtc.xlsx';

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error downloading template:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์แม่แบบ' },
      { status: 500 }
    );
  }
}
