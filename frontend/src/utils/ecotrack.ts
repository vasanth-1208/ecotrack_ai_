import {
  GLOBAL_AVERAGE_HOUSEHOLD_EMISSIONS,
  INDIA_AVERAGE_HOUSEHOLD_EMISSIONS,
  KG_CO2_PER_TREE_PER_YEAR,
  MONEY_SAVED_PER_KG_CO2,
  WEEKLY_STREAK_DAYS,
} from '../constants/ecotrack';
import type { CarbonFootprint, CarbonSummary, StreakDay } from '../types/ecotrack';

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
});

export const formatKg = (value: number) => `${Math.round(value)} kg CO₂`;

export const calculateTreeEquivalent = (co2Kg: number) => Math.max(1, Math.round(co2Kg / KG_CO2_PER_TREE_PER_YEAR));

export const calculateMoneySaved = (co2Kg: number) => Math.max(0, Math.round(co2Kg * MONEY_SAVED_PER_KG_CO2));

export const buildWeeklyImpactSummary = (history: CarbonFootprint[]): CarbonSummary => {
  const sorted = [...history].sort((first, second) => first.date.localeCompare(second.date));
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];

  if (!latest) {
    return {
      co2SavedKg: 0,
      moneySavedInr: 0,
      treesEquivalent: 0,
      summaryLabel: 'No emissions logged yet',
      trendLabel: 'Start logging to see savings',
    };
  }

  const latestTotal = latest.totalEmissions;
  const baseline = previous?.totalEmissions ?? Math.max(latestTotal, INDIA_AVERAGE_HOUSEHOLD_EMISSIONS / 12);
  const co2SavedKg = Math.max(0, baseline - latestTotal);

  return {
    co2SavedKg: Math.round(co2SavedKg),
    moneySavedInr: calculateMoneySaved(co2SavedKg),
    treesEquivalent: calculateTreeEquivalent(co2SavedKg),
    summaryLabel: previous
      ? `Compared with ${previous.date}, your footprint changed by ${Math.round(baseline - latestTotal)} kg`
      : 'Baseline impact from your current monthly footprint',
    trendLabel: latestTotal <= baseline
      ? 'Emissions are trending in the right direction'
      : 'Emissions are above the recent baseline',
  };
};

export const buildLocalizedSuggestions = (footprint?: CarbonFootprint | null): string[] => {
  if (!footprint) {
    return [
      'Use public transport or a shared commute for your next trip.',
      'Keep your AC closer to 24°C during the hottest part of the day.',
      'Plan meals before shopping to avoid waste and impulse purchases.',
    ];
  }

  const categories = [
    { key: 'transportEmissions', label: 'transportation' },
    { key: 'energyEmissions', label: 'home energy' },
    { key: 'foodEmissions', label: 'food' },
    { key: 'shoppingEmissions', label: 'shopping' },
    { key: 'wasteEmissions', label: 'waste' },
  ] as const;

  const dominant = categories
    .map((entry) => ({ ...entry, value: footprint[entry.key] }))
    .sort((first, second) => second.value - first.value)[0];

  const suggestionsByCategory: Record<string, string[]> = {
    transportation: [
      'Use TNSTC, metro, or a shared commute instead of a private vehicle for one trip this week.',
      'Combine errands into a single route to cut fuel use and idle time.',
      'Walk or cycle for short trips under 3 km when the weather allows it.',
    ],
    'home energy': [
      'Raise the AC setting a little during peak summer hours and use fans where possible.',
      'Switch off standby appliances overnight to cut hidden electricity use.',
      'Run high-load appliances during cooler hours if your tariff supports it.',
    ],
    food: [
      'Replace one meat-heavy meal with a plant-based meal this week.',
      'Buy local and seasonal produce to lower food miles.',
      'Cook only what you need so leftovers do not become waste.',
    ],
    shopping: [
      'Delay non-essential purchases for 24 hours before checking out.',
      'Choose repaired or second-hand items when the use case allows it.',
      'Bundle online orders to reduce packaging and delivery trips.',
    ],
    waste: [
      'Keep a small sorting bin for dry waste, recyclables, and compostables.',
      'Reuse containers and bottles before buying new packaging.',
      'Track food waste for a week and cut the biggest source first.',
    ],
  };

  return suggestionsByCategory[dominant.label] ?? suggestionsByCategory.transportation;
};

export const buildStreakCalendar = (lastActiveDate: string | null | undefined, streakDays = 0): StreakDay[] => {
  const today = new Date();
  const lastActive = lastActiveDate ? new Date(lastActiveDate) : today;
  const activeDays = Math.min(WEEKLY_STREAK_DAYS, Math.max(0, streakDays));

  return Array.from({ length: WEEKLY_STREAK_DAYS }).map((_, index) => {
    const offset = WEEKLY_STREAK_DAYS - index - 1;
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const isActive = activeDays > 0 && lastActive >= date;

    return {
      date: date.toISOString().split('T')[0],
      label: `${weekdayFormatter.format(date)} ${monthFormatter.format(date)}`,
      active: isActive,
    };
  });
};

export const getIndiaBenchmarkText = (annualFootprint: number) => {
  const pct = Math.round(Math.abs((annualFootprint - INDIA_AVERAGE_HOUSEHOLD_EMISSIONS) / INDIA_AVERAGE_HOUSEHOLD_EMISSIONS) * 100);
  const isLower = annualFootprint <= INDIA_AVERAGE_HOUSEHOLD_EMISSIONS;

  return {
    pct,
    isLower,
    label: isLower ? 'Under India Avg' : 'Over India Avg',
    benchmark: INDIA_AVERAGE_HOUSEHOLD_EMISSIONS,
    globalBenchmark: GLOBAL_AVERAGE_HOUSEHOLD_EMISSIONS,
  };
};
