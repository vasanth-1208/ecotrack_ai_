'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { useUserProfile } from '../../hooks/useUserProfile';
import {
  buildLocalizedSuggestions,
  buildWeeklyImpactSummary,
  formatKg,
  getIndiaBenchmarkText,
} from '../../utils/ecotrack';
import type {
  CarbonFootprint,
  DashboardInsights,
  GoalProbability,
  PredictionPoint,
  ScoreBreakdown,
  WeeklyAction,
} from '../../types/ecotrack';

const DashboardCharts = dynamic(() => import('../../components/dashboard/DashboardCharts'), {
  ssr: false,
  loading: () => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
      <div className="h-72 rounded-xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
    </div>
  ),
});

const buildFallbackPredictions = (history: CarbonFootprint[]): PredictionPoint[] => {
  const latest = history[history.length - 1];
  if (!latest) return [];

  return Array.from({ length: 3 }).map((_, index) => ({
    date: `Forecast ${index + 1}`,
    emissions: Math.max(0, latest.totalEmissions - index * 8),
  }));
};

const buildFallbackInsights = (history: CarbonFootprint[]) => {
  const latest = history[history.length - 1];
  const previous = history[history.length - 2];
  const totalEmissions = latest?.totalEmissions ?? 0;
  const delta = previous ? previous.totalEmissions - totalEmissions : 0;
  const sustainabilityScore = Math.max(35, Math.min(95, Math.round(100 - totalEmissions / 6 + delta / 3)));

  return {
    insights: {
      roadmap: {
        immediateTargets: [
          'Shift one commute to public transport or a shared ride.',
          'Reduce home electricity use during peak hours.',
          'Replace one high-emission meal with a plant-based option.',
        ],
      },
      weeklyActionPlan: [
        { habit: 'Use shared transit', impact: 'Cuts transportation emissions', difficulty: 'easy' },
        { habit: 'Lower AC usage', impact: 'Reduces electricity demand', difficulty: 'medium' },
        { habit: 'Plan meals early', impact: 'Avoids food waste', difficulty: 'easy' },
      ],
    },
    sustainabilityScore,
    scoreBreakdown: {
      reductionScore: Math.max(0, Math.min(100, Math.round(70 + delta))),
      renewableScore: 65,
      challengeScore: 55,
      goalScore: 50,
      learningScore: 80,
    },
  };
};

