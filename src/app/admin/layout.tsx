"use client";
import React, { useState } from 'react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex min-h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      <div className={`fixed inset-y-0 left-0 z-30 ${collapsed ? 'w-20' : 'w-64'} transition-all duration-200 bg-white dark:bg-gray-800 shadow-md`}>
        <div className="flex items-center justify-center h-16 bg-gray-900 dark:bg-gray-900 relative">
          <span className={`text-white text-2xl font-bold ${collapsed ? 'hidden' : ''}`}>Admin</span>
          <button onClick={() => setCollapsed(!collapsed)} className="absolute right-0 top-0 h-16 w-16 flex items-center justify-center text-white">
            {/* You can use an icon here */}
            {collapsed ? '>' : '<'}
          </button>
        </div>
        <nav className="mt-4">
          <Link href="/admin/universal-license" className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700">
              <span className={`mx-4 font-medium ${collapsed ? 'hidden' : ''}`}>Universal License</span>
          </Link>
        </nav>
      </div>
      <div className={`flex-1 flex flex-col min-h-screen overflow-y-auto transition-all duration-200 ${collapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
} 