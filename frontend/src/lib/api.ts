const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const LOCAL_FOOTPRINT_HISTORY_PREFIX = 'ecotrack_footprints_';
const LOCAL_AUTH_PROFILE_PREFIX = 'ecotrack_profile_';
const LOCAL_GOALS_PREFIX = 'ecotrack_goals_';
export const AUTH_PROFILE_UPDATED_EVENT = 'ecotrack-auth-profile-updated';

type StoredFootprint = {
  date: string;
  [key: string]: unknown;
};

type AuthProfile = {
  fullName: string;
  points: number;
  level: number;
  carbonBudget: number;
  isPremium?: boolean;
  [key: string]: unknown;
};

type AuthResponse = {
  token: string;
  user?: AuthProfile;
};

type RewardsPayload = {
  totalPoints?: number;
  level?: number;
  newLevel?: number;
};

type StoredGoal = {
  id: string;
  title: string;
  category: 'transportation' | 'homeEnergy' | 'food' | 'shopping' | 'waste' | 'overall';
  targetValue: number;
  currentValue: number;
  startDate: string;
  targetDate: string;
  status: 'active' | 'completed' | 'failed';
  createdAt: string;
};

type GoalInput = {
  title: string;
  category: StoredGoal['category'];
  targetValue: number;
  targetDate: string;
};

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('ecotrack_token');
  }
  return null;
};

export const setAuthToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ecotrack_token', token);
  }
};

export const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('ecotrack_token');
  }
};

const getLocalFootprintHistoryKey = (): string => {
  const token = getAuthToken();
  return `${LOCAL_FOOTPRINT_HISTORY_PREFIX}${token || 'anonymous'}`;
};

const isStoredFootprint = (value: unknown): value is StoredFootprint => {
  return !!value && typeof value === 'object' && typeof (value as StoredFootprint).date === 'string';
};

const readLocalFootprintHistory = (): StoredFootprint[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(getLocalFootprintHistoryKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isStoredFootprint) : [];
  } catch {
    return [];
  }
};

const writeLocalFootprintHistory = (history: StoredFootprint[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getLocalFootprintHistoryKey(), JSON.stringify(history));
};

const mergeFootprintHistory = (serverHistory: unknown[], localHistory: StoredFootprint[]) => {
  const byMonth = new Map<string, StoredFootprint>();

  [...serverHistory, ...localHistory].forEach((footprint) => {
    if (isStoredFootprint(footprint)) {
      byMonth.set(footprint.date, footprint);
    }
  });

  return Array.from(byMonth.values()).sort((a, b) => a.date.localeCompare(b.date));
};

const rememberFootprint = (footprint: unknown) => {
  if (!isStoredFootprint(footprint)) return;

  const history = mergeFootprintHistory(readLocalFootprintHistory(), [footprint]);
  writeLocalFootprintHistory(history);
};

const getLocalAuthProfileKey = (token = getAuthToken()): string => {
  return `${LOCAL_AUTH_PROFILE_PREFIX}${token || 'anonymous'}`;
};

const normalizeAuthProfile = (value: unknown): AuthProfile | null => {
  if (!value || typeof value !== 'object') return null;

  const profile = value as Partial<AuthProfile>;
  return {
    ...profile,
    fullName: typeof profile.fullName === 'string' ? profile.fullName : 'EcoTrack User',
    points: typeof profile.points === 'number' ? profile.points : 0,
    level: typeof profile.level === 'number' ? profile.level : 1,
    carbonBudget: typeof profile.carbonBudget === 'number' ? profile.carbonBudget : 400,
    isPremium: !!profile.isPremium,
  };
};

const rememberAuthProfile = (response: AuthResponse) => {
  if (typeof window === 'undefined') return;

  const profile = normalizeAuthProfile(response.user);
  if (!profile) return;

  localStorage.setItem(getLocalAuthProfileKey(response.token), JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent(AUTH_PROFILE_UPDATED_EVENT, { detail: profile }));
};

const getLocalGoalsKey = (): string => {
  const token = getAuthToken();
  return `${LOCAL_GOALS_PREFIX}${token || 'anonymous'}`;
};

const isStoredGoal = (value: unknown): value is StoredGoal => {
  if (!value || typeof value !== 'object') return false;
  const goal = value as Partial<StoredGoal>;
  return (
    typeof goal.id === 'string' &&
    typeof goal.title === 'string' &&
    typeof goal.category === 'string' &&
    typeof goal.targetValue === 'number' &&
    typeof goal.currentValue === 'number' &&
    typeof goal.startDate === 'string' &&
    typeof goal.targetDate === 'string' &&
    typeof goal.status === 'string' &&
    typeof goal.createdAt === 'string'
  );
};

