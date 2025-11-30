import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

type InputVariant = "default" | "filled";
type InputSize = "sm" | "md" | "lg";

type InputProps = {
  label?: string;
  error?: string;
  hint?: string;
  variant?: InputVariant;
  inputSize?: InputSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "size">;

const variantStyles: Record<InputVariant, string> = {
  default: "bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary",
  filled: "bg-muted border border-transparent focus:border-primary focus:ring-1 focus:ring-primary",
};

const sizeStyles: Record<InputSize, { input: string; icon: string }> = {
  sm: { input: "px-3 py-1.5 text-sm", icon: "h-4 w-4" },
  md: { input: "px-4 py-2 text-sm", icon: "h-5 w-5" },
  lg: { input: "px-4 py-3 text-base", icon: "h-5 w-5" },
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      variant = "default",
      inputSize = "md",
      leftIcon,
      rightIcon,
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const hasError = Boolean(error);
    
    const inputClasses = [
      "w-full rounded-lg text-foreground placeholder:text-muted-foreground transition-colors outline-none",
      variantStyles[variant],
      sizeStyles[inputSize].input,
      leftIcon && "pl-10",
      rightIcon && "pr-10",
      hasError && "border-red-500 focus:border-red-500 focus:ring-red-500",
      props.disabled && "opacity-50 cursor-not-allowed bg-muted",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground ${sizeStyles[inputSize].icon}`}>
              {leftIcon}
            </span>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            {...props}
          />
          
          {rightIcon && (
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground ${sizeStyles[inputSize].icon}`}>
              {rightIcon}
            </span>
          )}
        </div>
        
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-red-500">
            {error}
          </p>
        )}
        
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
