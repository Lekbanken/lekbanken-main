import type { HTMLAttributes, ReactNode } from "react";

export type BadgeVariant = "default" | "primary" | "accent" | "warning" | "success" | "destructive" | "outline" | "secondary" | "error";
type BadgeSize = "sm" | "md" | "lg";

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  dot?: boolean;
} & HTMLAttributes<HTMLSpanElement>;

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary ring-1 ring-primary/20",
  accent: "bg-accent/10 text-accent-foreground ring-1 ring-accent/20",
  warning: "bg-yellow/10 text-yellow-800 ring-1 ring-yellow/20",
  success: "bg-green-50 text-green-700 ring-1 ring-green-600/20",
  destructive: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
  error: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
  outline: "bg-transparent text-foreground ring-1 ring-border",
  secondary: "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-muted-foreground",
  primary: "bg-primary",
  accent: "bg-accent",
  warning: "bg-yellow",
  success: "bg-green-500",
  destructive: "bg-red-500",
  error: "bg-red-500",
  outline: "bg-foreground",
  secondary: "bg-gray-500",
};

export function Badge({
  children,
  variant = "default",
  size = "md",
  className = "",
  dot = false,
  ...props
}: BadgeProps) {
  const classes = [
    "inline-flex items-center gap-1.5 rounded-full font-medium",
    variantStyles[variant],
    sizeStyles[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...props}>
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
