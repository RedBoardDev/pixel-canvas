import { LoginButton } from "@/applications/Auth/Ui/LoginButton";
import { PixelCanvasLogo } from "@/components/icons";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-10 bg-[var(--background)] px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)]">
          <PixelCanvasLogo size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Pixel Canvas</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Collaborative pixel art — draw with your friends
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <LoginButton size="lg" />
        <p className="max-w-[260px] text-center text-xs text-[var(--muted)]">
          Sign in with your Discord account to start placing pixels on the shared canvas
        </p>
      </div>

      <div className="flex gap-6 text-xs text-[var(--muted)]">
        <Feature label="Real-time" />
        <Feature label="Collaborative" />
        <Feature label="Serverless" />
      </div>
    </div>
  );
}

function Feature({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />
      {label}
    </div>
  );
}
