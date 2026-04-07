"use client";

import { LogoutIcon } from "@/components/icons";
import { useAuth } from "../Api/useAuth";
import type { User } from "../Domain/entities/User.entity";

interface UserMenuProps {
  user: User;
  onClose: () => void;
}

export function UserMenu({ user, onClose }: UserMenuProps) {
  const { logout } = useAuth();

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay for closing menu */}
      <div className="fixed inset-0 z-20" onClick={onClose} onKeyDown={onClose} />
      <div className="animate-fade-in absolute right-0 top-full z-30 mt-1 min-w-[180px] rounded-lg border border-border-subtle border-t-2 border-t-accent/20 bg-bg-surface p-1 shadow-xl">
        <div className="border-b border-border-subtle px-3 py-2">
          <p className="text-sm font-medium text-text-primary">{user.username}</p>
          <p className="text-xs text-text-muted">Discord</p>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            onClose();
          }}
          className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-bg-elevated"
        >
          <LogoutIcon />
          Log out
        </button>
      </div>
    </>
  );
}
