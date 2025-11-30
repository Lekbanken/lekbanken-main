import type { HTMLAttributes, ReactNode } from "react";

type CardVariant = "default" | "elevated" | "bordered" | "featured";

type CardProps = {
  children: ReactNode;
  variant?: CardVariant;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
} & HTMLAttributes<HTMLDivElement>;

const variantStyles: Record<CardVariant, string> = {
  default: "bg-card border border-border",
  elevated: "bg-card shadow-lg shadow-primary/5",
  bordered: "bg-card border-2 border-border",
  featured: "bg-primary/5 border border-primary ring-1 ring-primary",
};

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  children,
  variant = "default",
  className = "",
  padding = "md",
  ...props
}: CardProps) {
  const classes = [
    "rounded-2xl",
    variantStyles[variant],
    paddingStyles[padding],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

/* Sub-components for structured card content */

type CardHeaderProps = {
  children: ReactNode;
  className?: string;
};

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

type CardTitleProps = {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4";
};

export function CardTitle({ children, className = "", as: Tag = "h3" }: CardTitleProps) {
  return (
    <Tag className={`text-lg font-semibold text-foreground ${className}`}>
      {children}
    </Tag>
  );
}

type CardDescriptionProps = {
  children: ReactNode;
  className?: string;
};

export function CardDescription({ children, className = "" }: CardDescriptionProps) {
  return (
    <p className={`text-sm text-muted-foreground ${className}`}>
      {children}
    </p>
  );
}

type CardContentProps = {
  children: ReactNode;
  className?: string;
};

export function CardContent({ children, className = "" }: CardContentProps) {
  return <div className={className}>{children}</div>;
}

type CardFooterProps = {
  children: ReactNode;
  className?: string;
};

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div className={`mt-4 flex items-center gap-3 ${className}`}>
      {children}
    </div>
  );
}
