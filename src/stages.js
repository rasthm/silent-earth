/**
 * STAGES, DOOM-STYLE HELL & EARTH REALMS, DEMON ROSTER & 5 MULTI-PHASE DEMON BOSSES — SILENT EARTH 2D
 *
 * 5 Iconic Hell-on-Earth & Deep-Hell Biomes:
 *  - Stage 1: HELL ON EARTH (New Meridian Gore-Zone) — Boss: MALAK-9 // THE CYBER-DEMON BEHEMOTH
 *  - Stage 2: EXULTIA BLOOD FOUNDRY (Flesh Swamps & Bone Cathedrals) — Boss: ARACHNE-MIND // THE SPIDER MASTERMIND
 *  - Stage 3: PHOBOS CRYO-HELL BREACH (UAC Moon Base Torn by Hell) — Boss: KHAN-VALKYRIE // CORRUPTED MAYKR SERAPH
 *  - Stage 4: NEKRAVOL — THE SOUL CITADEL (Tower of the Damned) — Boss: VEX THE MARAUDER // FALLEN NIGHT SENTINEL
 *  - Stage 5: IMMORA — SANCTUM OF THE DARK LORD (Heart of Hell) — Final Boss (4 Phases): DAVOTH-OMEGA // THE ICON OF SIN
 */

import { updateStatus } from './status.js';
import { drawDemon, drawBossFigure } from './demons.js';

export const STAGE_DEFS = [
  {
    id: 1,
    code: 'LEVEL 1',
    name: 'THE ASH CATACOMBS',
    subtitle: 'DENIAL // THE CINDER PENITENTIARY',
    realm: 'iron_catacombs',
    weather: 'embers',
    width: 9800,
    groundY: 640,
    midBossTriggerX: 4850,
    bossTriggerX: 8820,
    arenaLeft: 8680,
    arenaRight: 9720,
    skyTop: '#060102',
    skyMid: '#1e0604',
    skyBot: '#4a0e06',
    accent: '#d8822b',
    groundColor: '#17120f',
    groundTrim: '#8c5830',
    bossTitle: 'LORD MALAK',
    bossSub: 'THE CINDER PENITENTIARY · FIRST SEAL',
  },
  {
    id: 2,
    code: 'LEVEL 2',
    name: 'THE DROWNED OSSUARY',
    subtitle: 'BARGAINING // THE WEEPING CHOIR',
    realm: 'silk_ossuary',
    weather: 'spores',
    width: 10200,
    groundY: 640,
    midBossTriggerX: 5100,
    bossTriggerX: 9220,
    arenaLeft: 9080,
    arenaRight: 10120,
    skyTop: '#050203',
    skyMid: '#1c0a08',
    skyBot: '#3e1410',
    accent: '#9eb864',
    groundColor: '#141610',
    groundTrim: '#6e7c48',
    bossTitle: 'MATRON ARACHNE',
    bossSub: 'THE WEEPING CHOIR · SECOND SEAL',
  },
  {
    id: 3,
    code: 'LEVEL 3',
    name: 'THE RIME VAULTS',
    subtitle: 'STASIS // THE FROZEN CLOCKMAKER',
    realm: 'frozen_reliquary',
    weather: 'snow',
    width: 10600,
    groundY: 640,
    midBossTriggerX: 5350,
    bossTriggerX: 9620,
    arenaLeft: 9480,
    arenaRight: 10520,
    skyTop: '#04060a',
    skyMid: '#14101a',
    skyBot: '#2e0e14',
    accent: '#b8c8d8',
    groundColor: '#12161c',
    groundTrim: '#6e8092',
    bossTitle: 'SERAPH VALKYRIE',
    bossSub: 'THE FROZEN CLOCKMAKER · THIRD SEAL',
  },
  {
    id: 4,
    code: 'LEVEL 4',
    name: 'THE IRON RELIQUARY',
    subtitle: 'GUILT // THE UNFORGIVEN FORGE',
    realm: 'nekravol',
    weather: 'stars',
    width: 11000,
    groundY: 640,
    midBossTriggerX: 5600,
    bossTriggerX: 10020,
    arenaLeft: 9880,
    arenaRight: 10920,
    skyTop: '#070203',
    skyMid: '#260806',
    skyBot: '#5a1408',
    accent: '#dca044',
    groundColor: '#151014',
    groundTrim: '#9e7032',
    bossTitle: 'VEX',
    bossSub: 'THE UNFORGIVEN FORGE · FOURTH SEAL',
  },
  {
    id: 5,
    code: 'LEVEL 5',
    name: 'CRADLE OF THE FIRST SIN',
    subtitle: 'ACCEPTANCE // THE SERAPH OF THE ECLIPSE',
    realm: 'immora',
    weather: 'rifts',
    width: 11400,
    groundY: 640,
    midBossTriggerX: 5850,
    bossTriggerX: 10420,
    arenaLeft: 10280,
    arenaRight: 11320,
    skyTop: '#080102',
    skyMid: '#2a0408',
    skyBot: '#600a10',
    accent: '#c84232',
    groundColor: '#160b0c',
    groundTrim: '#8c3228',
    bossTitle: 'DAVOTH-OMEGA',
    bossSub: 'THE SERAPH OF THE ECLIPSE & ICON OF SIN',
  },
];

