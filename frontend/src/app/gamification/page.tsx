'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import StreakCalendar from '../../components/gamification/StreakCalendar';
import { buildStreakCalendar } from '../../utils/ecotrack';
import { useUserProfile } from '../../hooks/useUserProfile';
import type { Badge, Challenge, LeaderboardEntry } from '../../types/ecotrack';

export default function GamificationPage() {
  const { profile } = useUserProfile();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const streakCalendar = useMemo(
    () => buildStreakCalendar(profile?.lastActiveDate, profile?.streakDays),
    [profile?.lastActiveDate, profile?.streakDays]
  );

  const fetchGamificationData = useCallback(async () => {
    try {
      const [challengeResult, leaderboardResult, badgeResult] = await Promise.all([
        api.gamification.getChallenges(),
        api.gamification.getLeaderboard(),
        api.gamification.getBadges(),
      ]);

      setChallenges(challengeResult.challenges || []);
      setLeaderboard(leaderboardResult.leaderboard || []);
      setBadges(badgeResult.badges || []);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchGamificationData();
      setLoading(false);
    };

    init();
  }, [fetchGamificationData]);

  const handleJoinChallenge = async (challengeId: string) => {
    setActionLoading(challengeId);
    try {
      await api.gamification.joinChallenge(challengeId);
      await fetchGamificationData();
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleIncrementProgress = async (challengeId: string, currentProgress: number) => {
    setActionLoading(challengeId);
    try {
      const nextProgress = Math.min(100, currentProgress + 25);
      const result = await api.gamification.logProgress(challengeId, nextProgress);
      if (result.status === 'completed') {
        alert(`🎉 Challenge Completed! Reward: +${result.rewards?.pointsEarned || 0} Points!`);
      }
      await fetchGamificationData();
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-semibold text-slate-600 dark:text-slate-400">Loading Gamification Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto mb-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)] gap-6">
        <div className="bg-gradient-to-r from-emerald-900 to-emerald-950 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-400">EcoTrack Gamification Hub</span>
            <h1 className="text-3xl font-black mt-1">Hello, {profile?.fullName || 'EcoTrack User'}!</h1>
            <p className="text-slate-300 text-sm mt-1">
              Streaks active: {profile?.streakDays || 0} day(s) 🔥 | Earn points to level up!
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center bg-emerald-900/60 border border-emerald-800 p-3 rounded-xl min-w-24">
              <span className="text-xs text-emerald-400 uppercase font-semibold">User Level</span>
              <p className="text-2xl font-black mt-0.5">Lvl {profile?.level || 1}</p>
            </div>
            <div className="text-center bg-emerald-900/60 border border-emerald-800 p-3 rounded-xl min-w-24">
              <span className="text-xs text-amber-400 uppercase font-semibold">Total Stars</span>
              <p className="text-2xl font-black mt-0.5">⭐ {profile?.points || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-850 dark:text-white">7 Day Green Streak</h2>
              <p className="text-xs text-slate-500 mt-1">Recent active days contribute to your momentum score.</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{profile?.streakDays || 0}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Days Active</p>
            </div>
          </div>
          <StreakCalendar days={streakCalendar} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-850 dark:text-white mb-2">AI-Generated Eco Challenges</h2>
            <p className="text-xs text-slate-500 mb-6">Dynamically generated based on your highest emission categories (SDG aligned).</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {challenges.map((challenge) => {
                const isJoined = challenge.status === 'joined';
                const isCompleted = challenge.status === 'completed';
                const isNotJoined = challenge.status === 'not_joined';

                return (
                  <div key={challenge.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-[10px] font-bold rounded uppercase">
                          {challenge.category}
                        </span>
                        <span className="text-xs font-bold text-amber-500">⭐ +{challenge.points} pts</span>
                      </div>
                      <h3 className="font-bold text-slate-800 dark:text-white text-sm mt-2">{challenge.title}</h3>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{challenge.description}</p>
                    </div>

                    <div className="space-y-3">
                      {isJoined && (
                        <div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-600 h-full transition-all" style={{ width: `${challenge.progress || 0}%` }}></div>
                          </div>
                          <span className="text-[10px] text-slate-500 mt-1 block font-semibold">Progress: {challenge.progress || 0}%</span>
                        </div>
                      )}

                      {isNotJoined && (
                        <button
                          onClick={() => handleJoinChallenge(challenge.id)}
                          disabled={actionLoading === challenge.id}
                          className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-all"
                        >
                          Join Campaign
                        </button>
                      )}

                      {isJoined && (
                        <button
                          onClick={() => handleIncrementProgress(challenge.id, challenge.progress || 0)}
                          disabled={actionLoading === challenge.id}
                          className="w-full py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-350 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg transition-all"
                        >
                          +25% Progress Log
                        </button>
                      )}

                      {isCompleted && (
                        <div className="w-full py-2 bg-emerald-100 text-emerald-800 text-center font-bold text-xs rounded-lg">
                          ✓ Challenge Completed
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-850 dark:text-white mb-2">Earned Eco Badges</h2>
            <p className="text-xs text-slate-500 mb-6">Complete milestones, log footprints, and achieve goals to earn premium awards.</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { id: 'GREEN_STARTER', name: 'Green Starter', desc: 'Logged initial profile', icon: '🌱' },
                { id: 'ECO_WARRIOR', name: 'Eco Warrior', desc: 'Emissions under 200 kg CO2', icon: '🏹' },
                { id: 'CARBON_REDUCER', name: 'Carbon Reducer', desc: 'Reduced carbon by 10%', icon: '📉' },
                { id: 'CLIMATE_CHAMPION', name: 'Climate Champion', desc: 'Rehearsed Level 5 status', icon: '🏆' },
              ].map((badgeTemplate) => {
                const earned = badges.some((badge) => badge.badgeType === badgeTemplate.id);
                return (
                  <div
                    key={badgeTemplate.id}
                    className={`p-4 rounded-xl border text-center flex flex-col items-center justify-between ${
                      earned
                        ? 'bg-emerald-50/20 border-emerald-700 dark:bg-emerald-950/10'
                        : 'bg-slate-50/50 border-slate-200 dark:border-slate-800/80 grayscale opacity-40'
                    }`}
                  >
                    <span className="text-4xl block mb-2">{badgeTemplate.icon}</span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-850 dark:text-white leading-tight">{badgeTemplate.name}</h4>
                      <p className="text-[10px] text-slate-500 leading-normal mt-1">{badgeTemplate.desc}</p>
                    </div>
                    {earned && (
                      <span className="text-[8px] uppercase font-bold text-emerald-700 dark:text-emerald-400 mt-2 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                        Earned
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 flex flex-col h-fit">
          <h2 className="text-lg font-bold text-slate-850 dark:text-white mb-2">Community Leaderboard</h2>
          <p className="text-xs text-slate-500 mb-6">Compare points and sustainability scores with fellow climate citizens anonymously.</p>

          <div className="space-y-3">
            {leaderboard.map((entry) => {
              const isMe = entry.userId === profile?.id;
              return (
                <div
                  key={entry.userId}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    isMe
                      ? 'bg-emerald-50/50 border-emerald-700 dark:bg-emerald-950/15'
                      : 'bg-slate-50/60 dark:bg-slate-850/40 border-slate-200/50 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 flex items-center justify-center font-black text-xs rounded-full ${
                        entry.rank === 1
                          ? 'bg-amber-400 text-slate-950'
                          : entry.rank === 2
                            ? 'bg-slate-350 text-slate-900'
                            : entry.rank === 3
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {entry.rank}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-850 dark:text-white">
                        {entry.fullName} {isMe && <span className="text-[10px] text-emerald-600">(You)</span>}
                      </p>
                      <p className="text-[10px] text-slate-500">Lvl {entry.level} | Score: {entry.sustainabilityScore}/100</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white">⭐ {entry.points} pts</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
