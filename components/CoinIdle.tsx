import Image from "next/image";
import styles from "./CoinIdle.module.css";

type CoinIdleProps = {
  size?: number;
  src?: string;
  className?: string;
  ariaLabel?: string;
  paused?: boolean;
};

export function CoinIdle({
  size = 64,
  src = "/icons/app-nav/lekvaluta.png",
  className = "",
  ariaLabel = "DiceCoin",
  paused = false,
}: CoinIdleProps) {
  return (
    <Image
      src={src}
      alt={ariaLabel}
      width={size}
      height={size}
      className={`${paused ? "" : styles.coinIdle} ${className}`}
      priority={false}
    />
  );
}
