import wtf from 'wtf_wikipedia';
import type { ParsedDocument, ParsedSection } from '@/core/types';
import { WIKIPEDIA_ARTICLES } from './config';

export async function fetchWikipediaArticle(title: string): Promise<ParsedDocument | null> {
  try {
    const doc = await wtf.fetch(title);
    if (!doc) return null;

    const sections = doc.sections().map((s) => convertSection(s));

    return {
      title: doc.title() || title,
      sections,
      sourceFile: `wikipedia:${title}`,
      metadata: {
        source: 'wikipedia',
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
        categories: (doc.categories() || []).join(', '),
      },
    };
  } catch (err) {
    console.error(`Failed to fetch Wikipedia article: ${title}`, err);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertSection(section: any): ParsedSection {
  return {
    title: section.title() || 'Introduction',
    content: section.text() || '',
    depth: section.depth?.() || 0,
    children: (section.children?.() || []).map(convertSection),
  };
}

export async function fetchAllWikipediaArticles(
  onProgress?: (current: number, total: number, title: string) => void
): Promise<ParsedDocument[]> {
  const documents: ParsedDocument[] = [];
  const total = WIKIPEDIA_ARTICLES.length;

  for (let i = 0; i < total; i++) {
    const title = WIKIPEDIA_ARTICLES[i];
    onProgress?.(i + 1, total, title);

    const doc = await fetchWikipediaArticle(title);
    if (doc) {
      documents.push(doc);
    }

    // Rate limiting: be conservative with Wikipedia API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return documents;
}
