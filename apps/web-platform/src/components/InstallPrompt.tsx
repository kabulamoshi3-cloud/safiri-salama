/**
 * PWA Install Prompt
 * Works on Android (beforeinstallprompt) and shows instructions for iPhone
 */
import React, { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Android: listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler as any);

    // iOS: show banner after 3 seconds if not dismissed
    if (ios) {
      const dismissed = localStorage.getItem('pwa_install_dismissed');
      if (!dismissed) {
        setTimeout(() => setShowBanner(true), 3000);
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler as any);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
      setDeferredPrompt(null);
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa_install_dismissed', '1');
  };

  if (isInstalled || !showBanner) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-[#0F172A] text-white rounded-2xl p-4 shadow-2xl border border-white/10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-[#2563EB] rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-sm">SH</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm mb-1">Install Safiri Haraka</p>
            {isIOS ? (
              <p className="text-white/60 text-xs">
                Tap <Share size={12} className="inline" /> Share → "Add to Home Screen"
              </p>
            ) : (
              <p className="text-white/60 text-xs">
                Add to home screen for the best experience
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isIOS && (
              <button
                onClick={handleInstall}
                className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-1 transition"
              >
                <Download size={14} /> Install
              </button>
            )}
            <button onClick={handleDismiss} className="text-white/40 hover:text-white/70 transition">
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
