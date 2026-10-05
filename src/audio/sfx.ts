/** All sound is synthesised with WebAudio – no audio files. */
export type SfxName =
  'click' | 'chime' | 'wrong' | 'pickup' | 'place' | 'restore' | 'success' | 'whoosh' | 'tick' | 'sparkle';

type ACtor = typeof AudioContext;

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private drone: { stop(): void } | null = null;
  private muted = false;
  private droneWanted = false;

  /** Must be called from a user gesture (browsers keep audio suspended until then). */
  unlock(): void {
    if (!this.ctx) {
      const AC: ACtor | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: ACtor }).webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
      } catch {
        return;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.droneWanted && !this.drone) this.startDrone();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    delay = 0,
    slideTo?: number,
  ): void {
    const c = this.ctx;
    if (!c || !this.master || this.muted) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  play(name: SfxName): void {
    switch (name) {
      case 'click':
        this.tone(660, 0.06, 'triangle', 0.25);
        break;
      case 'tick':
        this.tone(1200, 0.03, 'square', 0.08);
        break;
      case 'chime':
        this.tone(880, 0.5, 'sine', 0.35);
        this.tone(1320, 0.6, 'sine', 0.25, 0.09);
        this.tone(1760, 0.7, 'sine', 0.18, 0.18);
        break;
      case 'wrong':
        this.tone(220, 0.22, 'sawtooth', 0.22, 0, 140);
        this.tone(165, 0.3, 'sawtooth', 0.2, 0.12, 100);
        break;
      case 'pickup':
        this.tone(520, 0.1, 'sine', 0.25, 0, 780);
        break;
      case 'place':
        this.tone(300, 0.12, 'triangle', 0.3, 0, 180);
        break;
      case 'sparkle':
        [1568, 2093, 2637, 3136].forEach((f, i) => this.tone(f, 0.25, 'sine', 0.12, i * 0.05));
        break;
      case 'restore':
        [392, 494, 587, 784, 988].forEach((f, i) => this.tone(f, 0.45, 'sine', 0.22, i * 0.07));
        break;
      case 'success':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.28, i * 0.11));
        this.tone(1047, 0.9, 'sine', 0.2, 0.5);
        break;
      case 'whoosh':
        this.tone(200, 0.35, 'sawtooth', 0.06, 0, 900);
        break;
    }
  }

  private startDrone(): void {
    const c = this.ctx;
    if (!c || !this.master) return;
    const g = c.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.05, c.currentTime + 3);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(filter.frequency);
    const oscs = [110, 110.6, 164.8, 220.4].map((f) => {
      const o = c.createOscillator();
      o.type = f > 150 ? 'sine' : 'triangle';
      o.frequency.value = f;
      o.connect(filter);
      o.start();
      return o;
    });
    filter.connect(g).connect(this.master);
    lfo.start();
    this.drone = {
      stop: () => {
        g.gain.cancelScheduledValues(c.currentTime);
        g.gain.linearRampToValueAtTime(0, c.currentTime + 0.6);
        window.setTimeout(() => {
          oscs.forEach((o) => o.stop());
          lfo.stop();
        }, 700);
      },
    };
  }

  /** Soft ambient drone while exploring. */
  setAmbient(on: boolean): void {
    this.droneWanted = on;
    if (!on) {
      this.drone?.stop();
      this.drone = null;
    } else if (this.ctx && !this.drone) this.startDrone();
  }
}

export const sfx = new Sfx();
