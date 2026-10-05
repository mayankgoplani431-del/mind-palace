import { describe, expect, it } from 'vitest';
import { extractJson, repairLlmOutput, validateExtract } from '../src/extract/validate';

const good = {
  topic: 'Atoms',
  language: 'en',
  concepts: [
    {
      id: 'c1',
      title: 'Atom',
      summary: 'The basic unit of matter.',
      keywords: ['proton', 'electron'],
      objectKey: 'atom',
      mnemonic: 'A tiny solar system spins on the pedestal.',
      quiz: {
        question: 'What is the basic unit of matter?',
        options: ['Atom', 'Cell', 'Star', 'Wave'],
        answerIndex: 0,
      },
    },
  ],
};

describe('zod schema', () => {
  it('accepts a valid payload', () => {
    expect(validateExtract(good).ok).toBe(true);
  });
  it('rejects an unknown objectKey', () => {
    const bad = structuredClone(good);
    bad.concepts[0]!.objectKey = 'spaceship';
    expect(validateExtract(bad).ok).toBe(false);
  });
  it('rejects summaries over 25 words and duplicate quiz options', () => {
    const long = structuredClone(good);
    long.concepts[0]!.summary = Array(30).fill('word').join(' ');
    expect(validateExtract(long).ok).toBe(false);
    const dup = structuredClone(good);
    dup.concepts[0]!.quiz.options = ['A', 'A', 'B', 'C'];
    expect(validateExtract(dup).ok).toBe(false);
  });
  it('rejects a bad answerIndex and wrong option count', () => {
    const a = structuredClone(good);
    a.concepts[0]!.quiz.answerIndex = 4;
    expect(validateExtract(a).ok).toBe(false);
    const b = structuredClone(good);
    b.concepts[0]!.quiz.options = ['A', 'B', 'C'];
    expect(validateExtract(b).ok).toBe(false);
  });
  it('repairs common LLM slips before validating', () => {
    const sloppy = structuredClone(good) as Record<string, unknown>;
    const c = (sloppy.concepts as Array<Record<string, unknown>>)[0]!;
    c.summary = Array(40).fill('word').join(' ');
    c.objectKey = 'Not-An-Object';
    (c.quiz as Record<string, unknown>).answerIndex = '2';
    sloppy.language = 'English';
    const fixed = validateExtract(repairLlmOutput(sloppy, 'en'));
    expect(fixed.ok).toBe(true);
  });
  it('extracts JSON from fenced or chatty replies', () => {
    expect(extractJson('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('here you go {"a":{"b":2}} thanks')).toEqual({ a: { b: 2 } });
    expect(() => extractJson('no json here')).toThrow();
  });
});
