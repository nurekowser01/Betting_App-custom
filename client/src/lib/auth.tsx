import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { queryClient, apiRequest } from "./queryClient";
import type { User } from "./types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<User>;
  register: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch {
        // Not authenticated
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<User> => {
    const res = await apiRequest("POST", "/api/auth/login", { username, password });
    const userData = await res.json();
    setUser(userData);
    await queryClient.invalidateQueries();
    return userData;
  }, []);

  const register = useCallback(async (username: string, password: string): Promise<User> => {
    const res = await apiRequest("POST", "/api/auth/register", { username, password });
    const userData = await res.json();
    setUser(userData);
    await queryClient.invalidateQueries();
    return userData;
  }, []);

  const logout = useCallback(async () => {
    await apiRequest("POST", "/api/auth/logout", {});
    setUser(null);
    await queryClient.invalidateQueries();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
