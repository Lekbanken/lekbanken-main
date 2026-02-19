'use client'

import { type ChangeEvent } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = {
  label?: string;
  error?: string;
  hint?: string;
  options: readonly SelectOption[];
  placeholder?: string;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  name?: string;
  className?: string;
  id?: string;
  required?: boolean;
  "aria-label"?: string;
};

export function Select({
  label,
  error,
  hint,
  options,
  placeholder = "Välj ett alternativ",
  value,
  onChange,
  disabled,
  name,
  className = "",
  id,
  "aria-label": ariaLabel,
  required,
}: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
  const hasError = Boolean(error);

  const selectedOption = options.find((o) => o.value === value) ?? null;

  function handleChange(newValue: string) {
    if (!onChange) return;
    // Synthesize a ChangeEvent-compatible object so existing consumers
    // that read `e.target.value` keep working without any changes.
    const syntheticEvent = {
      target: { value: newValue, name: name ?? "" },
      currentTarget: { value: newValue, name: name ?? "" },
    } as ChangeEvent<HTMLSelectElement>;
    onChange(syntheticEvent);
  }

  const buttonClasses = [
    "relative w-full cursor-default rounded-lg py-2.5 pl-4 pr-10 text-left text-sm",
    "bg-background border border-border text-foreground",
    "focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors",
    hasError && "border-red-500 focus:border-red-500 focus:ring-red-500",
    disabled && "opacity-50 cursor-not-allowed bg-muted",
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

      <Listbox value={value ?? ""} onChange={handleChange} disabled={disabled}>
        <div className="relative">
          <ListboxButton
            id={selectId}
            className={buttonClasses}
            aria-label={ariaLabel}
            aria-invalid={hasError}
            aria-describedby={
              hasError
                ? `${selectId}-error`
                : hint
                  ? `${selectId}-hint`
                  : undefined
            }
          >
            <span className={`block truncate ${selectedOption ? "" : "text-muted-foreground"}`}>
              {selectedOption?.label ?? placeholder}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronUpDownIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </span>
          </ListboxButton>

          <ListboxOptions
            anchor="bottom start"
            className="z-50 mt-1 max-h-60 w-[var(--button-width)] overflow-auto rounded-lg border border-border bg-popover py-1 text-sm shadow-lg focus:outline-none"
          >
            {options.map((option) => (
              <ListboxOption
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="group relative cursor-default select-none py-2 pl-10 pr-4 text-foreground data-[focus]:bg-primary data-[focus]:text-primary-foreground data-[disabled]:opacity-50"
              >
                <span className="block truncate font-normal group-data-[selected]:font-semibold">
                  {option.label}
                </span>
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary group-data-[focus]:text-primary-foreground [.group:not([data-selected])_&]:hidden">
                  <CheckIcon className="h-5 w-5" aria-hidden="true" />
                </span>
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>

      {/* Hidden input for form compatibility */}
      {name && (
        <input type="hidden" name={name} value={value ?? ""} required={required} />
      )}

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

Select.displayName = "Select";
