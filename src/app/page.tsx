'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import Image from 'next/image';

console.log('Firebase config (landing):', auth.app.options);

export default function Home() {
  const [authChecking, setAuthChecking] = useState(true);
  const router = useRouter();

  // Check if user is authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('onAuthStateChanged (landing) fired. User:', user);
      if (user) {
        // User is signed in, redirect to dashboard
        router.push('/dashboard');
      } else {
        // User is not signed in, show landing page
        setAuthChecking(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Show loading while checking authentication
  if (authChecking) {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <Image src="/digilogo.png" alt="Digipod Logo" width={120} height={40} />
          {/* <span className="font-extrabold text-2xl tracking-tight text-blue-700">Digipod</span> */}
        </div>
        <div className="flex gap-4">
          <Link 
            href="/signin" 
            className="px-6 py-2 text-blue-600 font-semibold hover:text-blue-700 transition"
          >
            Sign In
          </Link>
          <Link 
            href="/signup" 
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6">
          Automate Your
          <span className="block text-blue-600">Client Communication</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl">
          Digipod helps creative agencies and freelancers automate client emails, 
          track project phases, and focus on what matters most - your creative work.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <Link 
            href="/signup" 
            className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg text-lg hover:bg-blue-700 transition shadow-lg"
          >
            Get Started Free
          </Link>
          <Link 
            href="/signin" 
            className="px-8 py-4 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg text-lg hover:bg-blue-50 transition"
          >
            Sign In
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl w-full">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Email Replies</h3>
            <p className="text-gray-600">Generate professional email responses with AI assistance</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Project Tracking</h3>
            <p className="text-gray-600">Organize client projects and track progress phases</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Time Saving</h3>
            <p className="text-gray-600">Save hours on admin work and focus on creativity</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-500">
        <p>&copy; 2024 Digipod. Built for creative professionals.</p>
        <a
          href="/privacy-policy.html"
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-2 text-blue-600 hover:underline text-sm"
        >
          Privacy Policy
        </a>
      </footer>
    </div>
  );
}
