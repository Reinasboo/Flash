'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 md:pt-32 md:pb-48">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 right-10 w-72 h-72 bg-primary-200 rounded-full blur-3xl opacity-20"></div>
          <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-accent-300 rounded-full blur-3xl opacity-10"></div>
        </div>

        <div className="container-base">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 animate-fade-in">
              Autonomous Agent Wallet
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed animate-slide-in">
              Secure, intelligent wallet automation powered by autonomous agents on the Stellar network.
              Enable your agents to make financial decisions with confidence.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-slide-in">
              <Link href="/dashboard">
                <Button
                  variant="primary"
                  size="lg"
                  className="px-8"
                >
                  Enter Dashboard
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="lg"
                className="px-8"
              >
                Learn More
              </Button>
            </div>

            {/* Network Status */}
            <div className="pt-12 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-4">Network Status</p>
              <div className="flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 bg-success-500 rounded-full animate-pulse"></span>
                <span className="text-gray-900 font-medium">Stellar Testnet - Operational</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-spacing bg-gray-50">
        <div className="container-base">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to manage autonomous agents and their wallets
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '🤖',
                title: 'Agent Management',
                description: 'Create, monitor, and control autonomous agents with ease',
              },
              {
                icon: '💳',
                title: 'Wallet Control',
                description: 'Secure wallet management with granular permission controls',
              },
              {
                icon: '⚡',
                title: 'Real-time Transactions',
                description: 'View and track all agent transactions in real-time',
              },
              {
                icon: '🔐',
                title: 'Enterprise Security',
                description: 'Bank-grade security with multi-layer authentication',
              },
              {
                icon: '📊',
                title: 'Analytics Dashboard',
                description: 'Comprehensive insights into agent activity and performance',
              },
              {
                icon: '🔗',
                title: 'Stellar Integration',
                description: 'Native integration with the Stellar blockchain network',
              },
            ].map((feature, idx) => (
              <Card
                key={idx}
                hoverable
                className="flex flex-col items-start"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-spacing">
        <div className="container-base">
          <div className="bg-gradient-hero text-white rounded-2xl px-8 py-16 md:px-16 md:py-24 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to get started?
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Join thousands of teams managing autonomous agents with confidence
            </p>
            <Link href="/dashboard">
              <Button variant="secondary" size="lg" className="px-8">
                Access Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container-base">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-bold mb-4">Agentic Wallet</h4>
              <p className="text-sm">Autonomous agent wallet management on Stellar</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition">Features</Link></li>
                <li><Link href="#" className="hover:text-white transition">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white transition">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Developers</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition">Docs</Link></li>
                <li><Link href="#" className="hover:text-white transition">API</Link></li>
                <li><Link href="#" className="hover:text-white transition">SDK</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition">About</Link></li>
                <li><Link href="#" className="hover:text-white transition">Blog</Link></li>
                <li><Link href="#" className="hover:text-white transition">Contact</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm">&copy; 2024 Agentic Wallet. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0 text-sm">
              <Link href="#" className="hover:text-white transition">Privacy</Link>
              <Link href="#" className="hover:text-white transition">Terms</Link>
              <Link href="#" className="hover:text-white transition">Status</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
