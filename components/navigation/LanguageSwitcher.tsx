"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePreferences, type LanguageCode } from "@/lib/context/PreferencesContext";
import { cn } from "@/lib/utils";

const LANG_OPTIONS: Array<{ code: LanguageCode; label: string }> = [
  { code: "NO", label: "Norsk" },
  { code: "SE", label: "Svenska" },
  { code: "EN", label: "English" },
];

type LanguageSwitcherProps = {
  className?: string;
  align?: "start" | "center" | "end";
};

export function LanguageSwitcher({ className, align = "end" }: LanguageSwitcherProps) {
  const { language, setLanguage } = usePreferences();
  const active = LANG_OPTIONS.find((option) => option.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-2 text-sm font-medium text-foreground transition hover:border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          className,
        )}
      >
        <button type="button" aria-label="Change language">
          <span className="text-xs font-semibold">{active?.code ?? "NO"}</span>
          <svg viewBox="0 0 24 24" className="ml-1 inline h-3.5 w-3.5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-40">
        <DropdownMenuLabel>Language</DropdownMenuLabel>
        {LANG_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.code}
            onClick={() => void setLanguage(option.code)}
            className={cn("flex items-center justify-between text-sm", option.code === language && "text-primary")}
          >
            <span>{option.label}</span>
            {option.code === language && (
              <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
