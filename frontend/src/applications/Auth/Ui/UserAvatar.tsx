"use client";

import Image from "next/image";
import { useState } from "react";
import { useAuth } from "@/applications/Auth/Api/useAuth";
import { UserMenu } from "./UserMenu";

export function UserAvatar() {
  const { user, isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!isAuthenticated || !user) return null;

  const avatarUrl = user.avatarUrl;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-bg-elevated"
      >
        <Image
          src={avatarUrl}
          alt={user.username}
          className="h-7 w-7 rounded-full ring-2 ring-border-subtle"
          width={28}
          height={28}
          unoptimized
        />
        <span className="hidden text-sm font-medium text-text-primary sm:inline">
          {user.username}
        </span>
      </button>
      {menuOpen && <UserMenu user={user} onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
