'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GlassButton } from '../glass';

interface NavLink {
  label: string;
  href: string;
  icon?: string;
}

const navLinks: NavLink[] = [
  { label: 'Agents', href: '/agents', icon: '🤖' },
  { label: 'Transactions', href: '/transactions', icon: '📊' },
  { label: 'BYOA', href: '/byoa', icon: '🔗' },
];

export const TopNav: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-constellation-blue to-constellation-indigo/80 backdrop-blur-glass border-b border-constellation-cyan/20">
      <div className="container-base">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-constellation-cyan to-constellation-purple rounded-lg flex items-center justify-center text-lg font-bold">
              ⭐
            </div>
            <h1 className="text-xl font-bold text-constellation-white hidden sm:block">
              Agentic Wallet
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 text-constellation-silver hover:text-constellation-cyan transition-colors duration-200"
              >
                {link.icon && <span>{link.icon}</span>}
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Network Status */}
            <div className="hidden md:flex items-center gap-2 text-sm text-constellation-white">
              <span className="w-2 h-2 bg-constellation-cyan rounded-full md:inline-block"></span>
              <span>Testnet</span>
            </div>

            {/* Settings Button */}
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <span className="text-lg">⚙️</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 hover:bg-white/10 rounded-lg"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span className="text-lg">☰</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-constellation-cyan/20 animate-slide-down">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-2 px-4 text-constellation-silver hover:text-constellation-cyan hover:bg-white/5 rounded-lg transition-colors"
              >
                {link.icon && <span>{link.icon}</span>} {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};