const readLocalGoals = (): StoredGoal[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(getLocalGoalsKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isStoredGoal) : [];
  } catch {
    return [];
  }
};

const writeLocalGoals = (goals: StoredGoal[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getLocalGoalsKey(), JSON.stringify(goals));
};

const mergeGoals = (serverGoals: unknown[], localGoals: StoredGoal[]) => {
  const byId = new Map<string, StoredGoal>();

  [...serverGoals, ...localGoals].forEach((goal) => {
    if (isStoredGoal(goal)) {
      byId.set(goal.id, goal);
    }
  });

  return Array.from(byId.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

const getGoalCurrentValue = (goalData: GoalInput): number => {
  const history = readLocalFootprintHistory();
  const latest = history[history.length - 1] as StoredFootprint | undefined;
  if (!latest) return 400;

  if (goalData.category === 'overall') {
    return typeof latest.totalEmissions === 'number' ? latest.totalEmissions : 400;
  }

  const categoryKeyByGoal: Record<Exclude<StoredGoal['category'], 'overall'>, string> = {
    transportation: 'transportEmissions',
    homeEnergy: 'energyEmissions',
    food: 'foodEmissions',
    shopping: 'shoppingEmissions',
    waste: 'wasteEmissions',
  };

  const currentValue = latest[categoryKeyByGoal[goalData.category]];
  return typeof currentValue === 'number' ? currentValue : 400;
};

const createLocalGoal = (goalData: GoalInput): StoredGoal => {
  const now = new Date();
  return {
    id: `local-goal-${now.getTime()}-${Math.random().toString(36).substring(2, 8)}`,
    title: goalData.title,
    category: goalData.category,
    targetValue: goalData.targetValue,
    currentValue: getGoalCurrentValue(goalData),
    startDate: now.toISOString().split('T')[0],
    targetDate: goalData.targetDate,
    status: 'active',
    createdAt: now.toISOString(),
  };
};

const readLocalAuthProfile = (): AuthProfile | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(getLocalAuthProfileKey());
    const parsed = raw ? JSON.parse(raw) : null;
    return normalizeAuthProfile(parsed);
  } catch {
    return null;
  }
};

const updateLocalAuthProfile = (updates: Partial<AuthProfile>) => {
  if (typeof window === 'undefined') return null;

  const profile = normalizeAuthProfile({ ...(readLocalAuthProfile() || {}), ...updates });
  if (!profile) return null;

  localStorage.setItem(getLocalAuthProfileKey(), JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent(AUTH_PROFILE_UPDATED_EVENT, { detail: profile }));
  return profile;
};

const rememberRewards = (rewards: RewardsPayload | null | undefined) => {
  if (!rewards) return;

  const updates: Partial<AuthProfile> = {};
  if (typeof rewards.totalPoints === 'number') {
    updates.points = rewards.totalPoints;
  }
  if (typeof rewards.level === 'number') {
    updates.level = rewards.level;
  } else if (typeof rewards.newLevel === 'number') {
    updates.level = rewards.newLevel;
  }

  if (Object.keys(updates).length > 0) {
    updateLocalAuthProfile(updates);
  }
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeAuthToken();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
      window.location.href = '/auth';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Network response was not ok');
  }

  // Handle PDF/binary downloads
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/pdf')) {
    return response.blob() as any;
  }

  return response.json();
}