export function buildStage(stageIdx) {
  const def = STAGE_DEFS[stageIdx] || STAGE_DEFS[0];
  const gy = def.groundY;

  const platforms = [];
  const walls = [];
  const jumpPads = [];
  const grapplePoints = [];
  const monkeyBars = [];
  const slipgates = [];
  const goreNests = [];
  const barrels = [];
  const chests = [];
  const terminals = [];
  const mechBays = [];
  const hazards = [];
  const turrets = [];
  const enemies = [];
  const decors = [];
  const fgPillars = [];
  const torches = [];
  const chains = [];

  // Generate multi-layer 2.5D subterranean catacomb arches, stone pillars, hanging chains & flickering wall torches
  for (let x = 0; x < def.width; x += 210) {
    decors.push({
      x,
      w: 115 + ((x * 7) % 90),
      h: 220 + ((x * 13) % 260),
      layer: 0.22,
      windows: (x % 420) === 0,
      flesh: stageIdx === 1 || stageIdx === 4,
      arch: true,
    });
  }
  for (let x = 80; x < def.width; x += 300) {
    decors.push({
      x,
      w: 88 + ((x * 11) % 70),
      h: 150 + ((x * 17) % 165),
      layer: 0.48,
      pipes: true,
      flesh: false,
    });
  }
  // Flickering Dungeon Wall Torches & Hanging Iron Chains every 280px
  for (let x = 180; x < def.width; x += 280) {
    torches.push({
      x,
      y: gy - 115 - ((x * 3) % 90),
      phase: (x * 0.17) % 6.28,
    });
    if (x % 560 === 180) {
      chains.push({
        x: x + 95,
        h: 180 + ((x * 7) % 190),
        cage: (x % 1120) === 180,
        trap: (x % 840) === 180,
        trapReleased: false,
        cageY: gy - 210,
        angle: 0,
        angularVel: 0,
      });
    }
  }
  // Foreground 2.5D stone dungeon pillars (parallax > 1.0 so they sweep past the camera like a 3D dungeon!)
  for (let x = 520; x < def.width; x += 780) {
    fgPillars.push({
      x,
      w: 46 + ((x * 5) % 24),
    });
  }

  const addPlat = (x, y, w, oneWay = true, moving = false, range = 120, crumble = false) => {
    platforms.push({
      x,
      baseX: x,
      y,
      baseY: y,
      w,
      h: 18,
      oneWay,
      moving,
      range,
      crumble,
      crumbleT: 0,
      gone: false,
      respawnT: 0,
      vx: 0,
      phase: Math.random() * 6,
    });
  };

  // Multi-tiered DOOM Eternal / Metroidvania Gauntlet before Boss Arena
  const gauntletEnd = def.bossTriggerX - 280;
  let sectionIdx = 0;

  for (let x = 360; x < gauntletEnd; x += 410) {
    sectionIdx++;
    const lowY = gy - 115 - ((x * 3) % 35);
    const midY = gy - 220 - ((x * 5) % 35);
    const highY = gy - 335 - ((x * 7) % 30);

    addPlat(x, lowY, 195, true);

    // DOOM Eternal Monkey Bar in every section for high-speed 3D-style aerial vaulting!
    monkeyBars.push({
      x: x + 135,
      y: gy - 195 - (sectionIdx % 2) * 55,
      w: 64,
    });

    // Every 2nd section has a moving hover-platform & high secret sky-route!
    if (sectionIdx % 2 === 0) {
      addPlat(x + 150, midY, 165, true, true, 95);
      addPlat(x + 80, highY, 180, true);
      jumpPads.push({ x: x + 35, y: gy });

      // Overhead Magnetic Grapple Point for [F] Meat-Hook Swinging!
      grapplePoints.push({ x: x + 170, y: highY - 75 });

      // Secret Relic Chest on high sky-platform!
      chests.push({
        x: x + 170,
        y: highY,
        opened: false,
        mimic: Math.random() < 0.18,
        shards: 35 + stageIdx * 10,
      });
    } else {
      addPlat(x + 170, gy - 185, 160, true, false, 0, sectionIdx % 4 === 1);
      grapplePoints.push({ x: x + 240, y: gy - 310 });
    }

    // Vertical Wall-Jump Parkour Tower every 3rd section
    if (sectionIdx % 3 === 0) {
      walls.push({ x: x + 350, y: gy - 280, w: 28, h: 220 });
      addPlat(x + 310, gy - 280, 110, true);
      terminals.push({
        x: x + 365,
        y: gy - 280,
        hacked: false,
      });
    }

    // Environmental Hazard Pit (Hellfire Lava / Acid Blood / Cryo-Breach / Argent Plasma)
    if (sectionIdx % 2 === 1 && x > 600) {
      hazards.push({
        x: x + 210,
        y: gy - 8,
        w: 115,
        h: 16,
        type: def.weather,
      });
    }

    // Volatile Hellfire Barrels
    barrels.push({ x: x + 95, y: lowY, w: 28, h: 38, hp: 30, exploded: false });
    if (sectionIdx % 2 === 0) {
      barrels.push({ x: x + 280, y: gy, w: 28, h: 38, hp: 30, exploded: false });
    }
  }

  // Place 3 Demonic BLOOD ALTARS / GORE RELIQUARIES per Act across the 3 Dungeon Depths!
  goreNests.push(
    { id: 101, x: Math.round(def.bossTriggerX * 0.24), y: gy, hp: 60, ripped: false, cleared: false },
    { id: 102, x: Math.round(def.bossTriggerX * 0.51), y: gy, hp: 60, ripped: false, cleared: false },
    { id: 103, x: Math.round(def.bossTriggerX * 0.79), y: gy, hp: 60, ripped: false, cleared: false }
  );

  // Place Subterranean Slipgate Teleporter pairs across the 3 Depths
  slipgates.push(
    {
      x1: Math.round(def.bossTriggerX * 0.21),
      y1: gy,
      x2: Math.round(def.bossTriggerX * 0.21) + 320,
      y2: gy - 320,
      color: '#d8822b',
    },
    {
      x1: Math.round(def.bossTriggerX * 0.62),
      y1: gy,
      x2: Math.round(def.bossTriggerX * 0.62) + 320,
      y2: gy - 320,
      color: '#c84232',
    },
    {
      x1: def.arenaLeft + 140,
      y1: gy,
      x2: def.arenaRight - 140,
      y2: gy - 140,
      color: '#dca044',
    }
  );

  // Place 2 Ancient DREADNOUGHT GOLEM ARMOR BAYS (at 34% and 72% of the dungeon!)
  mechBays.push(
    { x: Math.round(def.bossTriggerX * 0.34), y: gy, used: false },
    { x: Math.round(def.bossTriggerX * 0.72), y: gy, used: false }
  );

  // Supply Reliquary Chests before Mid-Boss and before Fallen Lord Arena
  chests.push(
    { x: def.midBossTriggerX - 160, y: gy, opened: false, shards: 45 },
    { x: def.bossTriggerX - 180, y: gy, opened: false, shards: 65 }
  );

  // Boss Arena elevated tactical platforms, monkey bars, grapple points & jump pads
  const aLeft = def.arenaLeft;
  const aRight = def.arenaRight;
  const aMid = (aLeft + aRight) * 0.5;
  addPlat(aLeft + 95, gy - 140, 175, true);
  addPlat(aRight - 270, gy - 140, 175, true);
  addPlat(aMid - 115, gy - 255, 230, true);
  jumpPads.push({ x: aLeft + 55, y: gy });
  jumpPads.push({ x: aRight - 55, y: gy });
  monkeyBars.push({ x: aLeft + 290, y: gy - 220, w: 66 });
  monkeyBars.push({ x: aRight - 350, y: gy - 220, w: 66 });
  grapplePoints.push({ x: aLeft + 210, y: gy - 340 });
  grapplePoints.push({ x: aRight - 210, y: gy - 340 });
  grapplePoints.push({ x: aMid, y: gy - 380 });

  // Populate Stage Demons along the 3-Depth Dungeon Gauntlet (11 Demon Archetypes!)
  const rosters = [
    ['stalker', 'spitter', 'bloat', 'brute', 'drone', 'pyro'],
    ['stalker', 'spitter', 'medic', 'drone', 'assassin', 'bloat', 'summoner'],
    ['sniper', 'assassin', 'sentry', 'drone', 'medic', 'brute', 'stalker'],
    ['assassin', 'sniper', 'summoner', 'drone', 'pyro', 'bloat', 'sentry', 'brute'],
    ['brute', 'sniper', 'assassin', 'pyro', 'medic', 'summoner', 'sentry', 'spitter', 'drone', 'bloat'],
  ];
  const roster = rosters[stageIdx] || rosters[0];

  let idx = 0;
  // First demon sits beyond alert range of the spawn point so the player gets a moment to orient
  for (let x = 820; x < gauntletEnd; x += 225) {
    // Leave a clear space right at the Mid-Boss Warden gate so the Warden duel feels grand
    if (Math.abs(x - def.midBossTriggerX) < 220) continue;
    const type = roster[idx % roster.length];
    idx++;
    const onHigh = idx % 3 === 0;
    const spawnY = (type === 'drone' || type === 'spitter') ? gy - 195 - (idx % 3) * 45 : onHigh ? gy - 125 : gy;
    const en = createEnemy(type, x, spawnY, stageIdx);
    if (type !== 'drone' && type !== 'sentry' && (idx === 5 || idx === 12 || idx === 20 || Math.random() < 0.09 + stageIdx * 0.03)) {
      makeElite(en);
    }
    enemies.push(en);
  }

  // ======================================================================
  // ADVENTURE SYSTEMS: crates, sanctuary braziers (beacons), merchant, hazards, gate puzzle, ambushes, objectives
  // ======================================================================
  const crates = [];
  for (let cx = 300; cx < gauntletEnd; cx += 260 + ((cx * 3) % 90)) {
    crates.push({ x: cx, y: gy, hp: 20, broken: false });
  }
  for (const p of platforms) {
    if (!p.moving && Math.random() < 0.45) crates.push({ x: p.x + p.w * 0.5, y: p.y, hp: 20, broken: false });
  }

  const beacons = [];
  for (let bx = 1400; bx < def.bossTriggerX - 400; bx += 1450) beacons.push({ x: bx, lit: false });
  beacons.push({ x: def.bossTriggerX - 70, lit: false });

  const merchant = { x: Math.round(def.bossTriggerX * 0.22), y: gy, stock: null };

  const spikes = [];
  for (let sx = 900; sx < gauntletEnd; sx += 740) spikes.push({ x: sx, w: 96, y: gy });

  const lasers = [];
  for (let lx = 1250; lx < gauntletEnd; lx += 920) {
    lasers.push({ x: lx, y: gy, h: 240, period: 3.4, onFor: 1.5, offset: Math.random() * 3 });
  }

  // Sealed Iron Portcullis Gate: read the nearby Whispering Stone to unseal it
  const gateX = Math.round(def.bossTriggerX * 0.68);
  const gate = { x: gateX, y: gy - 520, w: 26, h: 520, gate: true, open: false };
  walls.push(gate);
  terminals.push({ x: gateX - 380, y: gy, hacked: false, opensGate: gate });

  const ambushes = [
    { id: 1, x: Math.round(def.bossTriggerX * 0.29), triggered: false, done: false },
    { id: 2, x: Math.round(def.bossTriggerX * 0.61), triggered: false, done: false },
    { id: 3, x: Math.round(def.bossTriggerX * 0.85), triggered: false, done: false },
  ];

  const objPool = [
    { id: 'chests', desc: 'Open 3 Reliquary Chests', goal: 3 },
    { id: 'crates', desc: 'Smash 10 Rotten Coffers', goal: 10 },
    { id: 'glory', desc: 'Perform 4 Executions [X]', goal: 4 },
    { id: 'hack', desc: 'Commune with 2 Lore Stones', goal: 2 },
    { id: 'elite', desc: 'Slay 2 Possessed Demons', goal: 2 },
    { id: 'ambush', desc: 'Purge 2 Blood Altars / Ambushes', goal: 2 },
    { id: 'parry', desc: 'Land 2 Crucible Parries', goal: 2 },
    { id: 'shatter', desc: 'Shatter 2 Rime-Bound Demons', goal: 2 },
  ];
  const picks = [...objPool].sort(() => Math.random() - 0.5).slice(0, 3);
  const objectives = [{ id: 'kills', desc: `Slay ${22 + stageIdx * 4} Catacomb Demons`, goal: 22 + stageIdx * 4 }, ...picks].map((o) => ({
    ...o,
    progress: 0,
    done: false,
    reward: { shards: 45 + stageIdx * 12, xp: 90 + stageIdx * 25 },
  }));

  // Tip 42: Secret Breakable Illusory Walls hiding secret relic chests
  const breakableWalls = [];
  for (let bx = 980; bx < gauntletEnd - 320; bx += 1100) {
    breakableWalls.push({
      x: bx,
      y: gy - 200,
      w: 32,
      h: 200,
      hp: 50,
      maxHp: 50,
      broken: false,
      hitFlash: 0,
    });
    // Secret Relic Coffer tucked into the hidden alcove behind the wall
    chests.push({
      x: bx + 65,
      y: gy,
      opened: false,
      shards: 85,
      secret: true,
    });
  }

  // Tip 44: Safe Sanctuary Shrine chapel before boss arena
  const sanctuary = {
    x: def.bossTriggerX - 170,
    y: gy,
    active: true,
  };

  // Tip 49: Environmental Lore Tablets (Stone Obelisks)
  const loreTablets = [
    { x: 560, y: gy, logIndex: (stageIdx * 2) % 10, read: false },
    { x: Math.round(def.bossTriggerX * 0.48), y: gy, logIndex: (stageIdx * 2 + 1) % 10, read: false },
  ];

  // Tip 48: Dynamic Gauntlet Lockdown Challenges
  const lockdowns = [
    {
      x: Math.round(def.bossTriggerX * 0.44),
      active: false,
      cleared: false,
      killsNeeded: 4,
      killsDone: 0,
      gateLeft: Math.round(def.bossTriggerX * 0.44) - 220,
      gateRight: Math.round(def.bossTriggerX * 0.44) + 220,
    },
  ];

  return {
    ...def,
    crates,
    beacons,
    merchant,
    spikes,
    lasers,
    ambushes,
    objectives,
    roster,
    checkpointX: 160,
    platforms,
    walls,
    breakableWalls,
    sanctuary,
    loreTablets,
    lockdowns,
    jumpPads,
    grapplePoints,
    monkeyBars,
    slipgates,
    goreNests,
    fgPillars,
    torches,
    chains,
    barrels,
    chests,
    terminals,
    mechBays,
    hazards,
    turrets,
    enemies,
    decors,
    midBossSpawned: false,
    midBossDefeated: false,
    midBoss: null,
    bossSpawned: false,
    bossDefeated: false,
    boss: null,
  };
}

