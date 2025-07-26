"use client";
import EmailSidebar from '../../components/EmailSidebar';
import AuthenticatedCoPilot from '../../components/AuthenticatedCoPilot';
import React, { useState } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex min-h-screen overflow-hidden">
      <div className={`fixed inset-y-0 left-0 z-30 ${collapsed ? 'w-20' : 'w-72'} transition-all duration-200`}>
        <EmailSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>
      <div className={`flex-1 flex flex-col min-h-screen overflow-y-auto transition-all duration-200 ${collapsed ? 'ml-20' : 'ml-72'}`}>
        {children}
      </div>
      {/* Pip Introduction - only on dashboard pages */}
      <div className="fixed bottom-24 right-6 z-40 text-center">
        <div className="text-blue-200 text-sm font-bold bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-3 border border-blue-800/50 shadow-lg">
          <div>Hi I&apos;m Pip,</div>
          <div>Your pod co-pilot</div>
        </div>
      </div>
      <AuthenticatedCoPilot />
    </div>
  );
} 