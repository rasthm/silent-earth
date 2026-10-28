/**
 * ELEMENTAL STATUS & REACTION SYSTEM (Noita / Dead Cells / Risk of Rain inspired)
 *
 * Statuses : burn, poison, chill -> freeze, shock, stun
 * Reactions: SHATTER (hit a frozen foe), MELT (burn a frozen foe),
 *            OVERLOAD (shock + burn explosion), TOXIC BLAST (burn + poison explosion)
 */

export const STATUS_INFO = {
  burn: { color: '#ff7a2a', label: 'BURN' },
  poison: { color: '#8dff3a', label: 'POISON' },
  chill: { color: '#7fe9ff', label: 'CHILL' },
  freeze: { color: '#bff6ff', label: 'FROZEN' },
  shock: { color: '#c06bff', label: 'SHOCK' },
  stun: { color: '#ffee66', label: 'STUN' },
};

export const AMMO_TYPES = [
  { id: 'std', name: 'STANDARD', color: '#ffaa22', glow: '#ff4411', element: null },
  { id: 'fire', name: 'INCENDIARY', color: '#ff7a2a', glow: '#ff2200', element: 'burn' },
  { id: 'cryo', name: 'CRYO', color: '#7fe9ff', glow: '#00aaff', element: 'chill' },
  { id: 'arc', name: 'ARC', color: '#c06bff', glow: '#8a2bff', element: 'shock' },
  { id: 'venom', name: 'VENOM', color: '#8dff3a', glow: '#22aa00', element: 'poison' },
];

export function applyStatus(e, type, dur, game) {
  if (!e || e.dead) return;
  e.status = e.status || {};
  if (type === 'stun' && e.isBoss) dur *= 0.3;
  if (type === 'freeze' && e.isBoss) return;

  let s = e.status[type];
  if (!s) s = e.status[type] = { t: 0, stacks: 0, tick: 0 };
  s.t = Math.max(s.t, dur);
  s.stacks = Math.min(5, s.stacks + 1);

  // Chill stacks into a full freeze
  if (type === 'chill' && s.stacks >= 5 && !e.isBoss) {
    delete e.status.chill;
    applyStatus(e, 'freeze', 2.4, game);
    game.floatText(e.x, e.y - e.h - 12, 'FROZEN!', STATUS_INFO.freeze.color);
    return;
  }

  // Elemental reactions
  if (!(e.reactCd > 0)) {
    if (type === 'burn' && e.status.freeze) {
      delete e.status.freeze;
      e.reactCd = 1.2;
      game.reaction(e, 'MELT!', 50, 0, '#ffb066');
    } else if (type === 'shock' && e.status.burn) {
      e.reactCd = 1.2;
      game.reaction(e, 'OVERLOAD!', 60, 150, '#d38bff');
    } else if ((type === 'burn' && e.status.poison) || (type === 'poison' && e.status.burn)) {
      delete e.status.poison;
      e.reactCd = 1.2;
      game.reaction(e, 'TOXIC BLAST!', 55, 170, '#b6ff5a');
    }
  }
}

/** Ticks statuses, returns the movement/attack speed multiplier (0 = locked down). */
export function updateStatus(e, dt, game) {
  if (e.reactCd > 0) e.reactCd -= dt;
  if (!e.status) return 1;
  let speed = 1;
  for (const type of Object.keys(e.status)) {
    const s = e.status[type];
    s.t -= dt;
    if (s.t <= 0) {
      delete e.status[type];
      continue;
    }
    if (type === 'burn') {
      game.dotDamage(e, (10 + s.stacks * 5) * dt);
      s.tick += dt;
      if (s.tick > 0.9) {
        s.tick = 0;
        game.spreadBurn(e);
      }
    } else if (type === 'poison') {
      game.dotDamage(e, (6 + s.stacks * 4) * dt);
    } else if (type === 'chill') {
      speed = Math.min(speed, 1 - 0.12 * s.stacks);
    } else if (type === 'freeze' || type === 'stun') {
      speed = 0;
    }
  }
  return speed;
}

/** Called for every direct player hit. Returns (possibly boosted) damage. */
export function statusOnHit(e, amount, game) {
  if (!e.status) return amount;
  if (e.status.freeze) {
    delete e.status.freeze;
    game.floatText(e.x, e.y - e.h - 12, 'SHATTER!', '#dffaff');
    game.spawnParticles(e.x, e.y - e.h * 0.5, 22, '#bff6ff', 300);
    game.bump('shatters');
    game.progressObjective('shatter');
    amount *= 1.8;
  }
  if (e.status.shock && Math.random() < 0.35) {
    game.shockArc(e, amount * 0.4);
  }
  return amount;
}
