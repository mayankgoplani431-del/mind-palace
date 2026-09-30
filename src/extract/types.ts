export type Lang = 'en' | 'hi' | 'mr';
export type LangChoice = Lang | 'auto';

export interface Quiz {
  question: string;
  options: string[];
  answerIndex: number;
}

export interface Concept {
  id: string;
  title: string;
  summary: string;
  keywords: string[];
  objectKey: string;
  mnemonic: string;
  quiz: Quiz;
}

/** What one extractor call returns: a single room's worth of concepts (6-8). */
export interface ExtractResult {
  topic: string;
  language: Lang;
  concepts: Concept[];
}

export interface ExtractOptions {
  lang: Lang;
  /** Used to make ids stable and unique across rooms. */
  idPrefix?: string;
}

export interface ConceptExtractor {
  readonly name: string;
  extract(text: string, opts: ExtractOptions): Promise<ExtractResult>;
}

export interface RoomSpec {
  id: string;
  topic: string;
  concepts: Concept[];
}

export type StyleKey = 'temple' | 'lab' | 'zen';

export interface PalaceData {
  version: 1;
  id: string;
  topic: string;
  language: Lang;
  seed: number;
  style: StyleKey;
  rooms: RoomSpec[];
  /** Palace Architect: conceptId -> slot index within its room (swaps only change layout). */
  slots?: Record<string, number>;
  createdAt: number;
  engine: string;
}
