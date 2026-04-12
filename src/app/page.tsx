"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface GraphStats {
  nodeCount: number;
  directedEdgeCount: number;
  undirectedEdgeCount: number;
  nodesByType: Record<string, number>;
  directedEdgesByType: Record<string, number>;
  undirectedEdgesByType: Record<string, number>;
  sourceFiles: string[];
  name: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/graph?format=stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.stats) setStats(data.stats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted text-sm mt-1">
          Transform raw files into AI-optimized dual-graph knowledge representations
        </p>
      </div>

      {loading ? (
        <div className="text-muted text-sm">Loading...</div>
      ) : stats ? (
        <div className="space-y-6">
          <div className="text-sm text-muted">
            Active graph: <span className="text-foreground font-medium">{stats.name}</span>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Nodes" value={stats.nodeCount} />
            <StatCard label="Directed Edges" value={stats.directedEdgeCount} />
            <StatCard label="Undirected Edges" value={stats.undirectedEdgeCount} />
          </div>

          {/* Node types */}
          <div className="bg-surface rounded-lg border border-border p-4">
            <h3 className="text-sm font-medium mb-3">Node Types</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.nodesByType).map(([type, count]) => (
                <span
                  key={type}
                  className={`px-2 py-1 rounded text-xs font-mono node-${type}`}
                  style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                >
                  {type}: {count}
                </span>
              ))}
            </div>
          </div>

          {/* Edge types */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface rounded-lg border border-border p-4">
              <h3 className="text-sm font-medium mb-3">Directed Edge Types</h3>
              <div className="space-y-1">
                {Object.entries(stats.directedEdgesByType).map(([type, count]) => (
                  <div key={type} className="flex justify-between text-xs font-mono">
                    <span className="text-muted">{type}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-surface rounded-lg border border-border p-4">
              <h3 className="text-sm font-medium mb-3">Undirected Edge Types</h3>
              <div className="space-y-1">
                {Object.entries(stats.undirectedEdgesByType).map(([type, count]) => (
                  <div key={type} className="flex justify-between text-xs font-mono">
                    <span className="text-muted">{type}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-3">
            <Link
              href="/graph"
              className="px-4 py-2 bg-accent text-white text-sm rounded-md hover:bg-accent-light transition-colors"
            >
              View Graph
            </Link>
            <Link
              href="/chat"
              className="px-4 py-2 bg-surface-2 text-foreground text-sm rounded-md border border-border hover:bg-surface transition-colors"
            >
              Query Graph
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-lg border border-border p-8 text-center">
          <p className="text-muted mb-4">No graph loaded yet. Start by loading an example dataset.</p>
          <Link
            href="/examples"
            className="px-4 py-2 bg-accent text-white text-sm rounded-md hover:bg-accent-light transition-colors"
          >
            Load Example Dataset
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <div className="text-2xl font-bold font-mono">{value.toLocaleString()}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  );
}
