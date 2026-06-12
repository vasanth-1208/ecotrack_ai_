const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const LOCAL_FOOTPRINT_HISTORY_PREFIX = 'ecotrack_footprints_';

type StoredFootprint = {
  date: string;
  [key: string]: unknown;
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
    register: (email: string, password: string, fullName: string) =>
      apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, fullName }),
      }),
    login: (email: string, password: string) =>
      apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    upgrade: () =>
      apiRequest('/auth/upgrade', {
        method: 'POST',
      }),
    me: () => apiRequest('/auth/me'),
    updateBudget: (carbonBudget: number) =>
      apiRequest('/auth/budget', {
        method: 'PUT',
        body: JSON.stringify({ carbonBudget }),
      }),
  },
  footprint: {
    submit: async (inputs: any) => {
      const result = await apiRequest('/footprint', {
        method: 'POST',
        body: JSON.stringify(inputs),
      });
      rememberFootprint(result.footprint);
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
    create: (goalData: any) =>
      apiRequest('/goals', {
        method: 'POST',
        body: JSON.stringify(goalData),
      }),
    list: () => apiRequest('/goals'),
    update: (id: string, currentValue: number) =>
      apiRequest(`/goals/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ currentValue }),
      }),
  },
  gamification: {
    getChallenges: () => apiRequest('/gamification/challenges'),
    joinChallenge: (id: string) =>
      apiRequest(`/gamification/challenges/${id}/join`, { method: 'POST' }),
    logProgress: (id: string, progress: number) =>
      apiRequest(`/gamification/challenges/${id}/progress`, {
        method: 'POST',
        body: JSON.stringify({ progress }),
      }),
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
    readArticle: (id: string) =>
      apiRequest(`/education/articles/${id}/read`, { method: 'POST' }),
    getQuizzes: () => apiRequest('/education/quizzes'),
    submitQuiz: (id: string, score: number) =>
      apiRequest(`/education/quizzes/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ score }),
      }),
  },
  simulator: {
    run: (inputs: any) =>
      apiRequest('/simulator', {
        method: 'POST',
        body: JSON.stringify(inputs),
      }),
  },
};
