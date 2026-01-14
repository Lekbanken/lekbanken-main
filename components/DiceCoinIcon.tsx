/**
 * DiceCoinIcon - Canonical icon for the in-product virtual currency
 * 
 * Use this component whenever displaying the DiceCoin currency icon.
 * For animated coin (idle/spinning), use CoinIdle instead.
 * 
 * @example
 * <DiceCoinIcon size={24} />
 * <DiceCoinIcon size="sm" className="text-yellow-500" />
 */

import Image from "next/image";
import { cn } from "@/lib/utils";

const DICECOIN_ASSET = "/icons/app-nav/lekvaluta.png";

type SizePreset = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<SizePreset, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

interface DiceCoinIconProps {
  /** Size in pixels or preset name */
  size?: number | SizePreset;
  /** Additional CSS classes */
  className?: string;
  /** Accessibility label */
  title?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

export function DiceCoinIcon({
  size = "md",
  className,
  title = "DiceCoin",
  style,
}: DiceCoinIconProps) {
  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size];
  
  return (
    <Image
      src={DICECOIN_ASSET}
      alt={title}
      width={pixelSize}
      height={pixelSize}
      className={cn("inline-block flex-shrink-0", className)}
      style={style}
      priority={false}
      unoptimized // Small icon, no need for optimization
    />
  );
}

/**
 * Emoji fallback for DiceCoin (for use in text contexts)
 */
export const DICECOIN_EMOJI = "🪙";

/**
 * Asset path for DiceCoin icon
 */
export const DICECOIN_ASSET_PATH = DICECOIN_ASSET;

export default DiceCoinIcon;
