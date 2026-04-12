// Regex-based Named Entity Recognition
// Extracts: proper nouns, dates, numbers, technical terms, acronyms

export function extractEntities(text: string): string[] {
  const entities = new Set<string>();

  // Capitalized multi-word phrases (proper nouns) - e.g., "Alan Turing", "United States"
  const properNouns = text.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g);
  for (const match of properNouns) {
    entities.add(match[1]);
  }

  // Single capitalized words not at sentence start (likely entities)
  const words = text.split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    const word = words[i].replace(/[^a-zA-Z]/g, '');
    if (word.length > 2 && /^[A-Z][a-z]+$/.test(word)) {
      // Skip common words that happen to follow periods
      if (!COMMON_CAPITALIZED.has(word)) {
        entities.add(word);
      }
    }
  }

  // Years
  const years = text.matchAll(/\b(1[0-9]{3}|20[0-2][0-9])\b/g);
  for (const match of years) {
    entities.add(match[1]);
  }

  // Acronyms (2+ uppercase letters)
  const acronyms = text.matchAll(/\b([A-Z]{2,})\b/g);
  for (const match of acronyms) {
    if (!COMMON_ACRONYMS_TO_SKIP.has(match[1])) {
      entities.add(match[1]);
    }
  }

  // Technical terms in backticks
  const backtickTerms = text.matchAll(/`([^`]+)`/g);
  for (const match of backtickTerms) {
    entities.add(match[1]);
  }

  return Array.from(entities);
}

const COMMON_CAPITALIZED = new Set([
  'The', 'This', 'That', 'These', 'Those', 'There', 'Their',
  'They', 'Then', 'When', 'Where', 'What', 'Which', 'While',
  'However', 'Although', 'Because', 'Since', 'After', 'Before',
  'During', 'Between', 'Through', 'About', 'Into', 'From',
  'Over', 'Under', 'Some', 'Many', 'Most', 'Each', 'Every',
  'Both', 'Such', 'Other', 'Another', 'Several', 'Also',
  'Often', 'Sometimes', 'Usually', 'Today', 'Here', 'Now',
]);

const COMMON_ACRONYMS_TO_SKIP = new Set([
  'I', 'II', 'III', 'IV', 'V', 'VI', 'AM', 'PM', 'AD', 'BC', 'CE', 'BCE',
  'VS', 'EG', 'IE', 'OK',
]);
