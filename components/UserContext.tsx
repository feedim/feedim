"use client";

import { createContext, useContext, useMemo } from "react";

export interface InitialUser {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  accountType: string;
  isPremium: boolean;
  premiumPlan: string | null;
  isVerified: boolean;
  role: string;
  status?: string;
  copyrightEligible?: boolean;
}

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
