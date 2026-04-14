// Build a per-question knowledge graph from a LongMemEval haystack.
//
// Each question ships with ~50 chat sessions of haystack. We turn each session
// into a ParsedDocument (reusing conversationToDocument) and build a fresh,
// isolated KnowledgeGraph so there's no cross-question contamination.

import type { ParsedDocument, ParsedConversation, KnowledgeGraph, TfidfIndex } from '@/core/types';
import { conversationToDocument } from '@/core/ingestion/parsers/conversation-parser';
import { buildGraph } from '@/core/graph/graph-builder';
import type { LMEQuestion, LMESession } from './dataset';

function sessionToDocument(
  questionId: string,
  sessionId: string,
  sessionDateStr: string,
  turns: LMESession
): ParsedDocument {
  const startedAt = Date.parse(sessionDateStr);
  const startedAtMs = Number.isFinite(startedAt) ? startedAt : Date.now();

  const conv: ParsedConversation = {
    id: `${questionId}/${sessionId}`,
    title: sessionId,
    messages: turns.map(t => ({ role: t.role, content: t.content })),
    sourceFile: `lme:${questionId}:${sessionId}`,
    startedAt: startedAtMs,
    format: 'raw',
    metadata: {
      messageCount: turns.length,
      sessionId,
      sessionDate: sessionDateStr,
    },
  };

  const doc = conversationToDocument(conv);
  // Preserve session timing + ids on the ParsedDocument so downstream temporal
  // reasoning has something to latch onto.
  doc.metadata = {
    ...doc.metadata,
    sessionId,
    sessionDate: sessionDateStr,
    startedAt: startedAtMs,
  };
  return doc;
}

export function buildGraphForQuestion(q: LMEQuestion): KnowledgeGraph & { tfidfIndex: TfidfIndex } {
  const docs: ParsedDocument[] = [];
  for (let i = 0; i < q.haystack_sessions.length; i++) {
    const sessionId = q.haystack_session_ids[i] ?? `session_${i}`;
    const sessionDate = q.haystack_dates[i] ?? q.question_date;
    docs.push(sessionToDocument(q.question_id, sessionId, sessionDate, q.haystack_sessions[i]));
  }
  return buildGraph(docs, `lme:${q.question_id}`) as KnowledgeGraph & { tfidfIndex: TfidfIndex };
}
