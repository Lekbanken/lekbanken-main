import { ReactNode, type KeyboardEvent } from "react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

type SettingsItemProps = {
  label: string;
  description?: string;
  icon?: ReactNode;
  iconClassName?: string;
  action?: ReactNode;
  trailing?: ReactNode;
  showChevron?: boolean;
  onClick?: () => void;
  href?: string;
};

export function SettingsItem({
  label,
  description,
  icon,
  iconClassName = "bg-primary/10 text-primary",
  action,
  trailing,
  showChevron = true,
  onClick,
  href,
}: SettingsItemProps) {
  const baseClasses =
    "flex w-full items-center gap-3 border-b border-border/50 px-4 py-3.5 text-left transition-all last:border-0 hover:bg-muted/50 active:bg-muted active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-inset min-h-[56px]";

  const content = (
    <>
      {/* Icon */}
      {icon && (
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
          {icon}
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
      </div>

      {/* Trailing content (value text, toggle, etc) */}
      {trailing && <div className="text-sm text-muted-foreground">{trailing}</div>}

      {/* Action (legacy support) */}
      {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}

      {/* Chevron */}
      {showChevron && !action && !trailing && (
        <ChevronRightIcon className="h-5 w-5 flex-shrink-0 text-muted-foreground/40" />
      )}
    </>
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  if (href) {
    return (
      <a href={href} className={baseClasses} onClick={onClick}>
        {content}
      </a>
    );
  }

  if (action || trailing) {
    return (
      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className={baseClasses}
      >
        {content}
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className={baseClasses}>
      {content}
    </button>
  );
}
