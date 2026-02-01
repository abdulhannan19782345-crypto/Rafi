
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { LiveService } from '../services/liveService';
import { GreenStarLogo } from '../constants';
import { LiveTranscription } from '../types';

interface LiveVoiceInterfaceProps {
  onClose: () => void;
  onSaveSession: (history: LiveTranscription[]) => void;
}

const VOICES = [
  { id: 'Zephyr', name: 'Zephyr (Smooth)' },
  { id: 'Puck', name: 'Puck (Playful)' },
  { id: 'Charon', name: 'Charon (Deep)' },
  { id: 'Kore', name: 'Kore (Cheerful)' },
  { id: 'Fenrir', name: 'Fenrir (Vast)' }
];

const LiveVoiceInterface: React.FC<LiveVoiceInterfaceProps> = ({ onClose, onSaveSession }) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error' | 'permission_denied'>('idle');
  const [transcriptions, setTranscriptions] = useState<LiveTranscription[]>([]);
  const [volume, setVolume] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  
  // Camera & Vision States
  const [useCamera, setUseCamera] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [showToast, setShowToast] = useState(true);
  
  const liveServiceRef = useRef<LiveService | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const transcriptionsRef = useRef<LiveTranscription[]>([]);

  useEffect(() => {
    transcriptionsRef.current = transcriptions;
  }, [transcriptions]);

  const handleEndSession = useCallback(() => {
    if (transcriptionsRef.current.length > 0) {
      onSaveSession(transcriptionsRef.current);
    }
    if (liveServiceRef.current) {
      liveServiceRef.current.disconnect();
    }
    onClose();
  }, [onClose, onSaveSession]);

  const startSession = useCallback(async (overrides?: any) => {
    if (liveServiceRef.current) {
      liveServiceRef.current.disconnect();
    }
    
    setStatus('connecting');
    const service = new LiveService({
      onTranscription: (text, role) => {
        setTranscriptions(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === role) {
            return [...prev.slice(0, -1), { ...last, text: last.text + text }];
          }
          return [...prev, { text, role, timestamp: Date.now() }];
        });
      },
      onVolumeChange: (v) => setVolume(v),
      onError: (err) => {
        console.error("Live UI Error:", err);
        setStatus('error');
      },
      onClose: () => handleEndSession()
    });

    const config = {
      voiceName: overrides?.voiceName ?? selectedVoice,
      useCamera: overrides?.useCamera ?? useCamera,
      facingMode: overrides?.facingMode ?? facingMode,
      videoElement: videoRef.current || undefined
    };

    try {
      await service.connect(config);
      liveServiceRef.current = service;
      setStatus('active');
      setIsSwitchingCamera(false);
    } catch (e: any) {
      console.error("Session failed:", e);
      if (e.message === "MEDIA_PERMISSION_DENIED" || e.name === 'NotAllowedError') {
        setStatus('permission_denied');
      } else {
        setStatus('error');
      }
      setIsSwitchingCamera(false);
    }
  }, [selectedVoice, useCamera, facingMode, handleEndSession]);

  const toggleCamera = () => {
    const nextState = !useCamera;
    setUseCamera(nextState);
    if (status === 'active' || status === 'connecting') {
      startSession({ useCamera: nextState });
    }
  };

  const switchCamera = () => {
    if (isSwitchingCamera) return;
    setIsSwitchingCamera(true);
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (useCamera && (status === 'active' || status === 'connecting')) {
      startSession({ facingMode: nextMode });
    } else {
      setIsSwitchingCamera(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowToast(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (liveServiceRef.current) {
        liveServiceRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white overflow-hidden animate-in fade-in duration-500">
      
      {/* Background Media View */}
      <div className="absolute inset-0 z-0">
        {useCamera ? (
          <div className={`relative w-full h-full transition-opacity duration-700 ${isSwitchingCamera ? 'opacity-0' : 'opacity-100'}`}>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : 'scale-x-1'}`} 
            />
            {/* Scrim to make UI elements pop */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#131314]">
             <div 
               className="w-64 h-64 rounded-full transition-transform duration-300" 
               style={{ 
                 background: `radial-gradient(circle, rgba(66,133,244,0.3) 0%, transparent 70%)`,
                 transform: `scale(${1 + volume * 2})` 
               }}
             >
               <div className="w-full h-full flex items-center justify-center">
                 <div className="w-32 h-32 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full animate-pulse shadow-[0_0_50px_rgba(66,133,244,0.5)]" />
               </div>
             </div>
          </div>
        )}
      </div>

      {/* Top Header Controls */}
      <header className="relative w-full flex justify-between items-center p-6 z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-black/20 backdrop-blur-md rounded-full border border-white/5">
            <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/></svg>
            <span className="text-sm font-semibold tracking-wide">Live</span>
          </div>
        </div>
        <button 
          onClick={switchCamera}
          className="p-3 bg-black/20 backdrop-blur-md rounded-full border border-white/5 text-white/80 hover:bg-black/40"
          title="Switch Camera"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </header>

      {/* Center Content / Transcriptions */}
      <div className="flex-1 w-full flex flex-col justify-end items-center px-6 pb-40 relative z-10 pointer-events-none">
        {showToast && useCamera && (
          <div className="mb-6 px-6 py-3 bg-[#1e1f20]/90 backdrop-blur-xl rounded-2xl border border-white/10 text-white/90 text-sm md:text-base animate-in fade-in slide-in-from-bottom-2 duration-700">
            For better results, capture objects with steady movements.
          </div>
        )}

        {status === 'active' && (
          <div className="w-full max-w-2xl flex flex-col items-center gap-4 text-center">
            {transcriptions.slice(-1).map((t, i) => (
              <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <p className={`text-2xl md:text-3xl font-medium leading-tight drop-shadow-lg ${t.role === 'user' ? 'text-white/60' : 'text-white'}`}>
                  {t.text}
                </p>
              </div>
            ))}
            {transcriptions.length === 0 && (
              <p className="text-xl text-white/40 font-light italic animate-pulse">Listening...</p>
            )}
          </div>
        )}

        {status === 'connecting' && (
          <div className="flex flex-col items-center gap-4 mb-20">
             <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
             <p className="text-white/60 text-lg animate-pulse">Connecting...</p>
          </div>
        )}

        {status === 'idle' && (
          <button 
            onClick={() => startSession()}
            className="pointer-events-auto mb-20 p-8 bg-white text-black rounded-full hover:scale-105 transition-transform shadow-2xl"
          >
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
          </button>
        )}
      </div>

      {/* Main Controls Section - Matches Screenshot */}
      <footer className="fixed bottom-0 left-0 right-0 p-8 flex flex-col items-center z-20 bg-gradient-to-t from-black/80 to-transparent">
        
        {/* The Action Bar */}
        <div className="w-full max-w-sm bg-black/30 backdrop-blur-3xl rounded-[3rem] p-2 flex items-center justify-between border border-white/5 shadow-2xl">
          
          {/* Camera Toggle */}
          <button 
            onClick={toggleCamera}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${useCamera ? 'bg-white text-black' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </button>

          {/* Frame/Upload Simulation Button */}
          <button 
            className="w-16 h-16 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center hover:bg-blue-600/30 transition-colors"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
            </svg>
          </button>

          {/* Microphone Toggle */}
          <button 
            onClick={() => setIsMicOn(!isMicOn)}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isMicOn ? 'bg-white/10 text-white/80 hover:bg-white/20' : 'bg-red-500/20 text-red-500'}`}
          >
            {isMicOn ? (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
            ) : (
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 1l22 22" /></svg>
            )}
          </button>

          {/* Close/End Session Button */}
          <button 
            onClick={handleEndSession}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

        </div>

        {/* Accessibility/Status Info */}
        <div className="mt-4 flex gap-4 text-white/30 text-xs font-bold uppercase tracking-widest">
           <span>Model: Ibrahim AI Pro</span>
           <span>•</span>
           <span>Mode: Live Talk</span>
        </div>
      </footer>

      <style>{`
        .mask-fade { mask-image: linear-gradient(to top, black 60%, transparent 100%); }
        .scroll-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default LiveVoiceInterface;
