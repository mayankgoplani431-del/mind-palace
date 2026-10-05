import { describe, expect, it } from 'vitest';
import { buildPalace } from '../src/extract';
import { SAMPLES } from '../src/input/samples';
import { decodeShare, encodeShare, exportPalace, parsePalaceFile, ImportError } from '../src/storage/export';
import { newCard } from '../src/learn/srs';

describe('export / import', () => {
  it('round-trips a palace through JSON and the share link', async () => {
    const { palace } = await buildPalace(SAMPLES[0]!.text, {
      langChoice: 'auto',
      engine: { kind: 'heuristic' },
    });
    const cards = { [palace.rooms[0]!.concepts[0]!.id]: newCard('x', 1) };
    const parsed = parsePalaceFile(exportPalace(palace, cards));
    expect(parsed.palace).toEqual(palace);
    expect(parsed.cards).toEqual(cards);
    expect(decodeShare(encodeShare(palace))).toEqual(palace);
    expect(encodeShare(palace).length).toBeLessThan(JSON.stringify(palace).length);
  });
  it('rejects garbage with a readable error', () => {
    expect(() => parsePalaceFile('not json')).toThrow(ImportError);
    expect(() => parsePalaceFile('{"a":1}')).toThrow(ImportError);
    expect(() => decodeShare('###')).toThrow(ImportError);
  });
});
