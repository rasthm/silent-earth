/**
 * TITLE SCREEN, ARMORY & CODEX
 *
 * The title is a living scene (eclipse, cathedral spires, embers, watching eyes and Rika on a
 * ledge) with a side menu. Sub-panels slide in on the right: New Journey, Chapters, Trials,
 * Armory (cloak / superpower / weapons with a live preview), Codex (animated bestiary) and Controls.
 */

import { Rika2D } from './rika2d.js';
import { STAGE_DEFS, createEnemy, createStageBoss } from './stages.js';
import { drawDemon, drawBossFigure, drawStamped } from './demons.js';
import { CLOAKS } from './items.js';
import { EX_WEAPONS, SIGILS, SECRET_BOSSES, DUNGEONS, CODEX } from './expansion.js';

const TAU = Math.PI * 2;
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

export function initMenu(game) {
  const menu = new TitleMenu(game);
  game.titleMenu = menu;
  return menu;
}

class TitleMenu {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('screen-menu');
    this.canvas = document.getElementById('title-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.mouse = { x: 0.5, y: 0.5 };
    this.panel = null;
    this.previewRika = new Rika2D(0, 0, null);
    this.previewRika.onGround = true;
    this.previewRika.hideAimLine = true;
    this.titleRika = new Rika2D(0, 0, null);
    this.titleRika.onGround = true;
    this.titleRika.hideAimLine = true;
    this.embers = Array.from({ length: 90 }, () => this.newEmber(true));
    this.eyes = Array.from({ length: 9 }, (_, i) => ({ x: 0.08 + Math.random() * 0.84, y: 0.55 + Math.random() * 0.25, t: Math.random() * 10, s: 0.6 + Math.random() * 0.6, i }));
    this.gargoyles = [0, 1, 2].map((i) => ({ x: Math.random(), y: 0.12 + i * 0.09, sp: 0.012 + Math.random() * 0.01, e: createEnemy('spitter', 0, 0, 0) }));
    this.codexCards = [];
    this.bind();
    this.refresh();
    requestAnimationFrame((t) => this.frame(t));
  }

  get profile() {
    return this.game.expansion.profile;
  }

