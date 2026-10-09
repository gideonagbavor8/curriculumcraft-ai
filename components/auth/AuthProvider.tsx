"use client";

import { createContext, useContext } from "react";

export interface TeacherUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

const AuthContext = createContext<TeacherUser | null>(null);

export function AuthProvider({ user, children }: { user: TeacherUser | null; children: React.ReactNode }) {
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
