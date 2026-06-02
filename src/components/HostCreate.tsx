import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Camera, Users, Sparkles, Loader2 } from 'lucide-react';

interface HostCreateProps {
  navigate: (path: string) => void;
}

export default function HostCreate({ navigate }: HostCreateProps) {
  const [partyName, setPartyName] = useState('');
  const [hostName, setHostName] = useState('');
  const [capacity, setCapacity] = useState('50');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim() || !hostName.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: partyName.trim(),
          hostDisplayName: hostName.trim(),
          maxCapacity: parseInt(capacity, 10) || 50,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong.');
      }

      // Celebrate!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#a78bfa', '#f472b6', '#38bdf8'],
      });

      // Save auth details for this party
      localStorage.setItem(`partylynx_token_${data.party.inviteToken}`, data.token);
      localStorage.setItem(
        `partylynx_user_${data.party.inviteToken}`,
        JSON.stringify({
          guestId: data.guestId,
          displayName: hostName.trim(),
          role: 'host',
        })
      );

      // Redirect host straight to their party feed
      setTimeout(() => {
        navigate(`/party/${data.party.inviteToken}`);
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Failed to create party. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
      {/* Top Brand logo */}
      <div className="flex items-center justify-center space-x-3 mt-6">
        <div className="p-3 bg-gradient-to-tr from-violet-600 to-pink-600 rounded-2xl shadow-lg animate-float">
          <Camera className="w-8 h-8 text-white" />
        </div>
        <span className="text-3xl font-display font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400">
          PartyLynx
        </span>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-md mx-auto my-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-extrabold tracking-tight mb-3">
            Shared digital photo albums,{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-pink-400">
              instantly.
            </span>
          </h1>
          <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
            Guests join via a simple link or QR code, snap photos from their native camera, and view the feed. No app download required.
          </p>
        </div>

        {/* Create Card Form */}
        <div className="glass-card rounded-3xl p-8 relative overflow-hidden pulse-border border border-purple-500/20">
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl text-center">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="party-name" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Party / Album Name
              </label>
              <input
                id="party-name"
                type="text"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="e.g., Summer Bash 2026 🌴"
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100 placeholder-slate-600 transition"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="host-name" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Your Display Name
              </label>
              <input
                id="host-name"
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="e.g., Alex (Host)"
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100 placeholder-slate-600 transition"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="capacity" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex justify-between items-center">
                <span>Guest Capacity Limit</span>
                <span className="text-slate-500 font-normal flex items-center gap-1 normal-case">
                  <Users className="w-3.5 h-3.5" /> Max capacity
                </span>
              </label>
              <input
                id="capacity"
                type="number"
                min="1"
                max="500"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="50"
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100 placeholder-slate-600 transition"
                required
                disabled={loading}
              />
              <p className="mt-1.5 text-slate-500 text-xxs leading-normal">
                Enforces a hard limit on guests allowed to enter this party room.
              </p>
            </div>

            <button
              id="btn-create-album"
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-semibold rounded-xl transition shadow-lg shadow-purple-500/20 active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Creating Album...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Create Shared Album</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer info */}
      <div className="text-center text-slate-600 text-xs py-4">
        © 2026 PartyLynx PWA. Built for frictionless moments.
      </div>
    </div>
  );
}
