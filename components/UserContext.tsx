"use client";

import { createContext, useContext, useMemo } from "react";
import type { InitialUser } from "@/lib/userTypes";

interface UserContextValue {
  user: InitialUser | null;
  isLoggedIn: boolean;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  isLoggedIn: false,
});

export function UserProvider({
  initialUser,
  children,
}: {
  initialUser: InitialUser | null;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ user: initialUser, isLoggedIn: !!initialUser }), [initialUser]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