  newEmber(any) {
    return { x: Math.random(), y: any ? Math.random() : 1.05, v: 0.02 + Math.random() * 0.05, s: 0.6 + Math.random() * 2, w: Math.random() * TAU };
  }

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  bind() {
    window.addEventListener('pointerdown', () => { this.lullabyOn = true; }, { once: true });
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX / window.innerWidth;
      this.mouse.y = e.clientY / window.innerHeight;
    });
    this.root.querySelectorAll('.tm-item').forEach((btn) => {
      btn.addEventListener('mouseenter', () => this.game.sfx?.uiHover?.());
      btn.addEventListener('click', () => {
        this.game.sfx.resume();
        const action = btn.dataset.action;
        if (action === 'continue') {
          const act = this.profile.furthestAct || 0;
          this.game.selectedStartStage = act;
          this.game.menuMode = 'campaign';
          document.getElementById('btn-start').click();
          return;
        }
        if (action === 'settings') {
          this.game.toggleOptionsModal();
          return;
        }
        this.open(btn.dataset.panel);
      });
    });
    this.root.querySelectorAll('.tp-close').forEach((b) => b.addEventListener('click', () => this.open(null)));
    document.getElementById('btn-new-journey')?.addEventListener('click', () => {
      this.game.selectedStartStage = 0;
      this.game.menuMode = 'campaign';
      document.getElementById('btn-start').click();
    });
    document.getElementById('btn-blood-pit')?.addEventListener('click', () => {
      this.game.menuMode = 'arena';
      document.getElementById('btn-start').click();
    });
    window.addEventListener('keydown', (e) => {
      if (this.game.state === 'menu' && e.code === 'Escape' && this.panel) this.open(null);
    });
  }

  open(name) {
    this.panel = name;
    this.root.querySelectorAll('.title-panel').forEach((p) => p.classList.toggle('open', p.id === `tp-${name}`));
    this.root.querySelectorAll('.tm-item').forEach((b) => b.classList.toggle('current', b.dataset.panel === name));
    this.root.classList.toggle('panel-open', !!name);
    if (name === 'chapters') this.renderChapters();
    if (name === 'armory') this.renderArmory();
    if (name === 'codex') this.renderCodex();
  }

  /** Re-reads the profile into the menu (called whenever the title screen is shown). */
  refresh() {
    const p = this.profile;
    const cont = document.getElementById('tm-continue');
    if (cont) {
      cont.classList.toggle('hidden', !(p.furthestAct > 0));
      const sub = document.getElementById('tm-continue-sub');
      if (sub) sub.textContent = `Act ${ROMAN[p.furthestAct] || 'I'} · ${STAGE_DEFS[p.furthestAct]?.name || ''}`;
    }
    const secrets = Object.keys(SECRET_BOSSES).filter((k) => p.slain[k]).length;
    const el = document.getElementById('menu-progress');
    if (el) {
      el.innerHTML = `<span>Weapons <b>${5 + p.weapons.length}/9</b></span><span>Superpowers <b>${p.sigils.length}/5</b></span><span>Secret Bosses <b>${secrets}/6</b></span><span>Codex <b>${CODEX.filter((c) => p.seen[c.key]).length}/${CODEX.length}</b></span>`;
    }
    if (this.panel) this.open(this.panel);
  }

  // -------------------------------------------------------------------------
  // Chapters
  // -------------------------------------------------------------------------

  renderChapters() {
    const p = this.profile;
    const wrap = document.getElementById('chapter-list');
    if (!wrap) return;
    wrap.innerHTML = STAGE_DEFS.map((s, i) => {
      const d = DUNGEONS[i];
      const reached = i <= (p.furthestAct || 0);
      const sigil = p.sigils.includes(d.crypt.sigil);
      const boss = p.slain[d.vault.boss];
      return `
        <button class="chapter-card ${reached ? '' : 'unvisited'}" data-act="${i}" style="--accent:${s.accent}">
          <div class="ch-num">ACT ${ROMAN[i]}</div>
          <div class="ch-name">${s.name}</div>
          <div class="ch-sub">${s.subtitle}</div>
          <div class="ch-row"><span>Fallen Lord</span><b>${s.bossTitle}</b></div>
          <div class="ch-row"><span>Crypt</span><b class="${sigil ? 'got' : ''}">${sigil ? '✓ ' + SIGILS[d.crypt.sigil].name : d.crypt.name}</b></div>
          <div class="ch-row"><span>Vault</span><b class="${boss ? 'got' : ''}">${boss ? '✓ ' + SECRET_BOSSES[d.vault.boss].name : '??? Sealed'}</b></div>
        </button>`;
    }).join('');
    wrap.querySelectorAll('.chapter-card').forEach((c) => c.addEventListener('click', () => {
      this.game.selectedStartStage = Number(c.dataset.act);
      this.game.menuMode = 'campaign';
      document.getElementById('btn-start').click();
    }));
  }

  // -------------------------------------------------------------------------
  // Armory
  // -------------------------------------------------------------------------

  renderArmory() {
    const p = this.profile;
    const cloaks = document.getElementById('armory-cloaks');
    if (cloaks) {
      cloaks.innerHTML = CLOAKS.map((c) => {
        const owned = !c.unlock || p.slain[c.unlock];
        const how = c.unlock ? `Slay ${SECRET_BOSSES[c.unlock].name}` : '';
        return `<button class="swatch ${p.cloak === c.id ? 'on' : ''} ${owned ? '' : 'locked'}" data-cloak="${c.id}" title="${owned ? c.name : 'Locked — ' + how}" style="--fill:${c.fill};--edge:${c.border}"><i></i><span>${owned ? c.name : '???'}</span></button>`;
      }).join('');
      cloaks.querySelectorAll('.swatch').forEach((b) => b.addEventListener('click', () => {
        if (b.classList.contains('locked')) return;
        p.cloak = b.dataset.cloak;
        this.game.expansion.save();
        this.game.expansion.applyLoadout(this.game.rika);
        this.renderArmory();
      }));
    }
    const sig = document.getElementById('armory-sigils');
    if (sig) {
      sig.innerHTML = Object.entries(SIGILS).map(([id, s]) => {
        const owned = p.sigils.includes(id);
        return `<button class="sigil-card ${p.sigil === id ? 'on' : ''} ${owned ? '' : 'locked'}" data-sigil="${id}" style="--accent:${s.color}">
          <div class="sg-icon">${owned ? s.icon : '?'}</div>
          <div><div class="sg-name">${owned ? s.name : 'UNAWAKENED SIGIL'}</div><div class="sg-desc">${owned ? s.desc : s.source}</div></div>
        </button>`;
      }).join('');
      sig.querySelectorAll('.sigil-card').forEach((b) => b.addEventListener('click', () => {
        if (b.classList.contains('locked')) return;
        p.sigil = b.dataset.sigil;
        this.game.expansion.save();
        this.renderArmory();
      }));
    }
    const wep = document.getElementById('armory-weapons');
    if (wep) {
      const base = [
        ['REPEATER CROSSBOW', 'Rapid bolts; every fifth bolt is a homing ember.'],
        ['HELL-SHOT BLUNDERBUSS', 'A seven-pellet blast with brutal kickback.'],
        ['RUNE LANCE', 'A piercing beam that punches through lines of demons.'],
        ['STORM-COIL', 'Chains lightning across up to five demons.'],
        ['ABYSS-ORB', 'A slow void orb that drags demons into its tendrils.'],
      ];
      const rows = base.map(([n, d], i) => `<div class="wep-card"><b>${i + 1}</b><div><div class="wp-name">${n}</div><div class="wp-desc">${d}</div></div></div>`);
      for (const m of [6, 7, 8, 9]) {
        const w = EX_WEAPONS[m];
        const owned = p.weapons.includes(m);
        rows.push(`<div class="wep-card relic ${owned ? '' : 'locked'}" style="--accent:${w.color}"><b>${m}</b><div><div class="wp-name">${owned ? w.name : 'LOST RELIC'}</div><div class="wp-desc">${owned ? `${w.desc} <i>Alt: ${w.alt} — ${w.altDesc}</i>` : w.source}</div></div></div>`);
      }
      wep.innerHTML = rows.join('');
    }
    const name = document.getElementById('armory-cloak-name');
    if (name) name.textContent = (CLOAKS.find((c) => c.id === p.cloak) || CLOAKS[0]).name;
  }

  // -------------------------------------------------------------------------
  // Codex
  // -------------------------------------------------------------------------

  renderCodex() {
    const p = this.profile;
    const grid = document.getElementById('codex-grid');
    if (!grid) return;
    const groups = [['demon', 'DEMONS OF THE CATACOMBS'], ['lord', 'THE FALLEN LORDS'], ['secret', 'SECRET BOSSES']];
    grid.innerHTML = groups.map(([kind, title]) => `
      <h3>${title}</h3>
      <div class="codex-row">${CODEX.filter((c) => c.kind === kind).map((c) => {
        const seen = !!p.seen[c.key];
        return `<div class="codex-card ${seen ? '' : 'unseen'} ${kind}"><canvas width="170" height="150" data-key="${c.key}"></canvas>
          <div class="cx-name">${seen ? c.name : '???'}</div><div class="cx-lore">${seen ? c.lore : 'Not yet encountered.'}</div></div>`;
      }).join('')}</div>`).join('');

    this.codexCards = [...grid.querySelectorAll('canvas')].map((cv) => {
      const entry = CODEX.find((c) => c.key === cv.dataset.key);
      let ent;
      if (entry.kind === 'lord') {
        ent = createStageBoss(entry.bossId - 1, { arenaRight: 0, groundY: 0 });
        ent.facing = 1;
      } else if (entry.kind === 'secret') {
        const sb = SECRET_BOSSES[entry.key];
        ent = createEnemy(sb.ai, 0, 0, 0);
        Object.assign(ent, { art: entry.key, w: sb.w, h: sb.h, facing: 1 });
      } else {
        ent = createEnemy(entry.key, 0, 0, 0);
        ent.facing = 1;
      }
      ent.alerted = true;
      ent.vx = 0;
      return { cv, ctx: cv.getContext('2d'), entry, ent, seen: !!p.seen[entry.key] };
    });
  }

  drawCodex(time) {
    for (const c of this.codexCards) {
      const { ctx, cv, ent, entry } = c;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.save();
      const isLord = entry.kind === 'lord';
      const extent = isLord ? Math.max(ent.h * 1.5, ent.w * 1.9) : entry.kind === 'secret' ? Math.max(ent.h * 1.15, ent.w * 1.4) : Math.max(ent.h * 1.5, ent.w * 1.7);
      const sc = Math.min(2.2, 130 / extent);
      ctx.translate(85, 140);
      ctx.scale(sc, sc);
      ent.animPhase = time * 4;
      if (isLord) drawBossFigure(ctx, ent, time);
      else drawDemon(ctx, ent, time, false);
      ctx.restore();
      // Unmet creatures become a black silhouette (one composite pass, no per-shape filter)
      if (!c.seen) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(0,0,0,0.9)';
        ctx.fillRect(0, 0, cv.width, cv.height);
      }
      // Backdrop glow slipped in behind the figure
      ctx.globalCompositeOperation = 'destination-over';
      const g = ctx.createRadialGradient(85, 90, 10, 85, 90, 110);
      g.addColorStop(0, entry.kind === 'secret' ? 'rgba(120,60,160,0.35)' : 'rgba(150,60,30,0.3)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // -------------------------------------------------------------------------
  // Title scene
  // -------------------------------------------------------------------------

  frame(t) {
    requestAnimationFrame((n) => this.frame(n));
    if (this.game.state !== 'menu' || this.root.classList.contains('hidden')) return;
    const time = t / 1000;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const W = window.innerWidth;
    const H = window.innerHeight;
    if (this.canvas.width !== Math.round(W * dpr) || this.canvas.height !== Math.round(H * dpr)) {
      this.canvas.width = Math.round(W * dpr);
      this.canvas.height = Math.round(H * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const dt = Math.min(0.05, time - (this._last || time));
    this._last = time;
    this.drawScene(ctx, W, H, time, dt);
    this.tickLullaby(time);
    if (this.panel === 'armory') this.drawPreview(time);
    if (this.panel === 'codex' && Math.floor(time * 30) !== this._codexTick) {
      this._codexTick = Math.floor(time * 30);
      this.drawCodex(time);
    }
  }

  drawScene(ctx, W, H, time, dt) {
    const px = (this.mouse.x - 0.5);
    const py = (this.mouse.y - 0.5);
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#040203');
    sky.addColorStop(0.45, '#14050a');
    sky.addColorStop(0.8, '#3a0c10');
    sky.addColorStop(1, '#120406');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // The eclipse
    const ex = W * 0.66 - px * 14;
    const ey = H * 0.27 - py * 10;
    const er = Math.min(W, H) * 0.15;
    const corona = ctx.createRadialGradient(ex, ey, er * 0.9, ex, ey, er * 3.4);
    corona.addColorStop(0, 'rgba(255,170,90,0.55)');
    corona.addColorStop(0.15, 'rgba(220,60,40,0.32)');
    corona.addColorStop(0.5, 'rgba(120,20,30,0.12)');
    corona.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = corona;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(time * 0.04);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * TAU;
      const len = er * (1.25 + (i % 3) * 0.18 + Math.sin(time * 0.8 + i) * 0.06);
      ctx.strokeStyle = `rgba(255,${120 + (i % 4) * 25},70,${0.12 + (i % 2) * 0.08})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * er * 1.02, Math.sin(a) * er * 1.02);
      ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#050102';
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,140,0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    this.drawEclipseEye(ctx, ex, ey, er, time, W, H);

    // Gargoyles drifting across the sky in silhouette
    for (const gg of this.gargoyles) {
      gg.x += gg.sp * dt;
      if (gg.x > 1.15) gg.x = -0.15;
      ctx.save();
      ctx.translate(gg.x * W, gg.y * H + Math.sin(time + gg.y * 10) * 8);
      ctx.scale(0.8, 0.8);
      ctx.globalAlpha = 0.85;
      gg.e.facing = 1;
      gg.e.animPhase = time * 3;
      drawStamped(ctx, 160, (s) => drawDemon(s, gg.e, time, false), '#000', 1);
      ctx.restore();
    }

    // Far cathedral spires
    this.drawSpires(ctx, W, H, H * 0.74, -px * 20, '#12060a', 1, time);
    // Fog band
    const fog = ctx.createLinearGradient(0, H * 0.6, 0, H * 0.8);
    fog.addColorStop(0, 'rgba(60,20,24,0)');
    fog.addColorStop(1, 'rgba(60,20,24,0.45)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, H * 0.6, W, H * 0.2);
    // Nearer ruined arches
    this.drawSpires(ctx, W, H, H * 0.86, -px * 45, '#08030500', 2, time);

    // Watching eyes in the dark
    for (const e of this.eyes) {
      const blink = Math.sin(time * e.s + e.t) > -0.92 ? 1 : 0.1;
      const x = e.x * W - px * 45;
      const y = e.y * H + (1 - blink) * 0;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 14);
      glow.addColorStop(0, `rgba(255,90,40,${0.5 * blink})`);
      glow.addColorStop(1, 'rgba(255,40,20,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 16, y - 16, 32, 32);
      // They glance toward the cursor
      const gx = Math.max(-2.5, Math.min(2.5, (this.mouse.x * W - x) / 120));
      const gy = Math.max(-1, Math.min(1, (this.mouse.y * H - y) / 160));
      ctx.fillStyle = `rgba(255,190,90,${blink})`;
      ctx.fillRect(x - 5 + gx, y - 1 + gy, 3.5, 2 * blink);
      ctx.fillRect(x + 2 + gx, y - 1 + gy, 3.5, 2 * blink);
      ctx.restore();
    }

    // Foreground ledge with Rika gazing at the eclipse
    const lx = W * 0.83 - px * 70;
    const ly = H * 0.8;
    ctx.fillStyle = '#030102';
    ctx.beginPath();
    ctx.moveTo(lx - W * 0.22, H);
    ctx.lineTo(lx - W * 0.14, ly + 12);
    ctx.lineTo(lx - 60, ly);
    ctx.lineTo(lx + 90, ly + 4);
    ctx.lineTo(lx + W * 0.25, ly - 30);
    ctx.lineTo(W + 20, H);
    ctx.closePath();
    ctx.fill();
    // Eclipse-light catching the lip of the ledge
    const lip = ctx.createLinearGradient(lx - W * 0.14, 0, lx + W * 0.25, 0);
    lip.addColorStop(0, 'rgba(255,140,80,0)');
    lip.addColorStop(0.35, 'rgba(255,150,90,0.55)');
    lip.addColorStop(1, 'rgba(255,140,80,0)');
    ctx.strokeStyle = lip;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lx - W * 0.14, ly + 12);
    ctx.lineTo(lx - 60, ly);
    ctx.lineTo(lx + 90, ly + 4);
    ctx.lineTo(lx + W * 0.25, ly - 30);
    ctx.stroke();
    const rs = Math.max(1.6, H / 330);
    ctx.save();
    ctx.translate(lx, ly + 1);
    ctx.scale(rs, rs);
    const r = this.titleRika;
    r.capeSkin = this.profile.cloak;
    r.vx = -120;
    r.walkPhase = 0;
    // Backlit by the eclipse: darkened in one pass rather than with a per-shape filter
    drawStamped(ctx, 220, (s) => r.drawBody(s, 0, 0, -1, Math.PI + 0.35 + Math.sin(time * 0.6) * 0.04, time, false), '#0a0405', 0.58);
    ctx.restore();
    // Rim light on Rika from the eclipse
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rim = ctx.createRadialGradient(lx - 10, ly - 40 * rs, 4, lx - 10, ly - 40 * rs, 70 * rs);
    rim.addColorStop(0, 'rgba(255,140,80,0.16)');
    rim.addColorStop(1, 'rgba(255,140,80,0)');
    ctx.fillStyle = rim;
    ctx.fillRect(lx - 80 * rs, ly - 120 * rs, 160 * rs, 140 * rs);
    ctx.restore();

    // Embers
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.embers.length; i++) {
      const em = this.embers[i];
      em.y -= em.v * dt;
      em.w += dt * 1.5;
      if (em.y < -0.05) this.embers[i] = this.newEmber(false);
      const x = (em.x + Math.sin(em.w) * 0.01) * W - px * 30 * em.s;
      const y = em.y * H;
      ctx.fillStyle = `rgba(255,${140 + em.s * 40},${60 + em.s * 20},${0.35 + em.s * 0.2})`;
      ctx.fillRect(x, y, em.s * 1.4, em.s * 1.4);
    }
    ctx.restore();

    // Vignette
    const vg = ctx.createRadialGradient(W * 0.55, H * 0.45, Math.min(W, H) * 0.3, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  /** Every few seconds the black sun opens: a blood-red eye that follows the cursor. */
  drawEclipseEye(ctx, ex, ey, er, time, W, H) {
    // It wakes a moment after the title appears, then never stops watching (blinking now and then)
    if (this._eyeWake === undefined) this._eyeWake = time + 1.6;
    let open = Math.max(0, Math.min(1, (time - this._eyeWake) / 1.2));
    if (this._blinkAt === undefined || time > this._blinkAt + 0.9) this._blinkAt = time + 3.5 + Math.random() * 4;
    const bk = time - this._blinkAt;
    if (bk > 0 && bk < 0.22) open *= Math.abs(bk - 0.11) / 0.11;
    // Smooth, slightly lagging gaze toward the cursor
    const mx = this.mouse.x * W - ex;
    const my = this.mouse.y * H - ey;
    const md = Math.hypot(mx, my) || 1;
    const reach = Math.min(1, md / (er * 2.5));
    const tx = (mx / md) * reach;
    const ty = (my / md) * reach;
    this._look = this._look || { x: 0, y: 0 };
    this._look.x += (tx - this._look.x) * 0.12;
    this._look.y += (ty - this._look.y) * 0.12;
    const close = Math.max(0, 1 - md / (er * 1.8));
    if (open > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(ex - er * 0.86, ey);
      ctx.quadraticCurveTo(ex, ey - er * 0.78 * open, ex + er * 0.86, ey);
      ctx.quadraticCurveTo(ex, ey + er * 0.78 * open, ex - er * 0.86, ey);
      ctx.closePath();
      ctx.clip();
      const scl = ctx.createRadialGradient(ex, ey, er * 0.1, ex, ey, er);
      scl.addColorStop(0, '#5a0a0a');
      scl.addColorStop(1, '#1a0203');
      ctx.fillStyle = scl;
      ctx.fillRect(ex - er, ey - er, er * 2, er * 2);
      ctx.strokeStyle = 'rgba(200,30,30,0.6)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU;
        ctx.beginPath();
        ctx.moveTo(ex + Math.cos(a) * er, ey + Math.sin(a) * er);
        ctx.quadraticCurveTo(ex + Math.cos(a + 0.3) * er * 0.6, ey + Math.sin(a + 0.3) * er * 0.6, ex + Math.cos(a) * er * 0.35, ey + Math.sin(a) * er * 0.35);
        ctx.stroke();
      }
      const ix = ex + this._look.x * er * 0.44;
      const iy = ey + this._look.y * er * 0.26;
      const iris = ctx.createRadialGradient(ix, iy, er * 0.04, ix, iy, er * 0.34);
      iris.addColorStop(0, close > 0.3 ? '#fff4c0' : '#ffe08a');
      iris.addColorStop(0.45, '#ff5a14');
      iris.addColorStop(1, '#5a0604');
      ctx.fillStyle = iris;
      ctx.beginPath();
      ctx.arc(ix, iy, er * 0.34, 0, TAU);
      ctx.fill();
      // The slit pupil widens hungrily as the cursor comes near
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(ix, iy, er * (0.045 + close * 0.09), er * (0.26 - close * 0.04), 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,240,220,0.7)';
      ctx.beginPath();
      ctx.arc(ix - er * 0.1, iy - er * 0.12, er * 0.03, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const eg = ctx.createRadialGradient(ex, ey, er * 0.2, ex, ey, er * 1.6);
      eg.addColorStop(0, `rgba(255,60,20,${(0.25 + close * 0.25) * open})`);
      eg.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = eg;
      ctx.fillRect(ex - er * 1.6, ey - er * 1.6, er * 3.2, er * 3.2);
      ctx.restore();
    }
    // A whisper beneath the black sun
    const wa = Math.max(0, Math.sin(time * 0.45)) ** 6;
    if (wa > 0.01) {
      ctx.save();
      ctx.font = 'italic 500 20px "Cormorant Garamond", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(200,30,40,${wa * 0.75})`;
      const lines = ['she is still singing', 'you left her down there', 'it is waiting in the dark', 'come home, sister'];
      ctx.fillText(lines[Math.floor(time / 14) % lines.length], ex + Math.sin(time * 6) * 1.2, ey + er * 1.55);
      ctx.restore();
    }
  }

  /** A warped music-box lullaby that plays while the title screen is open. */
  tickLullaby(time) {
    const sfx = this.game.sfx;
    if (!this.lullabyOn || !sfx || sfx.ctx.state !== 'running') return;
    const notes = [440, 523.25, 659.25, 587.33, 523.25, 493.88, 440, 0, 329.63, 440, 493.88, 523.25, 493.88, 415.3, 440, 0];
    if (time < (this._noteT || 0)) return;
    this._noteT = time + 0.52 + (Math.random() < 0.08 ? 0.3 : 0);
    this._noteI = ((this._noteI ?? -1) + 1) % notes.length;
    const f = notes[this._noteI];
    if (!f) return;
    const warp = 1 - (Math.random() < 0.18 ? 0.02 + Math.random() * 0.03 : 0);
    sfx.tone(f * warp, f * warp * 0.985, 1.6, 'sine', 0.05, -0.2, false);
    sfx.tone(f * 2.003 * warp, f * 2 * warp, 0.6, 'triangle', 0.012, 0.2, false);
  }

  /** Procedural gothic skyline: towers with lancet windows and spires, or ruined arches. */
  drawSpires(ctx, W, H, baseY, offset, color, layer, time) {
    ctx.save();
    ctx.translate(offset, 0);
    ctx.fillStyle = layer === 1 ? '#12060a' : '#070204';
    const seed = layer * 97;
    const step = layer === 1 ? 70 : 140;
    ctx.beginPath();
    ctx.moveTo(-100, H);
    for (let x = -100, i = 0; x < W + 200; x += step, i++) {
      const r1 = Math.abs(Math.sin((i + seed) * 12.9898) * 43758.5453) % 1;
      const r2 = Math.abs(Math.sin((i + seed) * 78.233) * 12345.678) % 1;
      if (layer === 1) {
        const h = 40 + r1 * (H * 0.19);
        const w = step * (0.45 + r2 * 0.35);
        ctx.lineTo(x, baseY - h * 0.5);
        ctx.lineTo(x, baseY - h);
        ctx.lineTo(x + w * 0.5, baseY - h - 40 - r2 * 70);
        ctx.lineTo(x + w, baseY - h);
        ctx.lineTo(x + w, baseY - h * 0.4);
        ctx.lineTo(x + step, baseY - 20 - r2 * 30);
      } else {
        const h = 40 + r1 * 80;
        ctx.lineTo(x, baseY - h);
        ctx.quadraticCurveTo(x + step * 0.5, baseY - h - 70, x + step, baseY - h);
        ctx.lineTo(x + step, baseY - h + 10);
      }
    }
    ctx.lineTo(W + 200, H);
    ctx.closePath();
    ctx.fill();
    // Lit windows in the far towers
    if (layer === 1) {
      for (let i = 0; i < 26; i++) {
        const r1 = Math.abs(Math.sin(i * 91.7) * 4375.85) % 1;
        const r2 = Math.abs(Math.sin(i * 17.3) * 9123.1) % 1;
        const flick = 0.5 + Math.sin(time * 3 + i) * 0.2;
        ctx.fillStyle = `rgba(255,150,60,${0.25 * flick})`;
        ctx.fillRect(r1 * W, baseY - 40 - r2 * H * 0.22, 3, 7);
      }
    }
    ctx.restore();
    void color;
  }

  drawPreview(time) {
    const cv = document.getElementById('armory-preview');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = 260;
    const H = 300;
    ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const cl = CLOAKS.find((c) => c.id === this.profile.cloak) || CLOAKS[0];
    const g = ctx.createRadialGradient(W / 2, H * 0.6, 10, W / 2, H * 0.6, W * 0.6);
    g.addColorStop(0, `${cl.border}40`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.86, 60, 10, 0, 0, TAU);
    ctx.fill();
    const r = this.previewRika;
    r.capeSkin = this.profile.cloak;
    r.vx = 0;
    ctx.save();
    ctx.translate(W / 2 - 6, H * 0.86);
    ctx.scale(2.5, 2.5);
    r.drawBody(ctx, 0, 0, 1, Math.sin(time * 0.7) * 0.25 - 0.1, time, false);
    ctx.restore();
  }
}
