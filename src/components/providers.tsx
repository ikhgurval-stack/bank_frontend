"use client";
import { ThemeProvider } from "next-themes";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  ApiError,
  clearAuthCache,
  errorMessage,
  getCurrentUser,
  login,
  logout,
} from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string;
  restore: () => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const restore = useCallback(async () => {
    try {
      setUser(await getCurrentUser());
      setError("");
    } catch (error) {
      setUser(null);
      if (!(error instanceof ApiError && error.status === 401))
        setError(errorMessage(error));
      else setError("");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    // This async request updates state only after the network response settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void restore();
    const expire = () => {
      clearAuthCache();
      setUser(null);
    };
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, [restore]);
  async function signIn(username: string, password: string) {
    const nextUser = await login(username, password);
    setError("");
    setUser(nextUser);
  }
  async function signOut() {
    await logout();
    setUser(null);
    setError("");
  }
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthContext.Provider
        value={{ user, loading, error, restore, signIn, signOut }}
      >
        {children}
      </AuthContext.Provider>
    </ThemeProvider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("Auth provider missing");
  return context;
}
