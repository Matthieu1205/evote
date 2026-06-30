import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { api } from '../lib/api';

export interface OrganizationBranding {
  name: string;
  slug: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  memberLabel: string;
}

export interface AuthUser {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  ordreNumber: string;
  phone?: string | null;
  section?: string | null;
  region?: string | null;
  photoUrl?: string | null;
  organization: OrganizationBranding;
}

export interface RawApiUser {
  id: string;
  ordreNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string | null;
  section?: string | null;
  region?: string | null;
  photoUrl?: string | null;
  organization: OrganizationBranding;
}

function mapUser(data: RawApiUser): AuthUser {
  return {
    id: data.id,
    name: `${data.firstName} ${data.lastName}`,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    role: data.role,
    ordreNumber: data.ordreNumber,
    phone: data.phone,
    section: data.section,
    region: data.region,
    photoUrl: data.photoUrl,
    organization: data.organization,
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (rawUser: RawApiUser) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const versionRef = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++versionRef.current;
    try {
      const data = await api.get<RawApiUser>('/auth/me');
      if (id !== versionRef.current) return;
      setUser(mapUser(data));
    } catch {
      if (id !== versionRef.current) return;
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  function login(rawUser: RawApiUser) {
    ++versionRef.current;
    setUser(mapUser(rawUser));
  }

  async function logout() {
    ++versionRef.current;
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
