import * as cheerio from 'cheerio';
import type { ParsedDocument, ParsedSection } from '@/core/types';

export function parseHtml(html: string, sourceFile: string): ParsedDocument {
  const $ = cheerio.load(html);

  // Remove script, style, nav, footer elements
  $('script, style, nav, footer, header, aside, .sidebar, .nav').remove();

  const title = $('h1').first().text().trim() || $('title').text().trim() || sourceFile;

  const sections = extractSections($);

  return {
    title,
    sections,
    sourceFile,
    metadata: {
      source: 'html',
    },
  };
}

function extractSections($: cheerio.CheerioAPI): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const body = $('main, article, .content, .docs-content, body').first();

  // Collect elements into a flat array first, then process outside the callback
  const elements: Array<{ tagName: string; text: string }> = [];
  body.children().each((_, el) => {
    const tagName = (el as { tagName?: string }).tagName?.toLowerCase() || '';
    const text = $(el).text().trim();
    if (text) elements.push({ tagName, text });
  });

  let currentTitle = '';
  let currentDepth = 1;
  let contentParts: string[] = [];

  for (const { tagName, text } of elements) {
    if (/^h[1-6]$/.test(tagName)) {
      // Save previous section
      if (currentTitle && contentParts.length > 0) {
        sections.push({
          title: currentTitle,
          content: contentParts.join('\n\n').trim(),
          depth: currentDepth,
          children: [],
        });
      }
      currentTitle = text;
      currentDepth = parseInt(tagName[1]);
      contentParts = [];
    } else if (tagName === 'pre' || tagName === 'code') {
      contentParts.push('```\n' + text + '\n```');
    } else {
      contentParts.push(text);
    }
  }

  // Save last section
  if (currentTitle && contentParts.length > 0) {
    sections.push({
      title: currentTitle,
      content: contentParts.join('\n\n').trim(),
      depth: currentDepth,
      children: [],
    });
  } else if (contentParts.length > 0) {
    sections.push({
      title: 'Content',
      content: contentParts.join('\n\n').trim(),
      depth: 1,
      children: [],
    });
  }

  return sections;
}
