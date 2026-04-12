interface LogoProps {
  size?: number;
  className?: string;
}

export function PixelCanvasLogo({ size = 16, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="5" height="5" rx="1" fill="#39ff85" />
      <rect x="9" y="2" width="5" height="5" rx="1" fill="#39ff85" opacity="0.6" />
      <rect x="2" y="9" width="5" height="5" rx="1" fill="#39ff85" opacity="0.6" />
      <rect x="9" y="9" width="5" height="5" rx="1" fill="#39ff85" opacity="0.25" />
    </svg>
  );
}
