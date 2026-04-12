import type { ParsedDocument, ParsedSection } from '@/core/types';
import { ARXIV_PAPERS } from './config';

// Fetch arXiv paper abstract + metadata via the arXiv API (Atom XML)
// We use abstracts instead of full PDFs for the PoC (faster, no PDF parsing needed)
export async function fetchArxivPaper(
  paperId: string,
  expectedTitle: string
): Promise<ParsedDocument | null> {
  try {
    const url = `http://export.arxiv.org/api/query?id_list=${paperId}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const xml = await res.text();
    const entry = parseArxivEntry(xml);
    if (!entry) return null;

    const sections: ParsedSection[] = [];

    // Title section
    sections.push({
      title: 'Title',
      content: entry.title,
      depth: 1,
      children: [],
    });

    // Authors section
    if (entry.authors.length > 0) {
      sections.push({
        title: 'Authors',
        content: entry.authors.join(', '),
        depth: 1,
        children: [],
      });
    }

    // Abstract section (the main content)
    sections.push({
      title: 'Abstract',
      content: entry.abstract,
      depth: 1,
      children: [],
    });

    // Categories
    if (entry.categories.length > 0) {
      sections.push({
        title: 'Categories',
        content: entry.categories.join(', '),
        depth: 1,
        children: [],
      });
    }

    return {
      title: entry.title || expectedTitle,
      sections,
      sourceFile: `arxiv:${paperId}`,
      metadata: {
        source: 'arxiv',
        arxivId: paperId,
        url: `https://arxiv.org/abs/${paperId}`,
        published: entry.published,
        authors: entry.authors.join(', '),
      },
    };
  } catch (err) {
    console.error(`Failed to fetch arXiv paper: ${paperId}`, err);
    return null;
  }
}

interface ArxivEntry {
  title: string;
  abstract: string;
  authors: string[];
  published: string;
  categories: string[];
}

function parseArxivEntry(xml: string): ArxivEntry | null {
  // Simple XML parsing (avoid heavy XML parser dependency)
  const getTag = (tag: string, source: string): string => {
    const match = source.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
    return match ? match[1].trim() : '';
  };

  const getAllTags = (tag: string, source: string): string[] => {
    const matches = source.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'g'));
    return Array.from(matches).map(m => m[1].trim());
  };

  const entry = getTag('entry', xml);
  if (!entry) return null;

  const title = getTag('title', entry).replace(/\s+/g, ' ');
  const abstract = getTag('summary', entry).replace(/\s+/g, ' ');
  const published = getTag('published', entry);

  // Authors
  const authorBlocks = entry.match(/<author>[\s\S]*?<\/author>/g) || [];
  const authors = authorBlocks.map(block => getTag('name', block));

  // Categories
  const categoryMatches = entry.matchAll(/category[^>]*term="([^"]+)"/g);
  const categories = Array.from(categoryMatches).map(m => m[1]);

  return { title, abstract, authors, published, categories };
}

export async function fetchAllArxivPapers(
  onProgress?: (current: number, total: number, title: string) => void
): Promise<ParsedDocument[]> {
  const documents: ParsedDocument[] = [];
  const total = ARXIV_PAPERS.length;

  for (let i = 0; i < total; i++) {
    const paper = ARXIV_PAPERS[i];
    onProgress?.(i + 1, total, paper.title);

    const doc = await fetchArxivPaper(paper.id, paper.title);
    if (doc) {
      documents.push(doc);
    }

    // arXiv rate limit: max 1 request per 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  return documents;
}
