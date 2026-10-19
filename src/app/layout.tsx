import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'ระบบเกียรติบัตรออนไลน์ วิทยาลัยเทคนิคเชียงใหม่ (CMTC e-Cert)',
  description:
    'ระบบจัดการและตรวจสอบเกียรติบัตรออนไลน์ ค้นหาและดาวน์โหลดเกียรติบัตรคุณภาพสูง วิทยาลัยเทคนิคเชียงใหม่ (CMTC)',
  keywords: ['เกียรติบัตร', 'certificate', 'ตรวจสอบเกียรติบัตร', 'CMTC', 'วิทยาลัยเทคนิคเชียงใหม่'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-slate-50 text-slate-800 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
