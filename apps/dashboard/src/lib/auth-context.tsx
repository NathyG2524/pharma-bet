"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { type DevAuthState, readAuthState, writeAuthState } from "./auth-storage";

const AuthContext = createContext<
  | {
      state: DevAuthState;
      updateState: (patch: Partial<DevAuthState>) => void;
    }
  | undefined
>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DevAuthState>(() => readAuthState());

  useEffect(() => {
    writeAuthState(state);
  }, [state]);

  const updateState = useCallback((patch: Partial<DevAuthState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo(() => ({ state, updateState }), [state, updateState]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return ctx;
}
