// graphAI Core Type Definitions
// All TypeScript interfaces that define the dual-graph knowledge model

export type NodeId = string;
export type EdgeId = string;

// --- Node Types ---

export type NodeType =
  | 'fact'
  | 'concept'
  | 'entity'
  | 'event'
  | 'definition'
  | 'claim'
  | 'data-point'
  | 'section'
  | 'document';

export interface SourceReference {
  file: string;
  offset: number;
  line?: number;
  section?: string;
}

export interface GraphNode {
  id: NodeId;
  content: string;
  contentHash: string;
  type: NodeType;
  source: SourceReference;
  entities: string[];
  metadata: Record<string, string | number>;
  level: number; // Hierarchy level (0 = leaf, 1+ = summary)
  confidence: number; // 0-1, extraction confidence
}

// --- Edge Types ---

export type DirectedEdgeType =
  | 'causes'
  | 'depends-on'
  | 'precedes'
  | 'contains'
  | 'defines'
  | 'cites'
  | 'contradicts'
  | 'supports';

export type UndirectedEdgeType =
  | 'similar-to'
  | 'co-occurs'
  | 'shares-entity'
  | 'shares-topic'
  | 'same-source';

export interface DirectedEdge {
  id: EdgeId;
  from: NodeId;
  to: NodeId;
  type: DirectedEdgeType;
  weight: number; // 0-1
  evidence?: string;
}

export interface UndirectedEdge {
  id: EdgeId;
  nodes: [NodeId, NodeId];
  type: UndirectedEdgeType;
  weight: number; // 0-1
}

// --- Graph ---

export interface GraphMetadata {
  createdAt: number;
  updatedAt: number;
  sourceFiles: string[];
  nodeCount: number;
  directedEdgeCount: number;
  undirectedEdgeCount: number;
  version: number;
}

export interface KnowledgeGraph {
  id: string;
  name: string;
  nodes: Map<NodeId, GraphNode>;
  directedEdges: Map<EdgeId, DirectedEdge>;
  undirectedEdges: Map<EdgeId, UndirectedEdge>;
  levels: number;
  metadata: GraphMetadata;
}

// --- Serializable versions (for .gai format and JSON transport) ---

export interface SerializableGraph {
  id: string;
  name: string;
  nodes: Array<GraphNode>;
  directedEdges: Array<DirectedEdge>;
  undirectedEdges: Array<UndirectedEdge>;
  levels: number;
  metadata: GraphMetadata;
}

// --- Pipeline Types ---

export type PipelineStage =
  | 'ingestion'
  | 'extraction'
  | 'graph-construction'
  | 'optimization'
  | 'serialization';

export interface PipelineEvent {
  stage: PipelineStage;
  progress: number; // 0-100
  message: string;
  timestamp: number;
}

export interface ParsedDocument {
  title: string;
  sections: ParsedSection[];
  sourceFile: string;
  metadata: Record<string, string | number>;
}

export interface ParsedSection {
  title: string;
  content: string;
  depth: number;
  children: ParsedSection[];
}

// --- Extraction Types ---

export interface ExtractedChunk {
  content: string;
  type: NodeType;
  source: SourceReference;
  entities: string[];
  metadata: Record<string, string | number>;
  parentId?: string; // For hierarchy
  order: number; // Sequential order within parent
  links: string[]; // Internal references/links found in the chunk
}

// --- Query Types ---

export interface QueryResult {
  answer: string;
  subgraph: SubgraphContext;
  seeds: Array<{ nodeId: NodeId; score: number }>;
}

export interface SubgraphContext {
  nodes: GraphNode[];
  directedEdges: DirectedEdge[];
  undirectedEdges: UndirectedEdge[];
  serialized: string; // The prompt-ready text format
}

// --- TF-IDF Types ---

export interface TfidfIndex {
  documents: Map<NodeId, Map<string, number>>; // nodeId -> term -> tfidf weight
  idf: Map<string, number>; // term -> idf value
  documentCount: number;
}