export default function DashboardPage() {
  const { profile, loading: profileLoading } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<CarbonFootprint[]>([]);
  const [predictions, setPredictions] = useState<PredictionPoint[]>([]);
  const [goalProbs, setGoalProbs] = useState<GoalProbability[]>([]);
  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const [score, setScore] = useState<number>(0);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(null);
  const [error, setError] = useState('');
  const [pdfGenerating, setPdfGenerating] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const histRes = await api.footprint.getHistory();
        const footprintHistory = histRes.history || [];
        setHistory(footprintHistory);

        if (footprintHistory.length > 0) {
          const [predResult, insightsResult] = await Promise.allSettled([
            api.predictions.get(),
            api.ai.getInsights(),
          ]);

          if (predResult.status === 'fulfilled') {
            setPredictions(predResult.value.predictions || []);
            setGoalProbs(predResult.value.goalProbabilities || []);
          } else {
            setPredictions(buildFallbackPredictions(footprintHistory));
            setGoalProbs([]);
          }

          if (insightsResult.status === 'fulfilled') {
            setInsights(insightsResult.value.insights);
            setScore(insightsResult.value.sustainabilityScore);
            setScoreBreakdown(insightsResult.value.scoreBreakdown);
          } else {
            const fallback = buildFallbackInsights(footprintHistory);
            setInsights(fallback.insights);
            setScore(fallback.sustainabilityScore);
            setScoreBreakdown(fallback.scoreBreakdown);
          }
        }
      } catch (err: unknown) {
        console.error('Fetch Dashboard Error:', err);
        setError('Complete the Carbon Calculator first to unlock the dashboard charts and AI insights.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const triggerPDFDownload = async () => {
    try {
      setPdfGenerating(true);
      const blob = await api.ai.downloadReportBlob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EcoTrack_Sustainability_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF Download Error:', err);
      alert('Failed to generate PDF. Check if you have logged a carbon footprint.');
    } finally {
      setPdfGenerating(false);
    }
  };

  const latest = useMemo(() => history[history.length - 1] || null, [history]);
  const budget = profile?.carbonBudget || 400;
  const emissions = latest?.totalEmissions || 0;
  const budgetUsagePercent = Math.round((emissions / budget) * 100);
  const summary = useMemo(() => buildWeeklyImpactSummary(history), [history]);
  const localizedSuggestions = useMemo(() => buildLocalizedSuggestions(latest), [latest]);
  const benchmark = useMemo(() => getIndiaBenchmarkText(emissions * 12), [emissions]);
  const budgetState = useMemo(() => {
    if (emissions > budget) {
      return {
        zoneText: 'Over Budget',
        color: 'bg-red-500',
        textCol: 'text-red-650 dark:text-red-400',
        border: 'border-red-250',
        emoji: '🔴',
      };
    }

    if (budgetUsagePercent > 70) {
      return {
        zoneText: 'Warning Zone',
        color: 'bg-amber-500',
        textCol: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-250',
        emoji: '🟡',
      };
    }

    return {
      zoneText: 'Safe Zone',
      color: 'bg-emerald-500',
      textCol: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-250',
      emoji: '🟢',
    };
  }, [budget, budgetUsagePercent, emissions]);

  const {
    zoneText: budgetZoneText,
    color: budgetColor,
    textCol: budgetTextCol,
    border: budgetBorder,
    emoji: budgetEmoji,
  } = budgetState;

  const {
    pct: pctVsIndia,
    isLower: isLowerThanIndia,
    label: benchmarkLabel,
    benchmark: indiaAvg,
  } = benchmark;

  const userAnnual = emissions * 12;

  const pieData = useMemo(() => {
    if (!latest) return [];
    return [
      { name: 'Transport', value: latest.transportEmissions, color: '#10B981' },
      { name: 'Home Energy', value: latest.energyEmissions, color: '#3B82F6' },
      { name: 'Food', value: latest.foodEmissions, color: '#F59E0B' },
      { name: 'Shopping', value: latest.shoppingEmissions, color: '#EC4899' },
      { name: 'Waste', value: latest.wasteEmissions, color: '#8B5CF6' },
    ];
  }, [latest]);

  const lineData = useMemo(
    () =>
      history.map((item) => ({
        name: item.date,
        emissions: Math.round(item.totalEmissions),
        type: 'Historical',
      })),
    [history]
  );

  const forecastData = useMemo(
    () =>
      predictions.map((pred) => ({
        name: pred.date,
        emissions: Math.round(pred.emissions),
        type: 'Forecast',
      })),
    [predictions]
  );

  const fullTrendData = useMemo(() => [...lineData, ...forecastData], [lineData, forecastData]);

  if (loading || profileLoading) {
    return (
      <div className="flex-1 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-semibold text-slate-600 dark:text-slate-400">Loading Dashboard Intelligence...</p>
        </div>
      </div>
    );
  }

  // Fallback if no logs
  if (error || history.length === 0) {
    return (
      <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-6 flex flex-col items-center justify-center text-center">
        <div className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8">
          <span className="text-5xl block mb-4">🌱</span>
          <h2 className="text-2xl font-bold text-slate-850 dark:text-white mb-2">Welcome to EcoTrack AI</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
            We don&apos;t see any logged emissions yet. Complete your first monthly footprint log using the calculator to view trends, benchmark averages, and receive personalized AI roadmaps.
          </p>
          <a
            href="/calculator"
            className="inline-block py-2.5 px-6 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg shadow transition-all focus:ring-2 focus:ring-emerald-500"
          >
            Start Carbon Calculator
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Top Banner Row */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">EcoTrack Intelligence Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Real-time footprint audits, trends forecasting, and SDG-aligned habits.</p>
        </div>

        <button
          onClick={triggerPDFDownload}
          disabled={pdfGenerating}
          className="py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 disabled:bg-slate-700 text-white font-bold text-sm rounded-lg shadow transition-all focus:ring-2 focus:ring-emerald-500 flex items-center gap-2"
        >
          {pdfGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Generating PDF...
            </>
          ) : (
            <>
              📄 Download PDF Report
            </>
          )}
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">Weekly Impact Summary</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{summary.summaryLabel}</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full">
              {summary.trendLabel}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">CO₂ Saved</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{formatKg(summary.co2SavedKg)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Estimated Savings</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">₹{summary.moneySavedInr}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Tree Equivalent</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{summary.treesEquivalent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-slate-900 dark:text-white mb-3">Localized Suggestions</h3>
          <div className="space-y-3">
            {localizedSuggestions.slice(0, 3).map((suggestion) => (
              <div key={suggestion} className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed flex gap-2">
                <span className="text-emerald-500 font-bold">•</span>
                <span>{suggestion}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            India benchmark: {benchmark.label} | {benchmark.pct}% gap
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Carbon Budget and Key Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: Budget System */}
            <div className={`bg-white dark:bg-slate-900 border ${budgetBorder} rounded-2xl shadow-sm p-6 flex flex-col justify-between`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Monthly Carbon Budget</h3>
                  <p className="text-3xl font-black text-slate-850 dark:text-white mt-1">{Math.round(emissions)} <span className="text-sm font-normal text-slate-500">/ {budget} kg CO₂</span></p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 ${budgetTextCol}`}>
                  {budgetEmoji} {budgetZoneText}
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-3.5 rounded-full overflow-hidden">
                  <div 
                    className={`${budgetColor} h-full transition-all`} 
                    style={{ width: `${Math.min(100, budgetUsagePercent)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
                  <span>{budgetUsagePercent}% Spent</span>
                  <span>{Math.round(Math.max(0, budget - emissions))} kg remaining</span>
                </div>
              </div>
            </div>

            {/* Card 2: Benchmarking Status */}
            <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">National Benchmarking</h3>
                <p className="text-3xl font-black text-slate-850 dark:text-white mt-1">
                  {benchmarkLabel}
                </p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
                  You emit <span className="font-bold text-slate-850 dark:text-white">{pctVsIndia}% {isLowerThanIndia ? 'less' : 'more'}</span> CO₂ than the average Indian household ({indiaAvg} kg/year).
                </p>
              </div>

              {/* Benchmark bars */}
              <div className="mt-3 space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-semibold">
                    <span>vs. India Avg ({indiaAvg} kg)</span>
                    <span>{Math.round(userAnnual)} kg</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${isLowerThanIndia ? 'bg-emerald-500' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(100, (userAnnual / indiaAvg) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <DashboardCharts trendData={fullTrendData} lineData={lineData} forecastData={forecastData} pieData={pieData} />

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">AI Recommended Roadmap</h3>
              <div className="space-y-3.5">
                {insights && insights.roadmap.immediateTargets.slice(0, 3).map((target: string, idx: number) => (
                  <div key={idx} className="flex gap-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{target}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 mt-4 pt-3.5 flex justify-between items-center">
              <span className="text-xs text-slate-500 font-semibold uppercase">SDG 13 Climate Action</span>
              <a href="/coach" className="text-xs text-emerald-700 dark:text-emerald-400 font-bold hover:underline">
                Consult AI Coach →
              </a>
            </div>
          </div>

        </div>

        {/* Right 1 Column (Score widget, predictions, and actions) */}
        <div className="space-y-6">
          
          {/* Sustainability Score Widget */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 text-center">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4 uppercase tracking-wider">Sustainability Score</h3>
            
            {/* Circle gauge representation */}
            <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100 dark:text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-600"
                  strokeDasharray={`${score}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-slate-850 dark:text-white">{score}</span>
                <span className="text-[10px] text-slate-500 font-bold">OUT OF 100</span>
              </div>
            </div>

            {/* Explainable breakdown list */}
            {scoreBreakdown && (
              <div className="mt-6 space-y-2 text-left border-t border-slate-100 dark:border-slate-800 pt-4 text-xs font-semibold text-slate-500">
                <div className="flex justify-between">
                  <span>Emission Reductions (40%)</span>
                  <span className="text-slate-850 dark:text-white">{scoreBreakdown.reductionScore}/100</span>
                </div>
                <div className="flex justify-between">
                  <span>Renewable Energy (20%)</span>
                  <span className="text-slate-850 dark:text-white">{scoreBreakdown.renewableScore}/100</span>
                </div>
                <div className="flex justify-between">
                  <span>Challenges Passed (15%)</span>
                  <span className="text-slate-850 dark:text-white">{scoreBreakdown.challengeScore}/100</span>
                </div>
                <div className="flex justify-between">
                  <span>Goals Achieved (15%)</span>
                  <span className="text-slate-850 dark:text-white">{scoreBreakdown.goalScore}/100</span>
                </div>
                <div className="flex justify-between">
                  <span>Educational Quizzes (10%)</span>
                  <span className="text-slate-850 dark:text-white">{scoreBreakdown.learningScore}/100</span>
                </div>
              </div>
            )}
          </div>

          {/* Goal Probability predictions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Goal Achievements Outlook</h3>
            
              {goalProbs.length === 0 ? (
                <p className="text-xs text-slate-500 leading-relaxed">
                  No active goals. Set a goal in the Goals tab to track achievement probabilities.
                </p>
            ) : (
              <div className="space-y-4">
                {goalProbs.map((gp, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-350">
                      <span className="truncate max-w-[150px]">{gp.goalTitle}</span>
                      <span className={gp.probabilityPercent >= 70 ? 'text-emerald-500' : 'text-amber-500'}>
                        {gp.probabilityPercent}% Prob
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${gp.probabilityPercent >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${gp.probabilityPercent}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                      <span>Forecast: {Math.round(gp.projectedEmissionsAtDeadline)} kg</span>
                      <span>Status: {gp.statusText}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dynamic AI Action Plan Habits */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Weekly Eco-Habits Plan</h3>
            <div className="space-y-3">
              {insights && insights.weeklyActionPlan.slice(0, 3).map((act: WeeklyAction, i: number) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-850 dark:text-white">{act.habit}</p>
                  <div className="flex justify-between items-center text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mt-1.5">
                    <span>{act.impact}</span>
                    <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-slate-500">
                      {act.difficulty.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