export const api = {
  auth: {
    register: async (email: string, password: string, fullName: string) => {
      const result = await apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, fullName }),
      });
      rememberAuthProfile(result);
      return result;
    },
    login: async (email: string, password: string) => {
      const result = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      rememberAuthProfile(result);
      return result;
    },
    upgrade: () =>
      apiRequest<{ isPremium?: boolean }>('/auth/upgrade', {
        method: 'POST',
      }).then((result) => {
        if (result.isPremium) {
          updateLocalAuthProfile({ isPremium: true });
        }
        return result;
      }),
    me: async () => {
      try {
        const result = await apiRequest<{ user: AuthProfile }>('/auth/me');
        if (result.user) {
          const token = getAuthToken();
          if (typeof window !== 'undefined' && token) {
            const profile = normalizeAuthProfile(result.user);
            if (profile) {
              localStorage.setItem(getLocalAuthProfileKey(token), JSON.stringify(profile));
              window.dispatchEvent(new CustomEvent(AUTH_PROFILE_UPDATED_EVENT, { detail: profile }));
            }
          }
        }
        return result;
      } catch (err: any) {
        const profile = readLocalAuthProfile();
        if (err.message === 'User not found' && profile) {
          return { user: profile };
        }
        throw err;
      }
    },
    updateBudget: async (carbonBudget: number) => {
      const result = await apiRequest('/auth/budget', {
        method: 'PUT',
        body: JSON.stringify({ carbonBudget }),
      });
      const profile = readLocalAuthProfile();
      if (profile && typeof window !== 'undefined') {
        localStorage.setItem(getLocalAuthProfileKey(), JSON.stringify({ ...profile, carbonBudget }));
      }
      return result;
    },
  },
  footprint: {
    submit: async (inputs: any) => {
      const result = await apiRequest('/footprint', {
        method: 'POST',
        body: JSON.stringify(inputs),
      });
      rememberFootprint(result.footprint);
      rememberRewards(result.gamification);
      return result;
    },
    getHistory: async () => {
      const localHistory = readLocalFootprintHistory();
      try {
        const result = await apiRequest('/footprint/history');
        return {
          ...result,
          history: mergeFootprintHistory(result.history || [], localHistory),
        };
      } catch (err: any) {
        if (err.message === 'Unauthorized' || localHistory.length === 0) {
          throw err;
        }
        return { history: localHistory };
      }
    },
  },
  predictions: {
    get: () => apiRequest('/predictions'),
  },
  goals: {
    create: async (goalData: GoalInput) => {
      try {
        const result = await apiRequest<{ goal: StoredGoal }>('/goals', {
          method: 'POST',
          body: JSON.stringify(goalData),
        });
        writeLocalGoals(mergeGoals([result.goal], readLocalGoals()));
        return result;
      } catch (err: any) {
        if (err.message === 'Unauthorized') {
          throw err;
        }
        const goal = createLocalGoal(goalData);
        writeLocalGoals(mergeGoals([goal], readLocalGoals()));
        return { goal };
      }
    },
    list: async () => {
      const localGoals = readLocalGoals();
      try {
        const result = await apiRequest<{ goals: StoredGoal[] }>('/goals');
        return {
          ...result,
          goals: mergeGoals(result.goals || [], localGoals),
        };
      } catch (err: any) {
        if (err.message === 'Unauthorized' || localGoals.length === 0) {
          throw err;
        }
        return { goals: localGoals };
      }
    },
    update: async (id: string, currentValue: number) => {
      try {
        const result = await apiRequest(`/goals/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ currentValue }),
        });
        rememberRewards(result.rewards);
        const localGoals = readLocalGoals().map((goal) =>
          goal.id === id
            ? {
                ...goal,
                currentValue,
                status: currentValue <= goal.targetValue ? 'completed' as const : goal.status,
              }
            : goal
        );
        writeLocalGoals(localGoals);
        return result;
      } catch (err: any) {
        if (err.message === 'Unauthorized') {
          throw err;
        }
        const localGoals = readLocalGoals();
        const goal = localGoals.find((item) => item.id === id);
        if (!goal) {
          throw err;
        }
        goal.currentValue = currentValue;
        goal.status = currentValue <= goal.targetValue ? 'completed' : goal.status;
        writeLocalGoals(localGoals);
        return { message: 'Goal progress updated locally', status: goal.status, currentValue };
      }
    },
  },
  gamification: {
    getChallenges: () => apiRequest('/gamification/challenges'),
    joinChallenge: (id: string) =>
      apiRequest(`/gamification/challenges/${id}/join`, { method: 'POST' }),
    logProgress: async (id: string, progress: number) => {
      const result = await apiRequest(`/gamification/challenges/${id}/progress`, {
        method: 'POST',
        body: JSON.stringify({ progress }),
      });
      rememberRewards(result.rewards);
      return result;
    },
    getLeaderboard: () => apiRequest('/gamification/leaderboard'),
    getBadges: () => apiRequest('/gamification/badges'),
  },
  ai: {
    getInsights: () => apiRequest('/ai/insights'),
    chat: (message: string, history: any[]) =>
      apiRequest('/ai/coach', {
        method: 'POST',
        body: JSON.stringify({ message, history }),
      }),
    getReportDownloadUrl: () => {
      const token = getAuthToken();
      return `${API_BASE_URL}/ai/report?token=${token}`;
    },
    // We can also fetch as blob and trigger download client-side
    downloadReportBlob: () => apiRequest('/ai/report'),
  },
  offsets: {
    getRecommendations: () => apiRequest('/offsets'),
  },
  education: {
    getArticles: () => apiRequest('/education/articles'),
    readArticle: async (id: string) => {
      const result = await apiRequest(`/education/articles/${id}/read`, { method: 'POST' });
      rememberRewards(result.rewards);
      return result;
    },
    getQuizzes: () => apiRequest('/education/quizzes'),
    submitQuiz: async (id: string, score: number) => {
      const result = await apiRequest(`/education/quizzes/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ score }),
      });
      rememberRewards(result.rewards);
      return result;
    },
  },
  simulator: {
    run: (inputs: any) =>
      apiRequest('/simulator', {
        method: 'POST',
        body: JSON.stringify(inputs),
      }),
  },
};
