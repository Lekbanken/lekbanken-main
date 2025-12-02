import { useEffect, useState } from "react";
import { CheckIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const languages = [
  { code: "sv", label: "Svenska", flag: "🇸🇪" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "no", label: "Norsk", flag: "🇳🇴" },
];

type LanguageSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const selectedLang = languages.find((l) => l.code === value);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="h-4 w-4 rounded-full bg-muted" />
        <span className="h-4 w-16 rounded bg-muted" />
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <span>{selectedLang?.flag}</span>
          <span>{selectedLang?.label ?? "Språk"}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl sm:max-w-md">
        {/* Grabber */}
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />
        
        <SheetHeader className="text-left">
          <div className="flex items-center gap-2">
            <GlobeAltIcon className="h-5 w-5 text-muted-foreground" />
            <SheetTitle>Välj språk</SheetTitle>
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-1">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                onChange(lang.code);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                value === lang.code
                  ? "bg-primary/10"
                  : "hover:bg-muted/50"
              }`}
            >
              <span className="text-xl">{lang.flag}</span>
              <span className={`flex-1 text-sm font-medium ${
                value === lang.code ? "text-primary" : "text-foreground"
              }`}>
                {lang.label}
              </span>
              {value === lang.code && (
                <CheckIcon className="h-5 w-5 text-primary" />
              )}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
