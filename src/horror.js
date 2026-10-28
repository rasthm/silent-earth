/**
 * HORROR — darkness, light, hellish atmosphere, the Mourner, scares and dread audio.
 *
 *  - The world is drowned in red-black darkness. Rika's lantern, torches, lava cracks, gunfire,
 *    projectiles and bosses carve light out of it. Demons outside the light are only eyes.
 *  - Hell bleeds through: burning horizon, impaled silhouettes, falling ash, lava veins in the floor.
 *  - The Mourner stalks every act. It creeps closer only while Rika's back is turned; face it in
 *    the light and it shrieks and fades. Shoot it and it flees. Let it reach you and it takes you.
 *  - Scripted dread: lantern blackouts, whispers in Lyra's voice, words in blood on the walls,
 *    shapes at the edge of the light, distant screams.
 */

const TAU = Math.PI * 2;

const WHISPERS = [
  'Rika…',
  'you promised you would come back for me',
  'it is so cold down here, sister',
  'why did you leave me in the dark?',
  'I broke the seal. I wanted you to hear me.',
  'don’t turn around',
  'it’s right behind you',
  'sing for me…',
  'three hundred years. I counted every one.',
  'they were never the monsters, Rika',
  'the light is going out',
  'I can hear your heart',
];

const WALL_WORDS = [
  'SHE IS STILL SINGING',
  'TURN BACK',
  'IT FOLLOWS THE LIGHT',
  'WE WERE HER CHOIR',
  'DON’T LOOK BEHIND YOU',
  'LYRA LIED',
  'NO ONE LEAVES',
  'IT WEARS OUR FACES',
];

// Darkness strength per act (higher = darker). Boss fights ease off so they stay readable.
const ACT_DARK = [0.93, 0.95, 0.94, 0.96, 0.97];

function hash(n) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

export class Horror {
  constructor(game) {
    this.game = game;
    this.dark = document.createElement('canvas');
    this.dctx = this.dark.getContext('2d');
    this.grain = this.makeGrain();
    this.lightSprite = this.makeLightSprite();
    this.darkness = 1; // player setting multiplier (Settings › Darkness)
    this.cracksFor = new WeakMap();
    this.whispers = [];
    this.handprints = [];
    this.phantom = null;
    this.flicker = 1;
    this.blackout = 0;
    this.flickerHard = 0;
    this.scareT = 22;
    this.jump = 0;
    this.tear = 0;
    this.mourner = { state: 'away', t: 38, x: 0, seen: false, stare: 0, hp: 0 };
    this.audio = null;
    this.heartT = 0;
    this.bindSettings();
  }

  bindSettings() {
    const s = document.getElementById('slider-dark');
    if (!s) return;
    try {
      const saved = localStorage.getItem('se_darkness');
      if (saved !== null) s.value = saved;
    } catch { /* storage unavailable */ }
    const apply = () => {
      this.darkness = Number(s.value) / 100;
      const v = document.getElementById('val-dark');
      if (v) v.textContent = `${s.value}%`;
      try { localStorage.setItem('se_darkness', s.value); } catch { /* ignore */ }
    };
    s.addEventListener('input', apply);
    apply();
  }

