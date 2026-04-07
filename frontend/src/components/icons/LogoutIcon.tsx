interface IconProps {
  size?: number;
  className?: string;
}

export function LogoutIcon({ size = 14, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5.25 12.25H2.917A.917.917 0 0 1 2 11.333V2.667A.917.917 0 0 1 2.917 1.75H5.25M9.333 9.917L12 7.25l-2.667-2.667M12 7.25H5.25"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
