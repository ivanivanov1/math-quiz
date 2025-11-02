export type Question = {
  id: string;
  left: number;
  right: number;
};

export type SessionResponse = {
  sessionId: string;
  questions: Question[];
  timeLimitSeconds: number;
};

export type AnswerPayload = {
  questionId: string;
  answer: number;
};

export type CompleteSessionPayload = {
  playerName: string;
  answers: AnswerPayload[];
};

export type CompleteSessionResponse = {
  playerName: string;
  score: number;
  basePoints: number;
  floorScore: number;
  timeBonus: number;
  questionCount: number;
  correctCount: number;
  elapsedSeconds: number;
  timeLimitSeconds: number;
};

export type LeaderboardRun = {
  id: number;
  playerName: string;
  score: number;
  questionCount: number;
  correctCount: number;
  elapsedSeconds: number;
  timeLimitSeconds: number;
  createdAt: string;
};

export type LeaderboardResponse = {
  items: LeaderboardRun[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000';

async function request<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.error ?? response.statusText;
    throw new Error(message);
  }

  return response.json() as Promise<TResponse>;
}

export function createSession(questionCount: number) {
  return request<SessionResponse>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({ questionCount }),
  });
}

export function completeSession(sessionId: string, payload: CompleteSessionPayload) {
  return request<CompleteSessionResponse>(`/api/sessions/${sessionId}/complete`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchLeaderboard(page: number, search: string) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  if (search.trim()) {
    params.set('search', search.trim());
  }

  return request<LeaderboardResponse>(`/api/leaderboard?${params.toString()}`);
}
