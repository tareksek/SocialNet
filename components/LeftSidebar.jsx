'use client';
import Link from 'next/link';
import { Home, People, Video, Store, Groups, Gaming } from '@mui/icons-material';

export default function LeftSidebar() {
  const menu = [
    { name: 'الرئيسية', icon: Home, href: '/' },
    { name: 'الأصدقاء', icon: People, href: '/friends' },
    { name: 'الفيديوهات', icon: Video, href: '/videos' },
    { name: 'المتجر', icon: Store, href: '/marketplace' },
    { name: 'المجموعات', icon: Groups, href: '/groups' },
    { name: 'الألعاب', icon: Gaming, href: '/gaming' },
  ];

  return (
    <aside className="w-80 fixed left-0 top-14 bottom-0 overflow-y-auto hidden lg:block pt-4">
      <div className="px-3">
        {menu.map((item) => (
          <Link key={item.name} href={item.href}>
            <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
              <item.icon className="text-3xl text-gray-600 dark:text-gray-300" />
              <span className="text-lg">{item.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}
