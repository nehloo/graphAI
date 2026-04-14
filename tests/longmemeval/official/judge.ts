// Official LongMemEval LLM-judge implementation.
//
// Prompt templates are copied VERBATIM from xiaowu0162/LongMemEval at
// src/evaluation/evaluate_qa.py (get_anscheck_prompt). Do not edit these
// strings - any deviation would invalidate comparability against published
// leaderboard scores (Agentmemory V4, PwC Chronos, OMEGA, Mastra, etc.).

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { LMEQuestion, LMEQuestionType } from './dataset';
import { isAbstention } from './dataset';

export type JudgeModel = 'gpt-4o' | 'gpt-4o-mini';

// Canonical model ids used by the reference implementation's model_zoo.
const JUDGE_MODEL_IDS: Record<JudgeModel, string> = {
  'gpt-4o': 'gpt-4o-2024-08-06',
  'gpt-4o-mini': 'gpt-4o-mini-2024-07-18',
};

function buildJudgePrompt(
  task: LMEQuestionType,
  question: string,
  answer: string,
  response: string,
  abstention: boolean
): string {
  if (abstention) {
    return (
      'I will give you an unanswerable question, an explanation, and a response from a model. ' +
      'Please answer yes if the model correctly identifies the question as unanswerable. ' +
      'The model could say that the information is incomplete, or some other information is given but the asked information is not.\n\n' +
      `Question: ${question}\n\n` +
      `Explanation: ${answer}\n\n` +
      `Model Response: ${response}\n\n` +
      'Does the model correctly identify the question as unanswerable? Answer yes or no only.'
    );
  }

  if (
    task === 'single-session-user' ||
    task === 'single-session-assistant' ||
    task === 'multi-session'
  ) {
    return (
      'I will give you a question, a correct answer, and a response from a model. ' +
      'Please answer yes if the response contains the correct answer. Otherwise, answer no. ' +
      'If the response is equivalent to the correct answer or contains all the intermediate steps to get the correct answer, you should also answer yes. ' +
      'If the response only contains a subset of the information required by the answer, answer no. \n\n' +
      `Question: ${question}\n\n` +
      `Correct Answer: ${answer}\n\n` +
      `Model Response: ${response}\n\n` +
      'Is the model response correct? Answer yes or no only.'
    );
  }

  if (task === 'temporal-reasoning') {
    return (
      'I will give you a question, a correct answer, and a response from a model. ' +
      'Please answer yes if the response contains the correct answer. Otherwise, answer no. ' +
      'If the response is equivalent to the correct answer or contains all the intermediate steps to get the correct answer, you should also answer yes. ' +
      'If the response only contains a subset of the information required by the answer, answer no. ' +
      'In addition, do not penalize off-by-one errors for the number of days. ' +
      "If the question asks for the number of days/weeks/months, etc., and the model makes off-by-one errors (e.g., predicting 19 days when the answer is 18), the model's response is still correct. \n\n" +
      `Question: ${question}\n\n` +
      `Correct Answer: ${answer}\n\n` +
      `Model Response: ${response}\n\n` +
      'Is the model response correct? Answer yes or no only.'
    );
  }

  if (task === 'knowledge-update') {
    return (
      'I will give you a question, a correct answer, and a response from a model. ' +
      'Please answer yes if the response contains the correct answer. Otherwise, answer no. ' +
      'If the response contains some previous information along with an updated answer, ' +
      'the response should be considered as correct as long as the updated answer is the required answer.\n\n' +
      `Question: ${question}\n\n` +
      `Correct Answer: ${answer}\n\n` +
      `Model Response: ${response}\n\n` +
      'Is the model response correct? Answer yes or no only.'
    );
  }

  if (task === 'single-session-preference') {
    return (
      'I will give you a question, a rubric for desired personalized response, and a response from a model. ' +
      'Please answer yes if the response satisfies the desired response. Otherwise, answer no. ' +
      'The model does not need to reflect all the points in the rubric. ' +
      "The response is correct as long as it recalls and utilizes the user's personal information correctly.\n\n" +
      `Question: ${question}\n\n` +
      `Rubric: ${answer}\n\n` +
      `Model Response: ${response}\n\n` +
      'Is the model response correct? Answer yes or no only.'
    );
  }

  throw new Error(`Unknown question_type for judge: ${task}`);
}

export interface JudgeResult {
  correct: boolean;
  raw: string;
  judgeModel: string;
}

export async function judgeAnswer(
  q: LMEQuestion,
  modelResponse: string,
  opts: { model?: JudgeModel } = {}
): Promise<JudgeResult> {
  const judge: JudgeModel = opts.model ?? 'gpt-4o';
  const modelId = JUDGE_MODEL_IDS[judge];
  const prompt = buildJudgePrompt(
    q.question_type,
    q.question,
    q.answer,
    modelResponse,
    isAbstention(q)
  );

  const result = await generateText({
    model: openai(modelId),
    messages: [{ role: 'user', content: prompt }],
    temperature: 0, // Determinism for reproducible scoring
  });

  const raw = result.text.trim();
  // Parsing rule from evaluate_qa.py: label = 'yes' in eval_response.lower()
  const correct = raw.toLowerCase().includes('yes');

  return { correct, raw, judgeModel: modelId };
}
