import { nanoid } from 'nanoid';
import type { DirectedEdge, DirectedEdgeType, ExtractedChunk } from '@/core/types';

export function buildDirectedEdges(chunks: ExtractedChunk[]): DirectedEdge[] {
  const edges: DirectedEdge[] = [];

  // Build index of chunks by parentId for hierarchy
  const childrenOf = new Map<string, ExtractedChunk[]>();
  for (const chunk of chunks) {
    if (chunk.parentId) {
      const siblings = childrenOf.get(chunk.parentId) || [];
      siblings.push(chunk);
      childrenOf.set(chunk.parentId, siblings);
    }
  }

  // Build index by content for cross-referencing
  const chunkByKey = new Map<string, ExtractedChunk>();
  for (const chunk of chunks) {
    const key = chunkKey(chunk);
    chunkByKey.set(key, chunk);
  }

  for (const chunk of chunks) {
    const key = chunkKey(chunk);

    // 1. Contains edges: parent → child
    if (chunk.parentId) {
      edges.push(createEdge(chunk.parentId, key, 'contains', 1.0));
    }

    // 2. Precedes edges: sequential chunks in same section
    if (chunk.parentId) {
      const siblings = childrenOf.get(chunk.parentId) || [];
      const idx = siblings.findIndex(s => chunkKey(s) === key);
      if (idx > 0) {
        edges.push(createEdge(chunkKey(siblings[idx - 1]), key, 'precedes', 0.8));
      }
    }

    // 3. Cites edges: if chunk has links, create citation edges
    for (const link of chunk.links) {
      // Try to find a chunk that matches this link
      const target = findChunkByLink(chunks, link);
      if (target) {
        edges.push(createEdge(key, chunkKey(target), 'cites', 0.7));
      }
    }

    // 4. Defines edges: if a definition chunk, connect to chunks using that term
    if (chunk.type === 'definition') {
      const definedTerm = extractDefinedTerm(chunk.content);
      if (definedTerm) {
        for (const other of chunks) {
          if (other === chunk) continue;
          if (other.content.toLowerCase().includes(definedTerm.toLowerCase())) {
            edges.push(createEdge(key, chunkKey(other), 'defines', 0.6));
          }
        }
      }
    }
  }

  return edges;
}

function createEdge(from: string, to: string, type: DirectedEdgeType, weight: number): DirectedEdge {
  return {
    id: nanoid(),
    from,
    to,
    type,
    weight,
  };
}

export function chunkKey(chunk: ExtractedChunk): string {
  return `${chunk.source.file}:${chunk.type}:${chunk.order}`;
}

function findChunkByLink(chunks: ExtractedChunk[], link: string): ExtractedChunk | undefined {
  const linkLower = link.toLowerCase().replace(/_/g, ' ');
  // Try matching by title/content
  return chunks.find(c =>
    c.type === 'document' && c.content.toLowerCase() === linkLower
    || c.type === 'section' && c.content.toLowerCase() === linkLower
  );
}

function extractDefinedTerm(text: string): string | null {
  // "X is defined as..." / "X refers to..." / "X is a..."
  const patterns = [
    /^(.+?)\s+is\s+defined\s+as/i,
    /^(.+?)\s+refers?\s+to/i,
    /^(.+?)\s+is\s+(?:a|an|the)\s/i,
    /^(?:a|an|the)\s+(.+?)\s+is\s/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}
