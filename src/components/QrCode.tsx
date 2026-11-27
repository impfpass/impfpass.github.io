import { useMemo } from "react";
import { qrMatrix } from "@/core/formats/qr";

const QUIET_ZONE = 4;

interface QrCodeProps {
  text: string;
  label: string;
  className?: string;
}

/** QR-Code als SVG. Immer schwarz auf weiß, auch im dunklen Design. */
export function QrCode({ text, label, className }: QrCodeProps) {
  const { size, path } = useMemo(() => {
    const m = qrMatrix(text);
    const parts: string[] = [];
    m.forEach((cells, row) => {
      cells.forEach((dark, col) => {
        if (dark)
          parts.push(`M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`);
      });
    });
    return { size: m.length + 2 * QUIET_ZONE, path: parts.join("") };
  }, [text]);

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={size} height={size} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}
