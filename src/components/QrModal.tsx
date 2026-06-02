import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Share2 } from 'lucide-react';

interface QrModalProps {
  inviteToken: string;
  partyName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function QrModal({ inviteToken, partyName, isOpen, onClose }: QrModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const inviteUrl = `${window.location.origin}/join/${inviteToken}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (typeof navigator.share !== 'undefined') {
      try {
        await navigator.share({
          title: `Join ${partyName} on PartyLynx`,
          text: `Share and view photos from the party live! No app download needed.`,
          url: inviteUrl,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark overlay backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
        onClick={onClose} 
      />

      {/* Modal box */}
      <div className="relative w-full max-w-sm glass-neon-purple rounded-3xl p-6 overflow-hidden z-10 text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 bg-slate-900/80 border border-slate-800 rounded-full hover:bg-slate-800 transition text-slate-400 hover:text-slate-100 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mt-2 mb-6">
          <Share2 className="w-8 h-8 mx-auto text-purple-400 mb-2 animate-float" />
          <h2 className="text-xl font-display font-bold text-slate-100">Invite Guests</h2>
          <p className="text-slate-400 text-xs mt-1 px-4 leading-normal">
            Guests scan this QR code to join &ldquo;{partyName}&rdquo; instantly.
          </p>
        </div>

        {/* QR Code Container */}
        <div className="bg-white p-5 rounded-2xl inline-block shadow-inner mx-auto mb-6">
          <QRCodeSVG 
            value={inviteUrl} 
            size={180} 
            level="M" 
            includeMargin={false}
            fgColor="#020617"
            bgColor="#FFFFFF"
          />
        </div>

        {/* Share / Copy controls */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5">
            <span className="text-slate-400 text-xxs truncate flex-1 text-left select-all px-1.5 font-mono">
              {inviteUrl}
            </span>
            <button
              onClick={copyToClipboard}
              className="p-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-slate-100 transition active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
              title="Copy link"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            {typeof navigator.share !== 'undefined' && (
              <button
                onClick={handleNativeShare}
                className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-purple-500/10"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Link</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