/**
 * Creates the Mid-Dungeon Warden Boss halfway through each Act
 */
export function createMidBoss(stageIdx, stage) {
  const names = [
    'GARRUL // THE FORGEMASTER’S HUSK',
    'MORBUS // THE CARRION CANTOR',
    'CAELUM // WARDEN OF THE GLASS BELFRY',
    'KAELEN // ASH-HOUND EXECUTIONER',
    'APOSTLE SOL // THRONE GUARDIAN',
  ];
  const types = ['brute', 'summoner', 'sniper', 'assassin', 'brute'];
  const w = createEnemy(types[stageIdx] || 'brute', stage.midBossTriggerX + 260, stage.groundY, stageIdx);
  makeElite(w);
  w.isMidBoss = true;
  w.name = names[stageIdx] || names[0];
  w.maxHp = Math.round(680 + stageIdx * 240);
  w.hp = w.maxHp;
  w.w = Math.round(w.w * 1.25);
  w.h = Math.round(w.h * 1.25);
  w.color = '#d88b32';
  w.score = 900;
  return w;
}

/**
 * Creates a Dark-Dungeon Demon Archetype
 */
export function createEnemy(type, x, y, stageIdx) {
  const scale = 1 + stageIdx * 0.22;
  const configs = {
    stalker: {
      name: 'Catacomb Imp',
      w: 40,
      h: 64,
      hp: Math.round(78 * scale),
      speed: 235,
      color: '#c85228',
      score: 120,
    },
    spitter: {
      name: 'Abyssal Beholder',
      w: 52,
      h: 54,
      hp: Math.round(98 * scale),
      speed: 150,
      color: '#b83232',
      score: 160,
      flying: true,
    },
    brute: {
      name: 'Hell Baron',
      w: 60,
      h: 88,
      hp: Math.round(195 * scale),
      speed: 115,
      color: '#d46a28',
      score: 260,
    },
    sniper: {
      name: 'Ossuary Revenant',
      w: 42,
      h: 74,
      hp: Math.round(92 * scale),
      speed: 140,
      color: '#b8c4d0',
      score: 210,
    },
    assassin: {
      name: 'Shadow Prowler',
      w: 40,
      h: 68,
      hp: Math.round(115 * scale),
      speed: 300,
      color: '#9e68b8',
      score: 250,
    },
    pyro: {
      name: 'Forge Mancubus',
      w: 58,
      h: 76,
      hp: Math.round(145 * scale),
      speed: 115,
      color: '#d88b32',
      score: 230,
    },
    drone: {
      name: 'Wailing Skull',
      w: 36,
      h: 36,
      hp: Math.round(64 * scale),
      speed: 240,
      color: '#e09a38',
      score: 150,
      flying: true,
    },
    bloat: {
      name: 'Plague Tick',
      w: 42,
      h: 44,
      hp: Math.round(45 * scale),
      speed: 260,
      color: '#c86432',
      score: 90,
    },
    medic: {
      name: 'Blood Deacon',
      w: 42,
      h: 70,
      hp: Math.round(85 * scale),
      speed: 135,
      color: '#8cb878',
      score: 200,
    },
    summoner: {
      name: 'Archvile Cantor',
      w: 46,
      h: 82,
      hp: Math.round(150 * scale),
      speed: 115,
      color: '#dca044',
      score: 300,
    },
    sentry: {
      name: 'Arachno-Reliquary',
      w: 54,
      h: 58,
      hp: Math.round(140 * scale),
      speed: 0,
      color: '#b84238',
      score: 220,
    },
  };

  const c = configs[type] || configs.stalker;
  return {
    type,
    name: c.name,
    x,
    y,
    vx: 0,
    vy: 0,
    w: c.w,
    h: c.h,
    hp: c.hp,
    maxHp: c.hp,
    speed: c.speed,
    color: c.color,
    score: c.score,
    flying: !!c.flying,
    facing: -1,
    attackCd: 0.7 + Math.random() * 1.1,
    hitFlash: 0,
    animPhase: Math.random() * 6,
    dead: false,
    isBoss: false,
  };
}

function initBossFields(b, stageIdx) {
  b.stagger = 0;
  b.maxStagger = 320 + stageIdx * 80;
  b.staggerTimer = 0;
  b.ultimateDone = false;
  b.interruptible = false;
  b.finisherReady = false;
  b.finisherTimer = 0;
  b.tauntedLowHp = false;
  return b;
}

export function createStageBoss(stageIdx, stage) {
  const spawnX = stage.arenaRight - 180;
  const spawnY = stage.groundY;

  if (stageIdx === 0) {
    return initBossFields({
      isBoss: true,
      bossId: 1,
      name: 'MALAK // THE IRON PENITENT',
      x: spawnX,
      y: spawnY,
      vx: 0,
      vy: 0,
      w: 116,
      h: 154,
      hp: 1850,
      maxHp: 1850,
      phase: 1,
      maxPhases: 2,
      color: '#d87228',
      facing: -1,
      state: 'idle',
      stateTimer: 1.4,
      attackIndex: 0,
      hitFlash: 0,
      animPhase: 0,
      dead: false,
    }, stageIdx);
  }

  if (stageIdx === 1) {
    return initBossFields({
      isBoss: true,
      bossId: 2,
      name: 'MATRON ARACHNE // WEAVER OF HOLLOW VOWS',
      x: spawnX,
      y: spawnY - 90,
      vx: 0,
      vy: 0,
      w: 124,
      h: 120,
      hp: 2350,
      maxHp: 2350,
      phase: 1,
      maxPhases: 2,
      color: '#9eb864',
      facing: -1,
      flying: true,
      state: 'stalk',
      stateTimer: 1.3,
      attackIndex: 0,
      hitFlash: 0,
      animPhase: 0,
      dead: false,
    }, stageIdx);
  }

  if (stageIdx === 2) {
    return initBossFields({
      isBoss: true,
      bossId: 3,
      name: 'SERAPH VALKYRIE // KEEPER OF THE STILL HOUR',
      x: spawnX,
      y: spawnY - 140,
      vx: 0,
      vy: 0,
      w: 92,
      h: 128,
      hp: 2750,
      maxHp: 2750,
      phase: 1,
      maxPhases: 2,
      color: '#c8d6e4',
      facing: -1,
      flying: true,
      state: 'hover',
      stateTimer: 1.2,
      attackIndex: 0,
      hitFlash: 0,
      animPhase: 0,
      dead: false,
    }, stageIdx);
  }

  if (stageIdx === 3) {
    return initBossFields({
      isBoss: true,
      bossId: 4,
      name: 'VEX // THE FALLEN NIGHT SENTINEL',
      x: spawnX,
      y: spawnY,
      vx: 0,
      vy: 0,
      w: 68,
      h: 108,
      hp: 3250,
      maxHp: 3250,
      phase: 1,
      maxPhases: 3,
      color: '#c8382e',
      facing: -1,
      state: 'duel',
      stateTimer: 1.0,
      greenEyeTimer: 0,
      attackIndex: 0,
      hitFlash: 0,
      animPhase: 0,
      dead: false,
    }, stageIdx);
  }

  // ACT V TRUE FINAL BOSS (4 PHASES!): DAVOTH-OMEGA // SOVEREIGN OF THE FIRST GRIEF
  return initBossFields({
    isBoss: true,
    bossId: 5,
    name: 'DAVOTH-OMEGA // SOVEREIGN OF THE FIRST GRIEF',
    x: spawnX,
    y: spawnY - 130,
    vx: 0,
    vy: 0,
    w: 138,
    h: 174,
    hp: 4400,
    maxHp: 4400,
    phase: 1,
    maxPhases: 4,
    color: '#ff1e56',
    facing: -1,
    flying: true,
    state: 'sovereign',
    stateTimer: 1.2,
    attackIndex: 0,
    laserSweepAngle: 0,
    laserActive: 0,
    hitFlash: 0,
    animPhase: 0,
    dead: false,
  }, stageIdx);
}

/**
 * Updates moving platforms, friendly turrets, regular demons & multi-phase bosses
 */
