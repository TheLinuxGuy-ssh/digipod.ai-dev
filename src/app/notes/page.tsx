"use client";
import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";
import './notes-darkquill.css';

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

function ConnectGmailModal({ open }: { open: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-gray-900 rounded-xl p-8 shadow-xl border border-blue-800 flex flex-col items-center">
        <h2 className="text-2xl font-bold text-white mb-4">Start by connecting GMAIL</h2>
        <p className="text-blue-200 mb-6">To use Notes and other features, please connect your Gmail or other mailbox from the sidebar.</p>
        <button
          className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold shadow-sm transition"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export default function NotesPage() {
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("digipod-user-notes-rich");
    if (stored) {
      setNotes(stored === '<p><br></p>' ? '' : stored);
    }
    // Check Gmail connection on mount and on focus
    function checkGmail() {
      if (typeof window !== 'undefined' && window.gmailConnected === false) {
        setShowModal(true);
      } else {
        setShowModal(false);
      }
    }
    checkGmail();
    window.addEventListener('focus', checkGmail);
    return () => window.removeEventListener('focus', checkGmail);
  }, []);

  const handleSave = () => {
    localStorage.setItem("digipod-user-notes-rich", notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex flex-col h-full min-h-screen w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <ConnectGmailModal open={showModal} />
      <div className="flex-1 flex flex-col w-full h-full">
        <h1 className="text-3xl font-bold text-white pt-8 pb-4 pl-4">Notes</h1>
        <div className="flex-1 flex flex-col w-full h-full pb-8">
          <div ref={editorRef} className="flex-1 flex flex-col w-full h-full">
            <ReactQuill
              theme="snow"
              value={notes}
              onChange={setNotes}
              placeholder="What are you thinking today?"
              className="dark-quill bg-gray-900 rounded-lg flex-1 h-full min-h-[400px] text-white"
              style={{ height: "100%" }}
            />
          </div>
        </div>
        <div className="fixed bottom-8 right-8 z-10">
          <button
            onClick={handleSave}
            className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold shadow-sm transition disabled:opacity-50"
          >
            Save Notes
          </button>
          {saved && <div className="text-green-400 text-center mt-2">Notes saved!</div>}
        </div>
      </div>
    </div>
  );
} 