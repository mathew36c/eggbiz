import { Egg } from "lucide-react";
import { EggSize } from "@/lib/types";

interface EggSizeIconProps {
  size: EggSize;
  compact?: boolean;
}

function getEggColors(size: EggSize) {
  switch (size) {
    case "S":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "M":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "L":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "XL":
      return "bg-orange-200 text-orange-800 border-orange-300";
  }
}

export function EggSizeIcon({ size, compact = false }: EggSizeIconProps) {
  const wrapperSize = compact ? "h-7 w-7" : "h-9 w-9";
  const iconSize = compact ? "h-4 w-4" : "h-5 w-5";

  return (
    <div
      className={`${wrapperSize} ${getEggColors(size)} inline-flex items-center justify-center rounded-full border`}
      aria-label={`${size} egg`}
      title={`${size} egg`}
    >
      <Egg className={iconSize} />
    </div>
  );
}
