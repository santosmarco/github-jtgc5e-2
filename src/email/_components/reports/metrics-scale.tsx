import { Column, Img, Row } from "@react-email/components";

export type MetricsScaleProps = {
  leftLabel: string;
  rightLabel: string;
  value: number; // 0-100 value representing the position of the marker
  showNotches?: boolean;
};

export function MetricsScale({
  leftLabel,
  rightLabel,
  value,
  showNotches = false,
}: MetricsScaleProps) {
  // Constrain value between 0-100
  const constrainedValue = Math.max(0, Math.min(100, value));

  // Create SVG for the metrics scale
  const svgWidth = 300;
  const svgHeight = 30;
  const scaleHeight = 4;
  const indicatorRadius = 8;
  const notchHeight = 6;
  const padding = 10;

  // Calculate indicator position
  const indicatorX =
    padding + (constrainedValue / 100) * (svgWidth - 2 * padding);

  // Generate SVG string
  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
      <!-- Background scale bar -->
      <rect x="${padding}" y="${(svgHeight - scaleHeight) / 2}" width="${svgWidth - 2 * padding}" height="${scaleHeight}" rx="${scaleHeight / 2}" fill="#E5E7EB" />
      
      ${
        showNotches
          ? `
              <!-- Notches -->
              <line x1="${padding + (svgWidth - 2 * padding) * 0.25}" y1="${(svgHeight - notchHeight) / 2}" x2="${padding + (svgWidth - 2 * padding) * 0.25}" y2="${(svgHeight + notchHeight) / 2}" stroke="#9CA3AF" stroke-width="1" />
              <line x1="${padding + (svgWidth - 2 * padding) * 0.5}" y1="${(svgHeight - notchHeight) / 2}" x2="${padding + (svgWidth - 2 * padding) * 0.5}" y2="${(svgHeight + notchHeight) / 2}" stroke="#9CA3AF" stroke-width="1" />
              <line x1="${padding + (svgWidth - 2 * padding) * 0.75}" y1="${(svgHeight - notchHeight) / 2}" x2="${padding + (svgWidth - 2 * padding) * 0.75}" y2="${(svgHeight + notchHeight) / 2}" stroke="#9CA3AF" stroke-width="1" />
            `
          : ""
      }
      
      <!-- Indicator circle -->
      <circle cx="${indicatorX}" cy="${svgHeight / 2}" r="${indicatorRadius}" fill="#4F46E5" />
    </svg>
  `;

  // Convert SVG to a data URL
  const svgDataUrl = `data:image/svg+xml,${encodeURIComponent(svgContent)}`;

  return (
    <Row>
      <Column className="w-1/4 text-sm text-gray-600">{leftLabel}</Column>
      <Column className="w-1/2 px-2">
        <Img
          src={svgDataUrl}
          width={svgWidth}
          height={svgHeight}
          alt={`Metrics scale showing ${value}% towards ${rightLabel}`}
        />
      </Column>
      <Column className="w-1/4 text-right text-sm text-gray-600">
        {rightLabel}
      </Column>
    </Row>
  );
}
