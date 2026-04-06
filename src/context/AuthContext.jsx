import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

function isProfileComplete(user) {
  if (!user) return true; // no user = not relevant
  return !!(user.first_name && user.last_name);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pp_user'));
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const profileComplete = useMemo(() => isProfileComplete(user), [user]);

  useEffect(() => {
    const token = localStorage.getItem('pp_token');
    if (token && !user) {
      authAPI.me()
        .then(({ data }) => {
          const u = data.data || data.user || data;
          setUser(u);
          localStorage.setItem('pp_user', JSON.stringify(u));
        })
        .catch(() => {
          localStorage.removeItem('pp_token');
          localStorage.removeItem('pp_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    const userData = data.data?.user || data.user;
    const token = data.data?.token || data.token;
    localStorage.setItem('pp_token', token);
    localStorage.setItem('pp_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (formData) => {
    const { data } = await authAPI.register(formData);
    const userData = data.data?.user || data.user;
    const token = data.data?.token || data.token;
    if (token) {
      localStorage.setItem('pp_token', token);
      localStorage.setItem('pp_user', JSON.stringify(userData));
      setUser(userData);
    }
    return userData;
  };

  const updateUser = (updatedFields) => {
    setUser(prev => {
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('pp_user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    authAPI.logout().catch(() => {});
    localStorage.removeItem('pp_token');
    localStorage.removeItem('pp_user');
    localStorage.removeItem('pp_terminal');
    localStorage.removeItem('pp_settings');
    setUser(null);
  };

  const isProfileIncomplete = (u) => {
    const target = u || user;
    if (!target) return false;
    return !target.first_name || !target.last_name;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, isProfileIncomplete, profileComplete }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
