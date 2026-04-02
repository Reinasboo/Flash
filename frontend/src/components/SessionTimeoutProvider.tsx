'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const WARNING_TIME = 5 * 60 * 1000; // Show warning 5 minutes before timeout

interface SessionTimeoutProps {
  children: React.ReactNode;
}

/**
 * SessionTimeoutProvider
 * 
 * Implements automatic session timeout for BYOA authentication:
 * - Logs out user after 30 minutes of inactivity
 * - Shows warning 5 minutes before timeout
 * - Resets timer on user activity (mouse, keyboard, scroll)
 * - Clears all credentials on timeout
 * 
 * Vulnerability Fixed: HIGH - No session timeout
 * Addresses: Long-lived credentials without timeout
 */
export function SessionTimeoutProvider({ children }: SessionTimeoutProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const [showWarning, setShowWarning] = React.useState(false);
  const warningShownRef = useRef(false);

  // Clear any pending timeouts
  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
  }, []);

  // Handle session timeout
  const handleSessionTimeout = useCallback(() => {
    console.warn('Session timeout: User has been inactive for 30 minutes');
    
    // Clear all credentials
    apiClient.clearBYOAAuth();
    
    // Reset warning state
    setShowWarning(false);
    warningShownRef.current = false;
    
    // Show notification to user
    if (typeof window !== 'undefined') {
      // Optional: You could use a toast notification here
      alert('Your session has expired due to inactivity. Please log in again.');
    }
  }, []);

  // Show warning when close to timeout
  const showTimeoutWarning = useCallback(() => {
    if (!warningShownRef.current) {
      console.warn('Session timeout warning: User will be logged out in 5 minutes');
      setShowWarning(true);
      warningShownRef.current = true;
    }
  }, []);

  // Reset the timeout timer
  const resetTimeout = useCallback(() => {
    clearTimeouts();
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    setShowWarning(false);

    // Set warning timeout (25 minutes)
    warningTimeoutRef.current = setTimeout(() => {
      showTimeoutWarning();
    }, SESSION_TIMEOUT - WARNING_TIME);

    // Set logout timeout (30 minutes)
    timeoutRef.current = setTimeout(() => {
      handleSessionTimeout();
    }, SESSION_TIMEOUT);
  }, [clearTimeouts, handleSessionTimeout, showTimeoutWarning]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    // Only reset if we have BYOA credentials
    if (typeof window !== 'undefined' && sessionStorage.getItem('byoa-auth')) {
      resetTimeout();
    }
  }, [resetTimeout]);

  // Set up activity listeners
  useEffect(() => {
    // Events that indicate user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Initialize timer on mount
    resetTimeout();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearTimeouts();
    };
  }, [handleActivity, resetTimeout, clearTimeouts]);

  return (
    <>
      {children}
      
      {/* Session Timeout Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-2xl">⏱️</div>
              <h2 className="text-lg font-bold text-gray-900">Session Expiring Soon</h2>
            </div>
            
            <p className="text-gray-700 mb-4">
              Your session will expire in <strong>5 minutes</strong> due to inactivity. 
              Your credentials will be cleared for security.
            </p>
            
            <p className="text-sm text-gray-600 mb-6">
              Click anywhere to continue your session, or you will be automatically logged out.
            </p>
            
            <button
              onClick={() => {
                setShowWarning(false);
                handleActivity();
              }}
              className="w-full px-4 py-2 bg-constellation-cyan text-white rounded font-semibold hover:bg-constellation-cyan/90 transition-colors"
            >
              Continue Session
            </button>
          </div>
        </div>
      )}
    </>
  );
}
