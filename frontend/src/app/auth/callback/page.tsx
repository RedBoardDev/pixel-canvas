"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { useAuth } from "@/applications/Auth/Api/useAuth";

function CallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { handleCallback } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const code = searchParams.get("code");
    if (!code) {
      router.replace("/");
      return;
    }

    handleCallback(code).then((user) => {
      router.replace(user ? "/" : "/auth/login");
    });
  }, [searchParams, router, handleCallback]);

  return <AuthSpinner label="Authenticating with Discord..." />;
}

function AuthSpinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-void">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-subtle border-t-accent" />
        <p className="text-sm text-text-muted">{label}</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthSpinner label="Loading..." />}>
      <CallbackHandler />
    </Suspense>
  );
}
