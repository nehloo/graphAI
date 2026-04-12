import type { ParsedDocument, ParsedSection } from '@/core/types';
import { parseCsv } from '@/core/ingestion/parsers/csv-parser';
import {
  NASA_API_BASE,
  CURIOSITY_SOLS,
  MARS_MISSION_FACTS,
} from './config';

const NASA_API_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';

interface RoverPhoto {
  id: number;
  sol: number;
  camera: { name: string; full_name: string };
  img_src: string;
  earth_date: string;
  rover: { name: string; landing_date: string; launch_date: string; status: string };
}

// Fetch Mars rover photo metadata (not the images, just the metadata)
async function fetchRoverPhotos(
  rover: string,
  sol: number
): Promise<RoverPhoto[]> {
  try {
    const url = `${NASA_API_BASE}/mars-photos/api/v1/rovers/${rover}/photos?sol=${sol}&api_key=${NASA_API_KEY}&page=1`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    // Limit to 5 photos per sol to keep dataset manageable
    return (data.photos || []).slice(0, 5);
  } catch {
    return [];
  }
}

// Convert rover photos to a parsed document
function photosToDocument(photos: RoverPhoto[], rover: string, sol: number): ParsedDocument | null {
  if (photos.length === 0) return null;

  const sections: ParsedSection[] = [];

  // Overview section
  const roverInfo = photos[0].rover;
  sections.push({
    title: `${roverInfo.name} - Sol ${sol}`,
    content: `Photos taken by ${roverInfo.name} rover on Sol ${sol} (Mars day ${sol}). Earth date: ${photos[0].earth_date}. Rover launched: ${roverInfo.launch_date}, landed: ${roverInfo.landing_date}, status: ${roverInfo.status}.`,
    depth: 1,
    children: [],
  });

  // Camera breakdown
  const cameraGroups = new Map<string, RoverPhoto[]>();
  for (const photo of photos) {
    const group = cameraGroups.get(photo.camera.full_name) || [];
    group.push(photo);
    cameraGroups.set(photo.camera.full_name, group);
  }

  for (const [cameraName, cameraPhotos] of cameraGroups) {
    sections.push({
      title: cameraName,
      content: `${cameraPhotos.length} photos captured by ${cameraName} (${cameraPhotos[0].camera.name}). Photo IDs: ${cameraPhotos.map(p => p.id).join(', ')}.`,
      depth: 2,
      children: [],
    });
  }

  return {
    title: `${roverInfo.name} Rover Photos - Sol ${sol}`,
    sections,
    sourceFile: `nasa-mars:${rover}-sol-${sol}`,
    metadata: {
      source: 'nasa-mars',
      rover: roverInfo.name,
      sol,
      earthDate: photos[0].earth_date,
      photoCount: photos.length,
    },
  };
}

// Convert curated mission facts to documents
function factsToDocuments(): ParsedDocument[] {
  return MARS_MISSION_FACTS.map(fact => ({
    title: fact.title,
    sections: [{
      title: fact.title,
      content: fact.content,
      depth: 1,
      children: [],
    }],
    sourceFile: `nasa-mars:fact-${fact.title.toLowerCase().replace(/\s+/g, '-')}`,
    metadata: {
      source: 'nasa-mars',
      type: 'mission-fact',
    },
  }));
}

export async function fetchAllNasaMarsData(
  onProgress?: (current: number, total: number, title: string) => void
): Promise<ParsedDocument[]> {
  const documents: ParsedDocument[] = [];

  // 1. Add curated mission facts
  const facts = factsToDocuments();
  documents.push(...facts);

  // 2. Fetch Curiosity rover photo metadata
  const total = CURIOSITY_SOLS.length + facts.length;
  let current = facts.length;

  for (const sol of CURIOSITY_SOLS) {
    current++;
    onProgress?.(current, total, `Curiosity Sol ${sol}`);

    const photos = await fetchRoverPhotos('curiosity', sol);
    const doc = photosToDocument(photos, 'curiosity', sol);
    if (doc) documents.push(doc);

    // Rate limiting for NASA API (DEMO_KEY: 30 req/hour, registered: 1000/hour)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return documents;
}
