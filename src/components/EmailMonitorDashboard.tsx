'use client';

import React, { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  EnvelopeIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import useSWR from 'swr';
import type { User } from 'firebase/auth';

interface EmailSetting {
  id: string;
  provider: 'gmail' | 'imap';
  email: string;
  isActive: boolean;
  checkInterval: number;
  lastChecked?: string;
}

interface ClientFilter {
  id: string;
  emailAddress: string;
  projectId?: string;
  isActive: boolean;
  createdAt: string;
}

interface AIDraft {
  id: string;
  subject: string;
  body: string;
  closing: string;
  signature: string;
  status: 'draft' | 'approved' | 'declined' | 'sent';
  createdAt: string;
  originalEmail?: {
    from: string;
    subject: string;
    body: string;
    date: string;
  };
  clientEmail?: string;
}

interface ProcessingStatus {
  id: string;
  status: 'pending' | 'ai_processing' | 'draft_created' | 'error';
  from: string;
  subject: string;
  processedAt: string;
  errorMessage?: string;
}

export default function EmailMonitorDashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'filters' | 'drafts' | 'status'>('settings');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<AIDraft | null>(null);
  const [editingDraft, setEditingDraft] = useState<Partial<AIDraft>>({});

  // Email setting form
  const [emailForm, setEmailForm] = useState({
    provider: 'gmail' as 'gmail' | 'imap',
    email: '',
    gmailToken: '',
    imapHost: '',
    imapPort: 993,
    imapSecure: true,
    username: '',
    password: '',
    checkInterval: 5
  });

  // Client filter form
  const [filterForm, setFilterForm] = useState({
    emailAddress: '',
    projectId: ''
  });

  // Fetcher for SWR
  const fetcher = async (url: string) => {
    if (!currentUser) return null;
    const token = await currentUser.getIdToken();
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  };

  // Fetch data
  const { data: emailSettings, mutate: mutateSettings } = useSWR(
    currentUser ? '/api/email-settings' : null,
    fetcher
  );

  const { data: clientFilters, mutate: mutateFilters } = useSWR(
    currentUser ? '/api/client-filters' : null,
    fetcher
  );

  const { data: aiDrafts, mutate: mutateDrafts } = useSWR(
    currentUser ? '/api/ai-drafts?status=draft' : null,
    fetcher
  );

  const { data: processingStatus, mutate: mutateStatus } = useSWR(
    currentUser ? '/api/email-monitor/check' : null,
    fetcher,
    { refreshInterval: 5000 } // Poll every 5 seconds
  );

  // Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Helper function for authenticated fetches
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    if (!currentUser) throw new Error('Not authenticated');
    const token = await currentUser.getIdToken();
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  };

  // Handle email setting form submission
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchWithAuth('/api/email-settings', {
        method: 'POST',
        body: JSON.stringify(emailForm),
      });
      setShowEmailModal(false);
      setEmailForm({
        provider: 'gmail',
        email: '',
        gmailToken: '',
        imapHost: '',
        imapPort: 993,
        imapSecure: true,
        username: '',
        password: '',
        checkInterval: 5
      });
      mutateSettings();
    } catch (error) {
      console.error('Error creating email setting:', error);
    }
  };

  // Handle client filter form submission
  const handleFilterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchWithAuth('/api/client-filters', {
        method: 'POST',
        body: JSON.stringify(filterForm),
      });
      setShowFilterModal(false);
      setFilterForm({ emailAddress: '', projectId: '' });
      mutateFilters();
    } catch (error) {
      console.error('Error creating client filter:', error);
    }
  };

  // Handle manual email check
  const handleManualCheck = async () => {
    try {
      await fetchWithAuth('/api/email-monitor/check', { method: 'POST' });
      mutateStatus();
    } catch (error) {
      console.error('Error triggering manual check:', error);
    }
  };

  // Handle draft approval
  const handleApproveDraft = async (draftId: string) => {
    try {
      await fetchWithAuth('/api/ai-drafts', {
        method: 'POST',
        body: JSON.stringify({ draftId }),
      });
      mutateDrafts();
      setSelectedDraft(null);
    } catch (error) {
      console.error('Error approving draft:', error);
    }
  };

  // Handle draft decline
  const handleDeclineDraft = async (draftId: string) => {
    try {
      await fetchWithAuth('/api/ai-drafts', {
        method: 'PATCH',
        body: JSON.stringify({ draftId, status: 'declined' }),
      });
      mutateDrafts();
      setSelectedDraft(null);
    } catch (error) {
      console.error('Error declining draft:', error);
    }
  };

  // Handle draft update
  const handleUpdateDraft = async (draftId: string) => {
    try {
      await fetchWithAuth('/api/ai-drafts', {
        method: 'PATCH',
        body: JSON.stringify({ draftId, ...editingDraft }),
      });
      mutateDrafts();
      setSelectedDraft(null);
      setEditingDraft({});
    } catch (error) {
      console.error('Error updating draft:', error);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Email Monitor Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage email monitoring, client filters, and AI drafts</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'settings', label: 'Email Settings', icon: EnvelopeIcon },
              { id: 'filters', label: 'Client Filters', icon: EyeIcon },
              { id: 'drafts', label: 'AI Drafts', icon: PencilIcon },
              { id: 'status', label: 'Processing Status', icon: ClockIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'settings' | 'filters' | 'drafts' | 'status')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Email Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Email Settings</h2>
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Email Account
                </button>
              </div>

              <div className="grid gap-4">
                {emailSettings?.settings?.map((setting: EmailSetting) => (
                  <div key={setting.id} className="bg-white p-4 rounded-lg border">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{setting.email}</h3>
                        <p className="text-sm text-gray-500 capitalize">{setting.provider}</p>
                        <p className="text-sm text-gray-500">
                          Check every {setting.checkInterval} minutes
                        </p>
                        {setting.lastChecked && (
                          <p className="text-sm text-gray-500">
                            Last checked: {new Date(setting.lastChecked).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          setting.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {setting.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() => {/* Handle edit */}}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {/* Handle delete */}}
                          className="text-red-400 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Client Filters Tab */}
          {activeTab === 'filters' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Client Email Filters</h2>
                <button
                  onClick={() => setShowFilterModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Client Filter
                </button>
              </div>

              <div className="grid gap-4">
                {clientFilters?.filters?.map((filter: ClientFilter) => (
                  <div key={filter.id} className="bg-white p-4 rounded-lg border">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-gray-900">{filter.emailAddress}</h3>
                        <p className="text-sm text-gray-500">
                          Added: {new Date(filter.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          filter.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {filter.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() => {/* Handle edit */}}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {/* Handle delete */}}
                          className="text-red-400 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Drafts Tab */}
          {activeTab === 'drafts' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">AI Drafts</h2>
                <button
                  onClick={handleManualCheck}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  Check for New Emails
                </button>
              </div>

              <div className="grid gap-4">
                {aiDrafts?.drafts?.map((draft: AIDraft) => (
                  <div key={draft.id} className="bg-white p-4 rounded-lg border">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{draft.subject}</h3>
                        <p className="text-sm text-gray-500">
                          From: {draft.originalEmail?.from || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Created: {new Date(draft.createdAt).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {draft.body}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => setSelectedDraft(draft)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleApproveDraft(draft.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeclineDraft(draft.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Processing Status Tab */}
          {activeTab === 'status' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Processing Status</h2>
                <button
                  onClick={handleManualCheck}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Refresh Status
                </button>
              </div>

              <div className="grid gap-4">
                {processingStatus?.processingStatus?.map((status: ProcessingStatus) => (
                  <div key={status.id} className="bg-white p-4 rounded-lg border">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{status.subject}</h3>
                        <p className="text-sm text-gray-500">From: {status.from}</p>
                        <p className="text-sm text-gray-500">
                          Processed: {new Date(status.processedAt).toLocaleString()}
                        </p>
                        {status.errorMessage && (
                          <p className="text-sm text-red-600 mt-2">
                            Error: {status.errorMessage}
                          </p>
                        )}
                      </div>
                      <div className="ml-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          status.status === 'draft_created' ? 'bg-green-100 text-green-800' :
                          status.status === 'error' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {status.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Email Settings Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium mb-4">Add Email Account</h3>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Provider</label>
                  <select
                    value={emailForm.provider}
                    onChange={(e) => setEmailForm({ ...emailForm, provider: e.target.value as 'gmail' | 'imap' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="gmail">Gmail</option>
                    <option value="imap">IMAP/SMTP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={emailForm.email}
                    onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                {emailForm.provider === 'gmail' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gmail Token</label>
                    <textarea
                      value={emailForm.gmailToken}
                      onChange={(e) => setEmailForm({ ...emailForm, gmailToken: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      rows={3}
                      placeholder="Paste Gmail OAuth token JSON"
                      required
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">IMAP Host</label>
                      <input
                        type="text"
                        value={emailForm.imapHost}
                        onChange={(e) => setEmailForm({ ...emailForm, imapHost: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Username</label>
                      <input
                        type="text"
                        value={emailForm.username}
                        onChange={(e) => setEmailForm({ ...emailForm, username: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <input
                        type="password"
                        value={emailForm.password}
                        onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Check Interval (minutes)</label>
                  <input
                    type="number"
                    value={emailForm.checkInterval}
                    onChange={(e) => setEmailForm({ ...emailForm, checkInterval: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    min="1"
                    max="60"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Client Filter Modal */}
        {showFilterModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium mb-4">Add Client Email Filter</h3>
              <form onSubmit={handleFilterSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client Email</label>
                  <input
                    type="email"
                    value={filterForm.emailAddress}
                    onChange={(e) => setFilterForm({ ...filterForm, emailAddress: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="client@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Project (Optional)</label>
                  <input
                    type="text"
                    value={filterForm.projectId}
                    onChange={(e) => setFilterForm({ ...filterForm, projectId: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Project ID"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFilterModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Filter
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Draft Detail Modal */}
        {selectedDraft && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium">AI Draft Review</h3>
                <button
                  onClick={() => setSelectedDraft(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Original Email */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Original Email</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">From: {selectedDraft.originalEmail?.from}</p>
                    <p className="text-sm text-gray-600">Subject: {selectedDraft.originalEmail?.subject}</p>
                    <p className="text-sm text-gray-600">
                      Date: {selectedDraft.originalEmail?.date ? new Date(selectedDraft.originalEmail.date).toLocaleString() : 'Unknown'}
                    </p>
                    <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedDraft.originalEmail?.body}
                    </div>
                  </div>
                </div>

                {/* AI Draft */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">AI Draft</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Subject</label>
                      <input
                        type="text"
                        value={editingDraft.subject || selectedDraft.subject}
                        onChange={(e) => setEditingDraft({ ...editingDraft, subject: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Body</label>
                      <textarea
                        value={editingDraft.body || selectedDraft.body}
                        onChange={(e) => setEditingDraft({ ...editingDraft, body: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        rows={8}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Closing</label>
                      <input
                        type="text"
                        value={editingDraft.closing || selectedDraft.closing}
                        onChange={(e) => setEditingDraft({ ...editingDraft, closing: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Signature</label>
                      <input
                        type="text"
                        value={editingDraft.signature || selectedDraft.signature}
                        onChange={(e) => setEditingDraft({ ...editingDraft, signature: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => handleDeclineDraft(selectedDraft.id)}
                  className="px-4 py-2 text-red-700 bg-red-100 rounded-md hover:bg-red-200"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleUpdateDraft(selectedDraft.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update Draft
                </button>
                <button
                  onClick={() => handleApproveDraft(selectedDraft.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Approve & Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 