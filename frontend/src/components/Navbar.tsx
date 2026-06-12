'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { removeAuthToken, api } from '../lib/api';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [userStats, setUserStats] = React.useState<{ points: number; level: number; fullName: string; isPremium: boolean } | null>(null);

  // Load user profile statistics dynamically on mount/pathname change
  React.useEffect(() => {
    if (pathname === '/auth') return;
    
    api.auth.me()
      .then(res => {
        setUserStats({
          points: res.user.points,
          level: res.user.level,
          fullName: res.user.fullName,
          isPremium: !!res.user.isPremium
        });
      })
      .catch(() => {
        // user unauthorized
      });
  }, [pathname]);

  const handleUpgrade = async () => {
    try {
      const res = await api.auth.upgrade();
      if (res.isPremium) {
        setUserStats(prev => prev ? { ...prev, isPremium: true } : null);
        if (typeof window !== 'undefined') {
          const confetti = (await import('canvas-confetti')).default;
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        }
      }
    } catch (err) {
      console.error('Failed to upgrade to premium:', err);
    }
  };

  if (pathname === '/auth') return null;

  const handleLogout = () => {
    removeAuthToken();
    router.push('/auth');
  };

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard', shortcut: 'Alt+D' },
    { name: 'Calculator', href: '/calculator', shortcut: 'Alt+C' },
    { name: 'AI Coach', href: '/coach', shortcut: 'Alt+A' },
    { name: 'Goals', href: '/goals', shortcut: 'Alt+G' },
    { name: 'Gamification', href: '/gamification', shortcut: 'Alt+I' },
    { name: 'Education', href: '/education', shortcut: 'Alt+E' },
  ];

  return (
    <nav className="bg-emerald-950 text-white shadow-md" role="navigation" aria-label="Main Navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2 font-black text-xl tracking-wider text-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 px-2 rounded">
              <span className="text-2xl">🌱</span> ECOTRACK AI
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none ${
                    isActive 
                      ? 'bg-emerald-800 text-emerald-300 shadow-inner'
                      : 'hover:bg-emerald-900/60 hover:text-emerald-200'
                  }`}
                  title={`${link.name} (Shortcut: ${link.shortcut})`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Right Side Statistics & Logout */}
          <div className="flex items-center gap-3">
            {userStats && (
              <>
                {userStats.isPremium ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 border border-yellow-300 shadow animate-pulse">
                    👑 PREMIUM
                  </span>
                ) : (
                  <button
                    onClick={handleUpgrade}
                    className="py-1.5 px-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 active:from-amber-700 active:to-yellow-700 text-amber-950 font-black text-xs rounded-lg border border-yellow-400 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    title="Upgrade your account to Premium"
                  >
                    ⭐ Upgrade
                  </button>
                )}

                <div className="flex items-center gap-2 bg-emerald-900/80 px-3 py-1.5 rounded-lg border border-emerald-800 text-xs sm:text-sm shadow-sm">
                  <span className="font-bold text-emerald-400">Lvl {userStats.level}</span>
                  <span className="text-slate-400">|</span>
                  <span className="font-bold text-amber-400">⭐ {userStats.points} pts</span>
                </div>
              </>
            )}

            <button
              onClick={handleLogout}
              className="py-1.5 px-3 bg-emerald-900/50 hover:bg-red-900/80 hover:text-red-200 font-semibold text-sm rounded-lg border border-emerald-850 hover:border-red-900 transition-all focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
              title="Logout from EcoTrack AI"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
