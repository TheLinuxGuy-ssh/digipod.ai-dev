"use client";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useCallback, useState } from "react";
import "./testimonial.css";

declare global {
  interface Window {
    Razorpay?: unknown;
  }
}

export default function LandingPage() {
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showPreorderModal, setShowPreorderModal] = useState(false);

  const handleRazorpay = useCallback(() => {
    if (typeof window === "undefined" || !window.Razorpay) {
      alert("Razorpay SDK not loaded yet. Please wait a moment and try again.");
      return;
    }
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
      amount: 40000,
      currency: "INR",
      name: "Digipod",
      description: "Early Access - Founders Deal",
      handler: async function (response: unknown) {
        const res = response as { razorpay_payment_id?: string };
        if (!res.razorpay_payment_id) {
          alert("Payment ID missing!");
          return;
        }
        setIsRedirecting(true);
        // Call backend to verify and get license key
        const verifyRes = await fetch("/api/verify-razorpay-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payment_id: res.razorpay_payment_id }),
        });
        const data = await verifyRes.json();
        if (data.code) {
          window.location.href = `/preorder-success?license=${encodeURIComponent(data.code)}&payment_id=${encodeURIComponent(res.razorpay_payment_id)}`;
        } else {
          setIsRedirecting(false);
          alert("Payment verified, but license key not generated. Please contact support.");
        }
      },
      prefill: {
        name: "",
        email: "",
      },
      theme: {
        color: "#6c4ad6",
      },
    };
    type RazorpayType = new (options: object) => { open: () => void };
    const RazorpayConstructor = window.Razorpay as RazorpayType;
    const rzp = new RazorpayConstructor(options);
    rzp.open();
  }, []);

  return (
    <main className="min-h-screen w-full flex flex-col items-center text-white bg-gradient-to-b from-[#0a0820] via-[#14122b] to-[#1a1333]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Navbar */}
      <nav className="w-full flex flex-col items-center py-3 px-2 bg-transparent sticky top-0 z-30">
        <div className="flex w-full max-w-3xl items-center justify-between bg-black/90 rounded-2xl border border-[#666] px-5 py-2" style={{ boxShadow: '0 2px 16px 0 #0008' }}>
          <div className="flex flex-col items-center">
            <Image src="/digipod.png" alt="Digipod Logo" height={36} width={120} style={{ height: 36, width: 'auto' }} />
          </div>
          <div className="flex gap-2">
            <Link href="/signin" className="rounded-full px-5 py-2 bg-[#2d186a] text-white font-bold text-base shadow border border-[#3a1c8d] hover:bg-[#3a1c8d] transition-all" style={{ boxShadow: '0 2px 8px 0 #2d186a44' }}>Sign In</Link>
            <Link href="/signup" className="rounded-full px-5 py-2 bg-[#6c4ad6] text-white font-bold text-base shadow border border-[#6c4ad6] hover:bg-[#8f5fff] transition-all" style={{ boxShadow: '0 2px 8px 0 #6c4ad644' }}>Sign Up</Link>
          </div>
        </div>
      </nav>

      {/* Pre-order Modal */}
      {showPreorderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-[#18122b] rounded-2xl shadow-lg max-w-md w-full p-8 relative animate-fade-in">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl font-bold"
              onClick={() => setShowPreorderModal(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-4 text-center text-[#FFD600]">Pre-order Digipod</h2>
            <ul className="mb-6 text-left list-disc list-inside text-lg text-[#e0d6ff] space-y-2">
              <li>✔️ Lifetime access to Digipod (no monthly fees)</li>
              <li>✔️ Early access to all new features</li>
              <li>✔️ Founders badge on your profile</li>
              <li>✔️ Priority support & feature requests</li>
              <li>✔️ Exclusive community access</li>
            </ul>
            <button
              className="w-full bg-[#FFD600] text-[#1a1333] font-bold rounded-full px-8 py-3 shadow-lg hover:bg-yellow-300 transition-transform transform hover:scale-105 focus:ring-2 focus:ring-[#FFD600] border border-[#FFD600] disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={() => { setShowPreorderModal(false); handleRazorpay(); }}
              disabled={!razorpayLoaded || isRedirecting}
              type="button"
            >
              {razorpayLoaded ? (isRedirecting ? "Redirecting..." : "Pay Now") : "Loading..."}
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative w-full flex flex-col items-center justify-center text-center py-28 px-4 overflow-hidden" style={{ minHeight: '91.25vh' }}>
        {/* 3JS Wave Background */}
        <div id="container" className="absolute inset-0 w-full h-full z-0" style={{ pointerEvents: 'none' }} />
        {/* Optionally, remove or darken decorative overlays for a pure midnight look */}
        <div className="relative z-20 flex flex-col items-center justify-center w-full">
          <h2 className="text-lg font-semibold mb-4 text-[#FFD600] tracking-widest uppercase drop-shadow">Your Anti-Productivity Tool</h2>
          <h1 className="boldonse text-5xl md:text-7xl mb-6 leading-tight bg-gradient-to-r from-[#a18fff] via-[#6e3bbd] to-[#4b217a] bg-clip-text text-transparent animate-fade-in">AI-POWERED<br />BACK OFFICE</h1>
          <p className="max-w-2xl mx-auto text-lg text-[#e0d6ff] mb-10 animate-fade-in delay-100">
            Digipod is the first anti productivity tool for creatives.<br />We don&apos;t help hustle - we help you stop. Automate emails, invoices, updates, client chaos so you can finally get back to your craft.
          </p>
          <div className="flex flex-wrap gap-4 justify-center animate-fade-in delay-200">
            <a href="https://forms.gle/2j3DcMv9HyxzeDqi8" target="_blank" rel="noopener noreferrer" className="bg-white text-[#1a1333] font-bold rounded-full px-8 py-3 shadow-lg hover:bg-gray-200 transition-transform transform hover:scale-105 focus:ring-2 focus:ring-[#a18fff] border border-[#a18fff]">Join Waitlist →</a>
            <button
              type="button"
              onClick={handleRazorpay}
              disabled={!razorpayLoaded || isRedirecting}
              className="bg-[#FFD600] text-[#1a1333] font-bold rounded-full px-8 py-3 shadow-lg hover:bg-yellow-300 transition-transform transform hover:scale-105 focus:ring-2 focus:ring-[#FFD600] border border-[#FFD600] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {razorpayLoaded ? (isRedirecting ? "Redirecting..." : "Unlock Founders Deal") : "Loading..."}
            </button>
          </div>
          {isRedirecting && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
              <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-xl shadow-xl">
                <svg className="animate-spin h-8 w-8 text-[#6c4ad6]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span className="text-[#1a1333] font-semibold text-lg">Redirecting to success page...</span>
              </div>
            </div>
          )}
          <Script
            src="https://checkout.razorpay.com/v1/checkout.js"
            strategy="afterInteractive"
            onLoad={() => setRazorpayLoaded(true)}
          />
        </div>
      </section>

      {/* Dashboard Image Section */}
      <section className="w-full flex justify-center py-20 relative overflow-hidden">
        {/* Optionally, remove or darken dashboard section overlay for a pure midnight look */}
        <Image src="/showcase-latest.png" width={900} height={700} alt="Dashboard Screenshot" className="rounded-3xl shadow-2xl max-w-full h-auto border-4 border-[#3a1c8d] animate-fade-in" />
      </section>

      {/* Before/After Section */}
      <section className="w-full flex flex-col md:flex-row justify-center items-stretch gap-10 py-20 px-4">
        <div className="bg-gradient-to-br from-[#1a1333] to-[#3a1c8d] rounded-3xl p-10 flex-1 max-w-md shadow-2xl border border-[#3a1c8d] hover:scale-105 transition-transform duration-300">
          <h2 className="text-2xl font-bold mb-6 text-[#FFD600] tracking-wide">Before DigiPod</h2>
          <ul className="space-y-5 text-[#ffb3b3] text-base font-medium">
            <li>❌ You spent 4 hours a day searching and replying to emails that could have been one sentence</li>
            <li>❌ Projects move forward only when you manually nudge them, remind clients and update timelines.</li>
            <li>❌ Clients derail your flow with random requests, scope creep, and 17 follow ups.</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-[#2d186a] to-[#4b217a] rounded-3xl p-10 flex-1 max-w-md shadow-2xl border border-[#3a1c8d] hover:scale-105 transition-transform duration-300">
          <h2 className="text-2xl font-bold mb-6 text-[#6ee7b7] tracking-wide">After DigiPod</h2>
          <ul className="space-y-5 text-[#b3ffb3] text-base font-medium">
            <li>✅ AI handles 90% of the client emails while you sip coffee and design in peace.</li>
            <li>✅ DigiPod auto-advances projects based on smart email parsing and intent protection.</li>
            <li>✅ Clients are onboarded, well communicated and filtered automatically - no interruptions, no nonsense.</li>
          </ul>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full flex flex-col items-center py-24 px-4">
        <h2 className="text-4xl font-extrabold mb-16 text-center bg-gradient-to-r from-[#a18fff] via-[#6e3bbd] to-[#4b217a] bg-clip-text text-transparent tracking-tight animate-fade-in">Features</h2>
        <div className="flex flex-col items-center gap-16 w-full max-w-4xl">
          {/* Feature 1 */}
          <div className="flex flex-col md:flex-row items-center bg-gradient-to-br from-[#18122b] to-[#232042] rounded-3xl p-0 md:p-8 w-full shadow-2xl border border-[#3a1c8d] feature-card-glow">
            {/* Left: Text */}
            <div className="flex-1 flex flex-col items-start justify-center p-8 md:p-12">
              <span className="bg-[#232042] text-[#FFD600] font-bold rounded-full px-5 py-2 mb-6 text-lg shadow border border-[#FFD600]">01</span>
              <h3 className="text-3xl md:text-4xl font-extrabold mb-4 text-white">AI powered<br/>Client Inbox</h3>
              <p className="text-[#bcb8d8] text-lg mb-0 md:mb-0 font-medium">Your chaotic inbox, reimagined.<br/>Lets AI triage, respond and organise client comms so you never miss a beat.</p>
            </div>
            {/* Right: Image */}
            <div className="flex-1 flex items-center justify-center p-8 md:p-0">
              <Image src="/inbox.png" alt="Inbox" width={400} height={260} className="rounded-2xl shadow-lg border-2 border-[#232042] bg-[#232042]" />
            </div>
          </div>
          {/* Feature 2 */}
          <div className="flex flex-col md:flex-row-reverse items-center bg-gradient-to-br from-[#18122b] to-[#232042] rounded-3xl p-0 md:p-8 w-full shadow-2xl border border-[#3a1c8d] feature-card-glow">
            <div className="flex-1 flex flex-col items-start justify-center p-8 md:p-12">
              <span className="bg-[#232042] text-[#FFD600] font-bold rounded-full px-5 py-2 mb-6 text-lg shadow border border-[#FFD600]">02</span>
              <h3 className="text-3xl md:text-4xl font-extrabold mb-4 text-white">Automatic Phase Detection & Progression</h3>
              <p className="text-[#bcb8d8] text-lg mb-0 md:mb-0 font-medium">No more manually updating project statuses.<br/><span className="text-white">Digipod tracks progress and nudges</span> phases forward - automatically.</p>
            </div>
            <div className="flex-1 flex items-center justify-center p-8 md:p-0">
              <Image src="/progression.png" alt="Progression" width={400} height={260} className="rounded-2xl shadow-lg border-2 border-[#232042] bg-[#232042]" />
            </div>
          </div>
          {/* Feature 3 */}
          <div className="flex flex-col md:flex-row items-center bg-gradient-to-br from-[#18122b] to-[#232042] rounded-3xl p-0 md:p-8 w-full shadow-2xl border border-[#3a1c8d] feature-card-glow">
            <div className="flex-1 flex flex-col items-start justify-center p-8 md:p-12">
              <span className="bg-[#232042] text-[#FFD600] font-bold rounded-full px-5 py-2 mb-6 text-lg shadow border border-[#FFD600]">03</span>
              <h3 className="text-3xl md:text-4xl font-extrabold mb-4 text-white">Intelligence that gets Smarter</h3>
              <p className="text-[#bcb8d8] text-lg mb-0 md:mb-0 font-medium">Our AI learns from every project, client message and edge case.<br/><span className="text-white">Fewer Fumbles.</span> Sharper Suggestions. Always levelling up.</p>
            </div>
            <div className="flex-1 flex items-center justify-center p-8 md:p-0">
              <Image src="/AI.png" alt="AI" width={400} height={260} className="rounded-2xl shadow-lg border-2 border-[#232042] bg-[#232042]" />
            </div>
          </div>
          {/* Feature 4 */}
          <div className="flex flex-col md:flex-row-reverse items-center bg-gradient-to-br from-[#18122b] to-[#232042] rounded-3xl p-0 md:p-8 w-full shadow-2xl border border-[#3a1c8d] feature-card-glow">
            <div className="flex-1 flex flex-col items-start justify-center p-8 md:p-12">
              <span className="bg-[#232042] text-[#FFD600] font-bold rounded-full px-5 py-2 mb-6 text-lg shadow border border-[#FFD600]">04</span>
              <h3 className="text-3xl md:text-4xl font-extrabold mb-4 text-white">No more scope Marathons</h3>
              <p className="text-[#bcb8d8] text-lg mb-0 md:mb-0 font-medium">Detect scope creep before it becomes a crisis.<br/><span className="text-white">Digipod sets, defends</span> and enforces boundaries - without the awkward convos.</p>
            </div>
            <div className="flex-1 flex items-center justify-center p-8 md:p-0">
              <Image src="/marathon.png" alt="Marathon" width={400} height={260} className="rounded-2xl shadow-lg border-2 border-[#232042] bg-[#232042]" />
            </div>
          </div>
          {/* Feature 5 */}
          <div className="flex flex-col md:flex-row items-center bg-gradient-to-br from-[#18122b] to-[#232042] rounded-3xl p-0 md:p-8 w-full shadow-2xl border border-[#3a1c8d] feature-card-glow">
            <div className="flex-1 flex flex-col items-start justify-center p-8 md:p-12">
              <span className="bg-[#232042] text-[#FFD600] font-bold rounded-full px-5 py-2 mb-6 text-lg shadow border border-[#FFD600]">05</span>
              <h3 className="text-3xl md:text-4xl font-extrabold mb-4 text-white">Built to integrate, Not isolate</h3>
              <p className="text-[#bcb8d8] text-lg mb-0 md:mb-0 font-medium">Digipod plugs into your existing workflows -<br/><span className="text-white">from Gmail to Notion to Slack.</span> No rip and replace required.</p>
            </div>
            <div className="flex-1 flex items-center justify-center p-8 md:p-0">
              <Image src="/mail.png" alt="Mail" width={400} height={260} className="rounded-2xl shadow-lg border-2 border-[#232042] bg-[#232042]" />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="w-full flex flex-col items-center py-24 px-4">
        <h2 className="text-4xl font-extrabold mb-10 text-center bg-gradient-to-r from-[#a18fff] via-[#6e3bbd] to-[#4b217a] bg-clip-text text-transparent tracking-tight animate-fade-in">Be one of the first 100 to own the AI Back Office for your creative work</h2>
        <div className="bg-gradient-to-br from-[#2d186a] to-[#3a1c8d] rounded-3xl p-12 flex flex-col items-center shadow-2xl max-w-md w-full border border-[#3a1c8d] animate-fade-in">
          <span className="mb-4 text-base font-extrabold uppercase tracking-wider text-white bg-gradient-to-r from-[#FFD600] to-[#6c4ad6] px-6 py-2 rounded-full shadow-lg transition-transform transform hover:scale-105 animate-pulse">Limited time offer</span>
          <h3 className="text-2xl font-bold mb-2 text-[#FFD600]">Early Access</h3>
          <p className="text-5xl font-extrabold mb-4"><span className="text-[#FFD600]">INR 400</span> <span className="text-lg line-through text-[#a18fff] ml-2">INR 3500</span></p>
          <ul className="text-[#e0d6ff] text-lg mb-8 space-y-3">
            <li>✔️ Get Early Access + 3 Months Free</li>
            <li>✔️ Lifetime Discount Post Launch</li>
            <li>✔️ Your feature requests get top priority</li>
          </ul>
          <button
            type="button"
            onClick={handleRazorpay}
            disabled={!razorpayLoaded || isRedirecting}
            className="bg-[#FFD600] text-[#1a1333] font-bold rounded-full px-10 py-4 shadow-lg hover:bg-yellow-300 transition-transform transform hover:scale-105 w-full text-center focus:ring-2 focus:ring-[#FFD600] border border-[#FFD600] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {razorpayLoaded ? (isRedirecting ? "Redirecting..." : "Pre-order Now") : "Loading..."}
          </button>
        </div>
      </section>
      <div className="outerdiv">
    <div className="innerdiv">
      <div className="div1 eachdiv bg-gradient-to-br from-[#18122b] to-[#232042] border border-[#3a1c8d] rounded-3xl shadow-2xl">
          <div className="userdetails">
          <div className="imgbox">
            <img src="./profile.svg" alt="" />
          </div>
          <div className="detbox">
            <p className="name">Tumusiime Elijah</p>
            <p className="designation">Founder of Stealth Startup</p>
          </div>
          </div>
        <div className="text-2xl md:text-2xl font-extrabold mb-4 text-white">
          <h4>The life of a creative is definitely simplified.</h4>
       </div>
      </div>
      <div className="div2 eachdiv bg-gradient-to-br from-[#18122b] to-[#232042] border border-[#3a1c8d] rounded-3xl shadow-2xl">
                <div className="userdetails">
          <div className="imgbox">
            <img src="./prof-1.jpg" alt="" />
          </div>
          <div className="detbox">
            <p className="name">Dewashish Mehta</p>
            <p className="designation">Full Stack JS Developer</p>
          </div>
          </div>
        <div className="text-2xl md:text-2xl font-extrabold mb-4 text-white">
          <h4>Absolutely Amazing!</h4>
        </div>
      </div>
      <div className="div3 eachdiv bg-gradient-to-br from-[#18122b] to-[#232042] border border-[#3a1c8d] rounded-3xl shadow-2xl">
                <div className="userdetails">
          <div className="imgbox">
            <img src="./tlg.png" alt="" />
          </div>
          <div className="detbox">
            <p className="name">TheLinuxGuy</p>
            <p className="designation">Server Administrator</p>
          </div>
          </div>
        <div className="text-2xl md:text-2xl font-extrabold mb-4 text-white">
          <h4>Would love to try it out!! 🤩 Very excited!!!!</h4>
          </div>
      </div>
      <div className="div4 eachdiv bg-gradient-to-br from-[#18122b] to-[#232042] border border-[#3a1c8d] rounded-3xl shadow-2xl">
                <div className="userdetails">
          <div className="imgbox">
            <img src="./profile.svg" alt="" />
          </div>
          <div className="detbox">
            <p className="name">Adam West</p>
            <p className="designation">Developer@Stealth </p>
          </div>
          </div>
        <div className="text-2xl md:text-2xl font-extrabold mb-4 text-white">
          <h4>Looks Promising! </h4>
        </div>
      </div>
      <div className="div5 eachdiv bg-gradient-to-br from-[#18122b] to-[#232042] border border-[#3a1c8d] rounded-3xl shadow-2xl">
                <div className="userdetails">
          <div className="imgbox">
            <img src="./profile.svg" alt="" />
          </div>
          <div className="detbox">
            <p className="name">Urjah Goel</p>
            <p className="designation">Creative Freelancer</p>
          </div>
          </div>
        <div className="text-2xl md:text-2xl font-extrabold mb-4 text-white">
          <h4>Take my money!!</h4>
        </div>
      </div>
    </div>
  </div>
      {/* Footer */}
      <footer className="w-full flex flex-col items-center justify-center py-14 border-t border-[#3a1c8d] mt-auto relative overflow-hidden">
        {/* Optionally, remove or darken footer overlay for a pure midnight look */}
        <a href="https://forms.gle/2j3DcMv9HyxzeDqi8" target="_blank" rel="noopener noreferrer" className="bg-white text-[#1a1333] font-bold rounded-full px-8 py-3 shadow-lg hover:bg-gray-200 transition mb-6 animate-fade-in border border-[#a18fff]">Get Early Access →</a>
        <div className="text-[#a18fff] text-base animate-fade-in">&copy; {new Date().getFullYear()} Digipod. All rights reserved. <a href="/privacy-policy.html" target="_blank" className="underline ml-2">Privacy Policy</a></div>
      </footer>
    </main>
  );
} 