import { describe, expect, it } from 'vitest';
import { clipWords, splitSentences, toSections, toUnits } from '../src/input/text';

describe('splitSentences', () => {
  it('splits English on . ! ?', () => {
    expect(splitSentences('One is here. Two is there! Is three? Yes.')).toEqual(['One is here.', 'Two is there!', 'Is three?', 'Yes.']);
  });
  it('splits on the Devanagari danda, even without a following space', () => {
    expect(splitSentences('कोशिका जीवन की इकाई है।केंद्रक नियंत्रण केंद्र है। डीएनए अणु है॥')).toEqual([
      'कोशिका जीवन की इकाई है।',
      'केंद्रक नियंत्रण केंद्र है।',
      'डीएनए अणु है॥',
    ]);
  });
  it('does not split on decimals or abbreviations', () => {
    expect(splitSentences('Pi is about 3.14 in value. Dr. Rao met Prof. Sen, e.g. at noon.')).toEqual([
      'Pi is about 3.14 in value.',
      'Dr. Rao met Prof. Sen, e.g. at noon.',
    ]);
  });
  it('splits Marathi text that uses full stops', () => {
    expect(splitSentences('रायगड हा किल्ला आहे. शिवाजी महाराज राजा होते.')).toHaveLength(2);
  });
});

describe('toUnits / toSections', () => {
  const md = '# Title\n\n## Part A\n- **Term**: a definition that is long enough to count here.\n- Plain bullet sentence number two.\n\n## Part B\nSome text in part B. More text in part B.\n';
  it('finds headings and bold markers', () => {
    const units = toUnits(md);
    expect(units.filter((u) => u.kind === 'heading').map((u) => u.text)).toEqual(['Title', 'Part A', 'Part B']);
    expect(units.find((u) => u.text.startsWith('Term'))?.bold).toBe(true);
  });
  it('groups sentences under headings and drops empty ones', () => {
    const sections = toSections(toUnits(md));
    expect(sections.map((s) => s.heading)).toEqual(['Part A', 'Part B']);
    expect(sections[1]?.units).toHaveLength(2);
  });
  it('clips summaries to a word budget', () => {
    expect(clipWords('a b c d e f', 3)).toBe('a b c…');
    expect(clipWords('a b', 3)).toBe('a b');
  });
});
