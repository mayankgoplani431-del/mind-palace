import type { App } from '../app';
import { t } from '../i18n';
import type { CardButton, CardContent } from '../ui/card';
import { fadeWindowDays, isFaded } from '../learn/fading';
import { gradeFromQuiz, type Grade } from '../learn/srs';
import { shuffleQuiz } from './exam';
import { listenOnce, matchSpoken, voiceSupported, type VoiceError } from '../learn/voice';
import { stopSpeaking } from '../learn/tts';
import { sfx } from '../audio/sfx';

type Mode = 'view' | 'rate' | 'quiz';

/** The concept card shown when you approach / click a memory object: speak, quiz, rate, voice recall. */
export class LearnCard {
  openId: string | null = null;
  private mode: Mode = 'view';
  private footer = '';
  private quizStart = 0;
  private answered: { chosen: number; correct: number } | null = null;
  private restoredMsg = '';

  constructor(private readonly app: App) {}

  open(id: string, o: { auto?: boolean; click?: boolean } = {}): void {
    const w = this.app.world;
    const l = w?.locus(id);
    if (!w || !l) return;
    if (o.auto && this.app.dismissedId === id) return;
    if (this.openId === id && !o.click) return;
    this.openId = id;
    this.mode = 'view';
    this.footer = '';
    this.answered = null;
    this.restoredMsg = '';
    this.app.dismiss(null);
    w.setHighlight(id);
    if (o.click) sfx.play('click');
    this.render();
  }

  close(dismiss = false): void {
    if (!this.openId) return;
    if (dismiss) this.app.dismiss(this.openId);
    this.openId = null;
    this.app.world?.setHighlight(null);
    this.app.showCard(null);
    stopSpeaking();
  }

  private grade(g: Grade): void {
    const id = this.openId;
    if (!id) return;
    void this.app.gradeConcept(id, g, g !== 'again');
    this.restoredMsg = g === 'again' ? t('card.again.msg') : t('card.restored');
    this.mode = 'view';
    this.render();
  }

  private render(): void {
    const id = this.openId;
    const l = id ? this.app.world?.locus(id) : null;
    if (!id || !l) return;
    const c = l.concept;
    const f = this.app.freshnessOf(id);
    const card = this.app.cards.get(id);
    const faded = isFaded(f);
    const eyebrow = `${l.roomTopic} · #${l.slot + 1}${faded ? ` · ⚠ ${t('card.fading', { pct: Math.round(f * 100) })}` : ''}`;

    const speakBtn: CardButton = {
      label: `🔊 ${t('card.speak')}`,
      onClick: () => void this.app.speak(`${c.title}. ${c.summary}. ${c.mnemonic}`),
    };
    const close: CardButton = { label: t('card.close'), onClick: () => this.close(true) };
    const out: CardContent = {
      id: `${id}:${this.mode}`,
      title: c.title,
      eyebrow,
      onClose: () => this.close(true),
      dismissible: true,
    };

    if (this.mode === 'view') {
      out.body = [c.summary];
      out.quote = c.mnemonic;
      out.chips = c.keywords;
      const buttons: CardButton[] = [
        speakBtn,
        { label: `❓ ${t('card.quiz')}`, kind: 'primary', onClick: () => this.startQuiz() },
      ];
      if (voiceSupported()) buttons.push({ label: `🎤 ${t('card.say')}`, onClick: () => void this.voice() });
      buttons.push({ label: `⭐ ${t('card.rate')}`, onClick: () => ((this.mode = 'rate'), this.render()) });
      buttons.push(close);
      out.buttons = buttons;
      out.footer =
        this.restoredMsg ||
        this.footer ||
        (card && card.reps > 0
          ? t('card.next', { d: Math.max(1, card.interval), w: fadeWindowDays(card) })
          : '');
    } else if (this.mode === 'rate') {
      out.body = [t('card.rateQ')];
      out.options = (['again', 'hard', 'good', 'easy'] as Grade[]).map((g) => ({
        label: t(`card.${g}`),
        kind: g === 'again' ? 'bad' : g === 'easy' ? 'primary' : g === 'good' ? 'good' : 'plain',
        onClick: () => this.grade(g),
      }));
      out.buttons = [{ label: t('card.back'), onClick: () => ((this.mode = 'view'), this.render()) }];
    } else {
      const q = shuffleQuiz(c.quiz, `${this.app.palace?.seed}:${id}:card`);
      out.body = [q.question];
      out.options = q.options.map((o, i) => ({
        label: o,
        state: this.answered
          ? i === q.answerIndex
            ? 'right'
            : i === this.answered.chosen
              ? 'wrong'
              : undefined
          : undefined,
        disabled: !!this.answered,
        onClick: () => this.answer(i, q.answerIndex),
      }));
      out.buttons = this.answered
        ? [
            {
              label: t('card.continue'),
              kind: 'primary',
              onClick: () => ((this.mode = 'view'), this.render()),
            },
            { label: t('card.tryAgain'), onClick: () => this.startQuiz() },
          ]
        : [{ label: t('card.back'), onClick: () => ((this.mode = 'view'), this.render()) }];
      out.footer = this.footer;
    }
    this.app.showCard(out);
  }

  private startQuiz(): void {
    this.mode = 'quiz';
    this.answered = null;
    this.footer = '';
    this.quizStart = performance.now();
    this.render();
  }

  private answer(chosen: number, correctIdx: number): void {
    const correct = chosen === correctIdx;
    const fast = (performance.now() - this.quizStart) / 1000 < 8;
    this.answered = { chosen, correct: correctIdx };
    this.footer = correct ? `✔ ${t('card.correct')} — ${t('card.restored')}` : `✖ ${t('card.wrong')}`;
    sfx.play(correct ? 'chime' : 'wrong');
    const id = this.openId;
    if (id) void this.app.gradeConcept(id, gradeFromQuiz(correct, fast, false), correct);
    this.render();
  }

  private async voice(): Promise<void> {
    const id = this.openId;
    const c = id ? this.app.world?.locus(id)?.concept : null;
    if (!id || !c) return;
    this.footer = `🎙 ${t('card.listening')}`;
    this.render();
    try {
      const heard = await listenOnce(this.app.palace?.language ?? 'en');
      const m = matchSpoken(heard, c);
      const pct = Math.round(m.score * 100);
      this.footer = m.pass
        ? `✔ ${t('card.voicePass', { pct, heard: m.heard })}`
        : `✖ ${t('card.voiceFail', { pct, heard: m.heard })}`;
      sfx.play(m.pass ? 'chime' : 'wrong');
      if (m.pass) void this.app.gradeConcept(id, m.score > 0.85 ? 'easy' : 'good', true);
    } catch (e) {
      const err = e as VoiceError;
      this.footer = `⚠ ${t(`err.voice.${typeof e === 'string' ? err : 'error'}`)}`;
    }
    if (this.openId === id) this.render();
  }
}
