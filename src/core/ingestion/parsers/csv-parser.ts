import Papa from 'papaparse';
import type { ParsedDocument, ParsedSection } from '@/core/types';

export function parseCsv(content: string, sourceFile: string): ParsedDocument {
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  const headers = result.meta.fields || [];
  const rows = result.data as Record<string, unknown>[];

  // Create sections: one overview section + one section per logical group
  const sections: ParsedSection[] = [];

  // Overview section with schema info
  sections.push({
    title: 'Schema',
    content: `This dataset has ${rows.length} rows and ${headers.length} columns: ${headers.join(', ')}.`,
    depth: 1,
    children: [],
  });

  // Convert rows to readable text chunks (batch rows into groups of 10)
  const batchSize = 10;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const batchText = batch.map(row => {
      return headers
        .map(h => `${h}: ${row[h] ?? 'N/A'}`)
        .join(', ');
    }).join('\n');

    sections.push({
      title: `Rows ${i + 1}-${Math.min(i + batchSize, rows.length)}`,
      content: batchText,
      depth: 2,
      children: [],
    });
  }

  return {
    title: sourceFile.replace(/\.(csv|tsv)$/i, ''),
    sections,
    sourceFile,
    metadata: {
      source: 'csv',
      rowCount: rows.length,
      columnCount: headers.length,
      columns: headers.join(', '),
    },
  };
}

export function parseJson(content: string, sourceFile: string): ParsedDocument {
  const data = JSON.parse(content);
  const sections: ParsedSection[] = [];

  if (Array.isArray(data)) {
    // Array of objects — treat like CSV
    sections.push({
      title: 'Overview',
      content: `Array of ${data.length} items.`,
      depth: 1,
      children: [],
    });

    const batchSize = 10;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchText = batch.map((item: unknown) =>
        typeof item === 'object' && item !== null
          ? Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(', ')
          : String(item)
      ).join('\n');

      sections.push({
        title: `Items ${i + 1}-${Math.min(i + batchSize, data.length)}`,
        content: batchText,
        depth: 2,
        children: [],
      });
    }
  } else if (typeof data === 'object' && data !== null) {
    // Object — create sections from top-level keys
    for (const [key, value] of Object.entries(data)) {
      const content = typeof value === 'object'
        ? JSON.stringify(value, null, 2).slice(0, 1000)
        : String(value);

      sections.push({
        title: key,
        content,
        depth: 1,
        children: [],
      });
    }
  }

  return {
    title: sourceFile.replace(/\.json$/i, ''),
    sections,
    sourceFile,
    metadata: {
      source: 'json',
      type: Array.isArray(data) ? 'array' : 'object',
    },
  };
}
