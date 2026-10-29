/**
 * Public Website Home Page
 * Hero + features + ONE install button + i18n
 */
import React, { useEffect, useRef } from 'react';
import {
  FaStar, FaGooglePlay, FaApple, FaDownload, FaCheckCircle,
} from 'react-icons/fa';
import { pubI18n } from '../i18n';

const APP_URL = 'https://skyrex-apps.vercel.app';

const HomePage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  useEffect(() => { return pubI18n.subscribe(() => forceUpdate()); }, []);

  // Animated background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);
    const dots: { x: number; y: number; pulse: number }[] = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      pulse: Math.random() * Math.PI * 2,
    }));
    const cars: { x: number; y: number; vx: number; vy: number; trail: { x: number; y: number }[] }[] = Array.from({ length: 4 }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      trail: [],
    }));
    let id: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      dots.forEach(d => {
        d.pulse += 0.02;
        const a = 0.15 + Math.sin(d.pulse) * 0.1;
        ctx.fillStyle = `rgba(147,197,253,${a})`;
        ctx.beginPath(); ctx.arc(d.x, d.y, 1.5, 0, Math.PI * 2); ctx.fill();
      });
      cars.forEach(c => {
        c.x += c.vx; c.y += c.vy;
        if (c.x < 0) c.x = canvas.offsetWidth;
        if (c.x > canvas.offsetWidth) c.x = 0;
        if (c.y < 0) c.y = canvas.offsetHeight;
        if (c.y > canvas.offsetHeight) c.y = 0;
        c.trail.push({ x: c.x, y: c.y });
        if (c.trail.length > 20) c.trail.shift();
        c.trail.forEach((p, i) => {
          ctx.fillStyle = `rgba(251,191,36,${(i / c.trail.length) * 0.4})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, (i / c.trail.length) * 2, 0, Math.PI * 2); ctx.fill();
        });
      });
      id = requestAnimationFrame(animate);
    };
    animate();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(id); };
  }, []);

  const testimonials = [
    { name: 'Amina T.', text: 'SkyRex imenifanya safari yangu ya kila siku iwe rahisi sana!', rating: 5 },
    { name: 'John M.',  text: 'I love the live tracking feature. Always know when my ride arrives.', rating: 5 },
    { name: 'Fatuma S.', text: 'Safe, reliable and affordable. Best app in Morogoro!', rating: 5 },
  ];

  return (
    <div className="overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative bg-gradient-to-br from-[#0F172A] via-[#1e3a8a] to-[#0F172A] text-white py-24 overflow-hidden min-h-screen flex items-center">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-50" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0F172A]/80 to-transparent" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-14 h-14 bg-[#2563EB] rounded-2xl flex items-center justify-center shadow-2xl">
              <span className="text-white font-black text-xl">SH</span>
            </div>
            <span className="text-3xl font-black">Safiri <span className="text-[#f59e0b]">Haraka</span></span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight whitespace-pre-line">
            {pubI18n.t('hero_title')}
          </h1>
          <p className="text-lg md:text-xl text-blue-200 mb-12 max-w-2xl mx-auto leading-relaxed">
            {pubI18n.t('hero_subtitle')}
          </p>

          {/* ONE Install Button */}
          <a
            href={APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-[#2563EB] hover:bg-[#1d4ed8] active:scale-95 text-white font-black text-xl px-10 py-5 rounded-2xl shadow-2xl transition-all"
          >
            <FaDownload size={24} />
            {pubI18n.t('install_passenger')}
          </a>

          <p className="text-blue-300/70 text-sm mt-4">
            {pubI18n.t('works_all_phones') || 'Works on Android & iPhone — no app store needed'}
          </p>

          {/* How to install hint */}
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4 text-sm text-blue-200/60">
            <span>🤖 Android: tap menu → "Add to Home Screen"</span>
            <span>🍎 iPhone: tap Share → "Add to Home Screen"</span>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 bg-[#F3F5F9]">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black text-[#0F172A] mb-4">{pubI18n.t('features_title')}</h2>
          <p className="text-gray-500 mb-12">3 simple steps to get a ride</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', emoji: '📱', title: 'Install the App', desc: 'Tap install and add to your home screen in seconds' },
              { step: '2', emoji: '📍', title: 'Enter Destination', desc: 'Type where you want to go on the Morogoro map' },
              { step: '3', emoji: '🚗', title: 'Ride & Pay', desc: 'Driver arrives, you ride, pay with cash or M-Pesa' },
            ].map(item => (
              <div key={item.step} className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="w-12 h-12 bg-[#2563EB] rounded-full flex items-center justify-center text-white font-black text-xl mx-auto mb-4">
                  {item.step}
                </div>
                <div className="text-4xl mb-3">{item.emoji}</div>
                <h3 className="font-black text-[#0F172A] text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-black text-[#0F172A] text-center mb-12">{pubI18n.t('features_title')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '⚡', title: pubI18n.t('feature_fast'), desc: pubI18n.t('feature_fast_desc') },
              { icon: '📍', title: pubI18n.t('feature_tracking'), desc: pubI18n.t('feature_tracking_desc') },
              { icon: '💳', title: pubI18n.t('feature_payment'), desc: pubI18n.t('feature_payment_desc') },
              { icon: '🕐', title: pubI18n.t('feature_support'), desc: pubI18n.t('feature_support_desc') },
            ].map((f, i) => (
              <div key={i} className="bg-[#F3F5F9] rounded-2xl p-6 text-center">
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="font-black text-[#0F172A] mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16 bg-[#2563EB] text-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { num: '10K+', label: 'Rides' },
              { num: '500+', label: 'Drivers' },
              { num: 'Morogoro', label: 'Tanzania' },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-4xl md:text-5xl font-black mb-1">{s.num}</div>
                <div className="text-blue-200">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 bg-[#F3F5F9]">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-black text-[#0F172A] text-center mb-12">What Riders Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex mb-3">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <FaStar key={j} className="text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 text-sm leading-relaxed">"{t.text}"</p>
                <p className="font-bold text-[#2563EB]">{t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 bg-gradient-to-br from-[#0F172A] to-[#1e3a8a] text-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-6xl mb-6">🚗</div>
          <h2 className="text-3xl md:text-4xl font-black mb-4">Ready to ride?</h2>
          <p className="text-blue-200 mb-8">Install SkyRex and get your first ride in under 60 seconds.</p>

          <a
            href={APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-white text-[#2563EB] hover:bg-blue-50 active:scale-95 font-black text-xl px-10 py-5 rounded-2xl shadow-2xl transition-all"
          >
            <FaDownload size={24} />
            Install Now — It's Free
          </a>

          <div className="mt-8 space-y-2 text-blue-300/60 text-sm">
            <div className="flex items-center justify-center gap-2"><FaCheckCircle className="text-green-400" /> No app store required</div>
            <div className="flex items-center justify-center gap-2"><FaCheckCircle className="text-green-400" /> Works on Android & iPhone</div>
            <div className="flex items-center justify-center gap-2"><FaCheckCircle className="text-green-400" /> Free to download & use</div>
          </div>

          <div className="mt-10 pt-8 border-t border-white/10">
            <p className="text-blue-300/40 text-xs mb-4">Native apps coming soon</p>
            <div className="flex justify-center gap-4 opacity-30">
              <div className="flex items-center gap-2 bg-white/10 px-5 py-2 rounded-xl text-sm"><FaGooglePlay /> Google Play</div>
              <div className="flex items-center gap-2 bg-white/10 px-5 py-2 rounded-xl text-sm"><FaApple /> App Store</div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
