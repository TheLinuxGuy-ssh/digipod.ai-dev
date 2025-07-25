"use client";
import { useEffect, useState } from 'react';
import CoPilot from './CoPilot';

export default function AuthenticatedCoPilot() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    // Dynamically import Firebase to avoid SSR issues
    const initAuth = async () => {
      try {
        const { auth } = await import('@/lib/firebase');
        const { onAuthStateChanged } = await import('firebase/auth');
        
        if (!auth) {
          console.warn('Firebase auth not initialized');
          setIsLoading(false);
          return;
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setIsAuthenticated(!!user);
          setIsLoading(false);
        }, (error) => {
          console.error('Auth state change error:', error);
          setIsAuthenticated(false);
          setIsLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error setting up auth listener:', error);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Don't render anything while checking authentication
  if (isLoading) {
    return null;
  }

  // Only render Co-Pilot if user is authenticated
  return isAuthenticated ? <CoPilot /> : null;
} 