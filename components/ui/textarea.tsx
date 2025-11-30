import type { TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";

type TextareaProps = {
  label?: string;
  error?: string;
  hint?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const hasError = Boolean(error);

    const textareaClasses = [
      "w-full rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground",
      "bg-background border border-border",
      "focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors",
      "resize-y min-h-[100px]",
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
            htmlFor={textareaId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          className={textareaClasses}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined
          }
          {...props}
        />

        {error && (
          <p id={`${textareaId}-error`} className="text-sm text-red-500">
            {error}
          </p>
        )}

        {hint && !error && (
          <p id={`${textareaId}-hint`} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
