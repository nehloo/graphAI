import type { ExtractedChunk, ParsedDocument, ParsedSection, NodeType } from '@/core/types';
import { MIN_CHUNK_LENGTH, MAX_CHUNK_LENGTH, MAX_CHUNK_SENTENCES } from '@/core/constants';
import { extractEntities } from './entity-extractor';

export function chunkDocument(doc: ParsedDocument): ExtractedChunk[] {
  const chunks: ExtractedChunk[] = [];
  let order = 0;

  // Create a document-level chunk
  const docChunkId = `doc:${doc.sourceFile}`;
  chunks.push({
    content: doc.title,
    type: 'document',
    source: { file: doc.sourceFile, offset: 0 },
    entities: extractEntities(doc.title),
    metadata: { ...doc.metadata, title: doc.title },
    order: order++,
    links: [],
  });

  // Process each section recursively
  for (const section of doc.sections) {
    chunkSection(section, chunks, doc.sourceFile, docChunkId, order);
    order = chunks.length;
  }

  return chunks;
}

function chunkSection(
  section: ParsedSection,
  chunks: ExtractedChunk[],
  sourceFile: string,
  parentId: string,
  startOrder: number
): void {
  let order = startOrder;

  // Section header as a node
  const sectionId = `section:${sourceFile}:${section.title}`;
  chunks.push({
    content: section.title,
    type: 'section',
    source: { file: sourceFile, offset: 0, section: section.title },
    entities: extractEntities(section.title),
    metadata: { depth: section.depth },
    parentId,
    order: order++,
    links: [],
  });

  // Split section content into chunks
  if (section.content.length > 0) {
    const textChunks = splitIntoChunks(section.content);
    for (const text of textChunks) {
      if (text.length < MIN_CHUNK_LENGTH) continue;

      const links = extractLinks(text);
      const entities = extractEntities(text);
      const type = classifyChunk(text);

      chunks.push({
        content: text,
        type,
        source: { file: sourceFile, offset: 0, section: section.title },
        entities,
        metadata: { sectionTitle: section.title },
        parentId: sectionId,
        order: order++,
        links,
      });
    }
  }

  // Recurse into children
  for (const child of section.children) {
    chunkSection(child, chunks, sourceFile, sectionId, order);
    order = chunks.length;
  }
}

function splitIntoChunks(text: string): string[] {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  const chunks: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length <= MAX_CHUNK_LENGTH) {
      chunks.push(paragraph.trim());
      continue;
    }

    // Split long paragraphs by sentences
    const sentences = splitSentences(paragraph);
    let current: string[] = [];

    for (const sentence of sentences) {
      current.push(sentence);
      if (current.length >= MAX_CHUNK_SENTENCES || current.join(' ').length > MAX_CHUNK_LENGTH) {
        chunks.push(current.join(' ').trim());
        current = [];
      }
    }
    if (current.length > 0) {
      chunks.push(current.join(' ').trim());
    }
  }

  return chunks;
}

function splitSentences(text: string): string[] {
  // Split on sentence boundaries, keeping the delimiter
  return text
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 0);
}

function classifyChunk(text: string): NodeType {
  const lower = text.toLowerCase();

  // Definition patterns
  if (/\b(is defined as|refers to|is a|is an|means)\b/.test(lower) && text.length < 200) {
    return 'definition';
  }

  // Event patterns (dates, years)
  if (/\b(in \d{4}|on \w+ \d{1,2}|founded|invented|created|launched|discovered)\b/.test(lower)) {
    return 'event';
  }

  // Data point patterns
  if (/\b(\d+%|\$[\d,.]+|[\d,.]+\s*(million|billion|thousand))\b/.test(lower)) {
    return 'data-point';
  }

  // Claim patterns
  if (/\b(according to|studies show|research suggests|it is believed)\b/.test(lower)) {
    return 'claim';
  }

  return 'fact';
}

function extractLinks(text: string): string[] {
  const links: string[] = [];

  // Markdown links: [text](url)
  const mdLinks = text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
  for (const match of mdLinks) {
    links.push(match[2]);
  }

  // Wiki-style links: [[article]]
  const wikiLinks = text.matchAll(/\[\[([^\]]+)\]\]/g);
  for (const match of wikiLinks) {
    links.push(match[1]);
  }

  return links;
}
