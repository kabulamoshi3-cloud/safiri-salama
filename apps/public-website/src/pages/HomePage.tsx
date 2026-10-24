import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaHeadset,
  FaShieldAlt,
  FaStar,
  FaGooglePlay,
  FaApple,
  FaCar,
  FaMapMarkedAlt,
  FaDownload,
} from 'react-icons/fa';
import Button from '../components/Button';
import Card from '../components/Card';
import { usePWAInstall } from '../hooks/usePWAInstall';

const HomePage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  // Animated background with map grid, moving cars, and glowing driver dots
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

    // Grid dots
    const gridDots: { x: number; y: number; pulse: number }[] = [];
    for (let i = 0; i < 80; i++) {
      gridDots.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    // Moving cars (light trails)
    const cars: { x: number; y: number; vx: number; vy: number; trail: { x: number; y: number; alpha: number }[] }[] = [];
    for (let i = 0; i < 5; i++) {
      cars.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        trail: [],
      });
    }

    // Glowing driver dots (pulsing)
    const drivers: { x: number; y: number; pulse: number }[] = [];
    for (let i = 0; i < 8; i++) {
      drivers.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Draw grid dots
      gridDots.forEach((dot) => {
        dot.pulse += 0.02;
        const alpha = 0.2 + Math.sin(dot.pulse) * 0.15;
        ctx.fillStyle = `rgba(147, 197, 253, ${alpha})`; // blue-300
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw grid lines (subtle)
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < gridDots.length; i++) {
        for (let j = i + 1; j < gridDots.length; j++) {
          const dx = gridDots[i].x - gridDots[j].x;
          const dy = gridDots[i].y - gridDots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(gridDots[i].x, gridDots[i].y);
            ctx.lineTo(gridDots[j].x, gridDots[j].y);
            ctx.stroke();
          }
        }
      }

      // Update and draw car trails
      cars.forEach((car) => {
        car.x += car.vx;
        car.y += car.vy;

        // Wrap around
        if (car.x < 0) car.x = canvas.offsetWidth;
        if (car.x > canvas.offsetWidth) car.x = 0;
        if (car.y < 0) car.y = canvas.offsetHeight;
        if (car.y > canvas.offsetHeight) car.y = 0;

        // Add to trail
        car.trail.push({ x: car.x, y: car.y, alpha: 1 });
        if (car.trail.length > 30) car.trail.shift();

        // Draw trail
        car.trail.forEach((point, i) => {
          point.alpha -= 0.033;
          const size = (i / car.trail.length) * 3;
          ctx.fillStyle = `rgba(251, 191, 36, ${point.alpha * 0.6})`; // amber-400
          ctx.beginPath();
          ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      // Draw glowing driver dots
      drivers.forEach((driver) => {
        driver.pulse += 0.05;
        const radius = 4 + Math.sin(driver.pulse) * 1.5;
        const alpha = 0.6 + Math.sin(driver.pulse) * 0.3;

        // Glow
        const gradient = ctx.createRadialGradient(driver.x, driver.y, 0, driver.x, driver.y, radius * 3);
        gradient.addColorStop(0, `rgba(34, 197, 94, ${alpha})`); // green-500
        gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(driver.x, driver.y, radius * 3, 0, Math.PI * 2);
        ctx.fill();

        // Dot
        ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
        ctx.beginPath();
        ctx.arc(driver.x, driver.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const benefits = [
    {
      icon: FaMapMarkerAlt,
      title: 'GPS Tracking',
      description: 'Real-time route optimization for faster journeys',
    },
    {
      icon: FaMoneyBillWave,
      title: 'Fair Prices',
      description: 'Transparent pricing with no hidden fees',
    },
    {
      icon: FaHeadset,
      title: '24/7 Support',
      description: 'We are always available to help you',
    },
    {
      icon: FaShieldAlt,
      title: 'Safe Drivers',
      description: 'All drivers are verified and background-checked',
    },
  ];

  const testimonials = [
    {
      name: 'Amina T.',
      text: 'Safiri Haraka has made my daily commute so much easier. The drivers are professional and the prices are fair.',
      rating: 5,
    },
    {
      name: 'John M.',
      text: 'I love the GPS tracking feature. I always know when my ride will arrive and can plan accordingly.',
      rating: 5,
    },
    {
      name: 'Fatuma S.',
      text: 'Safe, reliable, and affordable. Safiri Haraka is my go-to for getting around Dar es Salaam.',
      rating: 5,
    },
  ];

  return (
    <div>
      {/* Hero Section with Animated Background */}
      <section className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white py-20 overflow-hidden">
        {/* Animated Canvas Background */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.6 }}
        />

        {/* City Silhouette Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900/80 to-transparent" />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Safiri Haraka — Smart, safe & affordable transport in Tanzania 🇹🇿
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-blue-100">
                Karibu! Your journey starts here
              </p>
              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 mb-6">
                <Link to="/login?intent=book">
                  <Button variant="primary">Book a Ride</Button>
                </Link>
                <Link to="/become-a-driver">
                  <Button variant="secondary">Become a Driver</Button>
                </Link>
              </div>
              <p className="text-sm opacity-90">
                Trusted by 10,000+ passengers across Tanzania
              </p>
            </div>

            {/* Right: Phone Mockup with Live Tracking */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                {/* Phone Frame */}
                <div className="relative w-[280px] h-[560px] bg-slate-800 rounded-[3rem] border-8 border-slate-700 shadow-2xl overflow-hidden">
                  {/* Phone Screen */}
                  <div className="absolute inset-2 bg-white rounded-[2.5rem] overflow-hidden">
                    {/* Mini Map with Live Tracking */}
                    <div className="relative h-[400px] bg-gradient-to-br from-blue-50 to-blue-100">
                      {/* Map Grid Pattern */}
                      <div className="absolute inset-0" style={{
                        backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)',
                        backgroundSize: '30px 30px'
                      }} />

                      {/* Route Line */}
                      <svg className="absolute inset-0 w-full h-full">
                        <path
                          d="M 140 350 Q 200 250, 140 150"
                          stroke="#3b82f6"
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray="10,5"
                          opacity="0.6"
                        />
                      </svg>

                      {/* User Location (Pickup) */}
                      <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
                        <div className="relative">
                          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                            <FaMapMarkerAlt className="text-white text-xl" />
                          </div>
                          <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-30" />
                        </div>
                      </div>

                      {/* Driver Approaching (Animated) */}
                      <div className="absolute top-24 left-1/2 -translate-x-1/2">
                        <div className="relative animate-bounce">
                          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-3 border-white">
                            <FaCar className="text-white text-lg" />
                          </div>
                          <div className="absolute inset-0 bg-green-500 rounded-full animate-pulse opacity-40" />
                        </div>
                      </div>

                      {/* ETA Card */}
                      <div className="absolute top-4 left-4 right-4 bg-white rounded-2xl shadow-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <FaCar className="text-white text-sm" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Your driver</p>
                              <p className="font-semibold text-sm text-gray-900">Mohamed K.</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">ETA</p>
                            <p className="font-bold text-lg text-green-600">3 min</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <FaMapMarkedAlt />
                          <span>Toyota Ipsum • TSZ 1234</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Methods Bar */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
                      <p className="text-xs text-gray-500 mb-2 text-center">Pay with</p>
                      <div className="flex justify-center gap-3">
                        <div className="px-3 py-2 bg-green-50 rounded-lg text-xs font-semibold text-green-700 border border-green-200">
                          M-Pesa
                        </div>
                        <div className="px-3 py-2 bg-blue-50 rounded-lg text-xs font-semibold text-blue-700 border border-blue-200">
                          Wallet
                        </div>
                        <div className="px-3 py-2 bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 border border-gray-200">
                          Cash
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Phone Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index}>
                <benefit.icon className="text-primary text-4xl mb-4" />
                <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Service Coverage Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">Where We Operate</h2>
          <p className="text-lg text-gray-700 mb-6 max-w-3xl mx-auto">
            We currently operate in Tanzania's major cities and are rapidly expanding to serve you better.
          </p>
          <div className="max-w-2xl mx-auto">
            <ul className="text-left space-y-2 text-lg">
              <li className="flex items-center">
                <FaMapMarkerAlt className="text-primary mr-3" />
                Dar es Salaam
              </li>
              <li className="flex items-center">
                <FaMapMarkerAlt className="text-primary mr-3" />
                Dodoma
              </li>
            </ul>
            <p className="text-gray-600 mt-6">
              We have plans to expand to 10 cities by 2026!
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-primary text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <h3 className="text-4xl md:text-5xl font-bold mb-2">10K+</h3>
              <p className="text-xl">Rides</p>
            </div>
            <div>
              <h3 className="text-4xl md:text-5xl font-bold mb-2">500+</h3>
              <p className="text-xl">Drivers</p>
            </div>
            <div>
              <h3 className="text-4xl md:text-5xl font-bold mb-2">2</h3>
              <p className="text-xl">Cities</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            What Our Customers Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <div className="flex mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <FaStar key={i} className="text-secondary" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4">{testimonial.text}</p>
                <p className="font-semibold text-primary">{testimonial.name}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Download CTA Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Get the Safiri Haraka App
          </h2>

          {/* Web App - Install PWA */}
          <div className="mb-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border-2 border-blue-200">
            <div className="inline-block bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold mb-4">
              ⚡ INSTANT ACCESS
            </div>
            <h3 className="text-2xl font-bold mb-2 text-gray-800">Web App (Recommended)</h3>
            <p className="text-gray-600 mb-6">
              {isInstalled 
                ? "✅ App is already installed on your device!" 
                : "Install directly from your browser - works on all devices!"}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {isInstallable && !isInstalled && (
                <button
                  onClick={promptInstall}
                  className="flex items-center justify-center gap-3 bg-green-600 text-white px-8 py-4 rounded-xl hover:bg-green-700 transition-colors shadow-lg text-lg font-bold"
                >
                  <FaDownload size={24} />
                  Install App Now
                </button>
              )}
              <a
                href="https://safiriharaka-apps.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-colors shadow-lg text-lg font-bold"
              >
                📱 {isInstalled ? "Open App" : "Open Web App"}
              </a>
            </div>
            {!isInstallable && !isInstalled && (
              <p className="text-sm text-gray-600 mt-4">
                <strong>How to install:</strong> Open the link → Tap browser menu → Select "Add to Home Screen" or "Install App"
              </p>
            )}
          </div>

          <div className="text-center text-gray-500 text-sm mb-6">
            ───── or ─────
          </div>

          {/* Native Apps - Coming Soon */}
          <div className="bg-gray-50 rounded-2xl p-6">
            <div className="inline-block bg-amber-100 text-amber-800 px-4 py-1 rounded-full text-xs font-bold mb-3">
              COMING SOON
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-600">Native Mobile Apps</h3>
            <p className="text-gray-500 mb-4 text-sm">We're working on native apps for Google Play and App Store</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 opacity-50 pointer-events-none">
              <div className="flex items-center justify-center gap-3 bg-gray-300 text-gray-600 px-6 py-3 rounded-xl cursor-not-allowed">
                <FaGooglePlay size={24} />
                <div className="text-left">
                  <div className="text-xs">GET IT ON</div>
                  <div className="text-sm font-bold">Google Play</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 bg-gray-300 text-gray-600 px-6 py-3 rounded-xl cursor-not-allowed">
                <FaApple size={24} />
                <div className="text-left">
                  <div className="text-xs">Download on the</div>
                  <div className="text-sm font-bold">App Store</div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-blue-600 mt-6 font-semibold">
            💡 The web app works just like a native app - install it now!
          </p>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
