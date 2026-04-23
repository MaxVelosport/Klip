import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { useGetCurrentUser, CurrentUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";

interface AuthContextType {
  user: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, isError } = useGetCurrentUser({
    query: {
      retry: false,
      queryKey: getGetCurrentUserQueryKey(),
    }
  });

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, isAuthenticated: !!user && !isError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode, adminOnly?: boolean }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    } else if (!isLoading && isAuthenticated && adminOnly && user?.role !== "admin") {
      setLocation("/app/dashboard");
    }
  }, [isLoading, isAuthenticated, setLocation, adminOnly, user]);

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  }

  if (adminOnly && user?.role !== "admin") {
    return null;
  }

  return <>{children}</>;
}
