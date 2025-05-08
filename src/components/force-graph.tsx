"use client";

import * as d3 from "d3";
import { useEffect, useRef } from "react";

// Extended Node interface with d3 simulation properties
interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: string;
  description?: string;
  descriptions?: string[];
  observations?: string[];
  meetingIds?: string[];
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

// Extended Link interface with d3 simulation properties
export interface ForceGraphLink extends d3.SimulationLinkDatum<Node> {
  id: string;
  source: Node | string;
  target: Node | string;
  type: string;
  meetingId?: string;
  observations?: string[];
}

interface GraphData {
  nodes: Node[];
  links: ForceGraphLink[];
}

interface ForceGraphProps {
  data: GraphData;
  showLabels: boolean;
  zoomLevel: number;
  onNodeClick: (node: Node) => void;
  onLinkClick?: (link: ForceGraphLink) => void;
  highlightedNodeIds?: Set<string>;
  layoutMode?: "clustered" | "radial" | "force";
}

type D3ZoomEvent = d3.D3ZoomEvent<SVGSVGElement, unknown>;
type D3DragEvent = d3.D3DragEvent<SVGCircleElement, Node, Node>;

export default function ForceGraph({
  data,
  showLabels,
  zoomLevel,
  onNodeClick,
  onLinkClick,
  highlightedNodeIds = new Set(),
  layoutMode = "clustered",
}: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Create a color scale for node types using Tailwind colors
    const nodeTypes = Array.from(new Set(data.nodes.map((d) => d.type)));
    const nodeColors = [
      "#3b82f6", // blue-500
      "#ef4444", // red-500
      "#10b981", // emerald-500
      "#f59e0b", // amber-500
      "#8b5cf6", // violet-500
      "#ec4899", // pink-500
      "#14b8a6", // teal-500
      "#f97316", // orange-500
      "#6366f1", // indigo-500
      "#84cc16", // lime-500
      "#06b6d4", // cyan-500
      "#d946ef", // fuchsia-500
      "#0ea5e9", // sky-500
      "#eab308", // yellow-500
      "#a855f7", // purple-500
      "#f43f5e", // rose-500
    ];
    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(nodeTypes)
      .range(nodeColors);

    // Create a color scale for link types using Tailwind colors
    const linkTypes = Array.from(new Set(data.links.map((d) => d.type)));
    const linkColors = [
      "#94a3b820", // slate-400 with very low opacity
      "#9ca3af20", // gray-400 with very low opacity
      "#a1a1aa20", // zinc-400 with very low opacity
      "#a3a3a320", // neutral-400 with very low opacity
      "#a8a29e20", // stone-400 with very low opacity
      "#cbd5e120", // slate-200 with very low opacity
      "#e2e8f020", // slate-100 with very low opacity
      "#94a3b8", // slate-400
      "#9ca3af", // gray-400
      "#a1a1aa", // zinc-400
      "#a3a3a3", // neutral-400
      "#a8a29e", // stone-400
      "#fb7185", // rose-400
      "#f472b6", // pink-400
      "#e879f9", // fuchsia-400
      "#c084fc", // purple-400
      "#a78bfa", // violet-400
      "#818cf8", // indigo-400
      "#60a5fa", // blue-400
      "#38bdf8", // sky-400
      "#22d3ee", // cyan-400
      "#2dd4bf", // teal-400
      "#34d399", // emerald-400
    ];
    const linkColorScale = d3
      .scaleOrdinal<string>()
      .domain(linkTypes)
      .range(linkColors);

    // Create a container for our graph
    const g = svg.append("g");

    // Create a zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event: D3ZoomEvent) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(zoom);

    // Apply initial zoom level
    svg.call((selection) =>
      zoom.transform(selection, d3.zoomIdentity.scale(zoomLevel)),
    );

    // Group nodes by type for better organization
    const nodesByType = d3.group(data.nodes, (d) => d.type);
    const typeCount = nodesByType.size;

    // Calculate a better layout based on the number of node types
    // More separation for large datasets
    const outerRadius = Math.min(width, height) * 0.35; // Increased outer radius
    const centerOffset = Math.min(width, height) * 0.1; // Offset from center
    const angleStep = (2 * Math.PI) / typeCount;
    let typeIndex = 0;

    // Create a map for quick node lookup
    const nodeMap = new Map<string, Node>();
    for (const node of data.nodes) {
      nodeMap.set(node.id, node);
    }

    // Process links to ensure source and target are Node objects
    const processedLinks: ForceGraphLink[] = data.links.map((link) => {
      const sourceId =
        typeof link.source === "string" ? link.source : link.source.id;
      const targetId =
        typeof link.target === "string" ? link.target : link.target.id;

      return {
        ...link,
        source: nodeMap.get(sourceId) || sourceId,
        target: nodeMap.get(targetId) || targetId,
      };
    });

    // Pre-process nodes to ensure they have positions
    if (layoutMode === "clustered") {
      // Clustered layout (group nodes by type)
      for (const [, nodes] of nodesByType) {
        const angle = typeIndex * angleStep;

        // Position each type of node in its own sector
        // Move center position based on the angle from the center
        const centerX = width / 2 + centerOffset * Math.cos(angle);
        const centerY = height / 2 + centerOffset * Math.sin(angle);

        // Calculate a cluster radius based on the number of nodes
        // Larger clusters for more nodes, but capped to avoid too much spread
        const nodeCount = nodes.length;
        const clusterRadius = Math.min(
          Math.sqrt(nodeCount) * 20,
          outerRadius * 0.7,
        );

        // Arrange nodes in a spiral pattern which scales better than a circle for many nodes
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          if (!node) continue;

          // Spiral layout: increase radius as we go
          const nodeAngle = (i * 2.5) % (2 * Math.PI);
          const spiralRadius = clusterRadius * Math.sqrt((i + 1) / nodeCount);
          node.x = centerX + spiralRadius * Math.cos(nodeAngle);
          node.y = centerY + spiralRadius * Math.sin(nodeAngle);
        }

        typeIndex++;
      }
    } else if (layoutMode === "radial") {
      // Radial layout (nodes in concentric circles based on connection count)
      // Calculate connection count for each node
      const nodeConnectionCounts = data.nodes.map((node) => {
        const connections = processedLinks.filter((link) => {
          const sourceId =
            typeof link.source === "string" ? link.source : link.source.id;
          const targetId =
            typeof link.target === "string" ? link.target : link.target.id;
          return sourceId === node.id || targetId === node.id;
        }).length;
        return { node, connections };
      });

      // Sort by connection count
      nodeConnectionCounts.sort((a, b) => b.connections - a.connections);

      // Group into tiers based on connection count
      const maxConnections = nodeConnectionCounts[0]?.connections || 1;
      const tiers = 5; // Number of concentric circles

      // Assign each node to a tier based on connection count
      let nodeIndex = 0;
      for (const { node, connections } of nodeConnectionCounts) {
        // Calculate tier (0 is center, tiers-1 is outermost)
        let tier = Math.floor((tiers - 1) * (1 - connections / maxConnections));
        // Ensure highly connected nodes are near center
        if (connections > maxConnections * 0.7) tier = 0;
        if (connections < maxConnections * 0.1) tier = tiers - 1;

        // Calculate position in tier
        const tierRadius = (tier + 1) * (outerRadius / tiers);
        const nodesPerTier = Math.max(
          6,
          Math.floor((2 * Math.PI * tierRadius) / 30),
        ); // Estimate nodes per tier
        const angleInTier =
          (nodeIndex % nodesPerTier) * ((2 * Math.PI) / nodesPerTier);

        // Set position
        node.x = width / 2 + tierRadius * Math.cos(angleInTier);
        node.y = height / 2 + tierRadius * Math.sin(angleInTier);

        nodeIndex++;
      }
    } else {
      // Force-directed layout (random initial positions)
      for (const node of data.nodes) {
        // Random positions within a circle
        const angle = Math.random() * 2 * Math.PI;
        const radius = Math.random() * outerRadius * 0.8;
        node.x = width / 2 + radius * Math.cos(angle);
        node.y = height / 2 + radius * Math.sin(angle);
      }
    }

    // Function to determine node size based on connections
    function nodeSize(node: Node): number {
      const connectedLinks = processedLinks.filter((link) => {
        const sourceId =
          typeof link.source === "string" ? link.source : link.source.id;
        const targetId =
          typeof link.target === "string" ? link.target : link.target.id;
        return sourceId === node.id || targetId === node.id;
      });
      // Base size is 5, increases with the number of connections, up to a max size
      return Math.min(14, 5 + Math.sqrt(connectedLinks.length) * 1.5);
    }

    // Create the simulation with improved forces
    const simulation = d3
      .forceSimulation<Node>(data.nodes)
      .force(
        "link",
        d3
          .forceLink<Node, ForceGraphLink>(processedLinks)
          .id((d) => d.id)
          .distance((link) => {
            // Make relationship links longer between different node types
            const source =
              typeof link.source === "string" ? "" : link.source.type;
            const target =
              typeof link.target === "string" ? "" : link.target.type;
            return source === target ? 100 : 180; // Increased distances
          })
          .strength(0.5), // Reduced strength for more flexibility
      )
      .force("charge", d3.forceManyBody().strength(-600).distanceMax(300)) // Stronger repulsion with limited range
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force("x", d3.forceX(width / 2).strength(0.04))
      .force("y", d3.forceY(height / 2).strength(0.04))
      .force(
        "collision",
        d3
          .forceCollide<Node>()
          .radius((d) => nodeSize(d) + 12) // Increased padding between nodes
          .strength(0.8),
      );

    // Add clustering force only in clustered mode
    if (layoutMode === "clustered") {
      simulation.force("cluster", (alpha) => {
        // Apply clustering force - keep nodes of the same type together
        for (const node of data.nodes) {
          const clusterCenter = nodesByType.get(node.type)?.reduce(
            (acc, n) => {
              acc.x += n.x || 0;
              acc.y += n.y || 0;
              return acc;
            },
            { x: 0, y: 0 },
          );

          if (clusterCenter) {
            const count = nodesByType.get(node.type)?.length || 1;
            const clusterX = clusterCenter.x / count;
            const clusterY = clusterCenter.y / count;

            // Apply soft force to move toward cluster center
            node.vx = (node.vx || 0) + (clusterX - (node.x || 0)) * alpha * 0.2;
            node.vy = (node.vy || 0) + (clusterY - (node.y || 0)) * alpha * 0.2;
          }
        }
      });
    }

    // Create the links
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(processedLinks)
      .join("line")
      .attr("stroke", (d) => linkColorScale(d.type))
      .attr("stroke-width", 1.5) // Thinner links
      .attr("stroke-opacity", 0.5) // More transparent links
      .style("cursor", onLinkClick ? "pointer" : "default")
      .on("click", (event: MouseEvent, d: ForceGraphLink) => {
        if (onLinkClick) {
          event.stopPropagation();
          onLinkClick(d);
        }
      });

    // Create link labels - only show a subset to prevent clutter
    const showLinkLimit = Math.min(processedLinks.length, 100); // Limit link labels
    const linkLabel = g
      .append("g")
      .attr("class", "link-labels")
      .selectAll("text")
      .data(processedLinks.slice(0, showLinkLimit))
      .join("text")
      .attr("dy", -5)
      .attr("text-anchor", "middle")
      .attr("font-size", "8px") // Smaller font
      .text((d) => d.type)
      .style("pointer-events", "none")
      .style("opacity", showLabels ? 0.6 : 0) // More transparent labels
      .attr("fill", "#475569"); // slate-600

    // Create hulls (backgrounds) for each group - only in clustered mode
    const useHulls = layoutMode === "clustered" && nodesByType.size > 1;

    if (useHulls) {
      const hullPadding = 20;
      const hulls = g
        .append("g")
        .attr("class", "hulls")
        .selectAll("path")
        .data(Array.from(nodesByType.entries()))
        .join("path")
        .attr("fill", ([type]) => {
          const color = d3.color(colorScale(type));
          return color ? color.copy({ opacity: 0.08 }).toString() : "none";
        })
        .attr("stroke", ([type]) => colorScale(type))
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "5,5")
        .attr("stroke-opacity", 0.3);

      // Update hull shapes on tick
      simulation.on("tick", () => {
        hulls.attr("d", ([, nodes]) => {
          if (nodes.length < 2) return "";

          // Calculate convex hull points
          const points = nodes.map(
            (d) => [d.x || 0, d.y || 0] as [number, number],
          );
          const hull = d3.polygonHull(points);

          if (!hull) return "";

          // Add padding around the hull
          const padded = hull.map((point) => {
            const [x, y] = point;
            const centerX = d3.mean(points, (p) => p[0]) || 0;
            const centerY = d3.mean(points, (p) => p[1]) || 0;

            // Direction from center to point
            const dx = x - centerX;
            const dy = y - centerY;
            const len = Math.sqrt(dx * dx + dy * dy);

            // Extend point outward
            return [x + (dx / len) * hullPadding, y + (dy / len) * hullPadding];
          });

          return `M${padded.join("L")}Z`;
        });

        ticked();
      });
    } else {
      simulation.on("tick", ticked);
    }

    // Create the nodes
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGCircleElement, Node>("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", nodeSize)
      .attr("fill", (d) => {
        // Brighten highlighted nodes
        if (highlightedNodeIds.has(d.id)) {
          const color = d3.color(colorScale(d.type));
          return color ? color.brighter(0.5).toString() : colorScale(d.type);
        }
        return colorScale(d.type);
      })
      .style("cursor", "pointer")
      .on("click", (event: MouseEvent, d: Node) => {
        event.stopPropagation();
        onNodeClick(d);
      });

    // Set up drag behavior
    const drag = d3
      .drag<SVGCircleElement, Node>()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);

    // Apply drag behavior with proper type handling
    node.call(
      drag as unknown as (
        selection: d3.Selection<SVGCircleElement, Node, SVGGElement, unknown>,
      ) => void,
    );

    // Add tooltips
    node.append("title").text((d) => d.name);

    // Add highlights for searched nodes
    if (highlightedNodeIds.size > 0) {
      g.append("g")
        .attr("class", "node-highlights")
        .selectAll<SVGCircleElement, Node>("circle")
        .data(data.nodes.filter((d) => highlightedNodeIds.has(d.id)))
        .join("circle")
        .attr("r", (d) => nodeSize(d) + 5)
        .attr("fill", "none")
        .attr("stroke", "#fbbf24") // amber-400
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "3,2")
        .attr("pointer-events", "none");
    }

    // Add type indicators to nodes
    g.append("g")
      .attr("class", "node-borders")
      .selectAll<SVGCircleElement, Node>("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", (d) => nodeSize(d) + 2)
      .attr("fill", "none")
      .attr("stroke", (d) => colorScale(d.type))
      .attr("stroke-width", 1.5) // Thinner borders
      .attr("pointer-events", "none");

    // Create node labels - smaller font and limit to the most connected nodes to prevent clutter
    const nodeConnections = data.nodes.map((node) => {
      const connections = processedLinks.filter((link) => {
        const sourceId =
          typeof link.source === "string" ? link.source : link.source.id;
        const targetId =
          typeof link.target === "string" ? link.target : link.target.id;
        return sourceId === node.id || targetId === node.id;
      }).length;
      return { node, connections };
    });

    // Prioritize showing labels for highlighted and connected nodes
    const nodesToLabel = [...data.nodes].filter((node) =>
      highlightedNodeIds.has(node.id),
    );

    // Add top connected nodes (if we still have room)
    if (nodesToLabel.length < 100) {
      const topNodes = nodeConnections
        .sort((a, b) => b.connections - a.connections)
        .slice(0, Math.min(data.nodes.length, 100 - nodesToLabel.length))
        .map((item) => item.node);

      // Add top nodes that aren't already in the label set
      const existingNodeIds = new Set(nodesToLabel.map((n) => n.id));
      for (const node of topNodes) {
        if (!existingNodeIds.has(node.id)) {
          nodesToLabel.push(node);
        }
      }
    }

    const nodeLabel = g
      .append("g")
      .attr("class", "node-labels")
      .selectAll<SVGTextElement, Node>("text")
      .data(nodesToLabel)
      .join("text")
      .attr("dy", (d) => nodeSize(d) + 12)
      .attr("text-anchor", "middle")
      .attr("font-size", "8px") // Smaller font
      .text((d) => d.name)
      .style("pointer-events", "none")
      .style("opacity", showLabels ? 0.9 : 0)
      .attr("fill", (d) =>
        highlightedNodeIds.has(d.id) ? "#1e293b" : "#64748b",
      ); // Darker for highlighted

    // Add a subtle text shadow for better visibility
    nodeLabel
      .attr("stroke", "white")
      .attr("stroke-width", 0.3)
      .attr("paint-order", "stroke");

    function ticked() {
      link
        .attr("x1", (d) => {
          const source = typeof d.source === "string" ? { x: 0 } : d.source;
          return source.x || 0;
        })
        .attr("y1", (d) => {
          const source = typeof d.source === "string" ? { y: 0 } : d.source;
          return source.y || 0;
        })
        .attr("x2", (d) => {
          const target = typeof d.target === "string" ? { x: 0 } : d.target;
          return target.x || 0;
        })
        .attr("y2", (d) => {
          const target = typeof d.target === "string" ? { y: 0 } : d.target;
          return target.y || 0;
        });

      linkLabel
        .attr("x", (d) => {
          const source = typeof d.source === "string" ? { x: 0 } : d.source;
          const target = typeof d.target === "string" ? { x: 0 } : d.target;
          return ((source.x || 0) + (target.x || 0)) / 2;
        })
        .attr("y", (d) => {
          const source = typeof d.source === "string" ? { y: 0 } : d.source;
          const target = typeof d.target === "string" ? { y: 0 } : d.target;
          return ((source.y || 0) + (target.y || 0)) / 2;
        });

      node.attr("cx", (d) => d.x || 0).attr("cy", (d) => d.y || 0);

      nodeLabel.attr("x", (d) => d.x || 0).attr("y", (d) => d.y || 0);

      // Update node borders
      g.selectAll<SVGCircleElement, Node>(".node-borders circle")
        .attr("cx", (d) => d.x || 0)
        .attr("cy", (d) => d.y || 0);

      // Update node highlights if they exist
      g.selectAll<SVGCircleElement, Node>(".node-highlights circle")
        .attr("cx", (d) => d.x || 0)
        .attr("cy", (d) => d.y || 0);
    }

    function dragstarted(event: D3DragEvent) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: D3DragEvent) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: D3DragEvent) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    // Update visibility of labels when showLabels changes
    if (showLabels) {
      nodeLabel.style("opacity", 0.9);
      linkLabel.style("opacity", 0.6);
    } else {
      nodeLabel.style("opacity", 0);
      linkLabel.style("opacity", 0);
    }

    // Run simulation for a bit to get a better starting position
    const simulationIterations = layoutMode === "force" ? 200 : 100;
    for (let i = 0; i < simulationIterations; ++i) simulation.tick();
    ticked();

    // Heat the simulation initially to better organize the nodes
    // More heat for force-directed layout
    const initialAlpha = layoutMode === "force" ? 0.8 : 0.5;
    simulation.alpha(initialAlpha).restart();

    return () => {
      simulation.stop();
    };
  }, [
    data,
    showLabels,
    zoomLevel,
    onNodeClick,
    onLinkClick,
    highlightedNodeIds,
    layoutMode,
  ]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom<SVGSVGElement, unknown>();
    svg.call((selection) =>
      zoom.transform(selection, d3.zoomIdentity.scale(zoomLevel)),
    );
  }, [zoomLevel]);

  return <svg ref={svgRef} width="100%" height="100%" />;
}
