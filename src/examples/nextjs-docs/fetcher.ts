import type { ParsedDocument } from '@/core/types';
import { parseMarkdown } from '@/core/ingestion/parsers/markdown-parser';
import { NEXTJS_DOC_FILES, NEXTJS_RAW_BASE } from './config';

export async function fetchNextjsDoc(filePath: string): Promise<ParsedDocument | null> {
  try {
    const url = `${NEXTJS_RAW_BASE}${filePath}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    let content = await res.text();

    // Strip MDX-specific syntax (imports, JSX components) so markdown parser works
    content = content
      .replace(/^import\s+.*$/gm, '') // Remove import statements
      .replace(/<[A-Z][a-zA-Z]*\s[^>]*\/>/g, '') // Remove self-closing JSX components
      .replace(/<[A-Z][a-zA-Z]*[^>]*>[\s\S]*?<\/[A-Z][a-zA-Z]*>/g, '') // Remove JSX blocks
      .replace(/\{\/\*.*?\*\/\}/g, '') // Remove JSX comments
      .replace(/^---[\s\S]*?---\n?/m, ''); // Remove frontmatter (already handled by parser)

    const doc = parseMarkdown(content, `nextjs-docs:${filePath}`);
    doc.metadata.source = 'nextjs-docs';
    doc.metadata.url = `https://nextjs.org/docs/${filePath.replace(/\.mdx?$/, '').replace(/\d+-/g, '')}`;

    return doc;
  } catch (err) {
    console.error(`Failed to fetch Next.js doc: ${filePath}`, err);
    return null;
  }
}

export async function fetchAllNextjsDocs(
  onProgress?: (current: number, total: number, title: string) => void
): Promise<ParsedDocument[]> {
  const documents: ParsedDocument[] = [];
  const total = NEXTJS_DOC_FILES.length;

  for (let i = 0; i < total; i++) {
    const filePath = NEXTJS_DOC_FILES[i];
    onProgress?.(i + 1, total, filePath);

    const doc = await fetchNextjsDoc(filePath);
    if (doc) {
      documents.push(doc);
    }

    // Be gentle with GitHub raw content
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return documents;
}
