// Transformer Architecture & Attention Mechanisms
// ~25 foundational papers that heavily cite each other

export const ARXIV_PAPERS = [
  // Foundational
  { id: '1706.03762', title: 'Attention Is All You Need' },
  { id: '1409.0473', title: 'Neural Machine Translation by Jointly Learning to Align and Translate' },
  { id: '1301.3781', title: 'Efficient Estimation of Word Representations in Vector Space' },
  { id: '1810.04805', title: 'BERT: Pre-training of Deep Bidirectional Transformers' },

  // GPT family
  { id: '2005.14165', title: 'Language Models are Few-Shot Learners (GPT-3)' },

  // BERT variants
  { id: '1907.11692', title: 'RoBERTa: A Robustly Optimized BERT Pretraining Approach' },
  { id: '1909.11942', title: 'ALBERT: A Lite BERT for Self-supervised Learning' },
  { id: '2003.10555', title: 'ELECTRA: Pre-training Text Encoders as Discriminators' },

  // Efficient transformers
  { id: '2001.04451', title: 'Reformer: The Efficient Transformer' },
  { id: '2004.05150', title: 'Longformer: The Long-Document Transformer' },
  { id: '2006.04768', title: 'Linformer: Self-Attention with Linear Complexity' },

  // Vision transformers
  { id: '2010.11929', title: 'An Image is Worth 16x16 Words: Transformers for Image Recognition' },

  // T5 and sequence-to-sequence
  { id: '1910.10683', title: 'Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer' },

  // Scaling
  { id: '2001.08361', title: 'Scaling Laws for Neural Language Models' },
  { id: '2203.15556', title: 'Training Compute-Optimal Large Language Models (Chinchilla)' },

  // Architecture innovations
  { id: '2002.05202', title: 'GLU Variants Improve Transformer' },
  { id: '2104.09864', title: 'RoFormer: Enhanced Transformer with Rotary Position Embedding' },
  { id: '2305.13245', title: 'GQA: Training Generalized Multi-Query Transformer Models' },

  // Instruction tuning and RLHF
  { id: '2203.02155', title: 'Training language models to follow instructions with human feedback (InstructGPT)' },
  { id: '2210.11416', title: 'Scaling Instruction-Finetuned Language Models (Flan-T5)' },

  // Mixture of Experts
  { id: '2101.03961', title: 'Switch Transformers: Scaling to Trillion Parameter Models' },

  // Foundational concepts
  { id: '1412.6980', title: 'Adam: A Method for Stochastic Optimization' },
  { id: '1607.06450', title: 'Layer Normalization' },
  { id: '1512.03385', title: 'Deep Residual Learning for Image Recognition' },
  { id: '1706.02677', title: 'Deep Sets' },
];