export function updateEnemiesAndBoss(dt, game) {
  const rika = game.rika;
  const stage = game.stage;

  // Update moving hover-platforms
  for (const p of stage.platforms) {
    if (p.moving) {
      p.phase += dt * 1.6;
      const nextX = p.baseX + Math.sin(p.phase) * p.range;
      p.vx = (nextX - p.x) / Math.max(0.001, dt);
      p.x = nextX;
    }
  }

  // Update friendly hacked UAC Auto-Turrets
  for (const t of stage.turrets) {
    t.fireCd = Math.max(0, t.fireCd - dt);
    if (t.fireCd <= 0) {
      let nearest = null;
      let bestD = 620;
      for (const e of game.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - t.x, (e.y - e.h * 0.5) - (t.y - 24));
        if (d < bestD) { bestD = d; nearest = e; }
      }
      if (nearest) {
        t.fireCd = 0.28;
        const ang = Math.atan2((nearest.y - nearest.h * 0.5) - (t.y - 24), nearest.x - t.x);
        t.aimAngle = ang;
        game.spawnBullet({
          x: t.x + Math.cos(ang) * 20,
          y: t.y - 24 + Math.sin(ang) * 20,
          vx: Math.cos(ang) * 1050,
          vy: Math.sin(ang) * 1050,
          dmg: 22,
          color: '#3af2ff',
          glow: '#00aaff',
          radius: 4.5,
          fromPlayer: true,
        });
      }
    }
  }

  let meleeTokens = 2; // Tip 22: Combat Token Queue (at most 2 enemies attack in melee simultaneously)

  for (const e of game.enemies) {
    if (e.dead) continue;
    e.hitFlash = Math.max(0, e.hitFlash - dt * 5);
    e.animPhase += dt * 7;

    const spdM = e.isBoss ? 1 : updateStatus(e, dt, game);
    if (e.isBoss) updateStatus(e, dt, game);
    if (e.affix === 'regen') e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.035 * dt);
    if (e.dead) continue;

    if (e.isBoss) {
      updateBossAI(e, dt, game);
      continue;
    }

    const dx = rika.x - e.x;
    const dy = (rika.y - 40) - (e.y - e.h * 0.5);
    const dist = Math.hypot(dx, dy);

    // Tip 29: Idle Environmental Behaviors before detection
    if (!e.alerted) {
      if (dist < 480 || e.hp < e.maxHp || (rika && rika.shotCounter > (e.lastShotSeen || 0) + 1)) {
        e.alerted = true;
        game.floatingTexts.push({ x: e.x, y: e.y - e.h - 14, text: '!', color: '#ffcc33', life: 0.5 });
      } else {
        // Idle wandering on platform / inspecting ground
        e.vx = Math.sin(e.animPhase * 0.4) * 32;
        e.facing = e.vx >= 0 ? 1 : -1;
        e.x += e.vx * dt;
        continue;
      }
    }

    if (dist > 1050) continue;
    e.facing = dx >= 0 ? 1 : -1;

    // Tip 25: Enrage States at Low Health (<32% HP)
    const hpPct = e.hp / e.maxHp;
    if (!e.enraged && hpPct <= 0.32 && !e.isBoss) {
      e.enraged = true;
      e.speed *= 1.22;
      game.floatingTexts.push({ x: e.x, y: e.y - e.h - 22, text: '⚡ ENRAGED! ⚡', color: '#ff2244', life: 0.8 });
      game.spawnParticles(e.x, e.y - e.h * 0.5, 20, '#ff1133', 280);
      game.addShake(6, e.facing, 0);
    }

    e.attackCd -= dt * spdM * (e.affix === 'frenzy' ? 1.5 : e.enraged ? 1.3 : 1);
    if (spdM === 0) e.attackCd = Math.max(e.attackCd, 0.3);

    // Tip 21: Visual Attack Telegraphs (charging glint active within 0.38s of attack)
    e.telegraphing = e.attackCd <= 0.38;

    // Tip 23: Off-Screen Attack Throttling
    const isOffscreen = e.x < game.camX - 30 || e.x > game.camX + game.viewW + 30;
    if (isOffscreen && e.attackCd <= 0.1) {
      e.attackCd = 0.65;
      if (!game.offscreenWarnings) game.offscreenWarnings = [];
      game.offscreenWarnings.push({
        x: e.x,
        y: e.y,
        facing: dx >= 0 ? 1 : -1,
        timer: 0.65,
        type: e.type,
      });
    }

    // Flying Demons: Lost Soul (`drone`) & Cacodemon (`spitter`)
    if (e.flying) {
      // Tip 27: Smart Aerial Strafing with sweeping sine waves
      const swoopWave = Math.sin(game.time * 3.6 + e.animPhase) * 54;
      const targetY = rika.y - (e.type === 'spitter' ? 140 : 165) + swoopWave;
      const targetX = rika.x - e.facing * (e.type === 'spitter' ? 230 : 185);
      e.vx += (Math.sign(targetX - e.x) * e.speed - e.vx) * dt * 3.5;
      e.vy += (Math.sign(targetY - e.y) * e.speed - e.vy) * dt * 3.5;
      
      // Tip 7: Flying knockback velocity integration & damping
      if (!e.knockbackVx) e.knockbackVx = 0;
      if (!e.knockbackVy) e.knockbackVy = 0;
      e.x += (e.vx * spdM + e.knockbackVx) * dt;
      e.y += (e.vy * spdM + e.knockbackVy) * dt;
      e.knockbackVx *= Math.max(0, 1 - dt * 7.5);
      e.knockbackVy *= Math.max(0, 1 - dt * 7.5);

      if (e.attackCd <= 0 && dist < 660) {
        if (e.type === 'spitter') {
          // Cacodemon twin blue-violet Argent plasma balls (Tip 28: Parryable!)
          e.attackCd = 1.8;
          for (const offset of [-0.09, 0.09]) {
            const ang = Math.atan2(dy, dx) + offset;
            game.spawnBullet({
              x: e.x + e.facing * 20,
              y: e.y - e.h * 0.45,
              vx: Math.cos(ang) * 540,
              vy: Math.sin(ang) * 540,
              dmg: 16,
              color: '#55ddff',
              glow: '#aa33ff',
              radius: 7,
              parryable: true,
              shooter: e,
              fromPlayer: false,
            });
          }
        } else {
          // Lost Soul screaming hellfire skull spit/charge
          e.attackCd = 1.55;
          const ang = Math.atan2(dy, dx);
          game.spawnBullet({
            x: e.x,
            y: e.y - e.h * 0.5,
            vx: Math.cos(ang) * 530,
            vy: Math.sin(ang) * 530,
            dmg: 14,
            color: '#ffaa00',
            glow: '#ff4400',
            radius: 5.5,
            shooter: e,
            fromPlayer: false,
          });
        }
      }
      continue;
    }

    if (e.type === 'stalker' || e.type === 'assassin') {
      if (Math.abs(dx) > 36) e.vx = e.facing * e.speed;
      else e.vx = 0;

      // Tip 30: Demonic Retreat when low health
      if (hpPct < 0.28 && dist < 170) {
        if (!e.retreatCd || e.retreatCd <= 0) {
          e.retreatCd = 2.4;
          e.vx = -e.facing * 390;
          e.vy = -440;
          game.spawnParticles(e.x, e.y - 20, 10, '#9e68b8', 180);
          game.floatingTexts.push({ x: e.x, y: e.y - e.h - 12, text: 'RETREAT!', color: '#bb88ee', life: 0.5 });
        }
      }
      if (e.retreatCd > 0) e.retreatCd -= dt;

      // Hell Imp (`stalker`) leaps and hurls fireballs (Tip 28: Parryable!)
      if (e.type === 'stalker' && e.attackCd <= 0 && dist > 140 && dist < 520) {
        e.attackCd = 1.75;
        if (Math.random() < 0.45 && e.y >= stage.groundY - 4) e.vy = -440;
        const ang = Math.atan2(dy, dx);
        game.spawnBullet({
          x: e.x + e.facing * 18,
          y: e.y - 38,
          vx: Math.cos(ang) * 520,
          vy: Math.sin(ang) * 520,
          dmg: 14,
          color: '#ff9922',
          glow: '#ff4400',
          radius: 6,
          parryable: true,
          shooter: e,
          fromPlayer: false,
        });
      }

      if (e.type === 'assassin' && e.attackCd <= 0 && dist < 450) {
        e.attackCd = 2.5;
        game.spawnParticles(e.x, e.y - 34, 14, '#d93aff', 220);
        e.x = Math.max(60, Math.min(stage.width - 60, rika.x - rika.facing * 95));
        e.y = rika.y;
        game.spawnParticles(e.x, e.y - 34, 18, '#d93aff', 250);
      }
      if (Math.abs(dx) < 48 && Math.abs(e.y - rika.y) < 55 && e.attackCd <= 0) {
        // Tip 22: Combat Token Check (prevents swarm burst)
        if (meleeTokens > 0) {
          meleeTokens--;
          e.attackCd = 1.05;
          rika.takeDamage(18, game);
        } else {
          e.vx = -e.facing * 100;
          e.attackCd = 0.45;
        }
      }
    } else if (e.type === 'pyro') {
      // Mancubus: dual arm-cannon magma lob (Tip 24: Heavy projectile infighting!)
      if (dist > 380) e.vx = e.facing * e.speed;
      else e.vx = 0;

      if (e.attackCd <= 0 && dist < 680) {
        e.attackCd = 2.05;
        for (const mult of [0.78, 0.94]) {
          game.spawnBullet({
            x: e.x + e.facing * 24,
            y: e.y - 48,
            vx: dx * mult,
            vy: -470,
            gravity: 920,
            dmg: 18,
            color: '#ffaa11',
            glow: '#ff3300',
            radius: 7.5,
            heavy: true,
            shooter: e,
            fromPlayer: false,
          });
        }
      }
    } else if (e.type === 'brute') {
      // Baron of Hell: green/crimson Argent plasma fan + leap slam (Tip 24: Heavy!)
      if (dist > 260) e.vx = e.facing * e.speed;
      else e.vx = 0;

      if (e.attackCd <= 0 && dist < 560) {
        e.attackCd = 2.15;
        const baseAng = Math.atan2(dy, dx);
        for (let i = -1; i <= 1; i++) {
          const a = baseAng + i * 0.16;
          game.spawnBullet({
            x: e.x + e.facing * 26,
            y: e.y - 48,
            vx: Math.cos(a) * 560,
            vy: Math.sin(a) * 560,
            dmg: 18,
            color: '#55ff44',
            glow: '#ff4400',
            radius: 6.5,
            heavy: true,
            shooter: e,
            fromPlayer: false,
          });
        }
      }
    } else if (e.type === 'sniper') {
      // Revenant: shoulder-mounted twin rocket barrage (Tip 24: Heavy!)
      if (dist < 260) e.vx = -e.facing * e.speed;
      else e.vx = 0;

      if (e.attackCd <= 0 && dist < 780) {
        e.attackCd = 2.3;
        const ang = Math.atan2(dy, dx);
        for (const offY of [-56, -42]) {
          game.spawnBullet({
            x: e.x + e.facing * 18,
            y: e.y + offY,
            vx: Math.cos(ang) * 820,
            vy: Math.sin(ang) * 820,
            dmg: 16,
            color: '#ff5522',
            glow: '#3af2ff',
            radius: 5.5,
            heavy: true,
            shooter: e,
            fromPlayer: false,
          });
        }
      }
    }

    // ---- SPECIAL DEMON ARCHETYPES ----
    if (e.type === 'bloat') {
      e.vx = e.facing * e.speed;
      if (dist < 90) game.bloatExplode(e);
    } else if (e.type === 'medic') {
      if (dist < 300) e.vx = -e.facing * e.speed;
      else if (dist > 520) e.vx = e.facing * e.speed * 0.7;
      else e.vx = 0;
      if (e.attackCd <= 0) {
        e.attackCd = 2.2;
        let tgt = null;
        let worst = 0.95;
        for (const a of game.enemies) {
          if (a.dead || a === e || a.isBoss || Math.abs(a.x - e.x) > 400) continue;
          const f = a.hp / a.maxHp;
          if (f < worst) { worst = f; tgt = a; }
        }
        if (tgt) {
          tgt.hp = Math.min(tgt.maxHp, tgt.hp + tgt.maxHp * 0.25);
          game.beams.push({ x1: e.x, y1: e.y - e.h * 0.6, x2: tgt.x, y2: tgt.y - tgt.h * 0.5, color: '#ff2255', width: 4, life: 0.25, maxLife: 0.25 });
          game.spawnParticles(tgt.x, tgt.y - tgt.h * 0.5, 10, '#ff2255', 140);
          game.floatText(tgt.x, tgt.y - tgt.h - 8, '+BLOOD BUFF', '#ff4466');
        } else {
          e.attackCd = 0.6;
        }
      }
    } else if (e.type === 'summoner') {
      // Archvile: summons Hellspawn & casts golden hellfire blast
      if (dist < 340) e.vx = -e.facing * e.speed;
      else if (dist > 560) e.vx = e.facing * e.speed;
      else e.vx = 0;
      if (e.attackCd <= 0 && dist < 760) {
        e.attackCd = 4.8;
        if (game.enemies.filter((q) => !q.dead && !q.isBoss).length < 16) {
          for (const off of [-48, 48]) {
            const c = createEnemy(Math.random() < 0.5 ? 'stalker' : 'drone', e.x + off, e.y - 30, 1);
            game.scaleEnemy?.(c);
            game.enemies.push(c);
          }
          game.spawnParticles(e.x, e.y - 40, 22, '#ffb830', 260);
          game.floatText(e.x, e.y - e.h - 12, 'ARCHVILE SUMMON!', '#ffb830');
        }
      }
    } else if (e.type === 'sentry') {
      // Arachnotron plasma burst
      e.vx = 0;
      if (e.attackCd <= 0 && dist < 740) {
        e.attackCd = 1.85;
        const base = Math.atan2(dy, dx);
        for (let i = -1; i <= 1; i++) {
          game.spawnBullet({
            x: e.x + e.facing * 26,
            y: e.y - 34,
            vx: Math.cos(base + i * 0.07) * (700 + i * 40),
            vy: Math.sin(base + i * 0.07) * (700 + i * 40),
            dmg: 17,
            color: '#ff3a5a',
            glow: '#ff0033',
            radius: 5.5,
            fromPlayer: false,
          });
        }
      }
    }

    const prevY = e.y;
    if (!e.knockbackVx) e.knockbackVx = 0;
    if (!e.knockbackVy) e.knockbackVy = 0;

    // Tip 8: Wall Splat & Collision Damage when launched with high velocity into pillars/walls
    if (Math.abs(e.knockbackVx) > 210) {
      for (const wl of stage.walls || []) {
        if (e.x + e.w * 0.45 >= wl.x && e.x - e.w * 0.45 <= wl.x + wl.w && e.y > wl.y && e.y - e.h < wl.y + wl.h) {
          const splatDmg = Math.round(Math.abs(e.knockbackVx) * 0.14);
          e.hp -= splatDmg;
          e.hitFlash = 0.22;
          game.floatingTexts.push({
            x: e.x,
            y: e.y - e.h * 0.65,
            text: `★ WALL SPLAT ${splatDmg}!`,
            color: '#ff9033',
            life: 0.7,
          });
          game.addShake(9, -Math.sign(e.knockbackVx), 0);
          game.spawnParticles(e.x, e.y - e.h * 0.5, 18, '#b89478', 240);
          game.spawnBloodDecalCluster?.(e.x, e.y - e.h * 0.5, 5, '#8a101b');
          game.sfx?.hit?.();
          e.knockbackVx = -e.knockbackVx * 0.3; // bounce back
          break;
        }
      }
    }

    e.knockbackVx *= Math.max(0, 1 - dt * 8.5);
    e.knockbackVy *= Math.max(0, 1 - dt * 8.5);

    const totalVx = e.vx * spdM + e.knockbackVx;
    e.vy += 1500 * dt + e.knockbackVy;
    e.x += totalVx * dt;
    e.y += e.vy * dt;

    for (const p of stage.platforms) {
      if (p.gone) continue;
      if (e.x + 14 > p.x && e.x - 14 < p.x + p.w) {
        if (e.vy >= 0 && prevY <= p.y + 8 && e.y >= p.y) {
          e.y = p.y;
          e.vy = 0;
        }
      }
    }
    if (e.y >= stage.groundY) {
      e.y = stage.groundY;
      e.vy = 0;
    }
  }
}

