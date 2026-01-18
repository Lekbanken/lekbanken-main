import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Variant = "default" | "primary" | "secondary" | "outline" | "ghost" | "destructive" | "link";
type Size = "sm" | "md" | "lg";

type ButtonProps = {
  href?: string;
  children: ReactNode;
  className?: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingText?: string;
} & ButtonHTMLAttributes<HTMLButtonElement> &
  AnchorHTMLAttributes<HTMLAnchorElement>;

const baseStyles =
  "inline-flex items-center justify-center rounded-lg font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50";

const variantStyles: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
  secondary: "bg-muted text-foreground hover:bg-muted/80",
  outline:
    "border border-border text-foreground hover:bg-muted hover:text-foreground",
  ghost: "text-foreground hover:bg-muted",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-5 py-3 text-base gap-2",
};

// Loading spinner component
function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function Button({
  href,
  children,
  className = "",
  variant = "default",
  size = "md",
  loading = false,
  loadingText,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  
  const classes = cn(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    className
  );

  const spinnerSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  const content = loading ? (
    <>
      <Spinner className={spinnerSize} />
      {loadingText || children}
    </>
  ) : (
    children
  );

  if (href && !isDisabled) {
    return (
      <Link href={href} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={isDisabled} {...props}>
      {content}
    </button>
  );
}
