import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
};

export function SearchBar({ value, onChange, onClear }: SearchBarProps) {
  const t = useTranslations("browse");
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
        <MagnifyingGlassIcon className="h-5 w-5 text-muted-foreground" aria-hidden />
      </div>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("search.placeholder")}
        aria-label={t("search.ariaLabel")}
        className="h-12 w-full rounded-xl border border-border/50 bg-muted/40 pl-11 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={t("search.clearAriaLabel")}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted">
            <XMarkIcon className="h-4 w-4" />
          </span>
        </button>
      ) : null}
    </div>
  );
}
