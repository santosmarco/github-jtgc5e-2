import { Img, Section } from "@react-email/components";
import dayjs from "dayjs";

import { cn } from "~/lib/utils";

type Point = {
  x: Date;
  y: number;
};

type SparklineProps = {
  /**
   * Array of data points to render in the sparkline
   */
  data?: Point[];
  /**
   * Height of the sparkline component
   */
  height?: number;
  /**
   * Width of the SVG viewport
   */
  viewBoxWidth?: number;
  /**
   * Height of the SVG viewport
   */
  viewBoxHeight?: number;
  /**
   * Color of the line
   */
  lineColor?: string;
  /**
   * Color of the area under the line (optional)
   */
  areaColor?: string;
  /**
   * Whether to show dots at data points
   */
  showPoints?: boolean;
  /**
   * Size of dots at data points (if shown)
   */
  pointSize?: number;
  /**
   * Whether to show labels on each data point
   */
  showPointLabels?: boolean;
  /**
   * Whether to show grid lines
   */
  showGrid?: boolean;
  /**
   * Grid line color
   */
  gridColor?: string;
  /**
   * Labels text color
   */
  labelColor?: string;
  /**
   * Extra className for the container
   */
  className?: string;
};

export function Sparkline({
  data,
  height = 50,
  viewBoxWidth = 500,
  viewBoxHeight = 100,
  lineColor = "#4F46E5", // indigo-600
  areaColor,
  showPoints = true,
  pointSize = 3,
  showPointLabels = true,
  showGrid = true,
  gridColor = "#E5E7EB", // gray-200
  labelColor = "#6B7280", // gray-500
  className,
}: SparklineProps) {
  // Handle edge cases
  if (!data || data.length === 0) {
    return null;
  }

  // If only one point, duplicate it to draw at least a line
  const points =
    data.length === 1 && data[0]
      ? [...data, { ...data[0], x: dayjs(data[0].x).add(1, "day").toDate() }]
      : data;

  // Find min/max values for scaling
  const minX = Math.min(...points.map((p) => p.x.getTime()));
  const maxX = Math.max(...points.map((p) => p.x.getTime()));
  const minY = Math.min(...points.map((p) => p.y ?? 0));

  // Set fixed Y scale from (minY - 10) to 100, with a minimum of 0
  const fixedMinY = Math.max(0, minY - 10);
  const fixedMaxY = 100;

  // Calculate padding based on viewport dimensions
  const paddingX = 20;
  const paddingY = 10;
  const chartWidth = viewBoxWidth - paddingX * 2;
  const chartHeight = viewBoxHeight - paddingY * 2;

  // Function to normalize values to SVG coordinates
  const normalizeX = (x: Date) => {
    // Add padding of 5%
    const range = maxX - minX || 1;
    return paddingX + ((x.getTime() - minX) / range) * chartWidth;
  };

  const normalizeY = (y: number) => {
    // Add padding of 5% and invert Y (SVG 0,0 is top-left)
    const range = fixedMaxY - fixedMinY || 1;
    return viewBoxHeight - paddingY - ((y - fixedMinY) / range) * chartHeight;
  };

  // First and last values for labels
  const firstValue = points[0]?.y ?? 0;
  const lastValue = points[points.length - 1]?.y ?? 0;

  // Generate SVG path from points
  const pathPoints = points
    .map((p, i) => {
      const x = normalizeX(p.x);
      const y = normalizeY(p.y ?? 0);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(" ");

  // Generate the area path if areaColor is provided
  const areaPath = areaColor
    ? `${pathPoints} L ${normalizeX(points[points.length - 1]?.x ?? new Date())} ${viewBoxHeight - paddingY} L ${normalizeX(points[0]?.x ?? new Date())} ${viewBoxHeight - paddingY} Z`
    : null;

  // Calculate grid line positions
  const rightGridX = viewBoxWidth - paddingX;
  const bottomGridY = viewBoxHeight - paddingY;
  const leftGridX = paddingX;
  const topGridY = paddingY;

  // Generate horizontal grid lines every 10 y points
  const horizontalGridLines = [];
  for (let y = fixedMinY; y <= fixedMaxY; y += 10) {
    const yPos = normalizeY(y);
    horizontalGridLines.push(`
      <path
        d="M ${leftGridX} ${yPos} L ${rightGridX} ${yPos}"
        stroke="${gridColor}"
        stroke-width="0.5"
        opacity="1"
        vector-effect="non-scaling-stroke"
      />
    `);
  }

  // Calculate number of date ticks to show (max 5)
  const numPoints = points.length;
  const tickInterval = Math.max(1, Math.floor(numPoints / 5));

  const dateTicks = [];
  for (let i = 0; i < numPoints; i += tickInterval) {
    if (i === 0 || i === numPoints - 1 || i % tickInterval === 0) {
      const point = points[i];
      if (!point) continue;
      const x = normalizeX(point.x);
      dateTicks.push(`
        <text 
          x="${x}" 
          y="${bottomGridY + 15}" 
          text-anchor="middle"
          font-family="sans-serif" 
          font-size="8"
          fill="${labelColor}"
          opacity="0.7"
        >${dayjs(point.x).format("MMM, DD")}</text>
        <path
          d="M ${x} ${bottomGridY} L ${x} ${bottomGridY + 5}"
          stroke="${gridColor}"
          stroke-width="1"
          vector-effect="non-scaling-stroke"
        />
      `);
    }
  }

  // Always show the last date if it wasn't included
  const lastIndex = numPoints - 1;
  if (lastIndex % tickInterval !== 0 && lastIndex > 0) {
    const lastPoint = points[lastIndex];
    if (!lastPoint) return;
    const x = normalizeX(lastPoint.x);
    dateTicks.push(`
      <text 
        x="${x}" 
        y="${bottomGridY + 10}" 
        text-anchor="middle"
        font-family="sans-serif" 
        font-size="8"
        fill="${labelColor}"
        opacity="0.7"
      >${dayjs(lastPoint.x).format("MMM, DD")}</text>
      <path
        d="M ${x} ${bottomGridY} L ${x} ${bottomGridY + 5}"
        stroke="${gridColor}"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />
    `);
  }

  // Generate the SVG content
  const svgContent = `
    <svg
      viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="${height}"
      fill="none"
    >
      ${
        showGrid
          ? `
              <!-- Horizontal grid lines every 10 y points -->
              ${horizontalGridLines.join("")}
              
              <!-- Vertical grid lines -->
              <path
                d="M ${leftGridX} ${topGridY} L ${leftGridX} ${bottomGridY}"
                stroke="${gridColor}"
                stroke-width="1"
                vector-effect="non-scaling-stroke"
              />
              <path
                d="M ${rightGridX} ${topGridY} L ${rightGridX} ${bottomGridY}"
                stroke="${gridColor}"
                stroke-width="1"
                vector-effect="non-scaling-stroke"
              />
              <path
                d="M ${paddingX} ${bottomGridY} L ${rightGridX} ${bottomGridY}"
                stroke="${gridColor}"
                stroke-width="1"
                vector-effect="non-scaling-stroke"
              />
              
              <!-- Y-axis labels -->
              <text 
                x="${leftGridX - 5}" 
                y="${normalizeY(5)}" 
                text-anchor="end" 
                font-family="sans-serif" 
                font-size="8" 
                fill="${labelColor}" 
                opacity="0.7" 
              >0</text>
              <text 
                x="${leftGridX - 5}" 
                y="${normalizeY(55)}" 
                text-anchor="end" 
                font-family="sans-serif" 
                font-size="8" 
                fill="${labelColor}" 
                opacity="0.7" 
              >50</text>
              <text 
                x="${leftGridX - 5}" 
                y="${normalizeY(95)}" 
                text-anchor="end" 
                font-family="sans-serif" 
                font-size="8" 
                fill="${labelColor}" 
                opacity="0.7" 
              >100</text>
              
              <!-- X-axis date ticks -->
              ${dateTicks.join("")}
            `
          : ""
      }
      
      ${
        areaColor
          ? `
              <!-- Area under the line -->
              <path 
                d="${areaPath}" 
                fill="${areaColor}"
                opacity="0.2"
              />
            `
          : ""
      }
      
      <!-- The line -->
      <path 
        d="${pathPoints}" 
        stroke="${lineColor}" 
        stroke-width="2"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
      
      ${
        showPoints
          ? points
              .map((p, i) => {
                const x = normalizeX(p.x);
                const y = normalizeY(p.y ?? 0);
                const isMaxPoint =
                  p.y === Math.max(...points.map((p) => p.y ?? 0));
                const isLastPoint = i === points.length - 1;

                // Add performance trend indicators between points
                let trendIndicator = "";
                if (i > 0 && points[i - 1]) {
                  const prevPoint = points[i - 1];
                  const diff = (p.y ?? 0) - (prevPoint?.y ?? 0);
                  const diffText =
                    diff >= 0 ? `+${diff.toFixed(0)}` : `${diff.toFixed(0)}`;
                  const diffColor = diff >= 0 ? "#10B981" : "#EF4444"; // emerald-500 or red-500

                  // Calculate position between points
                  const midX = (normalizeX(prevPoint?.x ?? new Date()) + x) / 2;
                  const midY = (normalizeY(prevPoint?.y ?? 0) + y) / 2 - 15; // Position above the line

                  trendIndicator = `
                    <text 
                      x="${midX}" 
                      y="${midY}" 
                      text-anchor="middle"
                      font-family="sans-serif" 
                      font-size="12"
                      font-weight="bold"
                      fill="${diffColor}"
                      opacity="1"
                    >${diffText}</text>
                  `;
                }

                // Highlight the most recent point
                const pointRadius = isLastPoint ? pointSize * 1.5 : pointSize;
                const pointOpacity = isLastPoint ? "1" : "0.8";

                return `
                  ${trendIndicator}
                  <circle
                    cx="${x}"
                    cy="${y}"
                    r="${pointRadius}"
                    fill="${lineColor}"
                    opacity="${pointOpacity}"
                    vector-effect="non-scaling-stroke"
                  />
                  ${
                    showPointLabels
                      ? `
                          <text 
                            x="${x}" 
                            y="${isMaxPoint ? (isLastPoint ? y + 18 : y + 15) : y - 10}" 
                            text-anchor="middle"
                            font-family="sans-serif" 
                            font-size="${isLastPoint ? "11" : "10"}"
                            font-weight="${isLastPoint ? "bold" : "normal"}"
                            fill="${labelColor}"
                            opacity="${isLastPoint ? "1" : "0.8"}"
                          >${p.y?.toFixed(0)}</text>
                        `
                      : ""
                  }
                `;
              })
              .join("")
          : ""
      }
    </svg>
  `;

  // Encode SVG for data URL
  const encodedSvg = encodeURIComponent(svgContent.trim());
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;

  return (
    <Section
      className={cn("relative w-full", className)}
      style={{ height: `${height}px` }}
    >
      <Img
        src={svgDataUrl}
        width="100%"
        height={height}
        alt={`Sparkline chart showing trend from ${firstValue} to ${lastValue}`}
        title="Data trend visualization"
      />
    </Section>
  );
}
