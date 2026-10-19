# 🎓 CMTC e-Cert: ระบบจัดการและออกเกียรติบัตรออนไลน์
### วิทยาลัยเทคนิคเชียงใหม่ (Chiang Mai Technical College)

ระบบจัดการและพิมพ์เกียรติบัตรออนไลน์ระดับมืออาชีพ พร้อม **Visual Studio Editor สไตล์ Canva/Figma** รองรับการนำเข้าไฟล์ Excel หลายชีต, การประมวลผลฟิลเตอร์ภาพ/ลายเซ็น, ระบบสแกน QR Code ตรวจสอบความถูกต้องแบบ Real-time และส่งออกไฟล์ PDF/PNG ความละเอียดสูง

---

## ✨ ฟีเจอร์เด่นของระบบ (Key Features)

### 🎨 1. Visual Certificate Studio Editor (สไตล์ Canva/Figma)
- **แถบเครื่องมือรวมฝั่งซ้าย (Unified Studio Layout)**: รวมพาเนลปรับแต่ง ฟอนต์ ขนาด สี จัดวาง และเลเยอร์ไว้ทางซ้ายมือ กะทัดรัด ใช้งานง่าย
- **หน้าจอแคนวาสขนาดใหญ่เต็มหน้าจอ (Full-Screen Canvas)** พร้อมปุ่ม **`พอดีจออัตโนมัติ (Auto-Fit)`**
- **Canva Smart Guidelines**: เส้นไกด์สีชมพูมาเจนต้าตัดกึ่งกลางหน้ากระดาษ พร้อมระบบแม่เหล็กดูดอัตโนมัติ (Magnetic Snapping)
- **In-Place Inline Text Editing**: ดับเบิ้ลคลิกบนข้อความเพื่อพิมพ์แก้ไขคำในกรอบได้ทันที
- **Keyboard Shortcuts**: รองรับ `Ctrl+C` (คัดลอก), `Ctrl+V` (วาง), `Ctrl+Z` (Undo สูงสุด 30 สเต็ป), `Ctrl+Y` (Redo)
- **ฟิลเตอร์ภาพระดับโปร**:
  - **✨ Filter เพิ่มความคมชัด (Unsharp Masking)**: เร่งความคมชัดของภาพ/ตราสัญลักษณ์ 0% - 100%
  - **✂️ ตัดพื้นหลังสีขาว (White Cutout)**: คลิกเดียวตัดพื้นหลังกระดาษขาวของลายเซ็นให้โปร่งใส

### 📊 2. ระบบนำเข้า Excel อัจฉริยะ (Multi-Sheet & Append Import)
- รองรับไฟล์ Excel ที่มีหลายหน้า / หลายชีต (เช่น แยกตามสถานศึกษา) นำเข้าได้พร้อมกันทั้งหมดในคลิกเดียว
- โหมด **"➕ นำเข้าเพิ่มต่อท้าย (Append)"** รันเลขทะเบียนต่อเนื่อง ป้องกันข้อมูลเดิมสูญหาย
- ตัวเลือกล้างข้อมูลเขียนทับ (Overwrite) หากต้องการเริ่มต้นใหม่

### 🔒 3. ระบบความปลอดภัยและสิทธิ์ผู้ดูแล (Admin Portal)
- ป้องกัน Route อัตโนมัติด้วย Next.js Middleware
- Signed HTTP-Only Cookie เข้ารหัส HMAC-SHA256 ปลอดภัยสูง
- จัดการโครงการ ออกเกียรติบัตร และตรวจดูรายชื่อผู้รับได้อย่างรวดเร็ว

### 📱 4. ตรวจสอบความถูกต้องผ่าน QR Code แบบ Real-time
- ฝัง QR Code ลงบนเกียรติบัตรแบบไดนามิก ลิงก์ตรงสู่หน้ารับรองความถูกต้องของรายบุคคล
- รองรับการส่งออกไฟล์ **PDF สำหรับพิมพ์งานคมชัดสูง** และภาพ **PNG**

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

- **Frontend & Backend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS (ธีมสี ขาว-เลือดหมู CMTC `#9F1239`)
- **Database & ORM**: PostgreSQL 18, Prisma ORM
- **Graphics & PDF**: Canvas API (`@napi-rs/canvas`), `pdf-lib`, `qrcode`
- **Spreadsheet Processing**: `xlsx`

---

## 🚀 วิธีการติดตั้งและรันในเครื่อง (Getting Started)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. กำหนดค่า Environment Variables
คัดลอกไฟล์ `.env.example` เป็น `.env` แล้วระบุค่าเชื่อมต่อฐานข้อมูล PostgreSQL:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/cert_db?schema=public"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin1234"
AUTH_SECRET="your-super-secure-secret-token"
```

### 3. ซิงค์ Schema กับฐานข้อมูล Prisma
```bash
npx prisma db push
```

### 4. รัน Development Server
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

---

## 🐳 การรันด้วย Docker
```bash
docker compose up -d --build
```

---

## 📄 ลิขสิทธิ์ (License)
พัฒนาสำหรับวิทยาลัยเทคนิคเชียงใหม่ (CMTC)
