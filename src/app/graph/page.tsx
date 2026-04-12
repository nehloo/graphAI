"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";

// react-force-graph-2d uses canvas/WebGL — must be client-only
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface GraphNode {
  id: string;
  label: string;
  type: string;
  entities: string[];
  level: number;
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
  weight: number;
  directed: boolean;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  stats: {
    nodeCount: number;
    directedEdgeCount: number;
    undirectedEdgeCount: number;
    nodesByType: Record<string, number>;
  };
}

const NODE_COLORS: Record<string, string> = {
  fact: "#60a5fa",
  concept: "#34d399",
  entity: "#fb923c",
  event: "#c084fc",
  definition: "#f472b6",
  claim: "#fbbf24",
  "data-point": "#22d3ee",
  section: "#94a3b8",
  document: "#e2e8f0",
};

export default function GraphPage() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    fetch("/api/graph")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    }
  }, [data]);

  const filteredData = useCallback(() => {
    if (!data || filter === "all") return data;

    const filteredNodes = data.nodes.filter((n) => n.type === filter);
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredLinks = data.links.filter(
      (l) => nodeIds.has(l.source as string) && nodeIds.has(l.target as string)
    );

    return { ...data, nodes: filteredNodes, links: filteredLinks };
  }, [data, filter]);

  if (loading) return <div className="text-muted text-sm">Loading graph...</div>;
  if (!data) {
    return (
      <div className="text-muted text-sm">
        No graph loaded. Go to{" "}
        <a href="/examples" className="text-accent underline">
          Examples
        </a>{" "}
        to load a dataset.
      </div>
    );
  }

  const graphData = filteredData();

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Graph Visualization</h1>
          <p className="text-muted text-xs mt-1">
            {data.stats.nodeCount} nodes, {data.stats.directedEdgeCount + data.stats.undirectedEdgeCount} edges
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-xs text-muted">Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-surface-2 border border-border rounded px-2 py-1 text-xs text-foreground"
          >
            <option value="all">All types</option>
            {Object.keys(data.stats.nodesByType || {}).map((type) => (
              <option key={type} value={type}>
                {type} ({(data.stats.nodesByType as Record<string, number>)[type]})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0" style={{ height: "calc(100% - 60px)" }}>
        {/* Graph canvas */}
        <div
          ref={containerRef}
          className="flex-1 bg-surface rounded-lg border border-border overflow-hidden"
        >
          {graphData && (
            <ForceGraph2D
              graphData={graphData}
              width={dimensions.width}
              height={dimensions.height}
              /* eslint-disable @typescript-eslint/no-explicit-any */
              nodeColor={(node: any) => NODE_COLORS[node.type] || "#666"}
              nodeRelSize={4}
              nodeLabel={(node: any) => `[${node.type}] ${node.label}`}
              linkColor={(link: any) =>
                link.directed ? "rgba(99,102,241,0.3)" : "rgba(148,163,184,0.2)"
              }
              linkDirectionalArrowLength={3}
              linkDirectionalArrowRelPos={1}
              linkWidth={(link: any) => link.weight * 2}
              onNodeClick={(node: any) => setSelected(node as GraphNode)}
              /* eslint-enable @typescript-eslint/no-explicit-any */
              backgroundColor="#141414"
              cooldownTicks={100}
            />
          )}
        </div>

        {/* Inspector panel */}
        <div className="w-72 bg-surface rounded-lg border border-border p-4 overflow-y-auto">
          <h3 className="text-sm font-medium mb-3">Node Inspector</h3>
          {selected ? (
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted">Type:</span>{" "}
                <span className={`node-${selected.type} font-medium`}>{selected.type}</span>
              </div>
              <div>
                <span className="text-muted">Content:</span>
                <p className="mt-1 text-foreground leading-relaxed">{selected.label}</p>
              </div>
              {selected.entities.length > 0 && (
                <div>
                  <span className="text-muted">Entities:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selected.entities.map((e, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded bg-surface-2 text-muted font-mono"
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted text-xs">Click a node to inspect it.</p>
          )}

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="text-xs text-muted mb-2">Node Colors</h4>
            <div className="space-y-1">
              {Object.entries(NODE_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-muted">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
