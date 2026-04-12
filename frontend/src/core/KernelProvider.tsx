"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/applications/Auth/Api/AuthContext";

export function KernelProvider({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
