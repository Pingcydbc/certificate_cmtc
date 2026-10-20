import type { Metadata } from 'next';
import { Prompt, Sarabun, Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const prompt = Prompt({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  variable: '--font-prompt',
});

const sarabun = Sarabun({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  variable: '--font-sarabun',
});

const inter = Inter({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

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
    <html lang="th" className={`${prompt.variable} ${sarabun.variable} ${inter.variable}`}>
      <body className="bg-slate-50 text-slate-800 font-prompt flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 w-full flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
