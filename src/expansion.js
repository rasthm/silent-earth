/**
 * EXPANSION — the systems layered on top of the core campaign:
 *  - Persistent profile (unlocked weapons, superpowers, cloaks, codex entries)
 *  - Four relic weapons [6]-[9] found in dungeon vaults
 *  - Five superpowers ("Sigils") cast with [B], earned in crypts
 *  - Two enterable dungeons per act: a Crypt (chamber trials) and a Vault
 *    (opened by the Warden's key, guarded by a secret boss)
 *  - Five secret bosses, plus a hidden sixth for those who slay them all
 */

import { STAGE_DEFS, createEnemy, makeElite } from './stages.js';
import { applyStatus } from './status.js';
import { registerDemonRenderer, drawStamped } from './demons.js';
import { Rika2D } from './rika2d.js';
import { CLOAKS } from './items.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// Persistent profile
// ---------------------------------------------------------------------------

const PROFILE_KEY = 'se_profile_v1';

function defaultProfile() {
  return { cloak: 'crimson', sigil: null, weapons: [], sigils: [], slain: {}, seen: {}, furthestAct: 0 };
}

export function loadProfile() {
  try {
    return { ...defaultProfile(), ...JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') };
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(p) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch { /* storage unavailable */ }
}

// ---------------------------------------------------------------------------
// Content tables
// ---------------------------------------------------------------------------

export const EX_WEAPONS = {
  6: {
    id: 'reaper', name: 'BONE REAPER', alt: 'Reaper Storm', color: '#efe2c4',
    desc: 'Hurls a spinning bone scythe that cuts through every demon in its path, then returns.',
    altDesc: 'Three scythes at once.',
    source: 'Slay the Bell-Ringer of Cinders (Act I Vault)',
  },
  7: {
    id: 'censer', name: 'HELLFIRE CENSER', alt: 'Pyre Nova', color: '#ff8a2a',
    desc: 'A roaring torrent of burning incense. Short range, sets demons alight.',
    altDesc: 'A ring of fire bursts out around Rika.',
    source: 'Slay the Gravemother (Act II Vault)',
  },
  8: {
    id: 'harp', name: 'SOUL HARP', alt: 'Requiem', color: '#8fe6ff',
    desc: 'Looses spirit notes that seek out the nearest demon.',
    altDesc: 'Eight notes scatter and hunt at once.',
    source: 'Slay the Pale Knight (Act III Vault)',
  },
  9: {
    id: 'maul', name: 'THUNDER MAUL', alt: 'Thunderclap', color: '#ffe066',
    desc: 'Slams the earth and sends a lightning shockwave racing along the floor.',
    altDesc: 'Shockwaves both ways and lightning on the nearest demons.',
    source: 'Slay the Hollow Cardinal (Act IV Vault)',
  },
};

export const SIGILS = {
  wraith: {
    name: 'WRAITH VEIL', color: '#b7a3ff', cd: 22, icon: '☾',
    desc: 'Become an untouchable shade for 4 seconds and move 40% faster.',
    source: 'Cleanse the Crypt of the Kneeling Knights (Act I)',
  },
  bloodmoon: {
    name: 'BLOOD MOON', color: '#ff3a4a', cd: 30, icon: '●',
    desc: 'For 8 seconds, regain 8 Blood per second and 18 Blood for every kill.',
    source: 'Cleanse the Drowned Chapel (Act II)',
  },
  chrono: {
    name: 'CHRONO HUSH', color: '#8fe6ff', cd: 34, icon: '⧗',
    desc: 'Freeze every demon on screen solid for 3.5 seconds. Lords are stunned instead.',
    source: 'Cleanse the Hall of Frozen Hours (Act III)',
  },
  bonestorm: {
    name: 'BONE STORM', color: '#efe2c4', cd: 26, icon: '✶',
    desc: 'Six bone blades orbit Rika for 8 seconds, shredding anything close.',
    source: 'Cleanse the Ossuary Forge (Act IV)',
  },
  heaven: {
    name: "HEAVEN'S FALL", color: '#ffe8a0', cd: 32, icon: '✦',
    desc: 'Pillars of holy light strike every demon on screen.',
    source: 'Cleanse the Stair of the Fallen Sun (Act V)',
  },
};

export const SECRET_BOSSES = {
  bellringer: {
    name: 'THE BELL-RINGER OF CINDERS', title: 'KEEPER OF THE LAST TOLL',
    ai: 'brute', w: 110, h: 150, hp: 2400, color: '#ff9a2a', pattern: 'toll',
    reward: { weapon: 6, cloak: 'belfry' },
    lore: 'He rang the bell that called the faithful down into the dark. He has not stopped ringing since.',
  },
  gravemother: {
    name: 'THE GRAVEMOTHER', title: 'BROOD-QUEEN OF THE DROWNED',
    ai: 'summoner', w: 150, h: 120, hp: 3000, color: '#9cff5a', pattern: 'brood',
    reward: { weapon: 7, cloak: 'grave' },
    lore: 'She nursed the plague-dead with candles and lullabies, and when the Abyss answered, she kept all its children.',
  },
  paleknight: {
    name: 'THE PALE KNIGHT', title: 'FIRST SWORD OF THE STILL HOUR',
    ai: 'assassin', w: 64, h: 130, hp: 3400, color: '#8fe6ff', pattern: 'frost',
    reward: { weapon: 8, cloak: 'pale' },
    lore: 'Rika’s first teacher. He froze himself mid-swing rather than fall, and the frost kept him.',
  },
  cardinal: {
    name: 'THE HOLLOW CARDINAL', title: 'PRELATE OF A THOUSAND KNIVES',
    ai: 'spitter', w: 90, h: 140, hp: 3800, color: '#ff3a3a', pattern: 'knives',
    reward: { weapon: 9, cloak: 'cardinal' },
    lore: 'He sold absolution by the blade. His halo is every knife he was ever paid with.',
  },
  choir: {
    name: 'THE EYELESS CHOIR', title: 'THE FIVE WHO SANG THE SEAL SHUT',
    ai: 'sentry', w: 90, h: 150, hp: 4600, color: '#b06aff', pattern: 'hymn',
    reward: { cloak: 'eclipse', shards: 300 },
    lore: 'Five cantors sewed their eyes shut to sing the first Lullaby. They are still singing, and the song has turned.',
  },
  shadow: {
    name: 'LYRA’S SHADOW', title: 'THE VERSE THAT WAS NEVER SUNG',
    ai: 'assassin', w: 46, h: 96, hp: 5200, color: '#c08aff', pattern: 'mirror',
    reward: { cloak: 'lullaby', shards: 600 },
    lore: 'Everything Lyra could not forgive, given her sister’s face. It waits behind the Choir for one who has silenced every secret.',
  },
};

export const DUNGEONS = [
  { crypt: { name: 'CRYPT OF THE KNEELING KNIGHTS', sigil: 'wraith' }, vault: { name: 'THE CINDER BELFRY', boss: 'bellringer' } },
  { crypt: { name: 'THE DROWNED CHAPEL', sigil: 'bloodmoon' }, vault: { name: 'NEST OF THE GRAVEMOTHER', boss: 'gravemother' } },
  { crypt: { name: 'HALL OF FROZEN HOURS', sigil: 'chrono' }, vault: { name: 'THE PALE KNIGHT’S TOMB', boss: 'paleknight' } },
  { crypt: { name: 'THE OSSUARY FORGE', sigil: 'bonestorm' }, vault: { name: 'THE CARDINAL’S RELIQUARY', boss: 'cardinal' } },
  { crypt: { name: 'STAIR OF THE FALLEN SUN', sigil: 'heaven' }, vault: { name: 'THE EYELESS CHOIR', boss: 'choir' } },
];

const ROSTERS = [
  ['stalker', 'spitter', 'bloat', 'brute', 'drone', 'pyro'],
  ['stalker', 'spitter', 'medic', 'drone', 'assassin', 'bloat', 'summoner'],
  ['sniper', 'assassin', 'sentry', 'drone', 'medic', 'brute', 'stalker'],
  ['assassin', 'sniper', 'summoner', 'drone', 'pyro', 'bloat', 'sentry', 'brute'],
  ['brute', 'sniper', 'assassin', 'pyro', 'medic', 'summoner', 'sentry', 'spitter', 'drone', 'bloat'],
];

export const CODEX = [
  { key: 'stalker', kind: 'demon', name: 'Catacomb Imp', lore: 'Ember-skinned scavengers that hunt in packs and hurl fire from their claws.' },
  { key: 'spitter', kind: 'demon', name: 'Abyssal Gargoyle', lore: 'Bat-winged watchers of the vaults. They spit burning bile from above.' },
  { key: 'brute', kind: 'demon', name: 'Hell Baron', lore: 'A furnace burns where its heart should be. It telegraphs every slam, and every slam is lethal.' },
  { key: 'sniper', kind: 'demon', name: 'Ossuary Revenant', lore: 'Dead archers of the Vigil, still loyal to the last order they were given.' },
  { key: 'assassin', kind: 'demon', name: 'Shadow Prowler', lore: 'Three eyes, two scythes, no sound. Watch for the crouch before it lunges.' },
  { key: 'pyro', kind: 'demon', name: 'Forge Mancubus', lore: 'A walking furnace that vents flame from its iron gauntlet.' },
  { key: 'drone', kind: 'demon', name: 'Wailing Skull', lore: 'The last scream of the burned, given horns and hunger.' },
  { key: 'bloat', kind: 'demon', name: 'Plague Tick', lore: 'Swollen with volatile pus. Kill it at range.' },
  { key: 'medic', kind: 'demon', name: 'Blood Deacon', lore: 'Its censer mends demon flesh. Silence the priest first.' },
  { key: 'summoner', kind: 'demon', name: 'Archvile Cantor', lore: 'It raises its arms and the floor opens. Stop the chant before it finishes.' },
  { key: 'sentry', kind: 'demon', name: 'Arachno-Reliquary', lore: 'A saint’s reliquary that grew legs and learned to hate.' },
  { key: 'lord1', kind: 'lord', bossId: 1, name: 'Lord Malak', lore: 'The Iron Penitent. Denial, forged into armour.' },
  { key: 'lord2', kind: 'lord', bossId: 2, name: 'Matron Arachne', lore: 'The Weeping Choir. Bargaining, spun into silk.' },
  { key: 'lord3', kind: 'lord', bossId: 3, name: 'Seraph Valkyrie', lore: 'The Frozen Clockmaker. Stasis, carved into ice.' },
  { key: 'lord4', kind: 'lord', bossId: 4, name: 'Vex', lore: 'The Fallen Night Sentinel. Guilt, sharpened into an axe.' },
  { key: 'lord5', kind: 'lord', bossId: 5, name: 'Davoth-Omega', lore: 'Sovereign of the First Grief. The end of the song.' },
  ...Object.entries(SECRET_BOSSES).map(([key, b]) => ({ key, kind: 'secret', name: b.name, lore: b.lore })),
];

// ---------------------------------------------------------------------------
// Lyra's Shadow reuses Rika's own renderer, darkened and violet
// ---------------------------------------------------------------------------

const shadowBody = new Rika2D(0, 0, null);
shadowBody.capeSkin = 'eclipse';
shadowBody.onGround = true;
shadowBody.hideAimLine = true;
registerDemonRenderer('shadow', (ctx, e, t, F, a) => {
  shadowBody.vx = Math.abs(e.vx);
  shadowBody.walkPhase = e.animPhase;
  shadowBody.crouching = !!e.telegraphing;
  ctx.save();
  const halo = ctx.createRadialGradient(0, -44, 4, 0, -44, 70);
  halo.addColorStop(0, 'rgba(176,106,255,0.35)');
  halo.addColorStop(1, 'rgba(176,106,255,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(-70, -114, 140, 140);
  // Rika's own body, washed in violet shadow (or white on a hit flash) in one composite pass
  const flashing = F('#000') !== '#000';
  drawStamped(ctx, 200, (s) => shadowBody.drawBody(s, 0, 0, 1, a > 0 ? -0.3 : 0, t, false), flashing ? '#fff3e2' : '#2a0c46', flashing ? 0.9 : 0.72);
  ctx.fillStyle = '#e0c0ff';
  ctx.beginPath();
  ctx.arc(5, -66, 1.8, 0, TAU);
  ctx.fill();
  ctx.restore();
}, 78);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function touching(e, x, y, r) {
  const dx = e.x - x;
  const dy = (e.y - e.h * 0.5) - y;
  const er = Math.max(e.w, e.h) * 0.42;
  return dx * dx + dy * dy < (r + er) * (r + er);
}

function onScreen(game, e) {
  return e.x > game.camX - 40 && e.x < game.camX + game.viewW + 40 && e.y > game.camY - 40 && e.y - e.h < game.camY + game.viewH + 40;
}

// ---------------------------------------------------------------------------
// Expansion controller
// ---------------------------------------------------------------------------

export class Expansion {
  constructor(game) {
    this.game = game;
    this.profile = loadProfile();
    this.shots = [];
    this.inDungeon = false;
    this.dungeon = null;
    this.overworld = null;
    this.vaultKeys = {};
    this.sigilCd = 0;
    this.sigilActive = null;
    this.sigilTimer = 0;
    this.bones = [];
    this.tint = null;
    this._seenDirty = 0;
    Rika2D.prototype.expansionWeaponName = (m) => {
      const w = EX_WEAPONS[m];
      return w ? `[${m}] ${w.name} · Alt: ${w.alt}` : '';
    };
  }

  save() {
    saveProfile(this.profile);
  }

  /** Applies the saved cloak to a freshly created Rika. */
  applyLoadout(r) {
    r.capeSkin = this.profile.cloak || 'crimson';
  }

  ownsWeapon(m) {
    return m <= 5 || this.profile.weapons.includes(m);
  }

  weaponList() {
    return [1, 2, 3, 4, 5, ...[6, 7, 8, 9].filter((m) => this.profile.weapons.includes(m))];
  }

  cycleWeapon(dir) {
    const list = this.weaponList();
    const r = this.game.rika;
    const i = list.indexOf(r.weaponMode);
    const next = list[(i + dir + list.length) % list.length];
    r.switchWeapon(next, (m) => this.game.setMsg(m));
  }

  selectWeapon(m) {
    if (!this.ownsWeapon(m)) {
      const w = EX_WEAPONS[m];
      if (w) this.game.setMsg(`${w.name} IS STILL LOST — ${w.source}`);
      return;
    }
    this.game.rika.switchWeapon(m, (msg) => this.game.setMsg(msg));
  }

  // -------------------------------------------------------------------------
  // Relic weapons
  // -------------------------------------------------------------------------

  shotMult(r) {
    const g = this.game;
    return r.damageMult * (r.redEyeTimer > 0 ? 1.5 : 1) * (g.getComboDamageMult ? g.getComboDamageMult() : 1);
  }

  fireWeapon(r, onMsg) {
    const g = this.game;
    const m = r.weaponMode;
    const costs = { 6: 2, 7: 1, 8: 1, 9: 4 };
    const cost = costs[m] || 1;
    if (m === 7) {
      // The censer burns ammo every other puff
      r._censerTick = ((r._censerTick || 0) + 1) % 2;
    }
    const pay = m === 7 ? (r._censerTick === 0 ? 1 : 0) : cost;
    if (r.mag < pay) {
      r.reload(onMsg);
      return;
    }
    r.mag -= pay;
    if (r.mag <= 0) setTimeout(() => r.reload(onMsg), 120);

    const mult = this.shotMult(r);
    const a = r.aimAngle;
    const bx = r.x + Math.cos(a) * 36;
    const by = (r.y - (r.crouching ? 30 : 46)) + Math.sin(a) * 36;
    r.muzzleFlash = 0.06;
    r.shotCounter++;

    if (m === 6) {
      r.fireCd = 0.42;
      this.shots.push({ kind: 'reaper', x: bx, y: by, vx: Math.cos(a) * 980, vy: Math.sin(a) * 980, t: 0, out: 0.4, dmg: 46 * mult, r: 20, hit: new Set(), spin: 0 });
      g.sfx?.weaponSwitch?.();
      r.recoil = 6;
    } else if (m === 7) {
      r.fireCd = 0.05;
      for (let i = 0; i < 2; i++) {
        const sa = a + (Math.random() - 0.5) * 0.32;
        const sp = 520 + Math.random() * 120;
        this.shots.push({ kind: 'flame', x: bx, y: by, vx: Math.cos(sa) * sp + r.vx * 0.4, vy: Math.sin(sa) * sp, t: 0, life: 0.42, dmg: 6 * mult, r: 6, hit: new Set() });
      }
      if (Math.random() < 0.3) g.sfx?.shootPulse?.();
    } else if (m === 8) {
      r.fireCd = 0.2;
      this.shots.push({ kind: 'note', x: bx, y: by, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, t: 0, life: 2.4, dmg: 27 * mult, r: 7, trail: [], seek: 0, target: null });
      g.sfx?.teslaArc?.();
    } else if (m === 9) {
      r.fireCd = 0.85;
      this.slam(r, mult, r.facing);
      r.recoil = 14;
      onMsg?.('');
    }
    r.fireCd /= r.stats.rof;
  }

  altFire(r, onMsg) {
    const g = this.game;
    const m = r.weaponMode;
    const mult = this.shotMult(r);
    const a = r.aimAngle;
    const cx = r.x;
    const cy = r.y - 44;
    if (m === 6) {
      for (const off of [-0.32, 0, 0.32]) {
        this.shots.push({ kind: 'reaper', x: cx, y: cy, vx: Math.cos(a + off) * 900, vy: Math.sin(a + off) * 900, t: 0, out: 0.45, dmg: 52 * mult, r: 22, hit: new Set(), spin: 0 });
      }
      onMsg?.('REAPER STORM!');
    } else if (m === 7) {
      for (let i = 0; i < 20; i++) {
        const sa = (i / 20) * TAU;
        this.shots.push({ kind: 'flame', x: cx, y: cy, vx: Math.cos(sa) * 520, vy: Math.sin(sa) * 520, t: 0, life: 0.5, dmg: 18 * mult, r: 10, hit: new Set() });
      }
      g.addShake(6);
      onMsg?.('PYRE NOVA!');
    } else if (m === 8) {
      for (let i = 0; i < 8; i++) {
        const sa = a + (i - 3.5) * 0.3;
        this.shots.push({ kind: 'note', x: cx, y: cy, vx: Math.cos(sa) * 520, vy: Math.sin(sa) * 520, t: 0, life: 2.8, dmg: 30 * mult, r: 7, trail: [], seek: 0, target: null });
      }
      onMsg?.('REQUIEM!');
    } else if (m === 9) {
      this.slam(r, mult * 1.2, 1);
      this.slam(r, mult * 1.2, -1);
      const near = g.enemies.filter((e) => !e.dead && Math.abs(e.x - r.x) < 520).sort((p, q) => Math.abs(p.x - r.x) - Math.abs(q.x - r.x)).slice(0, 3);
      for (const e of near) {
        g.beams.push({ x1: e.x, y1: e.y - e.h - 500, x2: e.x, y2: e.y - e.h * 0.5, color: '#ffe066', width: 7, life: 0.35, maxLife: 0.35 });
        g.damageEnemy(e, 110 * mult, e.x, e.y - e.h * 0.5, true);
        applyStatus(e, 'shock', 2, g);
      }
      onMsg?.('THUNDERCLAP!');
    }
  }

  slam(r, mult, dir) {
    const g = this.game;
    const floorY = r.onGround ? r.y : g.stage.groundY;
    this.shots.push({ kind: 'wave', x: r.x + dir * 20, y: floorY, dir, t: 0, life: 0.85, dmg: 85 * mult, hit: new Set() });
    g.addShake(10, 0, 1);
    g.spawnParticles(r.x + dir * 30, floorY - 6, 14, '#ffe066', 260);
    g.sfx?.explode?.();
  }

  hit(e, dmg, x, y) {
    const r = this.game.rika;
    const crit = Math.random() < (r.stats.crit || 0);
    this.game.damageEnemy(e, crit ? dmg * (r.stats.critDmg || 1.75) : dmg, x, y, crit);
  }

  updateShots(dt) {
    const g = this.game;
    const r = g.rika;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.t += dt;
      let dead = false;

      if (s.kind === 'reaper') {
        s.spin += dt * 24;
        if (!s.back && s.t > s.out) {
          s.back = true;
          s.hit.clear();
        }
        if (s.back) {
          const dx = r.x - s.x;
          const dy = (r.y - 44) - s.y;
          const d = Math.hypot(dx, dy) || 1;
          const k = Math.min(1, dt * 9);
          s.vx += ((dx / d) * 1150 - s.vx) * k;
          s.vy += ((dy / d) * 1150 - s.vy) * k;
          if (d < 34 || s.t > 2.6) dead = true;
        } else {
          s.vx *= 1 - dt * 1.6;
          s.vy *= 1 - dt * 1.6;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        for (const e of g.enemies) {
          if (!e.dead && !s.hit.has(e) && touching(e, s.x, s.y, s.r)) {
            s.hit.add(e);
            this.hit(e, s.dmg, s.x, s.y);
          }
        }
      } else if (s.kind === 'flame') {
        s.vx *= 1 - dt * 2.4;
        s.vy = s.vy * (1 - dt * 2.4) - 120 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.r += dt * 46;
        for (const e of g.enemies) {
          if (!e.dead && !s.hit.has(e) && touching(e, s.x, s.y, s.r * 0.7)) {
            s.hit.add(e);
            this.hit(e, s.dmg, s.x, s.y);
            if (Math.random() < 0.35) applyStatus(e, 'burn', 2.5, g);
          }
        }
        if (s.t > s.life) dead = true;
      } else if (s.kind === 'note') {
        s.seek -= dt;
        if (s.seek <= 0) {
          s.seek = 0.12;
          let best = null;
          let bd = 760;
          for (const e of g.enemies) {
            if (e.dead) continue;
            const d = Math.hypot(e.x - s.x, (e.y - e.h * 0.5) - s.y);
            if (d < bd) { bd = d; best = e; }
          }
          s.target = best;
        }
        if (s.target && !s.target.dead && s.t > 0.08) {
          const want = Math.atan2((s.target.y - s.target.h * 0.5) - s.y, s.target.x - s.x);
          const cur = Math.atan2(s.vy, s.vx);
          let diff = want - cur;
          while (diff > Math.PI) diff -= TAU;
          while (diff < -Math.PI) diff += TAU;
          const turn = Math.max(-8 * dt, Math.min(8 * dt, diff));
          const sp = Math.min(900, Math.hypot(s.vx, s.vy) + 600 * dt);
          s.vx = Math.cos(cur + turn) * sp;
          s.vy = Math.sin(cur + turn) * sp;
        }
        s.trail.push(s.x, s.y);
        if (s.trail.length > 16) s.trail.splice(0, 2);
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        for (const e of g.enemies) {
          if (!e.dead && touching(e, s.x, s.y, s.r)) {
            this.hit(e, s.dmg, s.x, s.y);
            g.spawnParticles(s.x, s.y, 6, '#8fe6ff', 160);
            dead = true;
            break;
          }
        }
        if (s.t > s.life) dead = true;
      } else if (s.kind === 'wave') {
        s.x += s.dir * 780 * dt;
        for (const e of g.enemies) {
          if (e.dead || s.hit.has(e)) continue;
          if (Math.abs(e.x - s.x) < 30 + e.w * 0.4 && e.y > s.y - 150 && e.y - e.h < s.y + 6) {
            s.hit.add(e);
            this.hit(e, s.dmg, e.x, e.y - e.h * 0.5);
            applyStatus(e, 'shock', 1.5, g);
          }
        }
        if (s.t > s.life) dead = true;
      } else if (s.kind === 'pillar') {
        s.delay -= dt;
        if (s.delay <= 0 && !s.struck) {
          s.struck = true;
          s.t = 0;
          for (const e of g.enemies) {
            if (!e.dead && Math.abs(e.x - s.x) < 46 + e.w * 0.4) this.hit(e, s.dmg, e.x, e.y - e.h * 0.5);
          }
          g.addShake(5);
          g.spawnParticles(s.x, s.y, 10, '#ffe8a0', 220);
        }
        if (s.struck && s.t > 0.45) dead = true;
      }
      if (dead) this.shots.splice(i, 1);
    }
  }

  drawShots(ctx, time) {
    for (const s of this.shots) {
      if (s.kind === 'reaper') {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(255,230,190,0.25)';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 20, s.spin, s.spin + 2.2);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        ctx.rotate(s.spin);
        ctx.fillStyle = '#8a7a5a';
        ctx.fillRect(-14, -2, 28, 4);
        ctx.beginPath();
        ctx.moveTo(12, -2);
        ctx.quadraticCurveTo(26, -20, 6, -26);
        ctx.quadraticCurveTo(18, -14, 8, -4);
        ctx.closePath();
        ctx.fillStyle = '#f2e8d2';
        ctx.fill();
        ctx.strokeStyle = '#2a1a10';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      } else if (s.kind === 'flame') {
        const k = s.t / s.life;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
        g.addColorStop(0, `rgba(255,${230 - k * 120},${140 - k * 120},${0.9 * (1 - k)})`);
        g.addColorStop(1, 'rgba(160,30,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, TAU);
        ctx.fill();
        ctx.restore();
      } else if (s.kind === 'note') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(143,230,255,0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let j = 0; j < s.trail.length; j += 2) {
          if (j === 0) ctx.moveTo(s.trail[j], s.trail[j + 1]);
          else ctx.lineTo(s.trail[j], s.trail[j + 1]);
        }
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 14);
        g.addColorStop(0, 'rgba(230,250,255,1)');
        g.addColorStop(1, 'rgba(80,180,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 14, 0, TAU);
        ctx.fill();
        ctx.restore();
      } else if (s.kind === 'wave') {
        const k = s.t / s.life;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1 - k;
        for (let j = 0; j < 3; j++) {
          const h = 60 + Math.random() * 60;
          const x = s.x - s.dir * j * 14;
          ctx.strokeStyle = j === 0 ? '#fff6c0' : '#ffd040';
          ctx.lineWidth = j === 0 ? 3 : 2;
          ctx.beginPath();
          ctx.moveTo(x, s.y);
          ctx.lineTo(x + (Math.random() - 0.5) * 14, s.y - h * 0.5);
          ctx.lineTo(x + (Math.random() - 0.5) * 10, s.y - h);
          ctx.stroke();
        }
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 50);
        g.addColorStop(0, 'rgba(255,220,90,0.7)');
        g.addColorStop(1, 'rgba(255,160,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(s.x - 50, s.y - 50, 100, 54);
        ctx.restore();
      } else if (s.kind === 'pillar') {
        ctx.save();
        if (!s.struck) {
          ctx.strokeStyle = 'rgba(255,232,160,0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, 30, 7, 0, 0, TAU);
          ctx.stroke();
        } else {
          const k = s.t / 0.45;
          ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createLinearGradient(s.x - 40, 0, s.x + 40, 0);
          g.addColorStop(0, 'rgba(255,230,150,0)');
          g.addColorStop(0.5, `rgba(255,248,220,${1 - k})`);
          g.addColorStop(1, 'rgba(255,230,150,0)');
          ctx.fillStyle = g;
          ctx.fillRect(s.x - 40, s.y - 900, 80, 900);
        }
        ctx.restore();
      }
    }
  }

  // -------------------------------------------------------------------------
  // Superpowers ([B])
  // -------------------------------------------------------------------------

  castSigil() {
    const g = this.game;
    const id = this.profile.sigil;
    if (!id) {
      g.setMsg('NO SUPERPOWER YET — cleanse a Crypt (the amber doorways) to awaken one.');
      return;
    }
    if (this.sigilCd > 0) {
      g.setMsg(`${SIGILS[id].name} RECOVERING — ${Math.ceil(this.sigilCd)}s`);
      return;
    }
    const sg = SIGILS[id];
    const r = g.rika;
    this.sigilCd = sg.cd * (r.stats.cdr || 1);
    g.sfx?.powerup?.();
    g.addShake(8);
    g.flashColor = sg.color;
    g.flashAlpha = 0.25 * (g.flashMult ?? 1);
    g.setMsg(`${sg.icon} ${sg.name}!`);

    if (id === 'wraith') {
      this.sigilActive = 'wraith';
      this.sigilTimer = 4;
    } else if (id === 'bloodmoon') {
      this.sigilActive = 'bloodmoon';
      this.sigilTimer = 8;
      this._moonKills = g.kills;
    } else if (id === 'bonestorm') {
      this.sigilActive = 'bonestorm';
      this.sigilTimer = 8;
      this.bones = Array.from({ length: 6 }, (_, i) => ({ a: (i / 6) * TAU, cd: new Map() }));
    } else if (id === 'heaven') {
      const targets = g.enemies.filter((e) => !e.dead && onScreen(g, e)).slice(0, 14);
      targets.forEach((e, i) => {
        this.shots.push({ kind: 'pillar', x: e.x, y: e.y, delay: 0.15 + i * 0.07, t: 0, dmg: 170 * r.damageMult });
      });
      if (!targets.length) g.setMsg(`${sg.name} — no demons in sight.`);
    } else if (id === 'chrono') {
      for (const e of g.enemies) {
        if (e.dead || !onScreen(g, e)) continue;
        if (e.isBoss || e.isSecretBoss) applyStatus(e, 'stun', 1.8, g);
        else applyStatus(e, 'freeze', 3.5, g);
      }
      this.tint = { color: 'rgba(120,200,255,', t: 0.8 };
    }
  }

  updateSigil(dt) {
    const g = this.game;
    const r = g.rika;
    this.sigilCd = Math.max(0, this.sigilCd - dt);
    if (this.tint) {
      this.tint.t -= dt;
      if (this.tint.t <= 0) this.tint = null;
    }
    if (!this.sigilActive) {
      r.speedBuff = 1;
      return;
    }
    this.sigilTimer -= dt;
    if (this.sigilActive === 'wraith') {
      r.invulnTimer = Math.max(r.invulnTimer, 0.12);
      r.speedBuff = 1.4;
    } else if (this.sigilActive === 'bloodmoon') {
      const kills = g.kills - this._moonKills;
      this._moonKills = g.kills;
      r.hp = Math.min(r.maxHp, r.hp + 8 * dt + kills * 18);
    } else if (this.sigilActive === 'bonestorm') {
      for (const b of this.bones) {
        b.a += dt * 5.5;
        const bx = r.x + Math.cos(b.a) * 72;
        const by = r.y - 44 + Math.sin(b.a) * 48;
        b.x = bx;
        b.y = by;
        for (const e of g.enemies) {
          if (e.dead || !touching(e, bx, by, 14)) continue;
          const last = b.cd.get(e) || 0;
          if (g.time - last > 0.3) {
            b.cd.set(e, g.time);
            this.hit(e, 34 * r.damageMult, bx, by);
          }
        }
      }
    }
    if (this.sigilTimer <= 0) {
      this.sigilActive = null;
      r.speedBuff = 1;
      this.bones = [];
    }
  }

  drawSigilFx(ctx, time) {
    const r = this.game.rika;
    if (this.sigilActive === 'wraith') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(r.x, r.y - 40, 6, r.x, r.y - 40, 70);
      g.addColorStop(0, 'rgba(183,163,255,0.35)');
      g.addColorStop(1, 'rgba(183,163,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(r.x - 70, r.y - 110, 140, 140);
      ctx.restore();
    } else if (this.sigilActive === 'bloodmoon') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const k = (time * 0.8 + i / 6) % 1;
        ctx.fillStyle = `rgba(255,40,60,${1 - k})`;
        ctx.beginPath();
        ctx.arc(r.x + Math.sin(i * 2.4) * 26, r.y - 10 - k * 80, 2.6, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    } else if (this.sigilActive === 'bonestorm') {
      for (const b of this.bones) {
        if (b.x === undefined) continue;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.a * 3);
        ctx.fillStyle = '#efe2c4';
        ctx.strokeStyle = '#2a1a10';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.quadraticCurveTo(0, -8, 12, 0);
        ctx.quadraticCurveTo(0, -3, -12, 0);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // -------------------------------------------------------------------------
  // Dungeon doors in the overworld
  // -------------------------------------------------------------------------

  /** Called whenever the game loads a campaign act. */
  onLoadStage(stage, index, mode) {
    this.inDungeon = false;
    this.dungeon = null;
    this.overworld = null;
    this.shots = [];
    this.sigilActive = null;
    if (mode !== 'campaign' || !DUNGEONS[index]) return;
    if (index > (this.profile.furthestAct || 0)) {
      this.profile.furthestAct = index;
      this.save();
    }
    const d = DUNGEONS[index];
    stage.dungeonDoors = [
      { kind: 'crypt', x: Math.round(stage.bossTriggerX * 0.4), def: d.crypt, cleared: false },
      { kind: 'vault', x: Math.round(stage.bossTriggerX * 0.9), def: d.vault, cleared: false },
    ];
  }

  nearDoor() {
    const g = this.game;
    if (this.inDungeon) return null;
    for (const d of g.stage?.dungeonDoors || []) {
      if (Math.abs(d.x - g.rika.x) < 70 && Math.abs(g.stage.groundY - g.rika.y) < 60) return d;
    }
    return null;
  }

  promptText() {
    const g = this.game;
    const r = g.rika;
    const door = this.nearDoor();
    if (door) {
      if (door.cleared) return `${door.def.name} — CLEANSED`;
      if (door.kind === 'vault' && !this.vaultKeys[g.stageIndex]) return `[G] ${door.def.name} — SEALED · defeat this act's Warden for the key`;
      return `[G] ENTER ${door.def.name}`;
    }
    if (this.inDungeon) {
      const dn = this.dungeon;
      for (const al of dn.altars) {
        if (!al.claimed && Math.abs(al.x - r.x) < 70) return al.kind === 'sigil' ? '[G] AWAKEN THE SLEEPING SIGIL' : '[G] CLAIM THE VAULT’S TREASURE';
      }
      for (const p of dn.portals) {
        if (Math.abs(p.x - r.x) < 60) return '[G] RETURN TO THE CATACOMBS';
      }
    }
    return '';
  }

  /** Returns true if it handled the [G] press. */
  tryInteract() {
    const g = this.game;
    const r = g.rika;
    const door = this.nearDoor();
    if (door) {
      if (door.cleared) {
        g.setMsg(`${door.def.name} lies silent. Nothing more waits within.`);
        return true;
      }
      if (door.kind === 'vault' && !this.vaultKeys[g.stageIndex]) {
        g.setMsg('THE VAULT IS SEALED — its key hangs from this act’s Warden.');
        return true;
      }
      this.enterDungeon(door);
      return true;
    }
    if (!this.inDungeon) return false;
    const dn = this.dungeon;
    for (const al of dn.altars) {
      if (!al.claimed && Math.abs(al.x - r.x) < 70) {
        al.claimed = true;
        this.claimAltar(al);
        return true;
      }
    }
    for (const p of dn.portals) {
      if (Math.abs(p.x - r.x) < 60) {
        this.leaveDungeon(dn.complete);
        return true;
      }
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // Dungeon build / enter / leave
  // -------------------------------------------------------------------------

  buildDungeonStage(actIdx, door) {
    const def = STAGE_DEFS[actIdx];
    const gy = def.groundY;
    const rooms = 3;
    const roomW = 1150;
    const start = 420;
    const width = start + rooms * roomW + 360;
    const vault = door.kind === 'vault';
    const accent = vault ? '#b06aff' : '#e6a848';

    const platforms = [];
    const addPlat = (x, y, w, moving = false) => platforms.push({
      x, baseX: x, y, baseY: y, w, h: 18, oneWay: true, moving, range: 110,
      crumble: false, crumbleT: 0, gone: false, respawnT: 0, vx: 0, phase: Math.random() * 6,
    });
    const roomDefs = [];
    const walls = [];
    for (let i = 0; i < rooms; i++) {
      const x0 = start + i * roomW;
      const x1 = x0 + roomW;
      const boss = vault && i === rooms - 1;
      if (!boss) {
        addPlat(x0 + 160, gy - 150, 200);
        addPlat(x0 + roomW - 360, gy - 150, 200);
        addPlat(x0 + roomW * 0.5 - 120, gy - 270, 240, i === 1);
      } else {
        addPlat(x0 + 140, gy - 160, 190);
        addPlat(x0 + roomW - 330, gy - 160, 190);
      }
      const exitGate = { x: x1 - 14, y: gy - 560, w: 28, h: 560, dungeonGate: true };
      walls.push(exitGate);
      roomDefs.push({ x0, x1, boss, started: false, cleared: false, wave: 0, waves: boss ? 0 : 2, spawned: [], exitGate, entryGate: null });
    }

    const decors = [];
    for (let x = 0; x < width; x += 210) {
      decors.push({ x, w: 110 + ((x * 7) % 90), h: 220 + ((x * 13) % 240), layer: 0.25, windows: x % 420 === 0, flesh: vault, arch: true });
    }
    const torches = [];
    for (let x = 200; x < width; x += 330) torches.push({ x, y: gy - 130 - ((x * 3) % 60), phase: (x * 0.17) % 6.28 });

    return {
      id: 100 + actIdx,
      code: def.code,
      name: door.def.name,
      subtitle: vault ? 'A SEALED VAULT' : 'A FORGOTTEN CRYPT',
      realm: def.realm,
      weather: def.weather,
      width,
      groundY: gy,
      bossTriggerX: 1e9,
      midBossTriggerX: 0,
      arenaLeft: 0,
      arenaRight: width,
      skyTop: '#040203',
      skyMid: def.skyTop,
      skyBot: vault ? '#1e0e26' : def.skyMid,
      accent,
      groundColor: '#100c0b',
      groundTrim: vault ? '#7a4aa8' : '#9a6a32',
      bossTitle: '',
      bossSub: '',
      platforms,
      walls,
      breakableWalls: [],
      jumpPads: [],
      grapplePoints: roomDefs.map((rm) => ({ x: (rm.x0 + rm.x1) * 0.5, y: gy - 400 })),
      monkeyBars: [],
      slipgates: [],
      goreNests: [],
      fgPillars: [{ x: 700, w: 48 }, { x: 1900, w: 52 }, { x: 3100, w: 46 }],
      torches,
      chains: [],
      barrels: roomDefs.filter((rm) => !rm.boss).map((rm) => ({ x: rm.x0 + 560, y: gy, w: 28, h: 38, hp: 30, exploded: false })),
      crates: [],
      chests: [],
      terminals: [],
      mechBays: [],
      hazards: [],
      turrets: [],
      enemies: [],
      decors,
      spikes: [],
      lasers: [],
      beacons: [],
      ambushes: [],
      lockdowns: [],
      loreTablets: [],
      objectives: [{ id: 'chambers', desc: vault ? 'Breach the vault chambers' : 'Purge the crypt chambers', goal: rooms, progress: 0, done: false, reward: { shards: 0, xp: 0 } }],
      merchant: null,
      roster: ROSTERS[actIdx] || ROSTERS[0],
      checkpointX: 160,
      storyBeats: [],
      midBossSpawned: true,
      midBossDefeated: true,
      midBoss: null,
      bossSpawned: false,
      bossDefeated: false,
      boss: null,
      _rooms: roomDefs,
    };
  }

  enterDungeon(door) {
    const g = this.game;
    const r = g.rika;
    const actIdx = g.stageIndex;
    this.overworld = { stage: g.stage, enemies: g.enemies, x: r.x, y: r.y, camX: g.camX, door };
    const st = this.buildDungeonStage(actIdx, door);
    this.inDungeon = true;
    this.dungeon = {
      door,
      actIdx,
      kind: door.kind,
      rooms: st._rooms,
      altars: [],
      portals: [{ x: 170 }],
      complete: false,
      boss: null,
      bossKey: door.kind === 'vault' ? door.def.boss : null,
      shadowPending: 0,
    };
    g.stage = st;
    g.enemies = st.enemies;
    g.bullets = [];
    g.missiles = [];
    g.bfgOrbs = [];
    g.grenades = [];
    g.beams = [];
    g.wells = [];
    g.pickups = [];
    g.corpses = [];
    this.shots = [];
    r.x = 260;
    r.y = st.groundY;
    r.vx = 0;
    r.vy = 0;
    g.camX = 0;
    g.camY = 0;
    g.sfx?.powerup?.();
    document.getElementById('boss-hud')?.classList.add('hidden');
    const banner = document.getElementById('stage-banner');
    if (banner) {
      document.getElementById('banner-title').textContent = door.def.name;
      document.getElementById('banner-sub').textContent = door.kind === 'vault' ? 'SOMETHING ANCIENT WAITS IN THE DEEPEST CHAMBER' : 'THREE CHAMBERS · THREE TRIALS · ONE SLEEPING SIGIL';
      banner.classList.remove('hidden');
      setTimeout(() => banner.classList.add('hidden'), 3000);
    }
  }

  leaveDungeon(completed) {
    const g = this.game;
    const ow = this.overworld;
    if (!ow) return;
    if (completed) ow.door.cleared = true;
    g.stage = ow.stage;
    g.enemies = ow.enemies;
    g.bullets = [];
    g.missiles = [];
    g.bfgOrbs = [];
    g.grenades = [];
    g.beams = [];
    g.wells = [];
    g.pickups = [];
    g.corpses = [];
    this.shots = [];
    const r = g.rika;
    r.x = ow.door.x + 70;
    r.y = g.stage.groundY;
    r.vx = 0;
    r.vy = 0;
    r.invulnTimer = Math.max(r.invulnTimer, 1);
    g.camX = Math.max(0, r.x - g.viewW * 0.4);
    this.inDungeon = false;
    this.dungeon = null;
    this.overworld = null;
    document.getElementById('boss-hud')?.classList.add('hidden');
    g.setMsg(completed ? 'You return to the catacombs, stronger.' : 'You retreat to the catacombs.');
  }

  // -------------------------------------------------------------------------
  // Dungeon chambers
  // -------------------------------------------------------------------------

  spawnWave(room) {
    const g = this.game;
    const st = g.stage;
    const dn = this.dungeon;
    const roster = st.roster;
    const count = 3 + dn.actIdx + (room === dn.rooms[1] ? 1 : 0) + room.wave;
    room.spawned = [];
    for (let k = 0; k < count; k++) {
      const type = roster[Math.floor(Math.random() * roster.length)];
      const x = room.x0 + 180 + Math.random() * (room.x1 - room.x0 - 360);
      const fly = type === 'drone' || type === 'spitter';
      const e = createEnemy(type, x, fly ? st.groundY - 200 : st.groundY, dn.actIdx);
      if (Math.random() < 0.18 + dn.actIdx * 0.04 && !fly) makeElite(e);
      g.scaleEnemy(e);
      e.alerted = true;
      e.attackCd = 0.8 + Math.random();
      g.enemies.push(e);
      room.spawned.push(e);
      g.spawnParticles(x, e.y - e.h * 0.5, 14, st.accent, 220);
    }
    room.wave++;
    g.sfx?.bossRoar?.();
    g.addShake(6);
  }

  spawnSecretBoss(key, x) {
    const g = this.game;
    const st = g.stage;
    const dn = this.dungeon;
    const sb = SECRET_BOSSES[key];
    const e = createEnemy(sb.ai, x, sb.ai === 'spitter' ? st.groundY - 200 : st.groundY, dn.actIdx);
    e.art = key;
    e.name = `${sb.name}`;
    e.subtitle = `SECRET BOSS · ${sb.title}`;
    e.isSecretBoss = true;
    e.secretKey = key;
    e.w = sb.w;
    e.h = sb.h;
    e.maxHp = Math.round(sb.hp * (1 + dn.actIdx * 0.12));
    e.hp = e.maxHp;
    e.color = sb.color;
    e.score = 5000;
    e.execAt = 0.06;
    e.alerted = true;
    e.speed = (e.speed || 120) * (key === 'paleknight' || key === 'shadow' ? 1.05 : 0.85);
    e._patT = 3;
    e._patN = 0;
    g.scaleEnemy(e);
    g.enemies.push(e);
    st.midBoss = e;
    st.midBossDefeated = true;
    dn.boss = e;
    g.bossLagPct = 100;
    g.sfx?.bossRoar?.();
    g.addShake(18);
    g.spawnParticles(x, st.groundY - 60, 40, sb.color, 360);
    document.getElementById('boss-hud')?.classList.remove('hidden');
    const card = document.getElementById('boss-intro-card');
    if (card) {
      card.querySelector('.boss-intro-line').textContent = 'A SECRET BOSS STIRS';
      document.getElementById('boss-intro-title').textContent = sb.name;
      document.getElementById('boss-intro-sub').textContent = sb.title;
      card.classList.remove('hidden');
      setTimeout(() => card.classList.add('hidden'), 2600);
    }
  }

  updateDungeon(dt) {
    const g = this.game;
    const r = g.rika;
    const st = g.stage;
    const dn = this.dungeon;

    for (const room of dn.rooms) {
      if (!room.started && r.x > room.x0 + 120 && r.x < room.x1) {
        room.started = true;
        room.entryGate = { x: room.x0 - 14, y: st.groundY - 560, w: 28, h: 560, dungeonGate: true };
        st.walls.push(room.entryGate);
        if (room.boss) {
          this.spawnSecretBoss(dn.bossKey, room.x0 + (room.x1 - room.x0) * 0.68);
        } else {
          this.spawnWave(room);
        }
      }
      if (room.started && !room.cleared) {
        if (room.boss) {
          if (dn.boss && dn.boss.dead && !dn.shadowPending) this.onSecretBossSlain(room);
        } else if (room.spawned.every((e) => e.dead)) {
          if (room.wave < room.waves) {
            this.spawnWave(room);
          } else {
            this.clearRoom(room);
          }
        }
      }
    }

    // The hidden sixth: after the Choir falls, Lyra's Shadow steps out of the mirror
    if (dn.shadowPending > 0) {
      dn.shadowPending -= dt;
      if (dn.shadowPending <= 0) {
        dn.shadowPending = 0;
        dn.bossKey = 'shadow';
        const room = dn.rooms[dn.rooms.length - 1];
        this.spawnSecretBoss('shadow', room.x0 + (room.x1 - room.x0) * 0.6);
      }
    }

    if (dn.boss && !dn.boss.dead) this.updateBossPattern(dn.boss, dt);
  }

  clearRoom(room) {
    const g = this.game;
    const st = g.stage;
    const dn = this.dungeon;
    room.cleared = true;
    st.walls = st.walls.filter((w) => w !== room.exitGate && w !== room.entryGate);
    const obj = st.objectives[0];
    obj.progress = Math.min(obj.goal, obj.progress + 1);
    g.sfx?.powerup?.();
    g.gainShards(25 + dn.actIdx * 8);
    const last = room === dn.rooms[dn.rooms.length - 1];
    if (last) {
      obj.done = true;
      dn.complete = true;
      if (dn.kind === 'crypt') {
        dn.altars.push({ kind: 'sigil', x: (room.x0 + room.x1) * 0.5, claimed: false });
        g.toast('CRYPT CLEANSED', 'A sleeping sigil stirs on the altar ahead.', '#e6b868');
      }
      dn.portals.push({ x: room.x1 - 140 });
    } else {
      g.toast('CHAMBER PURGED', 'The portcullis grinds open.', '#e6b868');
    }
  }

  onSecretBossSlain(room) {
    const g = this.game;
    const dn = this.dungeon;
    const key = dn.bossKey;
    const first = !this.profile.slain[key];
    this.profile.slain[key] = true;
    this.save();
    g.setMsg(`${SECRET_BOSSES[key].name} HAS FALLEN`);
    g.addShake(20);
    g.flashColor = '#ffffff';
    g.flashAlpha = 0.5 * (g.flashMult ?? 1);
    document.getElementById('boss-hud')?.classList.add('hidden');
    g.stage.midBoss = null;
    dn.altars.push({ kind: 'boss', key, first, x: (room.x0 + room.x1) * 0.5 - 60, claimed: false });

    const allFive = ['bellringer', 'gravemother', 'paleknight', 'cardinal', 'choir'].every((k) => this.profile.slain[k]);
    if (key === 'choir' && allFive) {
      dn.shadowPending = 4;
      dn.boss = null;
      g.toast('THE MIRROR CRACKS', 'Something with your face steps out of the dark…', '#c08aff');
      return;
    }
    this.clearRoom(room);
  }

  claimAltar(al) {
    const g = this.game;
    const p = this.profile;
    if (al.kind === 'sigil') {
      const id = DUNGEONS[this.dungeon.actIdx].crypt.sigil;
      const sg = SIGILS[id];
      if (!p.sigils.includes(id)) {
        p.sigils.push(id);
        if (!p.sigil) p.sigil = id;
        this.save();
        g.toast(`SUPERPOWER AWAKENED: ${sg.name}`, `${sg.desc} Press [B]. Equip in the Armory.`, sg.color);
      } else {
        g.gainShards(150);
        g.toast('THE SIGIL RECOGNISES YOU', '+150 Soul Shards', sg.color);
      }
      g.flashColor = sg.color;
    } else {
      const sb = SECRET_BOSSES[al.key];
      const rw = sb.reward;
      if (rw.weapon && !p.weapons.includes(rw.weapon)) {
        p.weapons.push(rw.weapon);
        const w = EX_WEAPONS[rw.weapon];
        g.toast(`NEW WEAPON: ${w.name}`, `${w.desc} Press [${rw.weapon}].`, w.color);
        g.rika.switchWeapon(rw.weapon, (m) => g.setMsg(m));
      } else if (rw.weapon) {
        g.gainShards(200);
      }
      if (rw.cloak) g.toast('NEW CLOAK UNLOCKED', `${CLOAKS.find((c) => c.id === rw.cloak)?.name || rw.cloak} — wear it from the Armory.`, sb.color);
      if (rw.shards) g.gainShards(rw.shards);
      g.gainXp(300);
      this.save();
      g.flashColor = sb.color;
    }
    g.flashAlpha = 0.45 * (g.flashMult ?? 1);
    g.sfx?.powerup?.();
    g.addShake(10);
  }

  // -------------------------------------------------------------------------
  // Secret boss attack patterns (layered on top of their base demon AI)
  // -------------------------------------------------------------------------

  updateBossPattern(b, dt) {
    const g = this.game;
    const r = g.rika;
    if (b.status?.freeze || b.status?.stun) return;
    const rage = b.hp < b.maxHp * 0.5 ? 0.7 : 1;
    b._patT -= dt;
    b._warn = b._patT < 0.6 ? 1 - b._patT / 0.6 : 0;

    // The Choir's spiral hymn is a sustained emitter
    if (b._spiral > 0) {
      b._spiral -= dt;
      b._spiralTick = (b._spiralTick || 0) - dt;
      if (b._spiralTick <= 0) {
        b._spiralTick = 0.07;
        b._spiralA = (b._spiralA || 0) + 0.42;
        for (const off of [0, Math.PI]) {
          const a = b._spiralA + off;
          g.spawnBullet({ x: b.x, y: b.y - b.h * 0.7, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, dmg: 14, color: '#d8a8ff', glow: '#b06aff', radius: 6, fromPlayer: false });
        }
      }
    }
    if (b._patT > 0) return;
    b._patT = (3.4 + Math.random() * 1.2) * rage;
    b._patN++;
    const dmg = 16 + this.dungeon.actIdx * 3;
    const cx = b.x;
    const cy = b.y - b.h * 0.6;
    const toR = Math.atan2((r.y - 40) - cy, r.x - cx);
    const shoot = (x, y, a, sp, color, glow, radius = 7, extra = {}) =>
      g.spawnBullet({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg, color, glow, radius, fromPlayer: false, ...extra });

    switch (b.secretKey) {
      case 'bellringer': {
        // The toll: a ring of embers from the bell, then burning rain
        const bx = b.x - b.facing * 30;
        const by = b.y - b.h * 0.65;
        for (let i = 0; i < 18; i++) shoot(bx, by, (i / 18) * TAU, 340, '#ffb347', '#ff6a1a');
        if (b._patN % 2 === 0) {
          for (let i = 0; i < 7; i++) shoot(r.x + (i - 3) * 70, g.stage.groundY - 560 - i * 30, Math.PI / 2, 420, '#ffd36a', '#ff6a1a', 8);
        }
        g.sfx?.explode?.();
        g.addShake(9);
        break;
      }
      case 'gravemother': {
        // Arcing venom globs, and every third pattern a brood of ticks
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (r.x > cx ? 0.55 : -0.55) + (i - 2) * 0.16;
          shoot(cx, cy, a, 520 + i * 40, '#c8ff7a', '#5aa82a', 9, { gravity: 900 });
        }
        if (b._patN % 3 === 0) {
          for (let i = 0; i < 2; i++) {
            const t = createEnemy('bloat', b.x + (i ? 60 : -60), g.stage.groundY, this.dungeon.actIdx);
            g.scaleEnemy(t);
            t.alerted = true;
            g.enemies.push(t);
          }
        }
        break;
      }
      case 'paleknight': {
        // Frost crescents skating along the floor in both directions, plus a high one
        for (const dir of [-1, 1]) shoot(cx, g.stage.groundY - 22, dir > 0 ? 0 : Math.PI, 600, '#dff6ff', '#7fd0ff', 12, { heavy: true });
        shoot(cx, cy - 20, toR, 700, '#dff6ff', '#7fd0ff', 9);
        if (b._patN % 2 === 0) {
          b.x = Math.max(g.stage._rooms.at(-1).x0 + 60, Math.min(g.stage._rooms.at(-1).x1 - 60, r.x - r.facing * 140));
          g.spawnParticles(b.x, b.y - 60, 24, '#dff6ff', 260);
        }
        break;
      }
      case 'cardinal': {
        // A spiral of knives, then a tight aimed fan
        if (b._patN % 2) {
          for (let i = 0; i < 24; i++) shoot(cx, cy, (i / 24) * TAU + b._patN * 0.13, 280, '#f2ead8', '#ff3a3a', 6);
        } else {
          for (let i = -3; i <= 3; i++) shoot(cx, cy, toR + i * 0.09, 640, '#f2ead8', '#ff3a3a', 6);
        }
        break;
      }
      case 'choir': {
        b._spiral = 1.6;
        if (b._patN % 3 === 0) {
          for (let i = 0; i < 2; i++) {
            const s = createEnemy('drone', b.x + (i ? 120 : -120), g.stage.groundY - 220, this.dungeon.actIdx);
            g.scaleEnemy(s);
            s.alerted = true;
            g.enemies.push(s);
          }
        }
        break;
      }
      case 'shadow': {
        // Mirrors Rika: blinks behind her and returns her own volley
        if (b._patN % 2) {
          g.spawnParticles(b.x, b.y - 40, 20, '#c08aff', 240);
          const room = g.stage._rooms.at(-1);
          b.x = Math.max(room.x0 + 60, Math.min(room.x1 - 60, r.x - r.facing * 130));
          g.spawnParticles(b.x, b.y - 40, 20, '#c08aff', 240);
        }
        for (let i = -2; i <= 2; i++) shoot(b.x, b.y - 48, Math.atan2((r.y - 40) - (b.y - 48), r.x - b.x) + i * 0.12, 760, '#e8d0ff', '#9a4aff', 6);
        break;
      }
      default:
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Per-frame update & rendering hooks
  // -------------------------------------------------------------------------

  update(dt) {
    const g = this.game;
    if (!g.stage) return;
    this.updateShots(dt);
    this.updateSigil(dt);

    // Warden's key opens this act's vault
    const st = g.stage;
    if (!this.inDungeon && g.mode === 'campaign' && st.dungeonDoors && st.midBossDefeated && !this.vaultKeys[g.stageIndex]) {
      this.vaultKeys[g.stageIndex] = true;
      g.toast('VAULT KEY OBTAINED', `The Warden carried the key to ${DUNGEONS[g.stageIndex].vault.name}. Find the violet door.`, '#b06aff');
    }

    if (this.inDungeon) this.updateDungeon(dt);

    // Codex: remember every demon Rika has laid eyes on
    for (const e of g.enemies) {
      if (e.dead || !onScreen(g, e)) continue;
      const key = e.isBoss ? `lord${e.bossId}` : (e.art || e.type);
      if (!this.profile.seen[key]) {
        this.profile.seen[key] = true;
        this._seenDirty = 1;
      }
    }
    if (this._seenDirty) {
      this._seenDirty = 0;
      this.save();
    }
  }

  /** World-space props drawn behind actors: doors, gates, altars, portals. */
  renderWorld(ctx, time) {
    const g = this.game;
    const st = g.stage;
    if (!st) return;
    const gy = st.groundY;

    for (const d of st.dungeonDoors || []) this.drawDoor(ctx, d, gy, time);

    if (!this.inDungeon) return;
    const dn = this.dungeon;
    for (const w of st.walls) {
      if (w.dungeonGate) this.drawPortcullis(ctx, w, st.accent, time);
    }
    for (const p of dn.portals) this.drawPortal(ctx, p.x, gy, time);
    for (const al of dn.altars) this.drawAltar(ctx, al, gy, time);

    // Secret-boss pattern warning ring
    const b = dn.boss;
    if (b && !b.dead && b._warn > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(255,220,140,${0.3 + b._warn * 0.6})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x, b.y - b.h * 0.55, Math.max(b.w, b.h) * (1.1 - b._warn * 0.4), 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  /** Effects drawn over actors. */
  renderFx(ctx, time) {
    this.drawShots(ctx, time);
    this.drawSigilFx(ctx, time);
  }

  /** Screen-space overlay (after the world transform is popped). */
  renderOverlay(ctx, w, h) {
    if (this.tint) {
      ctx.fillStyle = `${this.tint.color}${0.25 * Math.min(1, this.tint.t / 0.4)})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (this.sigilActive === 'wraith') {
      ctx.fillStyle = 'rgba(60,40,120,0.12)';
      ctx.fillRect(0, 0, w, h);
    } else if (this.sigilActive === 'bloodmoon') {
      ctx.fillStyle = 'rgba(120,0,20,0.12)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  drawDoor(ctx, d, gy, time) {
    const vault = d.kind === 'vault';
    const locked = vault && !this.vaultKeys[this.game.stageIndex];
    const col = d.cleared ? '#5a5048' : vault ? '#b06aff' : '#e6a848';
    ctx.save();
    ctx.translate(d.x, gy);
    // Light spilling from the doorway
    if (!d.cleared) {
      const pulse = 0.6 + Math.sin(time * 2.4 + d.x) * 0.2;
      const g = ctx.createRadialGradient(0, -70, 10, 0, -70, 150);
      g.addColorStop(0, vault ? `rgba(176,106,255,${0.35 * pulse})` : `rgba(230,168,72,${0.35 * pulse})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-150, -220, 300, 230);
    }
    // Stone frame
    ctx.fillStyle = '#231b17';
    ctx.beginPath();
    ctx.moveTo(-58, 0);
    ctx.lineTo(-58, -120);
    ctx.quadraticCurveTo(0, -200, 58, -120);
    ctx.lineTo(58, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0c0807';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Voussoir stones
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 30, -120 + Math.sin(a) * 50);
      ctx.lineTo(Math.cos(a) * 58, -120 + Math.sin(a) * 80);
      ctx.stroke();
    }
    // Doorway
    ctx.beginPath();
    ctx.moveTo(-38, 0);
    ctx.lineTo(-38, -112);
    ctx.quadraticCurveTo(0, -168, 38, -112);
    ctx.lineTo(38, 0);
    ctx.closePath();
    const inner = ctx.createLinearGradient(0, -160, 0, 0);
    inner.addColorStop(0, d.cleared ? '#0a0807' : vault ? '#2a0e3a' : '#3a200a');
    inner.addColorStop(1, '#050303');
    ctx.fillStyle = inner;
    ctx.fill();
    // Iron door leaves (vault) or hanging chains (crypt)
    if (vault) {
      ctx.fillStyle = locked ? '#2a2430' : '#18141c';
      ctx.fillRect(-36, -110, 35, 110);
      ctx.fillRect(1, -110, 35, 110);
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-36, -110, 35, 110);
      ctx.strokeRect(1, -110, 35, 110);
      if (locked) {
        ctx.fillStyle = '#c8a860';
        ctx.fillRect(-8, -62, 16, 18);
        ctx.fillStyle = '#100808';
        ctx.fillRect(-2, -56, 4, 7);
      }
    } else {
      ctx.strokeStyle = '#4a3c30';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      for (const cx of [-18, 0, 18]) {
        ctx.beginPath();
        ctx.moveTo(cx, -140);
        ctx.lineTo(cx + Math.sin(time * 1.5 + cx) * 3, -70);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    // Keystone rune
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, -166, 7, 0, TAU);
    ctx.fill();
    ctx.font = '600 11px Cinzel, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = col;
    ctx.fillText(vault ? 'VAULT' : 'CRYPT', 0, -186);
    ctx.restore();
  }

  drawPortcullis(ctx, w, accent, time) {
    ctx.save();
    ctx.fillStyle = 'rgba(10,6,6,0.85)';
    ctx.fillRect(w.x - 6, w.y, w.w + 12, w.h);
    ctx.strokeStyle = '#5a5048';
    ctx.lineWidth = 3;
    for (let x = w.x - 4; x <= w.x + w.w + 4; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x, w.y);
      ctx.lineTo(x, w.y + w.h);
      ctx.stroke();
    }
    for (let y = w.y + 20; y < w.y + w.h; y += 46) {
      ctx.beginPath();
      ctx.moveTo(w.x - 6, y);
      ctx.lineTo(w.x + w.w + 6, y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.35 + Math.sin(time * 4) * 0.15;
    ctx.fillRect(w.x + w.w * 0.5 - 2, w.y + w.h - 200, 4, 180);
    ctx.restore();
  }

  drawPortal(ctx, x, gy, time) {
    ctx.save();
    ctx.translate(x, gy - 70);
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(230,200,140,${0.5 - i * 0.12})`;
      ctx.lineWidth = 3 - i;
      ctx.beginPath();
      ctx.ellipse(0, 0, 30 + i * 6 + Math.sin(time * 3 + i) * 2, 64 + i * 8, 0, 0, TAU);
      ctx.stroke();
    }
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 60);
    g.addColorStop(0, 'rgba(255,240,200,0.55)');
    g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 64, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawAltar(ctx, al, gy, time) {
    const col = al.kind === 'sigil' ? SIGILS[DUNGEONS[this.dungeon.actIdx].crypt.sigil].color : SECRET_BOSSES[al.key].color;
    ctx.save();
    ctx.translate(al.x, gy);
    ctx.fillStyle = '#2a221c';
    ctx.fillRect(-30, -40, 60, 40);
    ctx.fillStyle = '#3a2e26';
    ctx.fillRect(-36, -46, 72, 8);
    ctx.strokeStyle = '#0c0807';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-30, -40, 60, 40);
    if (!al.claimed) {
      const bob = Math.sin(time * 2.5) * 5;
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, -80 + bob, 2, 0, -80 + bob, 50);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.25, col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -80 + bob, 50, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.font = '600 22px Cinzel, Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff8e8';
      const icon = al.kind === 'sigil' ? SIGILS[DUNGEONS[this.dungeon.actIdx].crypt.sigil].icon : '✠';
      ctx.fillText(icon, 0, -72 + bob);
    }
    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // HUD
  // -------------------------------------------------------------------------

  syncHUD() {
    const g = this.game;
    const r = g.rika;
    const bar = document.getElementById('weapon-bar');
    const ammo = document.getElementById('ammo-txt');
    if (bar && ammo) {
      for (const m of [6, 7, 8, 9]) {
        let el = document.getElementById(`wep-${m}`);
        if (this.profile.weapons.includes(m)) {
          if (!el) {
            el = document.createElement('div');
            el.className = 'wep relic';
            el.id = `wep-${m}`;
            el.innerHTML = `<b>[${m}]</b> ${EX_WEAPONS[m].name.split(' ').pop()}`;
            bar.insertBefore(el, ammo);
          }
          el.classList.toggle('active', r.weaponMode === m);
        } else if (el) {
          el.remove();
        }
      }
    }
    const panel = document.getElementById('abilities-panel');
    if (panel) {
      let tile = document.getElementById('ab-sigil');
      if (!tile) {
        tile = document.createElement('div');
        tile.className = 'ability sigil';
        tile.id = 'ab-sigil';
        tile.innerHTML = '<div class="cd-overlay" id="cd-sigil"></div><span class="key">B</span><span class="ab-name" id="sigil-name">—</span><span class="ab-desc">Superpower</span>';
        panel.insertBefore(tile, panel.firstChild);
      }
      const id = this.profile.sigil;
      const name = id ? SIGILS[id].name : 'LOCKED';
      const nameEl = document.getElementById('sigil-name');
      if (nameEl && nameEl.textContent !== name) nameEl.textContent = name;
      tile.style.borderColor = id ? SIGILS[id].color : '';
      tile.classList.toggle('active-sigil', !!this.sigilActive);
      const cd = document.getElementById('cd-sigil');
      if (cd) cd.style.height = id ? `${(this.sigilCd / (SIGILS[id].cd * (r.stats.cdr || 1))) * 100}%` : '100%';
    }
  }
}
