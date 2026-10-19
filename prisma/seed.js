const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Ensure public/uploads has NSDV01.jpg
  const srcImg = path.join(__dirname, '../NSDV01.jpg');
  const destDir = path.join(__dirname, '../public/uploads');
  const destImg = path.join(destDir, 'NSDV01.jpg');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  if (fs.existsSync(srcImg) && !fs.existsSync(destImg)) {
    fs.copyFileSync(srcImg, destImg);
    console.log('Copied NSDV01.jpg to public/uploads/');
  }

  // Parse Excel file
  const excelPath = path.join(__dirname, '../ทะเบียนคุมเกียรติบัตรการจัเทำแผนจัดการเ.xlsx');
  let recipientsData = [];
  let projectTitle = 'โครงการนิเทศปฏิบัติการการพัฒนาครูอาชีวศึกษาในการประยุกต์ใช้เทคโนโลยีปัญญาประดิษฐ์ (AI)';
  let projectDesc = 'เพื่อยกระดับการจัดการเรียนรู้จัดทำแผนจัดการเรียนรู้รายวิชาตามหลักสูตรอาชีวศึกษา พุทธศักราช 2567';
  let eventDate = '12-14 พฤษภาคม 2569';
  let location = 'วิทยาลัยเทคนิคตาก';

  if (fs.existsSync(excelPath)) {
    const wb = xlsx.readFile(excelPath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    // Extract headers info if available
    if (rows[1] && rows[1][0]) {
      projectTitle = rows[1][0].trim();
    }
    if (rows[2] && rows[2][0]) {
      projectDesc = rows[2][0].trim();
    }
    if (rows[4] && rows[4][0]) {
      const match = rows[4][0].toString();
      // ระหว่างวันที่ 12-14 พฤษภาคม 2569 ณ วิทยาลัยเทคนิคตาก
      eventDate = '12-14 พฤษภาคม 2569';
      location = 'วิทยาลัยเทคนิคตาก';
    }

    // Rows from 8 to 77 (index 7 onwards)
    // Row 7 (index 6) is header: [ลำดับ, ทะเบียน, ชื่อ-นามสกุล, สถานศึกษา, หมายเหตุ]
    let headerRowIdx = 6;
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const row = rows[i] || [];
      if (row.some(cell => typeof cell === 'string' && (cell.includes('ทะเบียน') || cell.includes('ชื่อ-นามสกุล')))) {
        headerRowIdx = i;
        break;
      }
    }

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 3) continue;

      const certNumber = r[1] ? String(r[1]).trim() : '';
      let fullName = r[2] ? String(r[2]).trim() : '';
      // Clean multiple spaces: "นายสุรศักดิ์    ยะกัน" -> "นายสุรศักดิ์ ยะกัน"
      fullName = fullName.replace(/\s+/g, ' ');
      const organization = r[3] ? String(r[3]).trim() : '';
      const note = r[4] ? String(r[4]).trim() : null;

      if (certNumber && fullName) {
        recipientsData.push({
          certNumber,
          fullName,
          organization: organization || 'วิทยาลัยเทคนิคตาก',
          note,
        });
      }
    }
  }

  console.log(`Found ${recipientsData.length} recipients in Excel.`);

  // Create or Update Project
  const project = await prisma.project.upsert({
    where: { code: 'NSDV-2569' },
    update: {
      title: projectTitle,
      description: projectDesc,
      eventDate,
      location,
      isActive: true,
    },
    create: {
      code: 'NSDV-2569',
      title: projectTitle,
      description: projectDesc,
      eventDate,
      location,
      isActive: true,
    },
  });

  console.log(`Project: ${project.title} (ID: ${project.id})`);

  // Create Template and Elements
  const existingTemplate = await prisma.certificateTemplate.findUnique({
    where: { projectId: project.id },
  });

  if (existingTemplate) {
    await prisma.templateElement.deleteMany({
      where: { templateId: existingTemplate.id },
    });
    await prisma.certificateTemplate.delete({
      where: { id: existingTemplate.id },
    });
  }

  const template = await prisma.certificateTemplate.create({
    data: {
      projectId: project.id,
      backgroundImage: '/uploads/NSDV01.jpg',
      width: 990,
      height: 698,
      elements: {
        create: [
          {
            elementType: 'dynamic',
            fieldKey: 'certNumber',
            defaultValue: 'NSDV-2569-XXXX',
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
            defaultValue: 'ชื่อ - นามสกุล',
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
  });

  console.log(`Template created with elements.`);

  // Insert Recipients
  // Delete existing for this project to reseed cleanly
  await prisma.recipient.deleteMany({
    where: { projectId: project.id },
  });

  if (recipientsData.length > 0) {
    await prisma.recipient.createMany({
      data: recipientsData.map(r => ({
        ...r,
        projectId: project.id,
      })),
    });
    console.log(`Successfully seeded ${recipientsData.length} recipients.`);
  }

  // Also create a sample 2nd project so pagination and multi-project browsing can be easily demonstrated!
  const sampleProject = await prisma.project.upsert({
    where: { code: 'CMTC-2568' },
    update: {},
    create: {
      code: 'CMTC-2568',
      title: 'โครงการอบรมเชิงปฏิบัติการพัฒนาทักษะวิชาชีพและเทคโนโลยีดิจิทัลสู่อนาคต',
      description: 'โครงการพัฒนาศักยภาพครูและบุคลากรทางการศึกษา วิทยาลัยเทคนิคตาก',
      eventDate: '20-22 สิงหาคม 2568',
      location: 'ห้องประชุมทองกวาว วิทยาลัยเทคนิคตาก',
      isActive: true,
      template: {
        create: {
          backgroundImage: '/uploads/NSDV01.jpg',
          width: 990,
          height: 698,
          elements: {
            create: [
              {
                elementType: 'dynamic',
                fieldKey: 'certNumber',
                defaultValue: 'CMTC-2568-0001',
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
                defaultValue: 'นายสมชาย มุ่งมั่นพัฒนา',
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
      recipients: {
        create: [
          {
            certNumber: 'CMTC-2568-0001',
            fullName: 'นายสมชาย มุ่งมั่นพัฒนา',
            organization: 'วิทยาลัยเทคนิคตาก',
            note: 'ผ่านการทดสอบระดับดีเด่น',
          },
          {
            certNumber: 'CMTC-2568-0002',
            fullName: 'นางสาวสุดา รัตนศิลป์',
            organization: 'วิทยาลัยเทคนิคตาก',
            note: 'ผ่านการอบรม',
          },
        ],
      },
    },
  });

  console.log(`Sample project seeded: ${sampleProject.code}`);
  console.log('✅ Seed completed successfully!');
}

main()
  .catch(e => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