/**
 * 5 Multi-Phase DOOM Demon Boss AI State Machines
 */
function updateBossAI(b, dt, game) {
  const rika = game.rika;
  const stage = game.stage;
  const dx = rika.x - b.x;
  const dy = (rika.y - 40) - (b.y - b.h * 0.5);
  b.facing = dx >= 0 ? 1 : -1;

  // Tip 33: Boss Stagger / Posture Break State
  if (b.staggerTimer > 0) {
    b.staggerTimer -= dt;
    b.vx = 0;
    b.vy = 0;
    b.state = 'staggered';
    if (Math.random() < 0.35) game.spawnParticles(b.x, b.y - b.h * 0.5, 3, '#ffd700', 140);
    return;
  }

  // Tip 40: Kneeling Stance awaiting Finisher
  if (b.finisherReady) {
    b.vx = 0;
    b.vy = 0;
    b.state = 'kneeling';
    b.finisherTimer -= dt;
    if (b.finisherTimer <= 0) {
      game.onStageBossDefeated(b);
    }
    return;
  }

  // Check Phase Transitions
  const hpRatio = b.hp / b.maxHp;
  const nextPhase = Math.min(b.maxPhases, Math.floor((1 - hpRatio) * b.maxPhases) + 1);
  if (nextPhase > b.phase) {
    b.phase = nextPhase;
    game.sfx?.bossPhaseShift?.();
    game.sfx?.setBossPhaseMusic?.(b.phase);
    game.addShake(22, 0, 1);
    game.spawnParticles(b.x, b.y - b.h * 0.5, 65, b.color, 450);

    // Tip 35: Mid-Fight Conversational Banter on Phase Transition
    const bossBanter = [
      'LORD MALAK: "Ash to ash, pilgrim! The penitentiary shall be your tomb!"',
      'MATRON ARACHNE: "Listen closely... your lament has already been composed!"',
      'SERAPH VALKYRIE: "Time is a frozen gear. You shall tick no more."',
      'VEX: "You face the unyielding iron of the First Legion!"',
      'DAVOTH-OMEGA: "I am the cradle, and I am the eclipse of all things!"',
    ];
    game.setMsg(bossBanter[b.bossId - 1] || `${b.name} — PHASE ${b.phase} ENRAGED!`);

    // Tip 31: Evolving Boss Arenas
    if (b.bossId === 1) {
      // Shatters center platforms into crumble hazards
      for (const p of stage.platforms) {
        if (Math.abs(p.x - (stage.arenaLeft + stage.arenaRight) * 0.5) < 320) {
          p.crumble = true;
          p.crumbleT = 0.8;
        }
      }
      game.spawnBloodDecalCluster?.(b.x, stage.groundY, 8, '#ff3300');
    }
  }

  // Tip 35: Low-HP player dynamic taunt
  if (!b.tauntedLowHp && rika.hp < rika.maxHp * 0.25) {
    b.tauntedLowHp = true;
    game.setMsg(`${b.name}: "Fall, pilgrim! Your pilgrimage is at an end!"`);
  }

  // Tip 32: Desperation Ultimate Attacks (<22% HP)
  if (hpRatio <= 0.22 && !b.ultimateDone && b.state !== 'staggered') {
    b.ultimateDone = true;
    b.state = 'ultimate_windup';
    b.stateTimer = 2.4;
    game.sfx?.bossUltimateCharge?.();
    game.addShake(16, 0, 1);
    game.setMsg(`⚠ DANGER: ${b.name} IS CHARGING ANNIHILATION RIFT! SEEK HIGH PLATFORMS! ⚠`);
  }

  if (b.state === 'ultimate_windup') {
    b.vx = 0;
    game.spawnParticles(b.x + (Math.random() - 0.5) * 110, b.y - b.h * 0.5, 3, b.color, 140);
    if (b.stateTimer <= 0) {
      b.state = 'idle';
      b.stateTimer = 1.2;
      game.addShake(26, 0, 1);
      game.sfx?.explode();
      // Screen-wide ground-sweeping blast wave with safe elevated pockets!
      for (let wx = stage.arenaLeft + 60; wx < stage.arenaRight - 60; wx += 48) {
        game.spawnParticles(wx, stage.groundY - 10, 8, b.color, 320);
      }
      if (rika.y >= stage.groundY - 14) {
        rika.takeDamage(42, game);
        game.setMsg('GROUND SHOCKWAVE HIT — Jump or grapple above the rift!');
      } else {
        game.floatingTexts.push({ x: rika.x, y: rika.y - 40, text: '★ ULTIMATE EVADED! ★', color: '#2dff7a', life: 0.8 });
      }
    }
    return;
  }

  b.stateTimer -= dt;
  if (b.greenEyeTimer > 0) b.greenEyeTimer = Math.max(0, b.greenEyeTimer - dt);
  const speedMult = 1 + (b.phase - 1) * 0.28;

  // ==========================================================================
  // BOSS 1: MALAK-9 // THE CYBER-DEMON BEHEMOTH
  // ==========================================================================
  if (b.bossId === 1) {
    // Tip 34: Interruptible Charge Wind-up
    if (b.state === 'charge_windup') {
      b.vx = 0;
      b.interruptible = true;
      game.spawnParticles(b.x, b.y - 40, 2, '#ffaa33', 110);
      if (b.stateTimer <= 0) {
        b.interruptible = false;
        b.state = 'charge';
        b.stateTimer = 1.15;
      }
      return;
    }
    if (b.state === 'interrupted') {
      b.vx = 0;
      b.interruptible = false;
      if (b.stateTimer <= 0) {
        b.state = 'idle';
        b.stateTimer = 1.0;
      }
      return;
    }

    if (b.state === 'charge') {
      b.vx = b.chargeDir * 660 * speedMult;
      b.x += b.vx * dt;
      game.spawnParticles(b.x, b.y - 20, 2, '#ff5511', 120);
      if (Math.abs(b.x - rika.x) < 68 && Math.abs(b.y - rika.y) < 95) {
        rika.takeDamage(26, game);
      }
      if (b.x <= stage.arenaLeft + 80 || b.x >= stage.arenaRight - 80 || b.stateTimer <= 0) {
        b.state = 'idle';
        b.stateTimer = 1.1 / speedMult;
        game.addShake(10);
      }
    } else {
      b.vx = b.facing * 135 * speedMult;
      b.x += b.vx * dt;
      if (b.stateTimer <= 0) {
        b.attackIndex = (b.attackIndex + 1) % 3;
        if (b.attackIndex === 0) {
          b.state = 'charge_windup';
          b.chargeDir = b.facing;
          b.stateTimer = 0.55;
          b.interruptible = true;
          game.sfx?.bossRoar();
          game.setMsg('LORD MALAK: CHARGING CINDER RUSH — COUNTER NOW!');
        } else if (b.attackIndex === 1) {
          b.stateTimer = 1.55 / speedMult;
          const count = b.phase === 2 ? 9 : 6;
          for (let i = 0; i < count; i++) {
            const frac = (i / (count - 1)) - 0.5;
            game.spawnBullet({
              x: b.x,
              y: b.y - 110,
              vx: frac * 760 + dx * 0.4,
              vy: -520 - Math.abs(frac) * 180,
              gravity: 980,
              dmg: 20,
              color: '#ff6611',
              glow: '#ff2200',
              radius: 8,
              fromPlayer: false,
            });
          }
          game.sfx?.explode();
        } else {
          b.stateTimer = 1.5 / speedMult;
          b.vy = -560;
          for (const dir of [-1, 1]) {
            game.spawnBullet({
              x: b.x + dir * 40,
              y: stage.groundY - 22,
              vx: dir * 560 * speedMult,
              vy: 0,
              dmg: 22,
              color: '#ff3300',
              glow: '#ffaa00',
              radius: 11,
              fromPlayer: false,
            });
          }
          game.addShake(11);
        }
      }
    }
    b.vy += 1500 * dt;
    b.y += b.vy * dt;
    if (b.y >= stage.groundY) { b.y = stage.groundY; b.vy = 0; }
    b.x = Math.max(stage.arenaLeft + 70, Math.min(stage.arenaRight - 70, b.x));
    return;
  }

  // ==========================================================================
  // BOSS 2: ARACHNE-MIND // THE SPIDER MASTERMIND
  // ==========================================================================
  if (b.bossId === 2) {
    const midX = (stage.arenaLeft + stage.arenaRight) * 0.5;
    const targetX = midX + Math.sin(b.animPhase * 0.45) * 340;
    const targetY = stage.groundY - 220 + Math.sin(b.animPhase * 0.9) * 85;
    b.x += (targetX - b.x) * dt * 3.0 * speedMult;
    b.y += (targetY - b.y) * dt * 3.0 * speedMult;

    if (b.stateTimer <= 0) {
      b.attackIndex = (b.attackIndex + 1) % 3;
      b.stateTimer = 1.45 / speedMult;
      if (b.attackIndex === 0) {
        const base = Math.atan2(dy, dx);
        for (let i = -3; i <= 3; i++) {
          // Tip 39: Telegraphed bullet-hell safe channels (skips i === -1 and 1)
          if (i === -1 || i === 1) continue;
          const a = base + i * 0.16;
          game.spawnBullet({
            x: b.x,
            y: b.y - 40,
            vx: Math.cos(a) * 620,
            vy: Math.sin(a) * 620,
            dmg: 19,
            color: '#55ff44',
            glow: '#00aa22',
            radius: 7.5,
            fromPlayer: false,
          });
        }
        game.sfx?.shootShotgun();
      } else if (b.attackIndex === 1) {
        for (let i = 0; i < 7; i++) {
          const rx = stage.arenaLeft + 80 + (i / 6) * (stage.arenaRight - stage.arenaLeft - 160);
          game.spawnBullet({
            x: rx,
            y: stage.groundY - 460,
            vx: (Math.random() - 0.5) * 90,
            vy: 480 * speedMult,
            dmg: 18,
            color: '#aaff22',
            glow: '#33ff55',
            radius: 8,
            fromPlayer: false,
          });
        }
        game.setMsg('MATRON ARACHNE: VENOM CHOIR BARRAGE!');
      } else {
        if (game.enemies.filter((e) => !e.dead && !e.isBoss).length < 4) {
          game.enemies.push(createEnemy('drone', b.x - 60, b.y - 40, 1));
          game.enemies.push(createEnemy('drone', b.x + 60, b.y - 40, 1));
          game.setMsg('MATRON ARACHNE RELEASES HER WAILING SKULLS!');
        }
      }
    }
    return;
  }

  // ==========================================================================
  // BOSS 3: KHAN-VALKYRIE // CORRUPTED MAYKR SERAPH
  // ==========================================================================
  if (b.bossId === 3) {
    const midX = (stage.arenaLeft + stage.arenaRight) * 0.5;
    const targetX = midX + Math.sin(b.animPhase * 0.35) * 320;
    const targetY = stage.groundY - 190 + Math.cos(b.animPhase * 0.7) * 65;
    b.x += (targetX - b.x) * dt * 2.8 * speedMult;
    b.y += (targetY - b.y) * dt * 2.8 * speedMult;

    if (b.stateTimer <= 0) {
      b.attackIndex = (b.attackIndex + 1) % 3;
      b.stateTimer = 1.5 / speedMult;
      if (b.attackIndex === 0) {
        const shards = b.phase === 2 ? 16 : 12;
        for (let i = 0; i < shards; i++) {
          // Tip 39: Predictable geometric safe notches (every 4th ray omitted for rhythmic roll/dash through)
          if (i % 4 === 0) continue;
          const a = (i / shards) * Math.PI * 2 + b.animPhase;
          game.spawnBullet({
            x: b.x,
            y: b.y - b.h * 0.5,
            vx: Math.cos(a) * 480 * speedMult,
            vy: Math.sin(a) * 480 * speedMult,
            dmg: 19,
            color: '#3af2ff',
            glow: '#0088ff',
            radius: 6.5,
            fromPlayer: false,
          });
        }
        game.sfx?.shootRail();
      } else if (b.attackIndex === 1) {
        const base = Math.atan2(dy, dx);
        for (let i = -2; i <= 2; i++) {
          const a = base + i * 0.13;
          game.spawnBullet({
            x: b.x,
            y: b.y - b.h * 0.5,
            vx: Math.cos(a) * 780,
            vy: Math.sin(a) * 780,
            dmg: 22,
            color: '#99f8ff',
            glow: '#3af2ff',
            radius: 7,
            fromPlayer: false,
          });
        }
        game.sfx?.shootPulse();
      } else {
        const drops = b.phase === 2 ? 8 : 5;
        for (let i = 0; i < drops; i++) {
          const rx = stage.arenaLeft + 90 + (i / (drops - 1)) * (stage.arenaRight - stage.arenaLeft - 180);
          game.spawnBullet({
            x: rx + (Math.random() - 0.5) * 45,
            y: stage.groundY - 460,
            vx: 0,
            vy: 560 * speedMult,
            dmg: 19,
            color: '#ffd24a',
            glow: '#3af2ff',
            radius: 7.5,
            fromPlayer: false,
          });
        }
      }
    }
    return;
  }

  // ==========================================================================
  // BOSS 4: VEX THE MARAUDER // FALLEN NIGHT SENTINEL (DOOM Eternal Marauder!)
  // ==========================================================================
  if (b.bossId === 4) {
    b.vx = b.facing * 290 * speedMult;
    b.x += b.vx * dt;
    b.vy += 1500 * dt;
    b.y += b.vy * dt;
    if (b.y >= stage.groundY) { b.y = stage.groundY; b.vy = 0; }
    b.x = Math.max(stage.arenaLeft + 65, Math.min(stage.arenaRight - 65, b.x));

    if (b.stateTimer <= 0) {
      b.attackIndex = (b.attackIndex + 1) % 3;
      b.stateTimer = 1.25 / speedMult;

      if (b.attackIndex === 0) {
        // Marauder Green-Eye Counter Window + Argent Axe Wave Slash!
        b.greenEyeTimer = 0.85;
        game.spawnParticles(b.x, b.y - 50, 22, '#2dff7a', 280);
        b.x = Math.max(stage.arenaLeft + 80, Math.min(stage.arenaRight - 80, rika.x - rika.facing * 140));
        b.y = rika.y;
        b.facing = rika.x >= b.x ? 1 : -1;
        game.sfx?.swordSlash();
        for (let i = -1; i <= 1; i++) {
          game.spawnBullet({
            x: b.x + b.facing * 30,
            y: b.y - 52 + i * 18,
            vx: b.facing * 860,
            vy: i * 95,
            dmg: 22,
            color: '#ff1e38',
            glow: '#ff6600',
            radius: 8,
            fromPlayer: false,
          });
        }
        game.setMsg("VEX'S EYES FLASH GREEN — COUNTER NOW FOR 2.2x DAMAGE!");
      } else if (b.attackIndex === 1) {
        // Aerial Leap + Super Shotgun / Argent Fan
        b.vy = -680;
        const base = Math.atan2(dy, dx);
        for (let i = -3; i <= 3; i++) {
          const a = base + i * 0.14;
          game.spawnBullet({
            x: b.x,
            y: b.y - 60,
            vx: Math.cos(a) * 740,
            vy: Math.sin(a) * 740,
            dmg: 20,
            color: '#ff2a6d',
            glow: '#ffd24a',
            radius: 6.5,
            fromPlayer: false,
          });
        }
        game.sfx?.shootShotgun();
      } else {
        // Twin Ground Argent Axe Shockwaves
        b.greenEyeTimer = 0.65;
        for (const dir of [-1, 1]) {
          game.spawnBullet({
            x: b.x + dir * 30,
            y: stage.groundY - 24,
            vx: dir * 680 * speedMult,
            vy: 0,
            dmg: 24,
            color: '#ff2244',
            glow: '#ffaa00',
            radius: 10,
            fromPlayer: false,
          });
        }
      }
    }
    return;
  }

  // ==========================================================================
  // BOSS 5 (4-PHASE TRUE FINAL BOSS): DAVOTH-OMEGA // THE ICON OF SIN & DARK LORD
  // ==========================================================================
  if (b.bossId === 5) {
    const midX = (stage.arenaLeft + stage.arenaRight) * 0.5;
    const hoverY = stage.groundY - (b.phase >= 3 ? 215 : 175) + Math.sin(b.animPhase * 0.5) * 45;
    const hoverX = midX + Math.cos(b.animPhase * 0.28) * 320;
    b.x += (hoverX - b.x) * dt * 2.6 * speedMult;
    b.y += (hoverY - b.y) * dt * 2.6 * speedMult;

    if (b.laserActive > 0) {
      b.laserActive -= dt;
      b.laserSweepAngle += dt * (b.phase >= 3 ? 1.5 : 1.05) * b.facing;
      game.fireBossLaser(b.x, b.y - b.h * 0.5, b.laserSweepAngle, dt);
    }

    if (b.stateTimer <= 0) {
      b.attackIndex = (b.attackIndex + 1) % 4;
      b.stateTimer = Math.max(0.95, 1.75 - b.phase * 0.2);

      if (b.attackIndex === 0) {
        const count = 12 + b.phase * 2;
        for (let i = 0; i < count; i++) {
          // Tip 39: Telegraphed bullet-hell safe channels (omits every 3rd bullet for predictable weaving)
          if (i % 3 === 0) continue;
          const a = (i / count) * Math.PI * 2 + b.animPhase * 0.5;
          game.spawnBullet({
            x: b.x,
            y: b.y - b.h * 0.5,
            vx: Math.cos(a) * 490,
            vy: Math.sin(a) * 490,
            dmg: 20,
            color: i % 2 === 0 ? '#ff1e56' : '#ffaa00',
            glow: '#ff0044',
            radius: 7,
            fromPlayer: false,
          });
        }
        game.sfx?.shootRail();
      } else if (b.attackIndex === 1) {
        b.laserActive = 1.4;
        b.laserSweepAngle = Math.atan2(dy, dx) - 0.55 * b.facing;
        game.sfx?.redEye();
        game.setMsg('DAVOTH-OMEGA: ECLIPSE BEAM — SHADOW STEP OR RAISE YOUR AEGIS!');
      } else if (b.attackIndex === 2) {
        const meteors = 5 + b.phase * 2;
        for (let i = 0; i < meteors; i++) {
          const tx = rika.x + (i - meteors * 0.5) * 90;
          game.spawnBullet({
            x: tx,
            y: stage.groundY - 520 - i * 35,
            vx: (rika.x - tx) * 0.35,
            vy: 620,
            dmg: 22,
            color: '#ffaa00',
            glow: '#ff1e56',
            radius: 8.5,
            fromPlayer: false,
          });
        }
        game.sfx?.explode();
      } else {
        const base = Math.atan2(dy, dx);
        for (let i = -2; i <= 2; i++) {
          const a = base + i * 0.11;
          game.spawnBullet({
            x: b.x,
            y: b.y - b.h * 0.5,
            vx: Math.cos(a) * 800,
            vy: Math.sin(a) * 800,
            dmg: 22,
            color: '#ff1e56',
            glow: '#ff0055',
            radius: 7.5,
            fromPlayer: false,
          });
        }
      }
    }
  }
}

