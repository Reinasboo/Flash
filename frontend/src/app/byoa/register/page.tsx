'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { GlassCard, GlassButton, GlassInput } from '@/components/glass';
import Link from 'next/link';

interface RegistrationResponse {
  agentId: string;
  publicKey: string;
  controlToken: string;
}

export default function RegisterBYOA() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contact_email: '',
    webhook_url: '',
    webhook_secret: '',
  });
  const [result, setResult] = useState<RegistrationResponse | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.registerBYOAAgent({
        name: formData.name,
        description: formData.description || undefined,
        contact_email: formData.contact_email || undefined,
        webhook_url: formData.webhook_url || undefined,
        webhook_secret: formData.webhook_secret || undefined,
        metadata: {
          registeredAt: new Date().toISOString(),
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setResult(data);
      setStep('success');
      // Store credentials for future use
      apiClient.setBYOAAuth(data.agentId, data.controlToken);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Agent name is required');
      return;
    }
    registerMutation.mutate();
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
    
    // Auto-clear clipboard after 60 seconds to prevent clipboard hijacking
    // This reduces the window for attackers to read credentials from clipboard via ClipboardAPI
    setTimeout(() => {
      navigator.clipboard.writeText("").catch(() => {
        // Silently fail if unable to clear (rare, user may have denied permission)
      });
    }, 60000); // 60 seconds
  };

  if (step === 'success' && result) {
    return (
      <div className="space-y-6">
        {/* Success Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Registration Successful! 🎉</h1>
            <p className="text-constellation-light">
              Your external agent has been registered and is ready to use
            </p>
          </div>
        </div>

        {/* Credentials Card */}
        <GlassCard className="p-8 bg-green-500/5 border-green-500/20">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Agent Details</h2>
            <p className="text-constellation-light">Save these credentials securely. You'll need them to authenticate API requests.</p>
          </div>

          <div className="space-y-6">
            {/* Agent ID */}
            <div>
              <label className="text-sm text-constellation-light block mb-2">Agent ID</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={result.agentId}
                  readOnly
                  className="flex-1 bg-constellation-dark/50 border border-constellation-cyan/30 rounded px-4 py-2 text-white font-mono text-sm"
                />
                <button
                  onClick={() => handleCopy(result.agentId, 'agentId')}
                  className="px-4 py-2 bg-constellation-cyan/20 hover:bg-constellation-cyan/30 text-constellation-cyan rounded transition-colors text-sm"
                >
                  {copied === 'agentId' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Public Key */}
            <div>
              <label className="text-sm text-constellation-light block mb-2">Stellar Public Key</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={result.publicKey}
                  readOnly
                  className="flex-1 bg-constellation-dark/50 border border-constellation-cyan/30 rounded px-4 py-2 text-white font-mono text-sm break-all"
                />
                <button
                  onClick={() => handleCopy(result.publicKey, 'publicKey')}
                  className="px-4 py-2 bg-constellation-cyan/20 hover:bg-constellation-cyan/30 text-constellation-cyan rounded transition-colors text-sm shrink-0"
                >
                  {copied === 'publicKey' ? '✓' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Control Token */}
            <div>
              <label className="text-sm text-constellation-light block mb-2">Control Token (Store Securely!)</label>
              <p className="text-xs text-yellow-400 mb-2">⚠️ This is shown only once. Save it now in a secure location.</p>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={result.controlToken}
                  readOnly
                  className="flex-1 bg-constellation-dark/50 border border-constellation-cyan/30 rounded px-4 py-2 text-white font-mono text-sm"
                />
                <button
                  onClick={() => handleCopy(result.controlToken, 'controlToken')}
                  className="px-4 py-2 bg-constellation-cyan/20 hover:bg-constellation-cyan/30 text-constellation-cyan rounded transition-colors text-sm"
                >
                  {copied === 'controlToken' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded">
            <p className="text-sm text-yellow-300">
              <strong>Important:</strong> Store your Control Token securely. We hash it on our servers and can never show it again. If lost, you'll need to rotate your credentials.
            </p>
          </div>
        </GlassCard>

        {/* Next Steps */}
        <GlassCard className="p-6">
          <h3 className="text-xl font-bold text-white mb-4">Next Steps</h3>
          <ol className="space-y-3 text-constellation-light">
            <li>
              <strong className="text-white">1. Save Credentials</strong>
              <p className="text-sm">Securely store your Agent ID and Control Token in your application</p>
            </li>
            <li>
              <strong className="text-white">2. Fund Wallet</strong>
              <p className="text-sm">Your Stellar account needs XLM to execute transactions</p>
            </li>
            <li>
              <strong className="text-white">3. Submit Intents</strong>
              <p className="text-sm">Use the API to submit transaction intents with authentication</p>
            </li>
            <li>
              <strong className="text-white">4. Monitor Status</strong>
              <p className="text-sm">Check execution status via the /intents/:id endpoint or webhooks</p>
            </li>
          </ol>
        </GlassCard>

        {/* API Documentation */}
        <GlassCard className="p-6">
          <h3 className="text-xl font-bold text-white mb-4">API Authentication Example</h3>
          <pre className="bg-constellation-dark/50 text-constellation-cyan text-xs p-4 rounded overflow-x-auto">
{`curl -X POST http://localhost:3001/byoa/agents/${result.agentId}/intents \\
  -H "X-Agent-ID: ${result.agentId}" \\
  -H "X-Control-Token-Hash: <sha256-hash-of-token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "idempotency_key": "uuid-here",
    "intents": [{
      "type": "TRANSFER_XLM",
      "params": {
        "destination": "GABC...",
        "amount": "10.00"
      }
    }]
  }'`}
          </pre>
        </GlassCard>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Link href="/byoa" className="flex-1">
            <GlassButton className="w-full py-3">← Back to Agents</GlassButton>
          </Link>
          <Link href={`/byoa/${result.agentId}`} className="flex-1">
            <GlassButton className="w-full py-3 bg-constellation-cyan/20">View Agent →</GlassButton>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Register External Agent (BYOA)</h1>
        <p className="text-constellation-light">
          Create a new external agent with secure control token authentication
        </p>
      </div>

      {/* Registration Form */}
      <GlassCard className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Agent Name */}
          <div>
            <label className="text-white text-sm font-semibold block mb-2">
              Agent Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Trading Bot, Price Monitor"
              className="w-full bg-constellation-dark/50 border border-constellation-cyan/30 rounded px-4 py-2 text-white placeholder-constellation-light/50 focus:border-constellation-cyan/60 focus:outline-none transition-colors"
              required
            />
            <p className="text-xs text-constellation-light mt-1">Required. 1-128 characters.</p>
          </div>

          {/* Description */}
          <div>
            <label className="text-white text-sm font-semibold block mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What does this agent do?"
              rows={3}
              className="w-full bg-constellation-dark/50 border border-constellation-cyan/30 rounded px-4 py-2 text-white placeholder-constellation-light/50 focus:border-constellation-cyan/60 focus:outline-none transition-colors"
            />
          </div>

          {/* Contact Email */}
          <div>
            <label className="text-white text-sm font-semibold block mb-2">
              Contact Email
            </label>
            <input
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              placeholder="your@example.com"
              className="w-full bg-constellation-dark/50 border border-constellation-cyan/30 rounded px-4 py-2 text-white placeholder-constellation-light/50 focus:border-constellation-cyan/60 focus:outline-none transition-colors"
            />
          </div>

          {/* Webhook URL */}
          <div>
            <label className="text-white text-sm font-semibold block mb-2">
              Webhook URL (Optional)
            </label>
            <input
              type="url"
              value={formData.webhook_url}
              onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              placeholder="https://your-app.com/webhooks/byoa"
              className="w-full bg-constellation-dark/50 border border-constellation-cyan/30 rounded px-4 py-2 text-white placeholder-constellation-light/50 focus:border-constellation-cyan/60 focus:outline-none transition-colors"
            />
            <p className="text-xs text-constellation-light mt-1">HTTPS required. We'll send intent events to this URL.</p>
          </div>

          {/* Webhook Secret */}
          <div>
            <label className="text-white text-sm font-semibold block mb-2">
              Webhook Secret (Optional)
            </label>
            <input
              type="password"
              value={formData.webhook_secret}
              onChange={(e) => setFormData({ ...formData, webhook_secret: e.target.value })}
              placeholder="Min 32 characters for security"
              className="w-full bg-constellation-dark/50 border border-constellation-cyan/30 rounded px-4 py-2 text-white placeholder-constellation-light/50 focus:border-constellation-cyan/60 focus:outline-none transition-colors"
            />
            <p className="text-xs text-constellation-light mt-1">Used to verify webhook signatures via HMAC-SHA256.</p>
          </div>

          {/* Error Message */}
          {registerMutation.isError && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded">
              <p className="text-red-300 text-sm">
                {registerMutation.error instanceof Error
                  ? registerMutation.error.message
                  : 'Registration failed. Please try again.'}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="flex-1 bg-constellation-cyan/20 hover:bg-constellation-cyan/30 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded transition-colors"
            >
              {registerMutation.isPending ? '⏳ Registering...' : '✓ Register Agent'}
            </button>
            <Link href="/byoa" className="flex-1">
              <button
                type="button"
                className="w-full bg-constellation-light/10 hover:bg-constellation-light/20 text-constellation-light font-semibold py-3 rounded transition-colors"
              >
                Cancel
              </button>
            </Link>
          </div>
        </form>
      </GlassCard>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-white mb-3">Security Features</h3>
          <ul className="space-y-2 text-sm text-constellation-light">
            <li>✓ SHA-256 hashed control tokens</li>
            <li>✓ Constant-time verification (timing-attack resistant)</li>
            <li>✓ Rate limiting per agent</li>
            <li>✓ Audit trail for all actions</li>
            <li>✓ HMAC-SHA256 webhook signatures</li>
          </ul>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-white mb-3">API Endpoints</h3>
          <ul className="space-y-2 text-sm font-mono text-constellation-cyan">
            <li>POST /byoa/agents/:id/intents</li>
            <li>GET /byoa/agents/:id</li>
            <li>GET /byoa/agents/:id/intents/:id</li>
            <li>GET /byoa/agents/:id/transactions</li>
            <li>PUT /byoa/agents/:id/config</li>
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}
