import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type StokvelTypePreference =
  | 'rotation' | 'burial' | 'investment' | 'grocery' | 'social';

export type AuthUser = {
  id: string;
  name: string;
  firstName: string;
  email: string | null;
  phone: string;
  language: string;
  theme: string;
  is_kyc_verified: boolean;
  avatar_url: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;
};

type RegisterData = {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  password: string;
  dob?: string;
  gender?: string;
  language?: string;
  stokvelPreferences?: StokvelTypePreference[];
  // OTP token from phone verification — required
  otpToken: string;
  // Session key from step 1 API
  sessionKey: string;
};

// ── Storage keys ──────────────────────────────────────────────────────────────

const ACCESS_TOKEN_KEY  = '@stockfair:access_token';
const REFRESH_TOKEN_KEY = '@stockfair:refresh_token';
const USER_KEY          = '@stockfair:user';

// ── API helpers ───────────────────────────────────────────────────────────────

async function post<T>(
  endpoint: string,
  body: object,
  accessToken?: string,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.error ?? 'Something went wrong' };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: 'Network error. Check your connection.' };
  }
}

async function get<T>(
  endpoint: string,
  accessToken: string,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.error ?? 'Something went wrong' };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: 'Network error.' };
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ ok: false }),
  register: async () => ({ ok: false }),
  logout: async () => {},
  updateProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]         = useState<AuthUser | null>(null);
  const [isLoading, setLoading] = useState(true);

  // ── On mount: restore session ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [accessToken, raw] = await AsyncStorage.multiGet([ACCESS_TOKEN_KEY, USER_KEY])
          .then(pairs => [pairs[0][1], pairs[1][1]]);

        if (accessToken && raw) {
          // Restore user from cache immediately
          try { setUser(JSON.parse(raw)); } catch {}

          // Verify token is still valid by fetching current user
          const result = await get<{ user: any }>('/auth/me', accessToken);
          if (result.ok) {
            const u = mapUser(result.data.user);
            setUser(u);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
          } else {
            // Token expired — try refresh
            await tryRefresh();
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Refresh token rotation ─────────────────────────────────────────────────
  const tryRefresh = async (): Promise<boolean> => {
    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) { await clearSession(); return false; }

    const result = await post<{ access_token: string; refresh_token: string }>(
      '/auth/refresh',
      { refresh_token: refreshToken },
    );

    if (!result.ok) { await clearSession(); return false; }

    await AsyncStorage.multiSet([
      [ACCESS_TOKEN_KEY,  result.data.access_token],
      [REFRESH_TOKEN_KEY, result.data.refresh_token],
    ]);
    return true;
  };

  const clearSession = async () => {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
    setUser(null);
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (identifier: string, password: string) => {
    const result = await post<{
      access_token: string;
      refresh_token: string;
      user: any;
    }>('/auth/signin', { identifier, password });

    if (!result.ok) return { ok: false, error: result.error };

    const u = mapUser(result.data.user);
    await AsyncStorage.multiSet([
      [ACCESS_TOKEN_KEY,  result.data.access_token],
      [REFRESH_TOKEN_KEY, result.data.refresh_token],
      [USER_KEY,          JSON.stringify(u)],
    ]);
    setUser(u);
    return { ok: true };
  }, []);

  // ── Register (multi-step, OTP already verified) ────────────────────────────
  // By the time this is called, OTP has already been verified and
  // otpToken + sessionKey are available from the registration flow.
  const register = useCallback(async (data: RegisterData) => {
    // Step 3 — language preference
    const step3 = await post('/auth/register/step3', {
      phone: data.phone,
      language: data.language ?? 'en',
    });
    if (!step3.ok) return { ok: false, error: step3.error };

    // Step 4 — interests + T&Cs → creates account
    const step4 = await post<{
      access_token: string;
      refresh_token: string;
      user: any;
    }>('/auth/register/step4', {
      phone: data.phone,
      interests: data.stokvelPreferences ?? [],
      theme: 'obsidian',
      terms_accepted: true,
    });

    if (!step4.ok) return { ok: false, error: step4.error };

    const u = mapUser(step4.data.user);
    await AsyncStorage.multiSet([
      [ACCESS_TOKEN_KEY,  step4.data.access_token],
      [REFRESH_TOKEN_KEY, step4.data.refresh_token],
      [USER_KEY,          JSON.stringify(u)],
    ]);
    setUser(u);
    return { ok: true };
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      await post('/auth/signout', { refresh_token: refreshToken }).catch(() => {});
    }
    await clearSession();
  }, []);

  // ── Update profile ─────────────────────────────────────────────────────────
  const updateProfile = useCallback(async (data: Partial<AuthUser>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }

// ── Helper ────────────────────────────────────────────────────────────────────

function mapUser(raw: any): AuthUser {
  return {
    id:              raw.id ?? '',
    name:            raw.full_name ?? '',
    firstName:       (raw.full_name ?? '').split(' ')[0] ?? '',
    email:           raw.email ?? null,
    phone:           raw.phone ?? '',
    language:        raw.language ?? 'en',
    theme:           raw.theme ?? 'obsidian',
    is_kyc_verified: raw.is_kyc_verified ?? false,
    avatar_url:      raw.avatar_url ?? null,
  };
}

// ── Standalone OTP helpers (used directly by register screen) ─────────────────
// These are exported so register.tsx can call them without going through context

export async function sendOtp(phone: string, purpose: string) {
  return post<{ message: string; expires_in_seconds: number; debug_otp?: string }>(
    '/auth/otp/send',
    { phone, purpose },
  );
}

export async function verifyOtp(phone: string, purpose: string, code: string) {
  return post<{ otp_token: string; message: string }>(
    '/auth/otp/verify',
    { phone, purpose, code },
  );
}

export async function registerStep1(payload: {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
}) {
  return post<{ session_key: string; message: string }>(
    '/auth/register/step1',
    payload,
  );
}

export async function registerStep2(payload: {
  session_key: string;
  phone: string;
  email?: string;
  password: string;
  confirm_password: string;
}) {
  return post<{ phone: string; message: string }>(
    '/auth/register/step2',
    payload,
  );
}
