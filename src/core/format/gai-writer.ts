import { pack } from 'msgpackr';
import type { KnowledgeGraph } from '@/core/types';
import { GAI_MAGIC, GAI_VERSION } from '@/core/constants';
import { toSerializable } from '@/core/graph/graph-store';

export function writeGai(graph: KnowledgeGraph): Buffer {
  const serializable = toSerializable(graph);

  const header = {
    version: GAI_VERSION,
    nodeCount: serializable.metadata.nodeCount,
    directedEdgeCount: serializable.metadata.directedEdgeCount,
    undirectedEdgeCount: serializable.metadata.undirectedEdgeCount,
    levels: serializable.levels,
    name: serializable.name,
    id: serializable.id,
  };

  const body = {
    nodes: serializable.nodes,
    directedEdges: serializable.directedEdges,
    undirectedEdges: serializable.undirectedEdges,
    metadata: serializable.metadata,
  };

  const headerBuf = pack(header);
  const bodyBuf = pack(body);

  // Compute simple checksum (sum of all bytes mod 2^32)
  let checksum = 0;
  for (const byte of headerBuf) checksum = (checksum + byte) & 0xffffffff;
  for (const byte of bodyBuf) checksum = (checksum + byte) & 0xffffffff;

  // Write header length as 4-byte big-endian
  const headerLenBuf = Buffer.alloc(4);
  headerLenBuf.writeUInt32BE(headerBuf.length, 0);

  // Write checksum as 4-byte big-endian
  const checksumBuf = Buffer.alloc(4);
  checksumBuf.writeUInt32BE(checksum, 0);

  return Buffer.concat([
    Buffer.from(GAI_MAGIC),
    headerLenBuf,
    headerBuf,
    bodyBuf,
    checksumBuf,
  ]);
}
