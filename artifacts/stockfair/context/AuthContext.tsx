import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type StokvelTypePreference = 'rotation' | 'burial' | 'investment' | 'grocery' | 'social';

export type AuthUser = {
  name: string;
  firstName: string;
  email: string;
  phone: string;
  password: string;
  dob?: string;
  gender?: string;
  language?: string;
  stokvelPreferences?: StokvelTypePreference[];
};

type AuthContextType = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    dob?: string;
    gender?: string;
    language?: string;
    stokvelPreferences?: StokvelTypePreference[];
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ ok: false }),
  register: async () => ({ ok: false }),
  logout: async () => {},
  updateProfile: async () => {},
});

const USER_KEY = '@stockfair_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]         = useState<AuthUser | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(USER_KEY).then((raw) => {
      if (raw) {
        try { setUser(JSON.parse(raw)); } catch {}
      }
      setLoading(false);
    });
  }, []);

  const persist = async (u: AuthUser) => {
    setUser(u);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
  };

  const login = async (email: string, password: string) => {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return { ok: false, error: 'No account found. Please register first.' };
    try {
      const saved: AuthUser = JSON.parse(raw);
      if (saved.email.toLowerCase() !== email.toLowerCase().trim())
        return { ok: false, error: 'Email address not found.' };
      if (saved.password !== password)
        return { ok: false, error: 'Incorrect password.' };
      setUser(saved);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Something went wrong. Please try again.' };
    }
  };

  const register = async (data: {
    firstName: string; lastName: string; email: string; phone: string; password: string;
    dob?: string; gender?: string; language?: string; stokvelPreferences?: StokvelTypePreference[];
  }) => {
    const name = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();
    const u: AuthUser = {
      name,
      firstName: data.firstName.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone.trim(),
      password: data.password,
      dob: data.dob,
      gender: data.gender,
      language: data.language,
      stokvelPreferences: data.stokvelPreferences,
    };
    await persist(u);
    return { ok: true };
  };

  const logout = async () => {
    await AsyncStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const updateProfile = async (data: Partial<AuthUser>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    await persist(updated);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
