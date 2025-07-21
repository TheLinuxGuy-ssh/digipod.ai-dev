"use client";
import EmailSidebar from '../../components/EmailSidebar';
import React, { useState } from 'react';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex min-h-screen overflow-hidden">
      <div className={`fixed inset-y-0 left-0 z-30 ${collapsed ? 'w-20' : 'w-72'} transition-all duration-200`}>
        <EmailSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>
      <div className={`flex-1 flex flex-col min-h-screen overflow-y-auto transition-all duration-200 ${collapsed ? 'ml-20' : 'ml-72'}`}>
        {children}
      </div>
    </div>
  );
} 