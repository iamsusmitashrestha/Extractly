import React, { createContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api, setAccessToken, clearAccessToken } from "../api/axios";

interface AuthContextType {
  user: { email: string } | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        // Try to silently refresh using httpOnly cookie
        const r = await api.post("/auth/refresh", {});
        setAccessToken(r.data.accessToken);
        // Fetch user info
        const me = await api.get("/auth/me");
        setUser(me.data.user);
      } catch {
        clearAccessToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post("/auth/register", { name, email, password });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user ?? { email });
  };

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user ?? { email });
  };

  const logout = async () => {
    try {
      // Logout endpoint clears the httpOnly cookie on server
      await api.post("/auth/logout");
      toast.success("Logged out successfully");
    } catch (err) {
      console.error(err);
      toast.error("Logout failed");
    } finally {
      clearAccessToken();
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const me = await api.get("/auth/me");
      setUser(me.data.user);
    } catch (e) {
      clearAccessToken();
      setUser(null);
      throw e;
    }
  };

  return (
    <AuthContext.Provider value={{ user, register, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