  /** One soft radial falloff, stamped (scaled) for every light: far cheaper than per-light gradients. */
  makeLightSprite() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const x = c.getContext('2d');
    const lg = x.createRadialGradient(64, 64, 64 * 0.15, 64, 64, 64);
    lg.addColorStop(0, 'rgba(0,0,0,1)');
    lg.addColorStop(0.6, 'rgba(0,0,0,0.55)');
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = lg;
    x.fillRect(0, 0, 128, 128);
    return c;
  }

  makeGrain() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const x = c.getContext('2d');
    const img = x.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = v;
      img.data[i + 1] = v * 0.9;
      img.data[i + 2] = v * 0.85;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  get active() {
    const g = this.game;
    return g.stage && (g.mode === 'campaign' || g.mode === 'arena' || g.mode === 'boss_rush');
  }

  /** Stalker and scare events only happen in the story (not in arenas or boss rush). */
  get storyMode() {
    const g = this.game;
    return g.mode === 'campaign' && g.state === 'playing' && !(g.stage?.bossSpawned && !g.stage?.bossDefeated);
  }

  onStage() {
    this.mourner = { state: 'away', t: 35 + Math.random() * 15, x: 0, seen: this.mourner.seen, stare: 0, hp: 0 };
    this.scareT = 16 + Math.random() * 10;
    this.whispers = [];
    this.handprints = [];
    this.blackout = 0;
    this.startAmbience();
  }

  // -------------------------------------------------------------------------
  // Audio: drones, whispers, screams, stingers, heartbeat, the warped lullaby
  // -------------------------------------------------------------------------

  get ac() {
    return this.game.sfx?.ctx;
  }

  startAmbience() {
    const sfx = this.game.sfx;
    if (!sfx || this.audio) return;
    try {
      const ctx = sfx.ctx;
      const out = ctx.createGain();
      out.gain.value = 0;
      out.gain.linearRampToValueAtTime(1, ctx.currentTime + 4);
      out.connect(sfx.master);
      // Two detuned sub-drones through a breathing low-pass
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 160;
      filt.Q.value = 6;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.07;
      lfoGain.gain.value = 90;
      lfo.connect(lfoGain);
      lfoGain.connect(filt.frequency);
      const g1 = ctx.createGain();
      g1.gain.value = 0.11;
      for (const f of [36.7, 38.9, 55.1]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.connect(filt);
        o.start();
      }
      filt.connect(g1);
      g1.connect(out);
      // Rumbling furnace of hell (filtered noise)
      const n = ctx.createBufferSource();
      n.buffer = sfx.noiseBuf;
      n.loop = true;
      const nf = ctx.createBiquadFilter();
      nf.type = 'lowpass';
      nf.frequency.value = 110;
      const ng = ctx.createGain();
      ng.gain.value = 0.2;
      n.connect(nf);
      nf.connect(ng);
      ng.connect(out);
      n.start();
      lfo.start();
      this.audio = { out };
    } catch { /* audio unavailable */ }
  }

  stopAmbience() {
    if (!this.audio) return;
    try {
      const t = this.ac.currentTime;
      this.audio.out.gain.cancelScheduledValues(t);
      this.audio.out.gain.setValueAtTime(this.audio.out.gain.value, t);
      this.audio.out.gain.linearRampToValueAtTime(0, t + 1.5);
      const dead = this.audio.out;
      setTimeout(() => dead.disconnect(), 1700);
    } catch { /* ignore */ }
    this.audio = null;
  }

  /** A breathy, syllabic whisper made from band-passed noise. */
  whisperSound(pan = (Math.random() - 0.5) * 1.6, vol = 0.5) {
    const sfx = this.game.sfx;
    if (!sfx) return;
    try {
      const ctx = sfx.ctx;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = sfx.noiseBuf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2200;
      bp.Q.value = 3;
      const g = ctx.createGain();
      g.gain.value = 0;
      const syll = 5 + Math.floor(Math.random() * 6);
      for (let i = 0; i < syll; i++) {
        const st = t + i * 0.16 + Math.random() * 0.05;
        g.gain.setTargetAtTime(vol * (0.4 + Math.random() * 0.6), st, 0.02);
        g.gain.setTargetAtTime(0.0001, st + 0.08, 0.03);
        bp.frequency.setValueAtTime(1600 + Math.random() * 2200, st);
      }
      const p = sfx.createPanner(pan);
      src.connect(bp);
      bp.connect(g);
      if (p) {
        g.connect(p);
        p.connect(sfx.master);
      } else g.connect(sfx.master);
      src.start(t);
      src.stop(t + syll * 0.17 + 0.3);
    } catch { /* ignore */ }
  }

  /** Distant, echoing scream of the damned. */
  screamSound(vol = 0.12, pan = (Math.random() - 0.5) * 2) {
    const sfx = this.game.sfx;
    if (!sfx) return;
    try {
      const ctx = sfx.ctx;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      const base = 520 + Math.random() * 300;
      o.frequency.setValueAtTime(base, t);
      o.frequency.linearRampToValueAtTime(base * 1.35, t + 0.25);
      o.frequency.exponentialRampToValueAtTime(base * 0.55, t + 1.6);
      const vib = ctx.createOscillator();
      const vg = ctx.createGain();
      vib.frequency.value = 7;
      vg.gain.value = 18;
      vib.connect(vg);
      vg.connect(o.frequency);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1100;
      f.Q.value = 2.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
      const p = sfx.createPanner(pan);
      o.connect(f);
      f.connect(g);
      if (p) {
        g.connect(p);
        p.connect(sfx.master);
      } else g.connect(sfx.master);
      o.start(t);
      vib.start(t);
      o.stop(t + 1.8);
      vib.stop(t + 1.8);
    } catch { /* ignore */ }
  }

  /** The jump-scare stinger: a dissonant shriek cluster over a sub-bass hit. */
  stinger() {
    const sfx = this.game.sfx;
    if (!sfx) return;
    for (const f of [233, 247, 311, 466, 622]) sfx.tone(f, f * 0.94, 1.1, 'sawtooth', 0.12, (Math.random() - 0.5), false);
    sfx.tone(48, 22, 0.8, 'sine', 0.6, 0, false);
    sfx.burst(0.5, 3000, 0.4, 'highpass');
    this.screamSound(0.3, 0);
  }

  heartbeat(vol) {
    const sfx = this.game.sfx;
    if (!sfx) return;
    sfx.tone(62, 38, 0.16, 'sine', vol, 0, false);
    setTimeout(() => sfx.tone(56, 34, 0.18, 'sine', vol * 0.8, 0, false), 190);
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  update(dt) {
    const g = this.game;
    if (!g.stage) return;
    const r = g.rika;

    // Lantern flicker: a living flame, guttering harder when something is near
    const m = this.mourner;
    const near = m.state === 'stalk' ? Math.max(0, 1 - Math.abs(m.x - r.x) / 600) : 0;
    const gutter = Math.max(this.flickerHard > 0 ? 0.8 : 0, near);
    const target = 1 - Math.random() * (0.06 + gutter * 0.55);
    this.flicker += (target - this.flicker) * Math.min(1, dt * (12 + gutter * 30));
    this.flickerHard = Math.max(0, this.flickerHard - dt);
    this.blackout = Math.max(0, this.blackout - dt);
    this.jump = Math.max(0, this.jump - dt);
    this.tear = Math.max(0, this.tear - dt);

    for (const w of this.whispers) w.t += dt;
    this.whispers = this.whispers.filter((w) => w.t < w.life);
    for (const h of this.handprints) h.t += dt;
    this.handprints = this.handprints.filter((h) => h.t < 5);
    if (this.phantom) {
      this.phantom.t += dt;
      if (this.phantom.t > this.phantom.life) this.phantom = null;
    }

    // Heartbeat quickens with low blood or a nearby stalker
    const fear = Math.max(near, r.hp < r.maxHp * 0.35 ? 0.6 : 0);
    if (fear > 0.15 && g.state === 'playing') {
      this.heartT -= dt;
      if (this.heartT <= 0) {
        this.heartT = 1.2 - fear * 0.75;
        this.heartbeat(0.18 + fear * 0.3);
      }
    }

    if (!this.storyMode) return;
    this.updateMourner(dt);

    this.scareT -= dt;
    if (this.scareT <= 0) {
      this.scareT = 22 + Math.random() * 24;
      this.randomScare();
    }
  }

  addWhisper(text) {
    const g = this.game;
    this.whispers.push({
      text: text || WHISPERS[Math.floor(Math.random() * WHISPERS.length)],
      x: 0.2 + Math.random() * 0.6,
      y: 0.25 + Math.random() * 0.4,
      t: 0,
      life: 4.2,
    });
    this.whisperSound();
    void g;
  }

  randomScare() {
    const g = this.game;
    const roll = Math.random();
    if (roll < 0.26) {
      // The lantern gutters and dies for a moment
      this.flickerHard = 2.6;
      setTimeout(() => {
        this.blackout = 1.4;
        this.whisperSound(0, 0.8);
      }, 900);
      setTimeout(() => this.addWhisper(), 2200);
    } else if (roll < 0.5) {
      this.addWhisper();
    } else if (roll < 0.68) {
      this.screamSound(0.16);
      g.addShake(4);
    } else if (roll < 0.84) {
      // Something watches from the edge of the light
      const r = g.rika;
      const side = Math.random() < 0.5 ? -1 : 1;
      this.phantom = { x: r.x + side * (260 + Math.random() * 80), t: 0, life: 0.55 };
      this.whisperSound(side * 0.8, 0.35);
    } else {
      // Bloody handprints smear across the screen
      for (let i = 0; i < 4; i++) {
        this.handprints.push({ x: Math.random() < 0.5 ? 0.04 + Math.random() * 0.14 : 0.82 + Math.random() * 0.14, y: 0.2 + Math.random() * 0.6, a: Math.random() * 0.8 - 0.4, t: -i * 0.18, s: 0.8 + Math.random() * 0.5 });
      }
      this.game.sfx?.burst?.(0.25, 600, 0.2, 'lowpass');
    }
  }

  updateMourner(dt) {
    const g = this.game;
    const r = g.rika;
    const m = this.mourner;
    if (m.state === 'away') {
      m.t -= dt;
      if (m.t <= 0) {
        m.state = 'stalk';
        m.x = r.x - r.facing * (720 + Math.random() * 120);
        m.x = Math.max(40, Math.min(g.stage.width - 40, m.x));
        m.stare = 0;
        m.hp = 3;
        m.life = 0;
        this.whisperSound(Math.sign(m.x - r.x) * 0.9, 0.7);
        if (!m.seen) {
          m.seen = true;
          setTimeout(() => this.addWhisper('something is following you. don’t turn your back on it.'), 600);
        } else if (Math.random() < 0.5) {
          this.addWhisper('don’t turn around');
        }
      }
      return;
    }
    if (m.state === 'flee') {
      m.t -= dt;
      m.x += m.dir * 900 * dt;
      if (m.t <= 0) this.mournerGone();
      return;
    }

    m.life += dt;
    const dx = m.x - r.x;
    const dist = Math.abs(dx);
    const facingIt = Math.sign(dx) === r.facing;
    const lightR = this.lanternRadius();

    if (!facingIt) {
      // Back turned: it glides closer, faster the longer it hunts
      const sp = 90 + Math.min(150, m.life * 6);
      m.x -= Math.sign(dx) * sp * dt;
      m.stare = Math.max(0, m.stare - dt);
      m.twitch = 0;
    } else if (dist < lightR + 60) {
      // Caught in the light: it freezes, then shrieks and fades
      m.stare += dt;
      m.twitch = 1;
      if (m.stare > 1.1) {
        this.screamSound(0.22, Math.sign(dx) * 0.6);
        this.flickerHard = 1;
        this.startFlee(Math.sign(dx));
        return;
      }
    } else {
      m.twitch = 0;
    }

    // Shot by anything Rika fires
    for (const b of g.bullets) {
      if (b.fromPlayer && Math.abs(b.x - m.x) < 26 && b.y > g.stage.groundY - 200 && b.y < g.stage.groundY) {
        b.life = 0;
        m.hp--;
        g.spawnParticles(m.x, b.y, 8, '#d8d0c8', 180);
        if (m.hp <= 0) {
          this.screamSound(0.25, Math.sign(dx) * 0.6);
          this.startFlee(Math.sign(dx));
          return;
        }
      }
    }

    // It reached her
    if (dist < 34 && g.state === 'playing') {
      this.jumpScare();
      const before = r.hp;
      r.takeDamage(32, g);
      if (r.hp === before && !g.godMode) r.hp = Math.max(1, r.hp - 20);
      this.mournerGone();
    }
  }

  startFlee(dir) {
    const m = this.mourner;
    m.state = 'flee';
    m.dir = dir;
    m.t = 0.5;
    this.game.toast?.('IT RETREATS INTO THE DARK', 'Face it in the light, or shoot it, to drive it away.', '#d8d0c8');
  }

  mournerGone() {
    const m = this.mourner;
    m.state = 'away';
    m.t = 55 + Math.random() * 45;
  }

  jumpScare() {
    const g = this.game;
    this.jump = 0.55;
    this.tear = 0.7;
    this.stinger();
    g.addShake(30);
    g.flashColor = '#3a0000';
    g.flashAlpha = 0.6 * (g.flashMult ?? 1);
  }

  lanternRadius() {
    const r = this.game.rika;
    let rad = 250 * this.flicker;
    if (r.redEyeTimer > 0) rad = 360;
    if (this.blackout > 0) rad *= 0.12;
    return rad;
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  cracks(st) {
    let list = this.cracksFor.get(st);
    if (!list) {
      list = [];
      for (let x = 420, i = 0; x < st.width - 200; i++) {
        x += 260 + hash(i + st.width) * 380;
        list.push({ x, w: 50 + hash(i * 3.7) * 110, seed: i });
      }
      const words = [];
      for (let x = 900, i = 0; x < st.width - 600; i++) {
        x += 1100 + hash(i * 9.1 + st.width) * 900;
        words.push({ x, y: st.groundY - 190 - hash(i * 5.3) * 120, text: WALL_WORDS[(i + Math.floor(st.width / 100)) % WALL_WORDS.length], rot: (hash(i * 2.2) - 0.5) * 0.12 });
      }
      list.words = words;
      this.cracksFor.set(st, list);
    }
    return list;
  }

  /** Hell bleeding through behind the catacombs (screen space, before parallax decor). */
  renderBackground(ctx, w, h) {
    const g = this.game;
    const st = g.stage;
    const t = g.time;
    // Burning horizon
    const hz = ctx.createLinearGradient(0, h * 0.35, 0, h);
    hz.addColorStop(0, 'rgba(120,10,0,0)');
    hz.addColorStop(0.6, 'rgba(170,30,8,0.28)');
    hz.addColorStop(1, 'rgba(255,80,20,0.38)');
    ctx.fillStyle = hz;
    ctx.fillRect(0, 0, w, h);
    // Slow, boiling blood-cloud bands
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 420 - g.camX * 0.03 + t * (6 + i * 2)) % (w + 600)) - 300;
      const cy = 80 + i * 38 + Math.sin(t * 0.2 + i) * 10;
      const cg = ctx.createRadialGradient(cx, cy, 10, cx, cy, 260);
      cg.addColorStop(0, `rgba(${90 + i * 10},10,8,0.22)`);
      cg.addColorStop(1, 'rgba(40,0,0,0)');
      ctx.fillStyle = cg;
      ctx.fillRect(cx - 260, cy - 260, 520, 520);
    }
    ctx.restore();
    // Distant impaled silhouettes on spikes (deep parallax)
    const base = st.groundY - g.camY - 20;
    ctx.fillStyle = 'rgba(14,3,4,0.9)';
    const off = g.camX * 0.12;
    for (let i = Math.floor(off / 160) - 1; i < Math.floor(off / 160) + w / 160 + 2; i++) {
      const x = i * 160 - off + hash(i) * 60;
      const sh = 140 + hash(i * 1.7) * 160;
      ctx.beginPath();
      ctx.moveTo(x - 3, base);
      ctx.lineTo(x, base - sh);
      ctx.lineTo(x + 3, base);
      ctx.fill();
      if (hash(i * 4.1) > 0.45) {
        // A body slumped on the spike
        const by = base - sh + 30 + hash(i * 2.9) * 20;
        ctx.beginPath();
        ctx.ellipse(x, by, 7, 16, 0.2, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 4, by - 18, 5, 0, TAU);
        ctx.fill();
        ctx.fillRect(x - 10, by - 4, 6, 18);
        ctx.fillRect(x + 4, by + 10, 4, 20);
      }
    }
    // Ash drifting down
    ctx.fillStyle = 'rgba(190,170,160,0.35)';
    for (let i = 0; i < 70; i++) {
      const ax = (hash(i) * w * 1.3 - g.camX * 0.25 + Math.sin(t * 0.6 + i) * 20) % (w + 40);
      const ay = (hash(i * 7.3) * h + t * (14 + hash(i * 2) * 20)) % h;
      ctx.fillRect(ax < 0 ? ax + w : ax, ay, 1.6, 1.6);
    }
  }

  /** World-space hell details: lava veins in the floor and words in blood on the walls. */
  renderWorld(ctx) {
    const g = this.game;
    const st = g.stage;
    const t = g.time;
    const list = this.cracks(st);
    const x0 = g.camX - 200;
    const x1 = g.camX + g.viewW + 200;
    const gy = st.groundY;

    for (const wd of list.words) {
      if (wd.x < x0 - 400 || wd.x > x1 + 400) continue;
      ctx.save();
      ctx.translate(wd.x, wd.y);
      ctx.rotate(wd.rot);
      ctx.font = 'italic 700 30px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(120,6,10,0.85)';
      ctx.fillText(wd.text, 0, 0);
      // Drips running from the letters
      const tw = ctx.measureText(wd.text).width;
      for (let i = 0; i < 9; i++) {
        const dx = -tw / 2 + hash(i + wd.x) * tw;
        const len = 10 + hash(i * 3 + wd.x) * 40 + Math.min(20, ((t * 4 + i * 7) % 60));
        ctx.fillRect(dx, 2, 2, len);
        ctx.beginPath();
        ctx.arc(dx + 1, 2 + len, 2.2, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();
    for (const c of list) {
      if (c.x < x0 || c.x > x1) continue;
      const pulse = 0.65 + Math.sin(t * 2.2 + c.seed) * 0.25;
      // Glowing seam along the floor
      ctx.strokeStyle = `rgba(255,${90 + pulse * 60},20,${0.9 * pulse})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(c.x, gy + 1);
      let px = c.x;
      for (let k = 1; k <= 6; k++) {
        px = c.x + (c.w * k) / 6;
        ctx.lineTo(px, gy + 1 + (hash(c.seed * 9 + k) * 10) * (k % 2));
      }
      ctx.stroke();
      // Molten fissure down into the stone
      ctx.beginPath();
      ctx.moveTo(c.x + c.w * 0.4, gy + 2);
      ctx.lineTo(c.x + c.w * 0.45 + 6, gy + 20);
      ctx.lineTo(c.x + c.w * 0.38, gy + 38);
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      const lg = ctx.createRadialGradient(c.x + c.w / 2, gy, 2, c.x + c.w / 2, gy, c.w * 0.9);
      lg.addColorStop(0, `rgba(255,90,20,${0.45 * pulse})`);
      lg.addColorStop(1, 'rgba(255,40,0,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(c.x - c.w * 0.4, gy - c.w * 0.9, c.w * 1.8, c.w * 1.3);
      // Embers spitting up
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.7 + i / 3 + c.seed * 0.13) % 1;
        ctx.fillStyle = `rgba(255,${150 + i * 30},60,${1 - k})`;
        ctx.fillRect(c.x + c.w * hash(c.seed + i), gy - k * 90, 2, 2);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  /** The Mourner and the edge-of-light phantom (world space, under the darkness). */
  renderActors(ctx) {
    const g = this.game;
    const gy = g.stage.groundY;
    const m = this.mourner;
    if (m.state === 'stalk' || m.state === 'flee') {
      ctx.save();
      if (m.state === 'flee') ctx.globalAlpha = Math.max(0, m.t / 0.5);
      this.drawMourner(ctx, m.x, gy, Math.sign(g.rika.x - m.x) || 1, g.time, m.twitch);
      ctx.restore();
    }
    if (this.phantom) {
      const p = this.phantom;
      ctx.save();
      ctx.globalAlpha = Math.sin((p.t / p.life) * Math.PI) * 0.85;
      ctx.fillStyle = '#040102';
      ctx.beginPath();
      ctx.ellipse(p.x, gy - 70, 16, 70, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, gy - 150, 13, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  drawMourner(ctx, x, gy, facing, t, twitch) {
    const jit = twitch ? (Math.random() - 0.5) * 3 : 0;
    ctx.save();
    ctx.translate(x + jit, gy);
    ctx.scale(facing, 1);
    const skin = '#cfc6bc';
    const shade = '#7a7068';
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 5, 0, 0, TAU);
    ctx.fill();
    // Impossibly thin legs
    ctx.strokeStyle = shade;
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-6, -96);
    ctx.lineTo(-9, -48);
    ctx.lineTo(-6, 0);
    ctx.moveTo(6, -96);
    ctx.lineTo(10, -50);
    ctx.lineTo(8, 0);
    ctx.stroke();
    // Ragged shroud
    ctx.fillStyle = '#2a2624';
    ctx.beginPath();
    ctx.moveTo(-16, -168);
    ctx.lineTo(16, -168);
    ctx.lineTo(22, -90);
    for (let i = 0; i < 6; i++) ctx.lineTo(22 - i * 8.8, -80 + (i % 2) * 14 + Math.sin(t * 3 + i) * 3);
    ctx.closePath();
    ctx.fill();
    // Ribs pressing through the cloth
    ctx.strokeStyle = 'rgba(207,198,188,0.5)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(2, -150 + i * 10, 10 - i, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    // Arms far too long, hanging past the knees, fingers twitching
    ctx.strokeStyle = skin;
    ctx.lineWidth = 4;
    const sway = Math.sin(t * 1.3) * 3;
    for (const [sx, dir] of [[-14, -1], [14, 1]]) {
      ctx.beginPath();
      ctx.moveTo(sx, -164);
      ctx.lineTo(sx + dir * 10, -110 + sway);
      ctx.lineTo(sx + dir * 6 + 8, -40 + sway);
      ctx.stroke();
      ctx.lineWidth = 1.6;
      for (let f = 0; f < 4; f++) {
        ctx.beginPath();
        ctx.moveTo(sx + dir * 6 + 8, -40 + sway);
        ctx.lineTo(sx + dir * 6 + 6 + f * 3, -18 + sway + (twitch ? Math.random() * 6 : 0));
        ctx.stroke();
      }
      ctx.lineWidth = 4;
    }
    // Head tilted at a wrong angle, hair hanging over a gaping mouth
    ctx.save();
    ctx.translate(4, -184);
    ctx.rotate(0.45 + (twitch ? (Math.random() - 0.5) * 0.3 : Math.sin(t * 0.7) * 0.05));
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 19, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#050203';
    ctx.beginPath();
    ctx.ellipse(-4, -4, 3.4, 5, 0, 0, TAU);
    ctx.ellipse(6, -4, 3.4, 5, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(1, 10, 5, 9 + (twitch ? 3 : 0), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#0a0606';
    for (let i = 0; i < 9; i++) {
      ctx.fillRect(-14 + i * 3.4, -18, 2.6, 26 + hash(i) * 34);
    }
    ctx.restore();
    ctx.restore();
  }

  /** Builds the darkness layer by punching light out of a red-black veil. */
  renderDarkness(ctx, w, h, shakeX, shakeY) {
    const g = this.game;
    const st = g.stage;
    const r = g.rika;
    const scale = g.viewScale;
    const pw = Math.round(w * scale);
    const ph = Math.round(h * scale);
    if (this.dark.width !== pw || this.dark.height !== ph) {
      this.dark.width = pw;
      this.dark.height = ph;
    }
    const d = this.dctx;
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, pw, ph);

    const bossFight = st.bossSpawned && !st.bossDefeated;
    let level = g.expansion?.inDungeon ? 0.95 : g.mode === 'campaign' ? (ACT_DARK[g.stageIndex] ?? 0.9) : 0.78;
    if (bossFight) level = Math.min(level, 0.74);
    level *= this.darkness;
    if (this.blackout > 0) level = Math.max(level, 0.985 * Math.max(0.6, this.darkness));
    if (g.flashAlpha > 0) level *= 1 - Math.min(0.6, g.flashAlpha);
    if (level <= 0.01) return;

    d.fillStyle = `rgba(9,0,2,${level})`;
    d.fillRect(0, 0, pw, ph);

    // World → darkness-canvas transform (matches the camera, zoom and shake)
    d.setTransform(scale, 0, 0, scale, 0, 0);
    if (g.camZoom !== 1) {
      d.translate(w * 0.5, h * 0.5);
      d.scale(g.camZoom, g.camZoom);
      d.translate(-w * 0.5, -h * 0.5);
    }
    d.translate(-g.camX + shakeX, -g.camY + shakeY);
    d.globalCompositeOperation = 'destination-out';
    const x0 = g.camX - 300;
    const x1 = g.camX + w + 300;
    const sprite = this.lightSprite;
    const light = (x, y, rad, strength = 1) => {
      if (x < x0 || x > x1 || rad <= 1) return;
      d.globalAlpha = strength;
      d.drawImage(sprite, x - rad, y - rad, rad * 2, rad * 2);
    };

    // Rika's lantern (+ muzzle flash)
    light(r.x, r.y - 48, this.lanternRadius(), 1);
    if (r.muzzleFlash > 0) light(r.x + Math.cos(r.aimAngle) * 40, r.y - 46, 300, 0.7);
    for (const tc of st.torches || []) light(tc.x, tc.y, 100 + Math.sin(g.time * 9 + tc.phase) * 8, 0.6);
    for (const c of this.cracks(st)) light(c.x + c.w / 2, st.groundY, 50 + c.w * 0.45, 0.4);
    for (const b of st.beacons || []) if (b.lit) light(b.x, st.groundY - 40, 220, 0.9);
    for (const ch of st.chests || []) if (!ch.opened) light(ch.x, ch.y - 20, 55, 0.45);
    for (const dr of st.dungeonDoors || []) if (!dr.cleared) light(dr.x, st.groundY - 80, 150, 0.7);
    if (g.expansion?.inDungeon) {
      for (const p of g.expansion.dungeon.portals) light(p.x, st.groundY - 70, 160, 0.8);
      for (const a of g.expansion.dungeon.altars) if (!a.claimed) light(a.x, st.groundY - 80, 170, 0.9);
    }
    if (st.merchant) light(st.merchant.x, st.merchant.y - 40, 130, 0.7);
    if (st.sanctuary) light(st.sanctuary.x, st.groundY - 40, 170, 0.8);
    // Every projectile carries its own light so nothing can hit Rika unseen
    let n = 0;
    for (const b of g.bullets) {
      if (n++ > 60) break;
      light(b.x, b.y, b.fromPlayer ? 46 : 58, 0.9);
    }
    for (const s of g.expansion?.shots || []) light(s.x, s.y, s.kind === 'pillar' ? 120 : 60, 0.8);
    for (const gr of g.grenades) light(gr.x, gr.y, 60, 0.8);
    for (const o of g.bfgOrbs) light(o.x, o.y, 160, 0.9);
    for (const bm of g.beams) light((bm.x1 + bm.x2) / 2, (bm.y1 + bm.y2) / 2, 220, 0.6 * (bm.life / bm.maxLife));
    for (const p of g.particles) {
      if (p.size > 3 && p.life > p.maxLife * 0.6 && n++ < 120) light(p.x, p.y, 30, 0.4);
    }
    // Lords and secret bosses burn bright enough to fight
    for (const e of g.enemies) {
      if (e.dead) continue;
      if (e.isBoss || e.isSecretBoss || e.isMidBoss) light(e.x, e.y - e.h * 0.5, Math.max(e.w, e.h) * 1.3, 0.75);
    }

    d.globalAlpha = 1;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.dark, 0, 0, w, h);
    // Hellfire breathing up from below, over the dark
    ctx.globalCompositeOperation = 'lighter';
    const floorY = (st.groundY - g.camY + shakeY);
    const ug = ctx.createLinearGradient(0, floorY - h * 0.5, 0, h);
    ug.addColorStop(0, 'rgba(120,10,0,0)');
    ug.addColorStop(0.7, `rgba(150,22,4,${0.1 + Math.sin(g.time * 0.8) * 0.03})`);
    ug.addColorStop(1, 'rgba(200,40,6,0.18)');
    ctx.fillStyle = ug;
    ctx.fillRect(0, floorY - h * 0.5, w, h);
    ctx.restore();

    // Eyes in the dark: demons beyond the light are only a pair of burning points
    this.renderEyes(ctx, w, h, shakeX, shakeY, level);
  }

  renderEyes(ctx, w, h, shakeX, shakeY, level) {
    const g = this.game;
    const r = g.rika;
    const lr = this.lanternRadius();
    const toScreen = (wx, wy) => {
      let sx = wx - g.camX + shakeX;
      let sy = wy - g.camY + shakeY;
      if (g.camZoom !== 1) {
        sx = (sx - w / 2) * g.camZoom + w / 2;
        sy = (sy - h / 2) * g.camZoom + h / 2;
      }
      return [sx, sy];
    };
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const draw = (wx, wy, col, size, sep, alpha) => {
      const [sx, sy] = toScreen(wx, wy);
      if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) return;
      const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, 16 * size);
      gl.addColorStop(0, col.replace('ALPHA', String(0.45 * alpha)));
      gl.addColorStop(1, col.replace('ALPHA', '0'));
      ctx.fillStyle = gl;
      ctx.fillRect(sx - 16 * size, sy - 16 * size, 32 * size, 32 * size);
      ctx.fillStyle = col.replace('ALPHA', String(alpha));
      ctx.fillRect(sx - sep - 2 * size, sy - 1, 3 * size, 1.8 * size);
      ctx.fillRect(sx + sep - size, sy - 1, 3 * size, 1.8 * size);
    };
    for (const e of g.enemies) {
      if (e.dead || e.isBoss || e.isSecretBoss) continue;
      const d = Math.hypot(e.x - r.x, (e.y - e.h * 0.6) - (r.y - 48));
      const inDark = Math.max(0, Math.min(1, (d - lr * 0.55) / (lr * 0.5)));
      if (inDark <= 0.05) continue;
      const fly = e.flying;
      const ex = e.x + e.facing * e.w * 0.24;
      const ey = e.y - e.h * (fly ? 0.58 : 0.84);
      const blink = Math.sin(g.time * 0.9 + e.animPhase * 3) > -0.96 ? 1 : 0;
      const tele = e.telegraphing ? 1.6 : 1;
      const col = e.type === 'sniper' ? 'rgba(130,220,255,ALPHA)' : e.type === 'assassin' ? 'rgba(220,150,255,ALPHA)' : 'rgba(255,90,40,ALPHA)';
      draw(ex, ey, col, (e.h > 80 ? 1.3 : 1) * tele, 3.5 * (e.h / 64), inDark * blink * level);
    }
    const m = this.mourner;
    if (m.state === 'stalk') {
      const d = Math.abs(m.x - r.x);
      const inDark = Math.max(0, Math.min(1, (d - lr * 0.55) / (lr * 0.5)));
      if (inDark > 0.05) draw(m.x + 4, g.stage.groundY - 186, 'rgba(240,240,255,ALPHA)', 0.7, 5, inDark * level * 0.8);
    }
    ctx.restore();
  }

  /** Screen-space post: grain, low-blood pulse, whispers, handprints, jump scare, tearing. */
  renderPost(ctx, w, h) {
    const g = this.game;
    const r = g.rika;
    const t = g.time;

    // Bloody handprints
    for (const hp of this.handprints) {
      if (hp.t < 0) continue;
      const a = Math.min(1, hp.t * 4) * Math.max(0, 1 - (hp.t - 3) / 2);
      this.drawHand(ctx, hp.x * w, hp.y * h, hp.a, hp.s, a);
    }

    // Low blood: the screen pulses red at the edges
    if (r.hp < r.maxHp * 0.35 && g.state === 'playing') {
      const k = 1 - r.hp / (r.maxHp * 0.35);
      const pulse = 0.5 + Math.sin(t * (4 + k * 4)) * 0.5;
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
      vg.addColorStop(0, 'rgba(120,0,0,0)');
      vg.addColorStop(1, `rgba(150,0,6,${(0.25 + pulse * 0.3) * k})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    }

    // Whispers drifting across the screen
    for (const wsp of this.whispers) {
      const k = wsp.t / wsp.life;
      const a = Math.sin(k * Math.PI) * 0.75;
      ctx.save();
      ctx.font = 'italic 500 26px "Cormorant Garamond", Georgia, serif';
      ctx.textAlign = 'center';
      const x = wsp.x * w + Math.sin(t * 7 + wsp.x * 10) * 1.5;
      const y = wsp.y * h - k * 14;
      ctx.fillStyle = `rgba(230,200,200,${a * 0.35})`;
      ctx.fillText(wsp.text, x + 2, y + 1);
      ctx.fillStyle = `rgba(200,30,40,${a})`;
      ctx.fillText(wsp.text, x, y);
      ctx.restore();
    }

    // Film grain
    ctx.save();
    ctx.globalAlpha = 0.07;
    const ox = Math.floor(Math.random() * 256);
    const oy = Math.floor(Math.random() * 256);
    for (let x = -ox; x < w; x += 256) {
      for (let y = -oy; y < h; y += 256) ctx.drawImage(this.grain, x, y);
    }
    ctx.restore();

    // The face
    if (this.jump > 0) this.drawScareFace(ctx, w, h, this.jump / 0.55);

    // Signal tear: horizontal slices of the frame slip sideways
    if (this.tear > 0 || this.blackout > 0.9) {
      const cv = g.canvas;
      const s = g.viewScale;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (let i = 0; i < 5; i++) {
        const sy = Math.random() * cv.height;
        const sh = 6 + Math.random() * 40 * s;
        const off = (Math.random() - 0.5) * 60 * s;
        ctx.drawImage(cv, 0, sy, cv.width, sh, off, sy, cv.width, sh);
      }
      ctx.restore();
    }
  }

  drawHand(ctx, x, y, rot, s, a) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    ctx.fillStyle = `rgba(110,4,8,${0.75 * a})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 26, 0, 0, TAU);
    ctx.fill();
    for (let f = 0; f < 4; f++) {
      ctx.beginPath();
      ctx.ellipse(-15 + f * 10, -36 - (f === 1 || f === 2 ? 6 : 0), 4.5, 15, (f - 1.5) * 0.12, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(26, 2, 5, 13, -0.9, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 4; i++) ctx.fillRect(-14 + i * 9, 18, 2.5, 18 + hash(i + x) * 30);
    ctx.restore();
  }

  drawScareFace(ctx, w, h, k) {
    const cx = w / 2 + (Math.random() - 0.5) * 30;
    const cy = h / 2 + (Math.random() - 0.5) * 30;
    const s = Math.min(w, h) / 300 * (1.1 + (1 - k) * 0.4);
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${0.85 * k})`;
    ctx.fillRect(0, 0, w, h);
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.globalAlpha = Math.min(1, k * 1.6);
    const sk = ctx.createRadialGradient(0, -10, 10, 0, 0, 140);
    sk.addColorStop(0, '#e8e0d6');
    sk.addColorStop(1, '#4a3a34');
    ctx.fillStyle = sk;
    ctx.beginPath();
    ctx.ellipse(0, 0, 95, 130, 0.08, 0, TAU);
    ctx.fill();
    // Sunken, bruised sockets
    for (const ex of [-38, 38]) {
      const so = ctx.createRadialGradient(ex, -30, 10, ex, -30, 48);
      so.addColorStop(0, 'rgba(40,10,14,0.9)');
      so.addColorStop(1, 'rgba(60,20,24,0)');
      ctx.fillStyle = so;
      ctx.fillRect(ex - 48, -78, 96, 96);
    }
    // Veins crawling over the skin
    ctx.strokeStyle = 'rgba(90,20,40,0.55)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 10; i++) {
      let vx = (hash(i * 3.1) - 0.5) * 150;
      let vy = (hash(i * 7.7) - 0.5) * 200;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      for (let k = 0; k < 4; k++) {
        vx += (hash(i * 11 + k) - 0.5) * 30;
        vy += (hash(i * 13 + k) - 0.5) * 30;
        ctx.lineTo(vx, vy);
      }
      ctx.stroke();
    }
    // Hollow eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(-38, -30, 22, 30, 0.2, 0, TAU);
    ctx.ellipse(38, -30, 22, 30, -0.2, 0, TAU);
    ctx.fill();
    // Blood running from the eyes
    ctx.fillStyle = '#6a0006';
    for (const ex of [-38, 38]) {
      for (let i = 0; i < 3; i++) {
        const dx = ex - 10 + i * 9;
        ctx.fillRect(dx, -4, 3.5, 40 + hash(ex + i) * 70);
      }
    }
    ctx.fillStyle = '#ff2a2a';
    ctx.beginPath();
    ctx.arc(-36, -26, 3.5, 0, TAU);
    ctx.arc(36, -26, 3.5, 0, TAU);
    ctx.fill();
    // Mouth torn open far too wide
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, 62, 34, 62, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#d8ccb8';
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(-28 + i * 9, 6 + Math.abs(i - 3) * 3);
      ctx.lineTo(-24 + i * 9, 22 + Math.abs(i - 3) * 2);
      ctx.lineTo(-20 + i * 9, 6 + Math.abs(i - 3) * 3);
      ctx.fill();
    }
    // Hair
    ctx.fillStyle = '#050303';
    for (let i = 0; i < 26; i++) {
      if (hash(i * 5.5) < 0.3) continue;
      ctx.fillRect(-110 + i * 8.5, -150, 2 + hash(i * 2.3) * 7, 50 + hash(i) * 130);
    }
    ctx.restore();
    // Blood-red wash
    ctx.fillStyle = `rgba(120,0,0,${0.3 * k})`;
    ctx.fillRect(0, 0, w, h);
  }
}
