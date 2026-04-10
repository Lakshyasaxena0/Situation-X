interface SaturnXLogoProps {
  size?: number;
  className?: string;
}

export function SaturnXLogo({ size = 48, className = "" }: SaturnXLogoProps) {
  const r = size / 2;
  const cx = r;
  const cy = r;
  const xSize = size * 0.38;
  const ringRx = size * 0.48;
  const ringRy = size * 0.16;
  const strokeW = size * 0.055;
  const xStroke = size * 0.13;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Back ring arc (behind X) */}
      <path
        d={`M ${cx - ringRx * 0.72} ${cy + ringRy * 0.5}
            Q ${cx - ringRx * 0.2} ${cy + ringRy * 1.4} ${cx} ${cy + ringRy * 1.2}
            Q ${cx + ringRx * 0.2} ${cy + ringRy * 1.4} ${cx + ringRx * 0.72} ${cy + ringRy * 0.5}`}
        stroke="#64748b"
        strokeWidth={strokeW}
        strokeLinecap="round"
        fill="none"
        opacity={0.55}
      />

      {/* X shape */}
      <line
        x1={cx - xSize * 0.85}
        y1={cy - xSize}
        x2={cx + xSize * 0.85}
        y2={cy + xSize}
        stroke="#f97316"
        strokeWidth={xStroke}
        strokeLinecap="round"
      />
      <line
        x1={cx + xSize * 0.85}
        y1={cy - xSize}
        x2={cx - xSize * 0.85}
        y2={cy + xSize}
        stroke="#f97316"
        strokeWidth={xStroke}
        strokeLinecap="round"
      />

      {/* Front ring arc (in front of X) */}
      <path
        d={`M ${cx - ringRx * 0.72} ${cy + ringRy * 0.5}
            Q ${cx - ringRx * 0.4} ${cy - ringRy * 0.8} ${cx} ${cy - ringRy * 0.9}
            Q ${cx + ringRx * 0.4} ${cy - ringRy * 0.8} ${cx + ringRx * 0.72} ${cy + ringRy * 0.5}`}
        stroke="#94a3b8"
        strokeWidth={strokeW}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
