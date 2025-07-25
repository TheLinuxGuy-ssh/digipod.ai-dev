"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

const WORKFLOWS = [
  {
    key: "onboarding",
    label: "Client Onboarding Email",
    subject: "Welcome to our agency!",
    prompt: "Send a warm welcome and onboarding instructions to new clients.",
    tone: "Friendly"
  },
  {
    key: "weekly-update",
    label: "Weekly Update Email",
    subject: "Weekly Project Update",
    prompt: "Summarize project progress and next steps for the week.",
    tone: "Professional"
  },
  {
    key: "late-payment",
    label: "Late Payment Follow-up",
    subject: "Payment Reminder",
    prompt: "Remind client about overdue invoices in a polite way.",
    tone: "Polite"
  },
  {
    key: "scope-freeze",
    label: "Scope Freeze Reminder",
    subject: "Scope Freeze Notice",
    prompt: "Notify client that the project scope is now locked to prevent scope creep.",
    tone: "Firm"
  },
  {
    key: "handoff",
    label: "Project Handoff Summary",
    subject: "Project Handoff & Next Steps",
    prompt: "Summarize project completion and provide next steps/resources.",
    tone: "Supportive"
  }
];

const AGENCY_TYPES = ["Design", "Dev", "Marketing", "Mixed"];
const PAINS = [
  "Late replies",
  "Project updates",
  "Scope creep",
  "Payments"
];
const FREQUENCIES = ["Daily", "Weekly", "Biweekly", "Monthly"];

function matchWorkflows(agencyType: string, painPoints: string[], frequency: string) {
  const enabled: typeof WORKFLOWS = [];
  // Always enable onboarding
  enabled.push(WORKFLOWS[0]);
  if (painPoints.includes("Late replies") || painPoints.includes("Project updates") || frequency === "Weekly") {
    enabled.push(WORKFLOWS[1]);
  }
  if (painPoints.includes("Payments")) {
    enabled.push(WORKFLOWS[2]);
  }
  if (painPoints.includes("Scope creep")) {
    enabled.push(WORKFLOWS[3]);
  }
  if (agencyType === "Dev" || agencyType === "Mixed") {
    enabled.push(WORKFLOWS[4]);
  }
  // Remove duplicates
  return Array.from(new Set(enabled));
}

export default function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [agencyType, setAgencyType] = useState("");
  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [frequency, setFrequency] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [enabledWorkflows, setEnabledWorkflows] = useState<typeof WORKFLOWS>([]);
  const router = useRouter();

  function handlePainToggle(pain: string) {
    setPainPoints((prev) =>
      prev.includes(pain) ? prev.filter((p) => p !== pain) : [...prev, pain]
    );
  }

  async function handleSubmit() {
    setLoading(true);
    // Auto-match workflows
    const workflows = matchWorkflows(agencyType, painPoints, frequency);
    setEnabledWorkflows(workflows);
    // Save to Firestore under user profile
    try {
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, 'users', user.uid), {
          enabledWorkflows: workflows.map(wf => wf.key),
        }, { merge: true });
        localStorage.setItem('digipod-onboarding-complete', 'true');
      }
    } catch {
      // Optionally handle error
    }
    setLoading(false);
    setConfirmed(true);
    setTimeout(() => router.push("/dashboard"), 1800);
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 py-12">
      <div className="bg-gray-900/95 rounded-2xl shadow-2xl p-8 max-w-xl w-full border border-blue-900 backdrop-blur-md flex flex-col items-center">
        {!confirmed ? (
          <>
            <h1 className="text-3xl font-bold text-white mb-8 text-center">Welcome! Let’s set up Digipod for you</h1>
            {step === 0 && (
              <div className="w-full flex flex-col items-center gap-6">
                <label className="text-lg text-blue-200 font-semibold mb-2">What type of agency are you?</label>
                <select
                  className="w-full p-3 rounded-lg bg-gray-800 text-white border border-blue-800 focus:ring-2 focus:ring-blue-400"
                  value={agencyType}
                  onChange={e => setAgencyType(e.target.value)}
                >
                  <option value="">Select agency type</option>
                  {AGENCY_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <button
                  className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold shadow-sm transition disabled:opacity-50 mt-4"
                  disabled={!agencyType}
                  onClick={() => setStep(1)}
                >
                  Next
                </button>
              </div>
            )}
            {step === 1 && (
              <div className="w-full flex flex-col items-center gap-6">
                <label className="text-lg text-blue-200 font-semibold mb-2">What’s your biggest client ops pain?</label>
                <div className="flex flex-wrap gap-3 w-full justify-center">
                  {PAINS.map(pain => (
                    <button
                      key={pain}
                      type="button"
                      className={`px-5 py-2 rounded-lg border font-semibold transition text-white ${painPoints.includes(pain) ? "bg-blue-700 border-blue-700" : "bg-gray-800 border-blue-800 hover:border-blue-500"}`}
                      onClick={() => handlePainToggle(pain)}
                    >
                      {pain}
                    </button>
                  ))}
                </div>
                <button
                  className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold shadow-sm transition disabled:opacity-50 mt-4"
                  disabled={painPoints.length === 0}
                  onClick={() => setStep(2)}
                >
                  Next
                </button>
              </div>
            )}
            {step === 2 && (
              <div className="w-full flex flex-col items-center gap-6">
                <label className="text-lg text-blue-200 font-semibold mb-2">How often do you talk to clients?</label>
                <div className="flex flex-wrap gap-3 w-full justify-center">
                  {FREQUENCIES.map(freq => (
                    <label key={freq} className={`px-5 py-2 rounded-lg border font-semibold transition text-white cursor-pointer ${frequency === freq ? "bg-blue-700 border-blue-700" : "bg-gray-800 border-blue-800 hover:border-blue-500"}`}>
                      <input
                        type="radio"
                        name="frequency"
                        value={freq}
                        checked={frequency === freq}
                        onChange={() => setFrequency(freq)}
                        className="mr-2 accent-blue-600"
                      />
                      {freq}
                    </label>
                  ))}
                </div>
                <button
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold text-lg shadow transition disabled:opacity-50 mt-4"
                  disabled={!frequency || loading}
                  onClick={handleSubmit}
                >
                  {loading ? "Setting up..." : "Finish & Setup Workflows"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-6 py-12 pb-12">
            <h2 className="text-2xl font-bold text-white mb-2 text-center">Awesome. We’ve preloaded these workflows for you.</h2>
            <div className="w-full flex flex-col gap-2 items-center">
              {enabledWorkflows.map(wf => (
                <div key={wf.key} className="bg-blue-800/80 text-blue-100 px-6 py-4 rounded-lg font-semibold shadow mb-2 w-full max-w-lg">
                  <div className="font-bold text-lg mb-1">{wf.label}</div>
                  <div className="text-blue-200 text-sm mb-1"><span className='font-semibold'>Subject:</span> {wf.subject}</div>
                  <div className="text-blue-300 text-sm mb-1"><span className='font-semibold'>Prompt:</span> {wf.prompt}</div>
                  <div className="text-blue-400 text-xs italic"><span className='font-semibold'>Tone:</span> {wf.tone}</div>
                </div>
              ))}
            </div>
            <div className="text-blue-300 mt-4 text-center">Redirecting to dashboard...</div>
          </div>
        )}
      </div>
    </div>
  );
} 