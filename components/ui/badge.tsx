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
  warning: "bg-warning/10 text-warning-foreground ring-1 ring-warning/25",
  success: "bg-success/10 text-success-foreground ring-1 ring-success/20",
  destructive: "bg-destructive/10 text-destructive-foreground ring-1 ring-destructive/20",
  error: "bg-destructive/10 text-destructive-foreground ring-1 ring-destructive/20",
  outline: "bg-transparent text-foreground ring-1 ring-border",
  secondary: "bg-muted text-muted-foreground ring-1 ring-border",
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
  warning: "bg-warning",
  success: "bg-success",
  destructive: "bg-destructive",
  error: "bg-destructive",
  outline: "bg-foreground",
  secondary: "bg-muted-foreground",
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
