'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const TopNav: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/agents', label: 'Agents', icon: '🤖' },
    { href: '/transactions', label: 'Transactions', icon: '💱' },
    { href: '/byoa', label: 'BYOA', icon: '🔗' },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Floating Navigation Bar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'glass shadow-lg py-3'
            : 'bg-transparent py-6'
        }`}
      >
        <div className="container-base flex items-center justify-between">
          {/* Logo Section */}
          <Link
            href="/"
            className="flex items-center gap-3 group"
          >
            <div className="relative">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-cyan rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-300" />
              
              {/* Logo Icon */}
              <div className="relative bg-dark-900 rounded-lg p-2">
                <span className="text-xl">⚡</span>
              </div>
            </div>

            {/* Logo Text */}
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gradient">FLASH</span>
              <span className="text-xs text-slate-100 -mt-1">Agentic Wallet</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 relative group ${
                  isActive(link.href)
                    ? 'text-cyan-400'
                    : 'text-slate-100 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{link.icon}</span>
                  {link.label}
                </span>

                {/* Animated Underline */}
                <div
                  className={`absolute bottom-0 left-0 h-0.5 bg-gradient-cyan transition-all duration-300 ${
                    isActive(link.href) ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}
                />

                {/* Hover Background */}
                {!isActive(link.href) && (
                  <div className="absolute inset-0 rounded-lg bg-cyan-500/5 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
              </Link>
            ))}
          </div>

          {/* Right Section: User Profile & Mobile Menu Toggle */}
          <div className="flex items-center gap-4">
            {/* User Profile Dropdown (Desktop) */}
            <div className="hidden md:flex items-center">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg glass glass-hover group">
                <div className="w-8 h-8 rounded-full bg-gradient-cyan flex items-center justify-center font-bold text-dark-900 text-sm">
                  A
                </div>
                <span className="text-sm font-medium text-slate-100 group-hover:text-white">
                  Admin
                </span>
                <svg className="w-4 h-4 text-slate-100 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg glass glass-hover text-cyan-400"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed top-20 left-0 right-0 z-40 md:hidden animate-slide-down">
          <div className="glass m-4 rounded-xl overflow-hidden">
            <div className="flex flex-col">
              {navLinks.map((link, index) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`px-4 py-3 border-b border-cyan-900/20 last:border-b-0 flex items-center gap-3 transition-colors ${
                    isActive(link.href)
                      ? 'bg-cyan-500/10 text-cyan-400'
                      : 'text-slate-100 hover:bg-cyan-500/5'
                  }`}
                  style={{ 
                    animation: `slideInUp 0.3s ease-out ${index * 50}ms both`
                  }}
                >
                  <span className="text-xl">{link.icon}</span>
                  <span className="font-medium">{link.label}</span>
                </Link>
              ))}

              {/* Mobile User Profile */}
              <div className="px-4 py-4 border-t border-cyan-900/20 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-cyan flex items-center justify-center font-bold text-dark-900">
                  A
                </div>
                <div>
                  <p className="font-medium text-white">Admin</p>
                  <p className="text-xs text-slate-100">Connected</p>
                </div>
              </div>

              {/* Mobile Logout */}
              <button className="w-full px-4 py-3 text-left text-error hover:bg-error/10 transition-colors font-medium border-t border-cyan-900/20">
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for fixed nav */}
      <div className="h-20" />
    </>
  );
};
