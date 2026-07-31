interface LogoBaseProps {
  className?: string;
}

interface LogoProps extends LogoBaseProps {
  height?: number;
  showText?: boolean;
}

interface LogoMarkProps extends LogoBaseProps {
  size?: number;
}

const LOGO = "/gymos-logo.png";

export function LogoMark({ size = 28, className }: LogoMarkProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg bg-primary ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <img src={LOGO} alt="" className="h-full w-full object-contain p-1 brightness-0 invert" />
    </div>
  );
}

export function Logo({ height = 36, className, showText = true }: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <img src={LOGO} alt="GymOS" style={{ height }} className="w-auto object-contain" />
    </div>
  );
}
