export type GoalCategory = 'transportation' | 'homeEnergy' | 'food' | 'shopping' | 'waste' | 'overall';

export interface AuthProfile {
  id?: string;
  email?: string;
  fullName: string;
  points: number;
  level: number;
  streakDays?: number;
  lastActiveDate?: string | null;
  carbonBudget: number;
  createdAt?: string;
  isPremium?: boolean;
}

export interface AuthResponse {
  token: string;
  user?: AuthProfile;
}

export interface CarbonFootprint {
  id: string;
  userId: string;
  date: string;
  inputs: Record<string, unknown> & {
    renewablePercentage?: number;
    dietType?: string;
  };
  transportEmissions: number;
  energyEmissions: number;
  foodEmissions: number;
  shoppingEmissions: number;
  wasteEmissions: number;
  totalEmissions: number;
  createdAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  category: GoalCategory;
  targetValue: number;
  currentValue: number;
  startDate: string;
  targetDate: string;
  status: 'active' | 'completed' | 'failed';
  createdAt: string;
}

export interface GoalInput {
  title: string;
  category: GoalCategory;
  targetValue: number;
  targetDate: string;
}

export interface PredictionPoint {
  date: string;
  emissions: number;
  confidenceMin?: number;
  confidenceMax?: number;
}

export interface GoalProbability {
  goalId: string;
  goalTitle: string;
  probabilityPercent: number;
  projectedEmissionsAtDeadline: number;
  statusText: 'On Track' | 'At Risk' | 'Needs Improvement';
}

export interface ScoreBreakdown {
  reductionScore: number;
  renewableScore: number;
  challengeScore: number;
  goalScore: number;
  learningScore: number;
}

export interface WeeklyAction {
  habit: string;
  impact: string;
  difficulty: string;
  sdgAlignments?: string[];
}

export interface DashboardRoadmap {
  immediateTargets: string[];
  longTermGoals?: string[];
  recommendedOffsetsKg?: number;
}

export interface DashboardInsights {
  roadmap: DashboardRoadmap;
  weeklyActionPlan: WeeklyAction[];
  spikeExplanation?: string;
}

export interface CarbonSummary {
  co2SavedKg: number;
  moneySavedInr: number;
  treesEquivalent: number;
  summaryLabel: string;
  trendLabel: string;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  readTimeMinutes: number;
  sdgAlignments: string[];
  read?: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  pointsReward: number;
  sdgAlignments: string[];
  questions: QuizQuestion[];
  completed?: boolean;
  score?: number | null;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  points: number;
  durationDays: number;
  sdgAlignments: string[];
  progress?: number;
  status?: 'joined' | 'completed' | 'not_joined';
}

export interface LeaderboardEntry {
  userId: string;
  fullName: string;
  points: number;
  level: number;
  sustainabilityScore: number;
  rank: number;
}

export interface Badge {
  id: string;
  userId: string;
  badgeType: string;
  title: string;
  description: string;
  earnedAt: string;
}

export interface RewardsPayload {
  pointsEarned?: number;
  totalPoints?: number;
  level?: number;
  newLevel?: number;
}

export interface StreakDay {
  date: string;
  label: string;
  active: boolean;
}
