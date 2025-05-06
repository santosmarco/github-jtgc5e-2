"use client";

import { Info, RefreshCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Slider } from "~/components/ui/slider";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useProfile } from "~/hooks/use-profile";
import { api } from "~/trpc/react";

import ForceGraph, { type ForceGraphLink } from "./force-graph";

// Define constants for dropdown values to improve type safety
const DisplayLimitMode = {
  ALL: "all",
  CONNECTED: "connected",
  TOP: "top",
} as const;
type DisplayLimitModeValue =
  (typeof DisplayLimitMode)[keyof typeof DisplayLimitMode];

const LayoutMode = {
  CLUSTERED: "clustered",
  RADIAL: "radial",
  FORCE: "force",
} as const;
type LayoutModeValue = (typeof LayoutMode)[keyof typeof LayoutMode];

// Define the data structure
interface Node {
  id: string;
  name: string;
  type: string;
  descriptions?: string[];
  observations?: string[];
  meetingIds?: string[];
}

interface Link {
  id: string;
  source: Node;
  target: Node;
  type: string;
  meetingId?: string;
  observations?: string[];
}

// Define raw data structures from API that might have string IDs for source/target
interface RawLink {
  id: string;
  source: string | Node;
  target: string | Node;
  type: string;
  meetingId?: string;
  observations?: string[];
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface RawGraphData {
  nodes: Node[];
  links: RawLink[];
}

// Empty data for initial state
const emptyData: GraphData = {
  nodes: [],
  links: [],
};

// Selection details panel component
interface SelectionDetailsPanelProps {
  selectedNode: Node | null;
  selectedLink: Link | null;
  selectedTab: "entities" | "relationships";
  setSelectedTab: (tab: "entities" | "relationships") => void;
}

function SelectionDetailsPanel({
  selectedNode,
  selectedLink,
  selectedTab,
  setSelectedTab,
}: SelectionDetailsPanelProps) {
  // Function to render meeting links
  const renderMeetingLinks = (meetingIds?: string[]) => {
    if (!meetingIds || meetingIds.length === 0) return null;

    return (
      <div className="mt-3 space-y-1">
        <h4 className="text-xs font-medium text-muted-foreground">
          Related Meetings:
        </h4>
        <div className="flex flex-wrap gap-2">
          {meetingIds.map((id) => (
            <a
              key={id}
              href={`/meetings/${id}`}
              className="text-xs text-blue-500 hover:underline"
            >
              Meeting {id.substring(0, 6)}
            </a>
          ))}
        </div>
      </div>
    );
  };

  // Function to render observations
  const renderObservations = (observations?: string[]) => {
    if (!observations || observations.length === 0) return null;

    return (
      <div className="mt-3">
        <h4 className="text-xs font-medium text-muted-foreground">
          Observations:
        </h4>
        <ul className="mt-1 space-y-2">
          {observations.map((observation, index) => {
            // Create a deterministic key from observation content
            const observationKey = `obs-${observation.substring(0, 20).replace(/\s+/g, "-")}-${index}`;
            return (
              <li
                key={observationKey}
                className="text-xs text-muted-foreground"
              >
                &bull; {observation}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  if (!selectedNode && !selectedLink) return null;

  return (
    <div className="mt-4">
      <Tabs
        value={selectedTab}
        onValueChange={(value) =>
          setSelectedTab(value as "entities" | "relationships")
        }
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="entities" disabled={!selectedNode}>
            Entity
          </TabsTrigger>
          <TabsTrigger value="relationships" disabled={!selectedLink}>
            Relationship
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entities" className="mt-2">
          {selectedNode && (
            <div className="rounded-md border bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{selectedNode.name}</h3>
                <Badge>{selectedNode.type}</Badge>
              </div>

              {selectedNode.descriptions &&
                selectedNode.descriptions.length > 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedNode.descriptions[0]}
                  </p>
                )}

              {renderObservations(selectedNode.observations)}
              {renderMeetingLinks(selectedNode.meetingIds)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="relationships" className="mt-2">
          {selectedLink && (
            <div className="rounded-md border bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  {selectedLink.source.name}
                  {" → "}
                  {selectedLink.target.name}
                </h3>
                <Badge>{selectedLink.type}</Badge>
              </div>

              {renderObservations(selectedLink.observations)}

              {selectedLink.meetingId && (
                <div className="mt-3">
                  <a
                    href={`/meetings/${selectedLink.meetingId}`}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    View related meeting
                  </a>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Graph Controls Panel component
interface GraphControlsPanelProps {
  entityTypes: string[];
  relationshipTypes: string[];
  selectedEntityType: string;
  setSelectedEntityType: (type: string) => void;
  selectedRelationshipType: string;
  setSelectedRelationshipType: (type: string) => void;
  showLabels: boolean;
  setShowLabels: (show: boolean) => void;
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  layoutMode: LayoutModeValue;
  setLayoutMode: (mode: LayoutModeValue) => void;
  displayLimitMode: DisplayLimitModeValue;
  setDisplayLimitMode: (mode: DisplayLimitModeValue) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleRelayout: () => void;
  isLoading: boolean;
}

function GraphControlsPanel({
  entityTypes,
  relationshipTypes,
  selectedEntityType,
  setSelectedEntityType,
  selectedRelationshipType,
  setSelectedRelationshipType,
  showLabels,
  setShowLabels,
  zoomLevel,
  setZoomLevel,
  layoutMode,
  setLayoutMode,
  displayLimitMode,
  setDisplayLimitMode,
  searchTerm,
  setSearchTerm,
  handleRelayout,
  isLoading,
}: GraphControlsPanelProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const handleZoomIn = () => {
    setZoomLevel(Math.min(zoomLevel + 0.2, 2.5));
  };

  const handleZoomOut = () => {
    setZoomLevel(Math.max(zoomLevel - 0.2, 0.5));
  };

  const handleSliderChange = (value: number[]) => {
    if (value.length > 0 && typeof value[0] === "number") {
      setZoomLevel(value[0] / 100 || 1);
    }
  };

  return (
    <CardContent className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="search-entities">Search Entities</Label>
        <div className="flex space-x-2">
          <Input
            id="search-entities"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search by name or description"
            className="flex-1"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearSearch}
              className="h-10 w-10"
            >
              <span className="sr-only">Clear search</span>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="entity-type">Entity Type</Label>
        <Select
          value={selectedEntityType}
          onValueChange={setSelectedEntityType}
          disabled={isLoading}
        >
          <SelectTrigger id="entity-type">
            <SelectValue placeholder="Select entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {entityTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="relationship-type">Relationship Type</Label>
        <Select
          value={selectedRelationshipType}
          onValueChange={setSelectedRelationshipType}
          disabled={isLoading}
        >
          <SelectTrigger id="relationship-type">
            <SelectValue placeholder="Select relationship type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Relationships</SelectItem>
            {relationshipTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label>Display Limit</Label>
        <Select
          value={displayLimitMode}
          onValueChange={(value) =>
            setDisplayLimitMode(value as DisplayLimitModeValue)
          }
          disabled={isLoading}
        >
          <SelectTrigger id="display-limit">
            <SelectValue placeholder="Display limit mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DisplayLimitMode.ALL}>
              Show All Entities
            </SelectItem>
            <SelectItem value={DisplayLimitMode.CONNECTED}>
              Only Connected Entities
            </SelectItem>
            <SelectItem value={DisplayLimitMode.TOP}>
              Top 100 Most Connected
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>Display Options</Label>

        <div className="flex items-center space-x-2">
          <Switch
            id="show-labels"
            checked={showLabels}
            onCheckedChange={setShowLabels}
            disabled={isLoading}
          />
          <Label htmlFor="show-labels">Show Labels</Label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Zoom</Label>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomOut}
                className="h-8 w-8"
                disabled={isLoading}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomIn}
                className="h-8 w-8"
                disabled={isLoading}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Slider
            value={[zoomLevel * 100]}
            min={50}
            max={250}
            step={10}
            onValueChange={handleSliderChange}
            disabled={isLoading}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label>Layout</Label>
        <Select
          value={layoutMode}
          onValueChange={(value) => setLayoutMode(value as LayoutModeValue)}
          disabled={isLoading}
        >
          <SelectTrigger id="layout-mode">
            <SelectValue placeholder="Layout mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={LayoutMode.CLUSTERED}>
              Clustered by Type
            </SelectItem>
            <SelectItem value={LayoutMode.RADIAL}>Radial Layout</SelectItem>
            <SelectItem value={LayoutMode.FORCE}>Force-Directed</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={handleRelayout}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reorganize
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Apply a new layout to the graph</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </CardContent>
  );
}

export default function KnowledgeGraph() {
  const { profile } = useProfile();
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<string[]>([]);
  const [selectedEntityType, setSelectedEntityType] = useState<string>("all");
  const [selectedRelationshipType, setSelectedRelationshipType] =
    useState<string>("all");
  const [showLabels, setShowLabels] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [filteredData, setFilteredData] = useState<GraphData>(emptyData);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [selectedTab, setSelectedTab] = useState<"entities" | "relationships">(
    "entities",
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [displayLimitMode, setDisplayLimitMode] =
    useState<DisplayLimitModeValue>(DisplayLimitMode.ALL);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(
    new Set(),
  );
  const [layoutMode, setLayoutMode] = useState<LayoutModeValue>(
    LayoutMode.CLUSTERED,
  );

  // Fetch knowledge graph data from API
  const { data: graphData, isLoading } =
    api.entities.getKnowledgeGraph.useQuery(
      { profileId: profile?.id || "" },
      { enabled: !!profile?.id },
    );

  // Extract entity and relationship types when data is loaded
  useEffect(() => {
    if (!graphData) return;

    const entityTypeSet = new Set<string>();
    const relationshipTypeSet = new Set<string>();

    for (const node of graphData.nodes) {
      entityTypeSet.add(node.type);
    }

    for (const link of graphData.links) {
      relationshipTypeSet.add(link.type);
    }

    setEntityTypes(Array.from(entityTypeSet));
    setRelationshipTypes(Array.from(relationshipTypeSet));
  }, [graphData]);

  // Create a memoized filter function
  const filterData = useCallback(() => {
    if (!graphData) return;

    let filteredNodes = [...graphData.nodes];

    // Create a map of node IDs to node objects for quick lookup
    const nodeMap = new Map<string, Node>();
    for (const node of filteredNodes) {
      nodeMap.set(node.id, node);
    }

    // Process links to ensure source and target are Node objects
    const processedLinks: Link[] = [];

    for (const link of graphData.links) {
      // Extract the source and target IDs correctly
      const sourceId =
        typeof link.source === "string" ? link.source : link.source?.id;

      const targetId =
        typeof link.target === "string" ? link.target : link.target?.id;

      // If we have valid source and target IDs and nodes
      if (sourceId && targetId) {
        const sourceNode = nodeMap.get(sourceId);
        const targetNode = nodeMap.get(targetId);

        // Only include links where both nodes exist
        if (sourceNode && targetNode) {
          processedLinks.push({
            ...link,
            source: sourceNode,
            target: targetNode,
          } as Link);
        }
      }
    }

    let filteredLinks = [...processedLinks];

    // Apply search filter if provided
    if (searchTerm) {
      const normalizedSearchTerm = searchTerm.toLowerCase();
      // First filter nodes that match the search term
      filteredNodes = filteredNodes.filter(
        (node) =>
          node.name.toLowerCase().includes(normalizedSearchTerm) ||
          node.descriptions?.some((desc) =>
            desc.toLowerCase().includes(normalizedSearchTerm),
          ) ||
          node.observations?.some((obs) =>
            obs.toLowerCase().includes(normalizedSearchTerm),
          ),
      );

      // Create a set of node IDs that match the search
      const searchMatchNodeIds = new Set(filteredNodes.map((node) => node.id));

      // Now find any direct connections to the matched nodes
      const connectedNodes = new Set<string>(searchMatchNodeIds);

      // Add directly connected nodes if in "connected" mode
      if (displayLimitMode === DisplayLimitMode.CONNECTED) {
        for (const link of processedLinks) {
          if (searchMatchNodeIds.has(link.source.id)) {
            connectedNodes.add(link.target.id);
          }
          if (searchMatchNodeIds.has(link.target.id)) {
            connectedNodes.add(link.source.id);
          }
        }

        // Update filtered nodes to include connected nodes
        filteredNodes = graphData.nodes.filter((node) =>
          connectedNodes.has(node.id),
        );
      }

      // Update highlighted nodes
      setHighlightedNodeIds(searchMatchNodeIds);

      // Filter links to only those connecting filtered nodes
      const nodeIds = new Set(filteredNodes.map((node) => node.id));
      filteredLinks = processedLinks.filter(
        (link) => nodeIds.has(link.source.id) && nodeIds.has(link.target.id),
      );
    } else {
      setHighlightedNodeIds(new Set());
    }

    // Filter nodes by entity type
    if (selectedEntityType !== "all") {
      filteredNodes = filteredNodes.filter(
        (node) => node.type === selectedEntityType,
      );
      // Only keep links where both source and target nodes are in the filtered nodes
      const nodeIds = new Set(filteredNodes.map((node) => node.id));
      filteredLinks = filteredLinks.filter(
        (link) => nodeIds.has(link.source.id) && nodeIds.has(link.target.id),
      );
    }

    // Filter links by relationship type
    if (selectedRelationshipType !== "all") {
      filteredLinks = filteredLinks.filter(
        (link) => link.type === selectedRelationshipType,
      );

      // Only keep nodes that are connected by the filtered links
      const connectedNodeIds = new Set<string>();
      for (const link of filteredLinks) {
        connectedNodeIds.add(link.source.id);
        connectedNodeIds.add(link.target.id);
      }

      filteredNodes = filteredNodes.filter((node) =>
        connectedNodeIds.has(node.id),
      );
    }

    // Check if we need to limit display by top connected nodes
    if (
      displayLimitMode === DisplayLimitMode.TOP &&
      filteredNodes.length > 100
    ) {
      // Optimized connection count calculation
      const connectionCounts = new Map<string, number>();
      for (const node of filteredNodes) {
        connectionCounts.set(node.id, 0);
      }

      // Count connections for each node
      for (const link of filteredLinks) {
        connectionCounts.set(
          link.source.id,
          (connectionCounts.get(link.source.id) || 0) + 1,
        );
        connectionCounts.set(
          link.target.id,
          (connectionCounts.get(link.target.id) || 0) + 1,
        );
      }

      // Create node-connection pairs for sorting
      const nodeConnectionCounts = filteredNodes.map((node) => ({
        node,
        connections: connectionCounts.get(node.id) || 0,
      }));

      // Sort and get top 100 most connected nodes
      const topConnectedNodes = nodeConnectionCounts
        .sort((a, b) => b.connections - a.connections)
        .slice(0, 100)
        .map((item) => item.node);

      // Update filtered nodes
      filteredNodes = topConnectedNodes;

      // Update filtered links
      const topNodeIds = new Set(topConnectedNodes.map((node) => node.id));
      filteredLinks = filteredLinks.filter(
        (link) =>
          topNodeIds.has(link.source.id) && topNodeIds.has(link.target.id),
      );
    }

    setFilteredData({
      nodes: filteredNodes,
      links: filteredLinks,
    });
  }, [
    graphData,
    selectedEntityType,
    selectedRelationshipType,
    searchTerm,
    displayLimitMode,
  ]);

  // Apply filters whenever dependencies change
  useEffect(() => {
    filterData();
  }, [filterData]);

  const handleNodeClick = (node: Node) => {
    setSelectedNode(node);
    setSelectedLink(null);
    setSelectedTab("entities");
  };

  const handleLinkClick = (link: ForceGraphLink) => {
    // We need to ensure the link is properly typed with our local Link interface
    // The link from ForceGraph might have source/target as string | Node
    if (typeof link.source === "string" || typeof link.target === "string") {
      return; // Skip if not Node objects
    }

    setSelectedLink(link as Link);
    setSelectedNode(null);
    setSelectedTab("relationships");
  };

  const handleRelayout = () => {
    // Force a complete re-rendering of the graph with new layout
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Knowledge Graph</CardTitle>
          <CardDescription>
            Explore relationships between entities in your meetings
          </CardDescription>
        </CardHeader>

        <GraphControlsPanel
          entityTypes={entityTypes}
          relationshipTypes={relationshipTypes}
          selectedEntityType={selectedEntityType}
          setSelectedEntityType={setSelectedEntityType}
          selectedRelationshipType={selectedRelationshipType}
          setSelectedRelationshipType={setSelectedRelationshipType}
          showLabels={showLabels}
          setShowLabels={setShowLabels}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
          displayLimitMode={displayLimitMode}
          setDisplayLimitMode={setDisplayLimitMode}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          handleRelayout={handleRelayout}
          isLoading={isLoading}
        />

        <CardContent>
          <SelectionDetailsPanel
            selectedNode={selectedNode}
            selectedLink={selectedLink}
            selectedTab={selectedTab}
            setSelectedTab={setSelectedTab}
          />
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Knowledge Graph Visualization</CardTitle>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              {isLoading ? (
                "Loading entity data..."
              ) : (
                <>
                  {filteredData.nodes.length} entities /{" "}
                  {filteredData.links.length} relationships
                </>
              )}
            </div>
          </div>
          <CardDescription>
            Drag nodes to reposition them. Click on entities or relationships
            for details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[700px] overflow-hidden rounded-md border bg-background">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">
                  Loading knowledge graph data...
                </p>
              </div>
            ) : filteredData.nodes.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">
                  No entity data available for the current filters
                </p>
              </div>
            ) : (
              <ForceGraph
                key={`graph-${refreshKey}-${layoutMode}`}
                data={filteredData}
                showLabels={showLabels}
                zoomLevel={zoomLevel}
                onNodeClick={handleNodeClick}
                onLinkClick={handleLinkClick}
                highlightedNodeIds={highlightedNodeIds}
                layoutMode={layoutMode}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
