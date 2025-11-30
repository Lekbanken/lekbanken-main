'use client'

import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "children">;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      options,
      placeholder = "Välj ett alternativ",
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const hasError = Boolean(error);

    const selectClasses = [
      "w-full appearance-none rounded-lg px-4 py-2.5 pr-10 text-sm text-foreground",
      "bg-background border border-border",
      "focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors",
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
            htmlFor={selectId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={selectClasses}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined
            }
            {...props}
          >
            <option value="" disabled>
              {placeholder}
            </option>
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </div>

        {error && (
          <p id={`${selectId}-error`} className="text-sm text-red-500">
            {error}
          </p>
        )}

        {hint && !error && (
          <p id={`${selectId}-hint`} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
