import { describe, expect, it } from 'vitest';
import { detectLanguage, resolveLang } from '../src/input/language-detect';
import { SAMPLES } from '../src/input/samples';

describe('language detection', () => {
  it('detects English', () => {
    expect(detectLanguage('Photosynthesis is the process by which plants make food from sunlight.')).toBe('en');
  });
  it('detects Hindi', () => {
    expect(detectLanguage('कोशिका जीवन की मूल इकाई है और यह सभी जीवों में पाई जाती है।')).toBe('hi');
  });
  it('detects Marathi', () => {
    expect(detectLanguage('शिवाजी महाराजांनी रायगडावर स्वराज्याची स्थापना केली आणि तो किल्ला अभेद्य आहे.')).toBe('mr');
  });
  it('treats empty text as English and honours manual override', () => {
    expect(detectLanguage('')).toBe('en');
    expect(resolveLang('hi', 'plain english text')).toBe('hi');
    expect(resolveLang('auto', 'plain english text')).toBe('en');
  });
  it('classifies the bundled samples correctly', () => {
    for (const s of SAMPLES) expect(detectLanguage(s.text)).toBe(s.lang);
  });
});
