'use client';
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function EmailSetupPage() {
  const [emailSettings, setEmailSettings] = useState({
    provider: 'gmail' as 'gmail' | 'imap',
    email: '',
    checkInterval: 15
  });
  const [clientFilters, setClientFilters] = useState<Array<{emailAddress: string, projectId?: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = '/signin';
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSaveEmailSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const user = auth.currentUser;
    if (!user) return;
    
    const token = await user.getIdToken();
    
    try {
      const res = await fetch('/api/email-settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...emailSettings,
          isActive: true
        })
      });
      
      if (res.ok) {
        setMessage('Email settings saved successfully!');
      } else {
        setMessage('Failed to save email settings');
      }
    } catch (error) {
      setMessage('Error saving email settings');
    }
    
    setLoading(false);
  };

  const handleAddClientFilter = () => {
    setClientFilters([...clientFilters, { emailAddress: '', projectId: '' }]);
  };

  const handleSaveClientFilters = async () => {
    setLoading(true);
    
    const user = auth.currentUser;
    if (!user) return;
    
    const token = await user.getIdToken();
    
    try {
      const res = await fetch('/api/client-filters', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          filters: clientFilters.filter(f => f.emailAddress.trim())
        })
      });
      
      if (res.ok) {
        setMessage('Client filters saved successfully!');
      } else {
        setMessage('Failed to save client filters');
      }
    } catch (error) {
      setMessage('Error saving client filters');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Email Monitoring Setup</h1>
        
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${message.includes('success') ? 'bg-green-600' : 'bg-red-600'} text-white`}>
            {message}
          </div>
        )}

        {/* Email Settings */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Email Account Settings</h2>
          <form onSubmit={handleSaveEmailSettings} className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">Email Provider</label>
              <select
                value={emailSettings.provider}
                onChange={(e) => setEmailSettings({...emailSettings, provider: e.target.value as 'gmail' | 'imap'})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="gmail">Gmail</option>
                <option value="imap">IMAP</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2">Email Address</label>
              <input
                type="email"
                value={emailSettings.email}
                onChange={(e) => setEmailSettings({...emailSettings, email: e.target.value})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="your-email@gmail.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2">Check Interval (minutes)</label>
              <input
                type="number"
                value={emailSettings.checkInterval}
                onChange={(e) => setEmailSettings({...emailSettings, checkInterval: parseInt(e.target.value)})}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                min="5"
                max="60"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Email Settings'}
            </button>
          </form>
        </div>

        {/* Client Filters */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Client Email Filters</h2>
          <p className="text-gray-300 mb-4">Add email addresses of clients you want to monitor for AI draft generation.</p>
          
          {clientFilters.map((filter, index) => (
            <div key={index} className="flex gap-4 mb-4">
              <input
                type="email"
                value={filter.emailAddress}
                onChange={(e) => {
                  const newFilters = [...clientFilters];
                  newFilters[index].emailAddress = e.target.value;
                  setClientFilters(newFilters);
                }}
                className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="client@example.com"
              />
              <input
                type="text"
                value={filter.projectId || ''}
                onChange={(e) => {
                  const newFilters = [...clientFilters];
                  newFilters[index].projectId = e.target.value;
                  setClientFilters(newFilters);
                }}
                className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="Project ID (optional)"
              />
            </div>
          ))}
          
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleAddClientFilter}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              Add Client Filter
            </button>
            
            <button
              type="button"
              onClick={handleSaveClientFilters}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Client Filters'}
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/dashboard"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold inline-block"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
} 