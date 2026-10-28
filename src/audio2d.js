/**
 * Procedural 2D Arcade / Doom-SciFi Sound & Synth Engine (WebAudio API)
 * Enhanced with dynamic music stems, pitch variation, stereo panning & critical health filters
 */
export class Sound2D {
  constructor() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    // Master bus
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.45;

    // Tip 63: Low-Pass Filter Bus for Low Health State
    this.lowPassFilter = this.ctx.createBiquadFilter();
    this.lowPassFilter.type = 'lowpass';
    this.lowPassFilter.frequency.value = 22050; // default wide open

    this.master.connect(this.lowPassFilter);
    this.lowPassFilter.connect(this.ctx.destination);

    this.noiseBuf = this.createNoise();
    this.heartbeatTimer = null;
    this.isLowHealth = false;
    this.combatIntensity = 0; // 0 = ambient exploration, 1 = intense combat
  }

  createNoise() {
    const len = this.ctx.sampleRate * 1.5;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  resume() {
    if (this.ctx.state !== 'running') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Tip 65: Binaural Stereo Spatialization helper
  createPanner(pan = 0) {
    if (this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      return panner;
    }
    return null;
  }

  // Tip 62: Procedural Pitch Variation helper
  getPitchVar(freq, amount = 0.08) {
    const variation = 1 + (Math.random() * 2 - 1) * amount;
    return freq * variation;
  }

  tone(freq, endFreq, duration, type = 'sawtooth', vol = 0.25, pan = 0, varyPitch = true) {
    try {
      this.resume();
      const actualFreq = varyPitch ? this.getPitchVar(freq) : freq;
      const actualEndFreq = endFreq && varyPitch ? this.getPitchVar(endFreq) : endFreq;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(actualFreq, t);
      if (actualEndFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, actualEndFreq), t + duration);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      const panner = this.createPanner(pan);
      if (panner) {
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.master);
      } else {
        osc.connect(gain);
        gain.connect(this.master);
      }
      osc.start(t);
      osc.stop(t + duration + 0.02);
    } catch { /* ignore */ }
  }

  burst(duration, filterFreq = 1200, vol = 0.25, filterType = 'lowpass', pan = 0) {
    try {
      this.resume();
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = filterFreq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      const panner = this.createPanner(pan);
      src.connect(filter);
      filter.connect(gain);
      if (panner) {
        gain.connect(panner);
        panner.connect(this.master);
      } else {
        gain.connect(this.master);
      }
      src.start(t);
      src.stop(t + duration + 0.02);
    } catch { /* ignore */ }
  }

  // Tip 66: Visceral Impact Crunch (sub-bass 45Hz thump + metallic snap)
  impactCrunch(isHeavy = false, pan = 0) {
    const bass = isHeavy ? 42 : 55;
    this.tone(bass, 24, 0.25, 'sine', isHeavy ? 0.45 : 0.3, pan, false);
    this.tone(1400, 320, 0.08, 'sawtooth', 0.22, pan);
    this.burst(0.06, 4500, 0.2, 'highpass', pan);
  }

  // Tip 67: Weapon Cocking & Rechambering Mechanical SFX
  weaponSwitch() {
    this.tone(580, 240, 0.06, 'triangle', 0.18, 0, false);
    setTimeout(() => this.burst(0.04, 3800, 0.16, 'highpass'), 60);
    setTimeout(() => this.tone(320, 480, 0.07, 'square', 0.16, 0, false), 130);
  }

  // Tip 64: Distinct Off-Screen Audio Signatures
  offScreenTelegraph(pan = -0.8) {
    this.tone(840, 420, 0.22, 'sawtooth', 0.28, pan, false);
    this.burst(0.12, 2800, 0.24, 'bandpass', pan);
  }

  // Tip 69: Boss Vocal Audio Telegraph
  bossTelegraph(type = 'heavy') {
    if (type === 'ultimate') {
      this.tone(85, 220, 1.2, 'sawtooth', 0.45, 0, false);
      this.burst(1.0, 380, 0.35, 'lowpass');
    } else {
      this.tone(120, 45, 0.45, 'sawtooth', 0.38, 0, true);
      this.burst(0.35, 600, 0.3, 'lowpass');
    }
  }

  // Tip 70: Triumphant Gothic Organ Fanfare
  stageClearFanfare() {
    this.stopMusic();
    const chords = [
      [220, 261.6, 329.6, 440], // A minor
      [174.6, 220, 261.6, 349.2], // F major
      [196, 246.9, 293.7, 392], // G major
      [220, 277.2, 329.6, 440, 554.4] // A Major Tierce de Picardie
    ];
    chords.forEach((chord, step) => {
      setTimeout(() => {
        chord.forEach(note => {
          this.tone(note, note * 0.999, 1.4, 'triangle', 0.14, 0, false);
          this.tone(note * 0.5, note * 0.499, 1.6, 'sawtooth', 0.08, 0, false);
        });
      }, step * 950);
    });
  }

  // Tip 63: Critical Health Audio Filter & Heartbeat Loop
  setLowHealth(active = false) {
    if (this.isLowHealth === active) return;
    this.isLowHealth = active;
    const t = this.ctx.currentTime;
    if (active) {
      // Muffle high frequencies with low-pass at 420Hz
      this.lowPassFilter.frequency.exponentialRampToValueAtTime(420, t + 0.4);
      if (!this.heartbeatTimer) {
        this.heartbeatTimer = setInterval(() => {
          if (this.ctx.state !== 'running' || this.muted || !this.isLowHealth) return;
          // Lub-dub heartbeat sound
          this.tone(55, 32, 0.12, 'sine', 0.38, 0, false);
          setTimeout(() => this.tone(48, 28, 0.14, 'sine', 0.32, 0, false), 140);
        }, 820);
      }
    } else {
      // Restore full audio fidelity
      this.lowPassFilter.frequency.exponentialRampToValueAtTime(22050, t + 0.3);
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
    }
  }

  shootPulse() {
    this.burst(0.08, 2200, 0.22, 'bandpass');
    this.tone(260, 75, 0.09, 'sawtooth', 0.2);
  }

  shootShotgun() {
    this.burst(0.2, 950, 0.42, 'lowpass');
    this.tone(140, 38, 0.22, 'square', 0.32);
  }

  shootRail() {
    this.tone(1400, 180, 0.32, 'sawtooth', 0.3);
    this.tone(620, 1800, 0.22, 'sine', 0.22);
    this.burst(0.18, 3500, 0.25, 'highpass');
  }

  jump(doubleJump = false) {
    this.tone(doubleJump ? 240 : 150, doubleJump ? 620 : 380, 0.14, 'sine', 0.18);
    if (doubleJump) this.burst(0.1, 1400, 0.16);
  }

  dash() {
    this.burst(0.16, 2600, 0.28, 'bandpass');
    this.tone(520, 120, 0.16, 'triangle', 0.24);
  }

  explode() {
    this.burst(0.48, 520, 0.5, 'lowpass');
    this.tone(110, 26, 0.45, 'sawtooth', 0.38);
  }

  shield() {
    this.tone(320, 880, 0.25, 'sine', 0.24);
  }

  reflect() {
    this.tone(880, 1760, 0.12, 'triangle', 0.25);
  }

  redEye() {
    this.tone(180, 960, 0.45, 'sawtooth', 0.32);
    this.tone(960, 220, 0.55, 'sine', 0.25);
  }

  reload() {
    this.tone(420, 280, 0.08, 'triangle', 0.16);
    setTimeout(() => this.tone(580, 880, 0.1, 'square', 0.18), 180);
  }

  hit() {
    this.tone(520, 240, 0.05, 'triangle', 0.12);
  }

  hurt() {
    this.tone(160, 55, 0.22, 'sawtooth', 0.3);
    this.burst(0.15, 700, 0.25);
  }

  bossRoar() {
    this.tone(95, 38, 0.85, 'sawtooth', 0.42);
    this.burst(0.7, 400, 0.35);
  }

  // Tip 33: Boss Posture Break / Stagger SFX
  bossStagger() {
    this.burst(0.45, 900, 0.45, 'bandpass');
    this.tone(180, 45, 0.48, 'sawtooth', 0.45);
    setTimeout(() => this.tone(90, 30, 0.35, 'square', 0.35), 80);
  }

  // Tip 37: Enraged Phase Shift SFX
  bossPhaseShift() {
    this.tone(60, 180, 0.95, 'sawtooth', 0.48);
    this.burst(0.85, 500, 0.4);
    setTimeout(() => this.tone(220, 110, 0.65, 'square', 0.38), 120);
  }

  // Tip 32: Desperation Ultimate Charge SFX
  bossUltimateCharge() {
    this.tone(120, 480, 1.4, 'sine', 0.38);
    this.burst(1.2, 1200, 0.3, 'bandpass');
  }

  powerup() {
    this.tone(440, 880, 0.15, 'triangle', 0.22);
    setTimeout(() => this.tone(660, 1320, 0.22, 'triangle', 0.22), 110);
  }

  swordSlash() {
    this.burst(0.11, 3200, 0.3, 'bandpass');
    this.tone(780, 140, 0.13, 'sawtooth', 0.28);
  }

  gloryKill() {
    this.burst(0.28, 1600, 0.45, 'lowpass');
    this.tone(240, 960, 0.24, 'sawtooth', 0.35);
    setTimeout(() => this.tone(880, 110, 0.28, 'square', 0.35), 90);
  }

  grapple() {
    this.tone(360, 1280, 0.16, 'triangle', 0.24);
    this.burst(0.09, 2800, 0.2, 'highpass');
  }

  teslaArc() {
    this.burst(0.06, 4200, 0.16, 'bandpass');
    this.tone(920 + Math.random() * 480, 320, 0.06, 'sawtooth', 0.14);
  }

  bfgShoot() {
    this.tone(110, 680, 0.38, 'sawtooth', 0.36);
    this.tone(440, 88, 0.42, 'sine', 0.3);
  }

  bfgDetonate() {
    this.burst(0.75, 380, 0.55, 'lowpass');
    this.tone(90, 22, 0.75, 'sawtooth', 0.48);
    this.tone(640, 80, 0.55, 'sine', 0.32);
  }

  chestOpen() {
    this.tone(523, 659, 0.12, 'triangle', 0.25);
    setTimeout(() => this.tone(659, 1046, 0.25, 'triangle', 0.28), 110);
  }

  levelUp() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, f * 1.01, 0.2, 'triangle', 0.24), i * 90));
  }

  parry() {
    this.tone(1500, 600, 0.18, 'square', 0.28);
    this.tone(900, 1800, 0.14, 'triangle', 0.26);
    this.burst(0.1, 5000, 0.3, 'highpass');
  }

  reaction() {
    this.burst(0.3, 900, 0.4, 'lowpass');
    this.tone(300, 900, 0.22, 'sawtooth', 0.28);
  }

  bossRoar() {
    this.burst(0.85, 320, 0.65, 'lowpass');
    this.tone(85, 24, 0.85, 'sawtooth', 0.55);
    this.tone(140, 40, 0.65, 'square', 0.35);
  }

  cutsceneSting() {
    try {
      this.resume();
      this.burst(1.4, 280, 0.45, 'lowpass');
      this.tone(55, 32, 1.6, 'sawtooth', 0.4);
      this.tone(110, 55, 1.2, 'sine', 0.3);
      this.tone(82.4, 41.2, 1.4, 'triangle', 0.25);
    } catch { /* ignore */ }
  }

  dialogueTick() {
    try {
      this.resume();
      this.burst(0.025, 3200, 0.08, 'bandpass');
      this.tone(420, 220, 0.03, 'sine', 0.06);
    } catch { /* ignore */ }
  }

  lullabyChime() {
    try {
      this.resume();
      const notes = [587.33, 659.25, 880, 1046.5];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.tone(freq, freq * 0.99, 0.6, 'sine', 0.18);
          this.tone(freq * 2, freq * 1.98, 0.4, 'triangle', 0.08);
        }, idx * 160);
      });
    } catch { /* ignore */ }
  }

  toggleMute() {
    this.muted = !this.muted;
    this.master.gain.value = this.muted ? 0 : 0.45;
    return this.muted;
  }

  setCombatIntensity(intensity = 0) {
    this.combatIntensity = Math.max(0, Math.min(1, intensity));
  }

  /** Simple procedural dark-synth loop with interactive combat layering */
  startMusic(theme = 0) {
    this.stopMusic();
    this.currentTheme = theme;
    this.currentPhase = 1;
    this.combatIntensity = 0;
    const roots = [55, 51.9, 58.3, 49, 46.2, 61.7];
    const root = roots[theme % roots.length];
    const bass = [0, 0, 3, 0, 5, 0, 3, 7];
    const lead = [12, 15, 19, 15, 17, 15, 12, 10];
    let step = 0;
    this.musicTimer = setInterval(() => {
      if (this.ctx.state !== 'running' || this.muted) return;
      const b = root * Math.pow(2, bass[step % 8] / 12);

      // Ambient drone layer: always softly present in background
      if (step % 8 === 0) {
        this.tone(root, root * 1.002, 1.8, 'sine', 0.035, 0, false);
      }

      // Bassline: scales with combat intensity
      const bassVol = 0.02 + this.combatIntensity * 0.045;
      this.tone(b, b * 0.985, 0.32, 'sawtooth', bassVol, 0, false);

      // High lead synth: plays during exploration and intensifies in combat
      if (step % 2 === 0 || this.combatIntensity > 0.6) {
        const l = root * Math.pow(2, lead[(step >> 1) % 8] / 12) * 2;
        this.tone(l, l, 0.18, 'triangle', 0.015 + this.combatIntensity * 0.025, 0, false);
      }

      // Percussion layer: driving kicks and snares kick in during active combat
      if (this.combatIntensity > 0.25) {
        if (step % 4 === 0) this.burst(0.08, 220, 0.04 + this.combatIntensity * 0.07, 'lowpass');
        if (step % 4 === 2) this.burst(0.05, 7000, 0.02 + this.combatIntensity * 0.04, 'highpass');
        if (this.combatIntensity > 0.75 && step % 4 === 3) this.burst(0.03, 3000, 0.03, 'bandpass');
      }
      step++;
    }, 235);
  }

  // Tip 37: Dynamic Boss Phase Music Transition (furious double-kick percussion and distorted synths)
  setBossPhaseMusic(phase = 2) {
    if (this.currentPhase === phase) return;
    this.currentPhase = phase;
    if (this.musicTimer) clearInterval(this.musicTimer);
    const roots = [55, 51.9, 58.3, 49, 46.2, 61.7];
    const root = (roots[(this.currentTheme || 0) % roots.length] || 55) * (phase >= 2 ? 0.85 : 1.0);
    const bass = phase >= 2 ? [0, 3, 0, 7, 0, 3, 5, 10] : [0, 0, 3, 0, 5, 0, 3, 7];
    const tempo = phase >= 2 ? 152 : 235; // Accelerated double-kick tempo
    let step = 0;
    this.musicTimer = setInterval(() => {
      if (this.ctx.state !== 'running' || this.muted) return;
      const b = root * Math.pow(2, bass[step % bass.length] / 12);
      this.tone(b, b * 0.97, 0.22, 'sawtooth', phase >= 2 ? 0.08 : 0.05);
      if (phase >= 2) {
        // Enraged double-kick war drums & distorted snare
        if (step % 2 === 0) this.burst(0.1, 140, 0.16, 'lowpass');
        if (step % 4 === 2) this.burst(0.06, 6200, 0.08, 'highpass');
        if (step % 8 === 7) this.burst(0.14, 400, 0.12, 'bandpass');
      } else {
        if (step % 4 === 0) this.burst(0.07, 220, 0.09, 'lowpass');
        if (step % 4 === 2) this.burst(0.04, 7000, 0.03, 'highpass');
      }
      step++;
    }, tempo);
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}
