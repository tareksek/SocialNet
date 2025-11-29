import './globals.css';
import Header from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'شبكتي - شبيه فيسبوك متكامل',
  description: 'موقع تواصل اجتماعي عربي متكامل 2025',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${inter.className} bg-gray-100 dark:bg-facebook-dark`}>
        <Header />
        <div className="max-w-screen-2xl mx-auto flex">
          <LeftSidebar />
          <main className="flex-1 min-w-0">{children}</main>
          <RightSidebar />
        </div>
      </body>
    </html>
  );
}
