import { unpack } from 'msgpackr';
import type { KnowledgeGraph, SerializableGraph } from '@/core/types';
import { GAI_MAGIC } from '@/core/constants';
import { fromSerializable } from '@/core/graph/graph-store';

export interface GaiHeader {
  version: number;
  nodeCount: number;
  directedEdgeCount: number;
  undirectedEdgeCount: number;
  levels: number;
  name: string;
  id: string;
}

export function readGai(buffer: Buffer): { graph: KnowledgeGraph; header: GaiHeader } {
  // Verify magic bytes
  for (let i = 0; i < GAI_MAGIC.length; i++) {
    if (buffer[i] !== GAI_MAGIC[i]) {
      throw new Error('Invalid .gai file: magic bytes mismatch');
    }
  }

  // Read header length
  const headerLen = buffer.readUInt32BE(4);

  // Read and unpack header
  const headerBuf = buffer.subarray(8, 8 + headerLen);
  const header = unpack(headerBuf) as GaiHeader;

  // Read body (from after header to 4 bytes before end for checksum)
  const bodyBuf = buffer.subarray(8 + headerLen, buffer.length - 4);
  const body = unpack(bodyBuf) as {
    nodes: SerializableGraph['nodes'];
    directedEdges: SerializableGraph['directedEdges'];
    undirectedEdges: SerializableGraph['undirectedEdges'];
    metadata: SerializableGraph['metadata'];
  };

  // Verify checksum
  const storedChecksum = buffer.readUInt32BE(buffer.length - 4);
  let computedChecksum = 0;
  for (const byte of headerBuf) computedChecksum = (computedChecksum + byte) & 0xffffffff;
  for (const byte of bodyBuf) computedChecksum = (computedChecksum + byte) & 0xffffffff;

  if (storedChecksum !== computedChecksum) {
    throw new Error('Invalid .gai file: checksum mismatch');
  }

  const serializable: SerializableGraph = {
    id: header.id,
    name: header.name,
    nodes: body.nodes,
    directedEdges: body.directedEdges,
    undirectedEdges: body.undirectedEdges,
    levels: header.levels,
    metadata: body.metadata,
  };

  return {
    graph: fromSerializable(serializable),
    header,
  };
}
