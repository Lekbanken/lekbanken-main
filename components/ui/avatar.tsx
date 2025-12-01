import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  xs: { wrapper: "h-6 w-6 text-xs", px: 24 },
  sm: { wrapper: "h-8 w-8 text-sm", px: 32 },
  md: { wrapper: "h-10 w-10 text-base", px: 40 },
  lg: { wrapper: "h-12 w-12 text-lg", px: 48 },
  xl: { wrapper: "h-16 w-16 text-xl", px: 64 },
};

// Generate consistent color from name
function getColorFromName(name: string): string {
  const colors = [
    "bg-primary",
    "bg-accent",
    "bg-yellow",
    "bg-destructive",
    "bg-info",
    "bg-success",
    "bg-warning",
    "bg-muted",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

// Get initials from name
function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({ src, alt, name, size = "md", className }: AvatarProps) {
  const initials = name ? getInitials(name) : "?";
  const bgColor = name ? getColorFromName(name) : "bg-muted";
  const dimensions = sizeClasses[size] || sizeClasses.md;

  if (src) {
    return (
      <div className={cn("relative inline-block overflow-hidden rounded-full", dimensions.wrapper, className)}>
        <Image
          src={src}
          alt={alt || name || "Avatar"}
          fill
          sizes={`${dimensions.px}px`}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white",
        dimensions.wrapper,
        bgColor,
        className,
      )}
      title={name}
    >
      {initials}
    </div>
  );
}

// Avatar with status indicator
interface AvatarWithStatusProps extends AvatarProps {
  status?: "online" | "offline" | "away" | "busy";
}

const statusColors = {
  online: "bg-success",
  offline: "bg-muted-foreground",
  away: "bg-warning",
  busy: "bg-destructive",
};

export function AvatarWithStatus({ status, ...props }: AvatarWithStatusProps) {
  return (
    <div className="relative inline-block">
      <Avatar {...props} />
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full ring-2 ring-card",
            statusColors[status],
            props.size === "xs" || props.size === "sm" ? "h-2 w-2" : "h-3 w-3",
          )}
        />
      )}
    </div>
  );
}

// Avatar group
interface AvatarGroupProps {
  avatars: Array<{ src?: string; name?: string }>;
  max?: number;
  size?: AvatarProps["size"];
  className?: string;
}

export function AvatarGroup({ avatars, max = 4, size = "sm", className }: AvatarGroupProps) {
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className={cn("flex -space-x-2", className)}>
      {visible.map((avatar, index) => (
        <Avatar key={index} src={avatar.src} name={avatar.name} size={size} className="ring-2 ring-card" />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-muted font-medium text-muted-foreground ring-2 ring-card",
            sizeClasses[size || "sm"].wrapper,
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
