import React, { useState, useEffect, useRef } from 'react';
import { Camera, Share2, RefreshCw, Loader2, ArrowLeft, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import type { Photo, Party } from '../types';
import { compressPhoto } from '../utils/compress';
import QrModal from './QrModal';
import { API_BASE_URL } from '../config';

interface FeedProps {
  inviteToken: string;
  navigate: (path: string) => void;
}

export default function Feed({ inviteToken, navigate }: FeedProps) {
  const [partyInfo, setPartyInfo] = useState<Party | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentUser, setCurrentUser] = useState<{ guestId: string; displayName: string; role: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState('');
  
  // QR modal
  const [qrOpen, setQrOpen] = useState(false);

  // Pull-to-refresh state variables
  const [pullDistance, setPullDistance] = useState(0);
  const [pullStatus, setPullStatus] = useState<'idle' | 'pulling' | 'threshold' | 'refreshing'>('idle');
  const touchStartY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pullThreshold = 80;

  // Retrieve credentials and verify membership on load
  useEffect(() => {
    const savedToken = localStorage.getItem(`partylynx_token_${inviteToken}`);
    const savedUser = localStorage.getItem(`partylynx_user_${inviteToken}`);

    if (!savedToken || !savedUser) {
      console.warn('Unauthorized access to feed, redirecting to join gate.');
      navigate(`/join/${inviteToken}`);
      return;
    }

    setToken(savedToken);
    setCurrentUser(JSON.parse(savedUser));
    
    // Initial loading sequence
    loadFeed();
  }, [inviteToken]);

  // Load the party metadata and photos
  const loadFeed = async () => {
    try {
      setLoading(true);
      setError('');

      // 1. Fetch party info
      const partyRes = await fetch(`${API_BASE_URL}/api/parties/join/${inviteToken}`);
      const partyData = await partyRes.json();
      if (!partyRes.ok) throw new Error(partyData.message || 'Party details not found');
      setPartyInfo(partyData);

      // 2. Fetch initial photos
      const photoRes = await fetch(`${API_BASE_URL}/api/photos/party/${partyData._id || partyData.id}`);
      const photoData = await photoRes.json();
      if (!photoRes.ok) throw new Error(photoData.message || 'Failed to load photos');
      setPhotos(photoData);

    } catch (err: any) {
      setError(err.message || 'Error loading album.');
    } finally {
      setLoading(false);
    }
  };

  // Delta Fetch on Pull to Refresh
  const refreshFeed = async () => {
    if (!partyInfo) return;
    setError('');

    try {
      // Find the timestamp of the newest non-optimistic photo
      const newestPhoto = photos.find(p => !p.isOptimistic);
      const sinceParam = newestPhoto ? `?since=${newestPhoto.timestamp}` : '';

      const res = await fetch(`${API_BASE_URL}/api/photos/party/${partyInfo._id || partyInfo.id}${sinceParam}`);
      const newPhotos = await res.json();

      if (!res.ok) throw new Error(newPhotos.message || 'Failed to refresh feed.');

      if (newPhotos.length > 0) {
        // Prepend new items to feed
        setPhotos(prev => {
          // Filter duplicates just in case
          const existingIds = new Set(prev.map(p => p._id));
          const uniqueNewPhotos = newPhotos.filter((p: Photo) => !existingIds.has(p._id));
          return [...uniqueNewPhotos, ...prev];
        });
      }
    } catch (err: any) {
      console.error('Refresh failed:', err);
      // Don't clutter UI with critical error on pull to refresh, silent alert
    } finally {
      setPullDistance(0);
      setPullStatus('idle');
    }
  };

  // Trigger hidden input camera
  const triggerCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // File captured handler (The core native camera upload route)
  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !partyInfo || !currentUser || !token) return;

    const file = files[0];
    
    // 1. Create a local URL for instant preview (Optimistic UI Rendering)
    const previewUrl = URL.createObjectURL(file);
    const tempId = `optimistic_${Date.now()}`;
    
    const optimisticPhoto: Photo = {
      _id: tempId,
      partyId: partyInfo._id || partyInfo.id || '',
      guestId: currentUser.guestId,
      uploaderDisplayName: currentUser.displayName,
      mediaUrl: previewUrl,
      timestamp: new Date().toISOString(),
      isOptimistic: true,
    };

    // Prepend optimistic preview
    setPhotos(prev => [optimisticPhoto, ...prev]);
    setUploadingCount(prev => prev + 1);

    // Reset camera input trigger so same file can be snapped again if needed
    if (e.target) e.target.value = '';

    try {
      // 2. Perform aggressive client-side compression
      const compressedFile = await compressPhoto(file);

      // 3. Prepare FormData
      const formData = new FormData();
      formData.append('photo', compressedFile);

      // 4. POST file to backend
      const uploadRes = await fetch(`${API_BASE_URL}/api/photos/party/${partyInfo._id || partyInfo.id}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      // Replace optimistic card with real uploaded image
      setPhotos(prev =>
        prev.map(p => (p._id === tempId ? { ...data, isOptimistic: false } : p))
      );
    } catch (err: any) {
      console.error('Photo upload error:', err);
      // Mark card as failed
      setPhotos(prev =>
        prev.map(p => (p._id === tempId ? { ...p, uploadFailed: true } : p))
      );
    } finally {
      setUploadingCount(prev => Math.max(0, prev - 1));
      // Cleanup the blob preview URL
      URL.revokeObjectURL(previewUrl);
    }
  };

  const removeFailedPhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p._id !== id));
  };

  // Pull to refresh touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const container = scrollContainerRef.current;
    if (container && container.scrollTop === 0 && pullStatus === 'idle') {
      touchStartY.current = e.touches[0].clientY;
      setPullStatus('pulling');
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStatus !== 'pulling' && pullStatus !== 'threshold') return;
    
    const touchY = e.touches[0].clientY;
    const dy = touchY - touchStartY.current;

    if (dy > 0) {
      // Apply logarithmic damping for smooth native feel
      const distance = Math.min(150, Math.log1p(dy / 80) * 80);
      setPullDistance(distance);
      
      if (distance >= pullThreshold) {
        setPullStatus('threshold');
      } else {
        setPullStatus('pulling');
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullStatus === 'threshold') {
      setPullStatus('refreshing');
      setPullDistance(pullThreshold - 20); // Hold at slightly lower than pull point
      refreshFeed();
    } else {
      setPullStatus('idle');
      setPullDistance(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4" />
        <p className="text-slate-400 text-sm">Entering Shared Album...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100 max-w-lg mx-auto border-x border-slate-900/60 relative overflow-hidden select-none">
      
      {/* HEADER SECTION */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-900/80 p-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="p-2 bg-slate-900/60 border border-slate-800 rounded-xl hover:bg-slate-800 transition text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="text-center flex-1 mx-4 overflow-hidden">
          <h1 className="font-display font-bold text-base text-slate-100 truncate">
            {partyInfo?.name}
          </h1>
          <p className="text-slate-500 text-xxs flex items-center justify-center gap-1">
            <span>{photos.length} photos</span>
            <span>&bull;</span>
            <span className="text-purple-400 font-semibold">{partyInfo?.currentGuests}/{partyInfo?.maxCapacity} Guests</span>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Share QR Trigger */}
          <button
            onClick={() => setQrOpen(true)}
            className="p-2 bg-gradient-to-tr from-violet-600/20 to-pink-600/20 border border-purple-500/30 text-purple-300 rounded-xl hover:from-violet-600/30 hover:to-pink-600/30 transition cursor-pointer"
            title="Invite Guests"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* DETAILED PULL TO REFRESH HEADER */}
      <div 
        className="w-full overflow-hidden flex items-center justify-center transition-all duration-200 bg-slate-950"
        style={{ height: `${pullDistance}px`, opacity: pullDistance > 0 ? 1 : 0 }}
      >
        <div className="flex items-center space-x-2 text-slate-400 text-xs">
          {pullStatus === 'refreshing' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
              <span>Fetching new snaps...</span>
            </>
          ) : pullStatus === 'threshold' ? (
            <>
              <RefreshCw className="w-4 h-4 rotate-180 text-pink-500 transition-transform duration-200" />
              <span>Release to refresh</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 text-slate-600" />
              <span>Pull down to reload</span>
            </>
          )}
        </div>
      </div>

      {/* MAIN PHOTO ALBUM FEED CONTAINER */}
      <div
        ref={scrollContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-tap-highlight"
      >
        {/* Error message banner */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-2xl text-center">
            {error}
          </div>
        )}
        {/* Uploading counter banner */}
        {uploadingCount > 0 && (
          <div className="p-3 bg-purple-600/10 border border-purple-500/20 rounded-2xl flex items-center justify-center space-x-2 text-xs text-purple-300">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Sending {uploadingCount} photo{uploadingCount > 1 ? 's' : ''} to album...</span>
          </div>
        )}

        {/* Empty state splash */}
        {photos.length === 0 ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="p-4 bg-slate-900 rounded-full text-slate-600 border border-slate-800">
              <ImageIcon className="w-12 h-12" />
            </div>
            <h3 className="font-display font-semibold text-lg text-slate-200">No Photos Snapshots Yet</h3>
            <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
              Tap the camera button below to snap the first photo of the event and add it to the shared album!
            </p>
            <button
              onClick={triggerCamera}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-pink-600 rounded-xl font-medium text-xs shadow-md shadow-purple-500/10 cursor-pointer"
            >
              Take First Photo
            </button>
          </div>
        ) : (
          /* Grid list of Photos */
          <div className="grid grid-cols-2 gap-3 pb-24">
            {photos.map((photo) => {
              const isUploadFailed = photo.uploadFailed;
              const isUploading = photo.isOptimistic;

              return (
                <div
                  key={photo._id}
                  className={`group relative aspect-[3/4] rounded-2xl overflow-hidden glass-panel border transition-all duration-300 ${
                    isUploading
                      ? 'border-purple-500/40 opacity-75 pulse-border upload-shimmer'
                      : isUploadFailed
                      ? 'border-red-500/50 ring-2 ring-red-500/15'
                      : 'border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Real or preview image */}
                  <img
                    src={photo.mediaUrl.startsWith('http') || photo.mediaUrl.startsWith('blob:') ? photo.mediaUrl : `${API_BASE_URL}${photo.mediaUrl}`}
                    alt={`Photo by ${photo.uploaderDisplayName}`}
                    loading="lazy"
                    className={`w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-105 ${
                      isUploading ? 'blur-sm brightness-75' : ''
                    }`}
                  />

                  {/* Gradient bottom overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent opacity-90 pointer-events-none" />

                  {/* Glass label metadata */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between">
                    <div className="overflow-hidden">
                      <p className="text-xxs font-bold text-slate-200 truncate pr-1">
                        {photo.uploaderDisplayName}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        {formatTime(photo.timestamp)}
                      </p>
                    </div>

                    {photo.guestId === currentUser?.guestId && (
                      <span className="text-[8px] bg-slate-800/90 text-slate-300 font-semibold px-1.5 py-0.5 rounded border border-slate-700/60 uppercase">
                        Me
                      </span>
                    )}
                  </div>

                  {/* Loading animation overlay */}
                  {isUploading && !isUploadFailed && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/30 backdrop-blur-xxs">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                      <span className="text-[9px] text-purple-300 font-semibold mt-1.5 tracking-wider uppercase">Compressing</span>
                    </div>
                  )}

                  {/* Error Upload Failed Overlay */}
                  {isUploadFailed && (
                    <div className="absolute inset-0 bg-slate-950/75 flex flex-col items-center justify-center p-3 text-center">
                      <AlertTriangle className="w-5 h-5 text-red-500 mb-1 animate-bounce" />
                      <p className="text-xxs font-bold text-red-400">Upload Failed</p>
                      <p className="text-[8px] text-slate-500 leading-tight mt-0.5 mb-2.5">
                        Network timeout or limit reached.
                      </p>
                      <button
                        onClick={() => removeFailedPhoto(photo._id)}
                        className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[9px] font-bold rounded-lg transition cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FLOATING ACTION BOTTOM CONTAINER */}
      <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center pointer-events-none">
        <button
          onClick={triggerCamera}
          className="pointer-events-auto w-16 h-16 rounded-full bg-gradient-to-tr from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white shadow-2xl shadow-purple-500/40 flex items-center justify-center transition hover:scale-105 active:scale-95 cursor-pointer"
          title="Snap Photo"
          id="btn-trigger-camera"
        >
          <Camera className="w-7 h-7" />
        </button>
      </div>

      {/* HIDDEN INPUT NATIVE TRIGGER */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraCapture}
        id="camera-capture-input"
      />

      {/* QR MODAL */}
      {partyInfo && (
        <QrModal
          isOpen={qrOpen}
          onClose={() => setQrOpen(false)}
          inviteToken={partyInfo.inviteToken}
          partyName={partyInfo.name}
        />
      )}
    </div>
  );
}

// Format relative times
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    return '';
  }
}
