import Image from 'next/image';
import Link from 'next/link';

export default function Onboarding() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 py-12">
      <div className="bg-gray-900/90 rounded-2xl shadow-2xl p-8 max-w-lg w-full border border-blue-900 backdrop-blur-md">
        <div className="flex flex-col items-center mb-6">
          <Image src="/digilogo.png" alt="Digipod Logo" width={120} height={40} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4 text-center">Welcome to Digipod!</h1>
        <p className="text-blue-100 text-center mb-6">
          Digipod helps creative agencies and freelancers automate client emails, track project phases, and focus on what matters most—your creative work.
        </p>
        <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-blue-800">
          <h2 className="text-lg font-semibold text-blue-300 mb-2">Why do we need Gmail access?</h2>
          <ul className="list-disc list-inside text-blue-100 text-sm space-y-1">
            <li>We never store your emails or credentials on our servers.</li>
            <li>All access is secure and you can disconnect anytime.</li>
            <li>We only use the minimum permissions needed to automate your workflow.</li>
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <Link href="/dashboard" className="bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg text-center transition">
            Go to Dashboard
          </Link>
          <Link href="/privacy-policy.html" target="_blank" className="text-blue-400 hover:underline text-center text-sm">
            Read our Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
} 