/**
 * Renders catacomb demons & multi-phase Fallen Lords plus their combat read-outs
 * (health, elite affix, execution prompt, attack telegraph).
 */
export function drawEnemyOrBoss(ctx, e, time) {
  if (e.dead) return;

  ctx.save();
  ctx.translate(e.x, e.y);

  if (e.isBoss) {
    drawBoss(ctx, e, time);
    ctx.restore();
    return;
  }

  const isStaggered = (e.hp / e.maxHp) <= (e.execAt ?? 0.38);
  const flash = e.hitFlash > 0;
  const headY = -e.h - 10;

  // Body
  ctx.save();
  ctx.scale(e.facing, 1);
  drawDemon(ctx, e, time, flash);
  ctx.restore();

  // Execution-ready shimmer: a pulsing gold outline glow instead of a strobing body
  if (isStaggered) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const r = Math.max(e.w, e.h) * 0.7;
    const g = ctx.createRadialGradient(0, -e.h * 0.5, r * 0.2, 0, -e.h * 0.5, r);
    g.addColorStop(0, 'rgba(255,179,71,0)');
    g.addColorStop(0.7, `rgba(255,179,71,${0.14 + Math.sin(time * 10) * 0.06})`);
    g.addColorStop(1, 'rgba(255,179,71,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-r, -e.h * 0.5 - r, r * 2, r * 2);
    ctx.restore();
  }

  // Health bar (only once damaged) — framed, with a trailing chip
  let barY = headY;
  if (e.hp < e.maxHp) {
    const bw = Math.max(36, Math.min(64, e.w * 1.05));
    const pct = Math.max(0, e.hp / e.maxHp);
    e._chip = e._chip === undefined ? pct : Math.max(pct, e._chip - 0.012);
    ctx.fillStyle = 'rgba(8,4,4,0.85)';
    ctx.fillRect(-bw / 2 - 1.5, barY - 1.5, bw + 3, 7);
    ctx.fillStyle = 'rgba(255,230,190,0.55)';
    ctx.fillRect(-bw / 2, barY, bw * e._chip, 4);
    ctx.fillStyle = isStaggered ? '#ffb347' : e.elite ? '#e8b84a' : '#c8322a';
    ctx.fillRect(-bw / 2, barY, bw * pct, 4);
    barY -= 10;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Elite affix tag
  if (e.elite) {
    ctx.font = '600 10px Georgia, serif';
    ctx.fillStyle = '#ffd56a';
    ctx.fillText(`✦ ${e.eliteLabel} ✦`, 0, barY);
    barY -= 13;
  }

  // Execution prompt as a compact key badge
  if (isStaggered) {
    const bob = Math.sin(time * 8) * 2;
    ctx.fillStyle = 'rgba(20,10,4,0.85)';
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-9, barY - 13 + bob, 18, 16, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd56a';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.fillText('X', 0, barY - 1 + bob);
    barY -= 20;
  }

  // Attack telegraph: a closing ring around a hot point above the head
  if (e.telegraphing) {
    const prog = Math.max(0, Math.min(1, (0.38 - Math.max(0, e.attackCd || 0)) / 0.38));
    ctx.save();
    ctx.strokeStyle = `rgba(255,70,50,${0.4 + prog * 0.6})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, barY - 4, 10 - prog * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffdd88';
    ctx.beginPath();
    ctx.arc(0, barY - 4, 1.5 + prog * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Unalerted demons drift little "z"s
  if (!e.alerted) {
    ctx.font = 'italic 10px Georgia, serif';
    for (let i = 0; i < 2; i++) {
      const k = (time * 0.6 + i * 0.5 + e.animPhase) % 1;
      ctx.fillStyle = `rgba(230,210,170,${0.7 * (1 - k)})`;
      ctx.fillText('z', 6 + k * 8, barY - k * 14);
    }
  }

  ctx.restore();
}

function drawBoss(ctx, b, time) {
  ctx.save();

  // Infernal presence: a broad aura that tightens and reddens with each phase
  const auraCol = b.bossId === 3 ? '80,170,230' : b.bossId === 2 ? '150,200,90' : '200,40,30';
  const auraR = Math.max(b.w, b.h) * (0.9 + b.phase * 0.08);
  const aura = ctx.createRadialGradient(0, -b.h * 0.5, auraR * 0.1, 0, -b.h * 0.5, auraR);
  aura.addColorStop(0, `rgba(${auraCol},${0.18 + b.phase * 0.05})`);
  aura.addColorStop(1, `rgba(${auraCol},0)`);
  ctx.fillStyle = aura;
  ctx.fillRect(-auraR, -b.h * 0.5 - auraR, auraR * 2, auraR * 2);

  drawBossFigure(ctx, b, time);

  // Phase degradation: embers bleed off a wounded Lord
  if (b.phase >= 2) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 8; i++) {
      const k = (time * 0.5 + i / 8) % 1;
      const ex = Math.sin(i * 12.9 + time) * b.w * 0.4;
      const ey = -b.h * (0.25 + (i % 4) * 0.15) - k * b.h * 0.5;
      ctx.fillStyle = `rgba(255,${120 + (i % 3) * 40},40,${1 - k})`;
      ctx.fillRect(ex, ey, 3, 3);
    }
    ctx.restore();
  }

  ctx.textAlign = 'center';

  // Posture broken: orbiting sparks + label
  if (b.staggerTimer > 0) {
    ctx.save();
    ctx.translate(0, -b.h - 18);
    for (let s = 0; s < 5; s++) {
      const sang = time * 5 + (s * Math.PI * 2) / 5;
      ctx.fillStyle = '#ffd56a';
      ctx.beginPath();
      ctx.arc(Math.cos(sang) * 34, Math.sin(sang) * 9, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 12px Georgia, serif';
    ctx.fillText('POSTURE BROKEN', 0, -16);
    ctx.restore();
  }

  // Counter window
  if (b.interruptible) {
    ctx.save();
    ctx.translate(0, -b.h * 0.5);
    const ringRad = Math.max(b.w, b.h) * 0.62 + Math.sin(time * 20) * 6;
    ctx.strokeStyle = '#ffd56a';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, ringRad, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffd56a';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.fillText('COUNTER NOW', 0, -ringRad - 8);
    ctx.restore();
  }

  // Finisher prompt
  if (b.finisherReady) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 2.5;
    for (let r = 0; r < 8; r++) {
      const rayAngle = (r / 8) * Math.PI * 2 + time * 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -b.h * 0.5);
      ctx.lineTo(Math.cos(rayAngle) * 110, -b.h * 0.5 + Math.sin(rayAngle) * 110);
      ctx.stroke();
    }
    const pulse = 1 + Math.sin(time * 10) * 0.06;
    ctx.translate(0, -b.h - 34);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ffd56a';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText('[X]  BREAK THE SEAL', 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

// ============================================================================
// POSSESSED ELITES (DOOM Spirit / Dead Cells style affixes)
// ============================================================================
const AFFIXES = [
  { id: 'shield', label: 'ARMORED', armor: 0.5 },
  { id: 'explosive', label: 'VOLATILE' },
  { id: 'regen', label: 'BLOOD-FED' },
  { id: 'frenzy', label: 'POSSESSED', speed: 1.5 },
];

export function makeElite(e) {
  const a = AFFIXES[Math.floor(Math.random() * AFFIXES.length)];
  e.elite = true;
  e.affix = a.id;
  e.eliteLabel = a.label;
  e.maxHp = Math.round(e.maxHp * 2.4);
  e.hp = e.maxHp;
  e.score *= 3;
  if (a.armor) e.armor = a.armor;
  if (a.speed) e.speed *= a.speed;
  e.w = Math.round(e.w * 1.12);
  e.h = Math.round(e.h * 1.12);
  return e;
}

// ============================================================================
// SURVIVAL ARENA ("The Slayer Gate Pit") — endless waves, boss every 5th wave
// ============================================================================
export function buildArenaStage() {
  const width = 2600;
  const gy = 640;
  const platforms = [];
  const addPlat = (x, y, w, moving = false, range = 100) =>
    platforms.push({
      x, baseX: x, y, baseY: y, w, h: 18, oneWay: true, moving, range,
      crumble: false, crumbleT: 0, gone: false, respawnT: 0, vx: 0, phase: Math.random() * 6,
    });
  addPlat(200, gy - 140, 220);
  addPlat(width - 420, gy - 140, 220);
  addPlat(width / 2 - 130, gy - 250, 260);
  addPlat(560, gy - 360, 200, true, 120);
  addPlat(width - 760, gy - 360, 200, true, 120);

  const decors = [];
  for (let x = 0; x < width; x += 210) {
    decors.push({ x, w: 110 + ((x * 7) % 90), h: 190 + ((x * 13) % 250), layer: 0.25, windows: x % 420 === 0, flesh: true, arch: true });
  }

  return {
    id: 99,
    code: 'SLAYER GATE',
    name: 'THE BLOOD ARENA',
    subtitle: 'SURVIVE ENDLESS DEMON WAVES',
    realm: 'immora',
    weather: 'rifts',
    width,
    groundY: gy,
    bossTriggerX: 1e9,
    arenaLeft: 60,
    arenaRight: width - 60,
    skyTop: '#0a0208',
    skyMid: '#28061a',
    skyBot: '#540c24',
    accent: '#ff4422',
    groundColor: '#170a12',
    groundTrim: '#ff4422',
    bossTitle: 'HELL GUARDIAN',
    bossSub: 'SLAYER GATE CHAMPION',
    platforms,
    walls: [],
    jumpPads: [{ x: 120, y: gy }, { x: width - 120, y: gy }],
    grapplePoints: [{ x: 700, y: gy - 430 }, { x: width - 700, y: gy - 430 }, { x: width / 2, y: gy - 450 }],
    monkeyBars: [{ x: 460, y: gy - 220, w: 66 }, { x: width - 520, y: gy - 220, w: 66 }],
    slipgates: [{ x1: 260, y1: gy, x2: width - 260, y2: gy - 140, color: '#ff3311' }],
    goreNests: [],
    fgPillars: [{ x: 640, w: 48 }, { x: 1860, w: 48 }],
    barrels: [
      { x: 900, y: gy, w: 28, h: 38, hp: 30, exploded: false },
      { x: width - 900, y: gy, w: 28, h: 38, hp: 30, exploded: false },
    ],
    crates: [],
    chests: [],
    terminals: [],
    mechBays: [{ x: width / 2, y: gy, used: false }],
    hazards: [],
    turrets: [],
    enemies: [],
    decors,
    spikes: [],
    lasers: [],
    beacons: [],
    ambushes: [],
    objectives: [],
    merchant: { x: 360, y: gy, stock: null },
    roster: ['stalker', 'spitter', 'brute', 'drone', 'pyro', 'bloat', 'medic', 'assassin', 'sniper', 'summoner', 'sentry'],
    checkpointX: 160,
    bossSpawned: false,
    bossDefeated: false,
    boss: null,
  };
}
