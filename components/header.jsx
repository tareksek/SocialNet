'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Search, Messenger, Notifications, AccountCircle } from '@mui/icons-material';

export default function Header() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-facebook-dark border-b border-gray-300 dark:border-gray-700 z-50">
      <div className="flex items-center justify-between h-full px-4">
        {/* Logo + Search */}
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-facebook-blue">شبكتي</h1>
          <div className="hidden md:flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2">
            <Search className="text-gray-500" />
            <input type="text" placeholder="ابحث..." className="bg-transparent outline-none ml-2" />
          </div>
        </div>

        {/* Icons */}
        <div className="flex items-center gap-4">
          <button><Messenger className="text-gray-600 dark:text-gray-300 text-2xl" /></button>
          <button><Notifications className="text-gray-600 dark:text-gray-300 text-2xl" /></button>
          <button onClick={() => setDarkMode(!darkMode)} className="text-sm">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <Link href="/profile/me">
            <AccountCircle className="text-3xl text-facebook-blue" />
          </Link>
        </div>
      </div>
    </header>
  );
}
