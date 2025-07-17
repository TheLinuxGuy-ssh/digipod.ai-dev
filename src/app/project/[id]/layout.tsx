"use client";
import EmailSidebar from '../../../components/EmailSidebar';
import React, { useState } from 'react';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="min-h-screen dashboard-main">
      <div className={`fixed top-0 left-0 h-screen z-40 ${collapsed ? 'w-20' : 'w-72'} transition-all duration-200`}>
        <EmailSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${collapsed ? 'ml-20' : 'ml-72'}`}>
        {children}
      </div>
    </div>
  );
} 