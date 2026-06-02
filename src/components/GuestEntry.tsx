import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Camera, AlertCircle, Loader2, LogIn } from 'lucide-react';

interface GuestEntryProps {
  inviteToken: string;
  navigate: (path: string) => void;
}

interface PartyInfo {
  id: string;
  name: string;
  hostDisplayName: string;
  currentGuests: number;
  maxCapacity: number;
  isFull: boolean;
}

export default function GuestEntry({ inviteToken, navigate }: GuestEntryProps) {
  const [displayName, setDisplayName] = useState('');
  const [partyInfo, setPartyInfo] = useState<PartyInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if the user already has a token for this party
    const existingToken = localStorage.getItem(`partylynx_token_${inviteToken}`);
    const existingUser = localStorage.getItem(`partylynx_user_${inviteToken}`);
    if (existingToken && existingUser) {
      console.log('Frictionless auto-login for party', inviteToken);
      navigate(`/party/${inviteToken}`);
      return;
    }

    fetchPartyDetails();
  }, [inviteToken]);

  const fetchPartyDetails = async () => {
    try {
      setChecking(true);
      setError('');
      const res = await fetch(`/api/parties/join/${inviteToken}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Party not found or expired.');
      }

      setPartyInfo(data);
    } catch (err: any) {
      setError(err.message || 'Could not verify party invitation.');
    } finally {
      setChecking(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please choose a display name.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/parties/join/${inviteToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to join party.');
      }

      // Celebrate!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#a78bfa', '#f472b6', '#38bdf8'],
      });

      // Save token & user profile
      localStorage.setItem(`partylynx_token_${inviteToken}`, data.token);
      localStorage.setItem(
        `partylynx_user_${inviteToken}`,
        JSON.stringify({
          guestId: data.guestId,
          displayName: displayName.trim(),
          role: 'guest',
        })
      );

      // Redirect into feed
      setTimeout(() => {
        navigate(`/party/${inviteToken}`);
      }, 800);

    } catch (err: any) {
      setError(err.message || 'Failed to join. The party might be full.');
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4" />
        <p className="text-slate-400 text-sm">Verifying Party Invitation...</p>
      </div>
    );
  }

  // Error view (e.g. party not found)
  if (error && !partyInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-center">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-400 mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-display font-bold mb-2">Invalid Invite</h1>
        <p className="text-slate-400 text-sm max-w-xs leading-relaxed mb-6">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition text-sm cursor-pointer"
        >
          Create Your Own Album
        </button>
      </div>
    );
  }

  const isFull = partyInfo ? partyInfo.currentGuests >= partyInfo.maxCapacity : false;

  // Party is full view (The Hard Cap Check)
  if (isFull && partyInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-center">
        <div className="w-16 h-16 bg-pink-500/10 border border-pink-500/20 rounded-full flex items-center justify-center text-pink-400 mb-6 animate-pulse">
          <UsersIcon className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-display font-bold mb-2">Album is Full 🛑</h1>
        <p className="text-slate-400 text-sm max-w-sm leading-relaxed mb-2">
          Oops! &ldquo;{partyInfo.name}&rdquo; has hit its hard limit of <strong>{partyInfo.maxCapacity}</strong> guests.
        </p>
        <p className="text-slate-500 text-xs max-w-xs leading-normal mb-8">
          The host set a capacity cap, and no more users can join this shared folder.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white rounded-xl transition text-sm cursor-pointer font-semibold shadow-lg shadow-purple-500/25"
        >
          Create New Party
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
      {/* Logo */}
      <div className="flex items-center justify-center space-x-3 mt-6">
        <div className="p-3 bg-gradient-to-tr from-violet-600 to-pink-600 rounded-2xl shadow-lg">
          <Camera className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-display font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400">
          PartyLynx
        </span>
      </div>

      {/* Main card */}
      <div className="w-full max-w-md mx-auto my-auto py-8">
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-1">YOU&apos;RE INVITED TO JOIN</p>
          <h1 className="text-3xl font-display font-extrabold tracking-tight mb-2 text-slate-100">
            {partyInfo?.name}
          </h1>
          <p className="text-slate-400 text-xs">
            Hosted by <strong className="text-slate-300">{partyInfo?.hostDisplayName}</strong> &bull; {partyInfo?.currentGuests}/{partyInfo?.maxCapacity} Guests
          </p>
        </div>

        <div className="glass-card rounded-3xl p-8 border border-purple-500/20">
          <form onSubmit={handleJoin} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl text-center">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="guest-name" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Choose a Display Name
              </label>
              <input
                id="guest-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Taylor Jenkins"
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-100 placeholder-slate-600 transition"
                required
                maxLength={25}
                disabled={submitting}
                autoFocus
              />
              <p className="mt-2 text-slate-500 text-xxs leading-normal">
                This name will show next to photos you upload. No email, password, or verification needed.
              </p>
            </div>

            <button
              id="btn-join-party"
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-semibold rounded-xl transition shadow-lg shadow-purple-500/20 active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Entering Album...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Join Live Feed</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="text-center text-slate-600 text-xs py-4">
        PartyLynx &bull; Frictionless photo memories.
      </div>
    </div>
  );
}

// Simple internal helper icon
function UsersIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
