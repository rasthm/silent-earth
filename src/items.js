/**
 * CONTENT DATABASE: Items (Risk of Rain style stacking relics), Skill Tree (Diablo style),
 * Achievements, Lore Logs, and Merchant dialogue.
 */

export const RARITY = {
  common: { color: '#b8c8d8', weight: 60, label: 'COMMON', price: 55 },
  rare: { color: '#4aa8ff', weight: 28, label: 'RARE', price: 95 },
  epic: { color: '#c06bff', weight: 10, label: 'EPIC', price: 160 },
  legendary: { color: '#ffb630', weight: 2.5, label: 'LEGENDARY', price: 270 },
  cursed: { color: '#ff2255', weight: 1.5, label: 'CURSED RELIC', price: 320 },
};

export function baseStats() {
  return {
    dmg: 1,
    crit: 0.05,
    critDmg: 1.75,
    lifesteal: 0,
    move: 1,
    cdr: 1,
    hpBonus: 0,
    shieldBonus: 0,
    magBonus: 0,
    shardMult: 1,
    magnet: 0,
    thorns: 0,
    explode: 0,
    ricochet: 0,
    deathNova: 0,
    storm: 0,
    berserk: 0,
    reload: 1,
    rof: 1,
    bladeDmg: 1,
    bladeReach: 0,
    bladeHeal: 0,
    gloryHeal: 0,
    statusChance: 1,
    statusDur: 1,
    xpMult: 1,
    // Tip 51 & 53: Elemental & Cursed Modifiers
    cinderSynergy: 0,
    frostSynergy: 0,
    bleedSynergy: 0,
    voidSynergy: 0,
    cursedHealPenalty: 1.0,
    noShield: false,
    flameDash: false,
    shadowGrapple: false,
  };
}

export const ITEMS = [
  // ---- COMMON ----
  { id: 'lens', name: 'Crit Lens', rarity: 'common', tag: 'Cinder', icon: '◉', desc: '+6% critical hit chance.', apply: (s, n) => { s.crit += 0.06 * n; } },
  { id: 'fang', name: 'Vampire Fang', rarity: 'common', tag: 'Bleed', icon: '♥', desc: 'Heal 3% of damage dealt.', apply: (s, n) => { s.lifesteal += 0.03 * n; } },
  { id: 'boots', name: 'Nitro Boots', rarity: 'common', tag: 'Cinder', icon: '»', desc: '+8% movement speed.', apply: (s, n) => { s.move += 0.08 * n; } },
  { id: 'drum', name: 'Spare Drum', rarity: 'common', tag: 'Void', icon: '▥', desc: '+8 magazine capacity.', apply: (s, n) => { s.magBonus += 8 * n; } },
  { id: 'plate', name: 'Scrap Plating', rarity: 'common', tag: 'Frost', icon: '▣', desc: '+20 max HP.', apply: (s, n) => { s.hpBonus += 20 * n; } },
  { id: 'coil', name: 'Magnet Coil', rarity: 'common', tag: 'Void', icon: '⌖', desc: '+90 pickup radius.', apply: (s, n) => { s.magnet += 90 * n; } },
  { id: 'siphon', name: 'Shard Siphon', rarity: 'common', tag: 'Void', icon: '◆', desc: '+20% Soul Shards gained.', apply: (s, n) => { s.shardMult += 0.2 * n; } },
  // ---- RARE ----
  { id: 'ricochet', name: 'Ricochet Rounds', rarity: 'rare', tag: 'Void', icon: '⤴', desc: 'Your bullets bounce off the ground once more.', apply: (s, n) => { s.ricochet += n; } },
  { id: 'volatile', name: 'Volatile Rounds', rarity: 'rare', tag: 'Cinder', icon: '✹', desc: '12% chance for bullets to detonate on hit.', apply: (s, n) => { s.explode += n; s.cinderSynergy += 0.15 * n; } },
  { id: 'thorns', name: 'Thorn Mesh', rarity: 'rare', tag: 'Bleed', icon: '✶', desc: 'Taking damage releases a thorn shockwave.', apply: (s, n) => { s.thorns += n; s.bleedSynergy += 0.15 * n; } },
  { id: 'chrono', name: 'Chrono Dial', rarity: 'rare', tag: 'Frost', icon: '◔', desc: '+12% cooldown recovery speed.', apply: (s, n) => { s.cdr += 0.12 * n; s.frostSynergy += 0.15 * n; } },
  { id: 'cell', name: 'Overshield Cell', rarity: 'rare', tag: 'Void', icon: '⬡', desc: '+35 max Shield.', apply: (s, n) => { s.shieldBonus += 35 * n; } },
  { id: 'whetstone', name: 'Plasma Whetstone', rarity: 'rare', tag: 'Bleed', icon: '⚔', desc: '+25% Crucible Blade damage.', apply: (s, n) => { s.bladeDmg += 0.25 * n; } },
  // ---- EPIC ----
  { id: 'berserk', name: 'Berserker Chip', rarity: 'epic', tag: 'Bleed', icon: '☠', desc: 'Up to +60% damage as your HP drops.', apply: (s, n) => { s.berserk += 0.6 * n; } },
  { id: 'nova', name: 'Death Nova', rarity: 'epic', tag: 'Cinder', icon: '✺', desc: 'Slain foes have a 50% chance to explode.', apply: (s, n) => { s.deathNova += n; s.cinderSynergy += 0.25 * n; } },
  { id: 'storm', name: 'Storm Capacitor', rarity: 'epic', tag: 'Void', icon: 'ϟ', desc: 'Phase Dash unleashes chain lightning.', apply: (s, n) => { s.storm += n; } },
  { id: 'prism', name: 'Elemental Prism', rarity: 'epic', tag: 'Void', icon: '◈', desc: '+50% status chance, +30% status duration.', apply: (s, n) => { s.statusChance += 0.5 * n; s.statusDur += 0.3 * n; } },
  // ---- LEGENDARY ----
  { id: 'phoenix', name: 'Phoenix Core', rarity: 'legendary', tag: 'Cinder', icon: '✦', desc: 'Revive once with 60% HP and a blast of fire.', apply: () => {} },
  { id: 'heart', name: 'Singularity Heart', rarity: 'legendary', tag: 'Void', icon: '❂', desc: '+30% damage, +10% cooldown recovery, +10% speed.', apply: (s, n) => { s.dmg += 0.3 * n; s.cdr += 0.1 * n; s.move += 0.1 * n; s.voidSynergy += 0.3 * n; } },
  { id: 'glass', name: 'Glass Cannon', rarity: 'legendary', tag: 'Bleed', icon: '❖', desc: '+70% damage, +12% crit, but -30 max HP.', apply: (s, n) => { s.dmg += 0.7 * n; s.crit += 0.12 * n; s.hpBonus -= 30 * n; } },
  // ---- CURSED RELICS (Tip 53: Risk vs Reward) ----
  { id: 'crown_thorns', name: 'Crown of Thorns', rarity: 'cursed', tag: 'Bleed', icon: '†', desc: '+65% All Damage, but healing from all sources is reduced by 50%.', apply: (s, n) => { s.dmg += 0.65 * n; s.cursedHealPenalty *= Math.pow(0.5, n); } },
  { id: 'blood_pact', name: 'Blood Covenant', rarity: 'cursed', tag: 'Bleed', icon: '☥', desc: '+35% Critical Chance, but taking damage inflicts bleed on yourself.', apply: (s, n) => { s.crit += 0.35 * n; } },
  { id: 'hollow_vow', name: 'Hollow Vow', rarity: 'cursed', tag: 'Void', icon: '☠', desc: '+60% Cinder extraction, but shield capacity is permanently 0.', apply: (s, n) => { s.shardMult += 0.6 * n; s.noShield = true; } },
];

export const SKILLS = [
  // ---- GUNNER ----
  { id: 'marksman', branch: 'GUNNER', name: 'Marksman', max: 5, desc: '+4% crit chance per rank.', apply: (s, r) => { s.crit += 0.04 * r; } },
  { id: 'heavy', branch: 'GUNNER', name: 'Heavy Rounds', max: 5, desc: '+7% damage per rank.', apply: (s, r) => { s.dmg += 0.07 * r; } },
  { id: 'hands', branch: 'GUNNER', name: 'Quick Hands', max: 3, desc: '-15% reload time per rank.', apply: (s, r) => { s.reload *= 1 - 0.15 * r; } },
  { id: 'trigger', branch: 'GUNNER', name: 'Hair Trigger', max: 3, desc: '+7% fire rate per rank.', apply: (s, r) => { s.rof += 0.07 * r; } },
  // ---- BLADEMASTER ----
  { id: 'whet', branch: 'BLADEMASTER', name: 'Sharpened Edge', max: 5, desc: '+12% blade damage per rank.', apply: (s, r) => { s.bladeDmg += 0.12 * r; } },
  { id: 'reach', branch: 'BLADEMASTER', name: 'Wide Arc', max: 3, desc: '+14 blade reach per rank.', apply: (s, r) => { s.bladeReach += 14 * r; } },
  { id: 'leech', branch: 'BLADEMASTER', name: 'Soul Leech', max: 3, desc: 'Each blade hit heals +4 HP per rank.', apply: (s, r) => { s.bladeHeal += 4 * r; } },
  { id: 'hunger', branch: 'BLADEMASTER', name: 'Glory Hunger', max: 3, desc: 'Glory Kills heal +10 HP per rank.', apply: (s, r) => { s.gloryHeal += 10 * r; } },
  // ---- TECHNOMANCER ----
  { id: 'overclock', branch: 'TECHNOMANCER', name: 'Overclock', max: 5, desc: '+7% cooldown recovery per rank.', apply: (s, r) => { s.cdr += 0.07 * r; } },
  { id: 'armor', branch: 'TECHNOMANCER', name: 'Reinforced Frame', max: 5, desc: '+15 HP and +6 Shield per rank.', apply: (s, r) => { s.hpBonus += 15 * r; s.shieldBonus += 6 * r; } },
  { id: 'sprint', branch: 'TECHNOMANCER', name: 'Servo Sprint', max: 3, desc: '+4% move speed per rank.', apply: (s, r) => { s.move += 0.04 * r; } },
  { id: 'scav', branch: 'TECHNOMANCER', name: 'Scavenger', max: 3, desc: '+10% shards and +25 pickup radius per rank.', apply: (s, r) => { s.shardMult += 0.1 * r; s.magnet += 25 * r; } },
  { id: 'insight', branch: 'TECHNOMANCER', name: 'Combat Insight', max: 3, desc: '+10% XP per rank.', apply: (s, r) => { s.xpMult += 0.1 * r; } },
  { id: 'affinity', branch: 'TECHNOMANCER', name: 'Elemental Affinity', max: 3, desc: '+25% status chance, +20% duration per rank.', apply: (s, r) => { s.statusChance += 0.25 * r; s.statusDur += 0.2 * r; } },
  // ---- MUTATION TALENTS (Tip 54) ----
  { id: 'flame_dash', branch: 'MUTATION', name: 'Flame Dash Mutation', max: 1, desc: 'Dashing leaves a trail of consecrated fire that burns pursuing enemies.', apply: (s, r) => { s.flameDash = r > 0; } },
  { id: 'shadow_grapple', branch: 'MUTATION', name: 'Shadow Grapple Mutation', max: 1, desc: 'Grappling cloaks Rika in shadows for 2 seconds, granting stealth and +40% next strike crit.', apply: (s, r) => { s.shadowGrapple = r > 0; } },
];

export const ACHIEVEMENTS = [
  { id: 'a_blood', name: 'First Blood', desc: 'Slay your first demon.', key: 'kills', goal: 1 },
  { id: 'a_slayer', name: 'Demonbane', desc: 'Slay 60 demons in one run.', key: 'kills', goal: 60 },
  { id: 'a_glory', name: 'Glory Hunter', desc: 'Perform 5 Glory Kills.', key: 'gloryKills', goal: 5 },
  { id: 'a_combo', name: 'Stylish!', desc: 'Reach a 30-hit combo.', key: 'maxCombo', goal: 30 },
  { id: 'a_mech', name: 'Mech Pilot', desc: 'Board a Titan-Walker.', key: 'mech', goal: 1 },
  { id: 'a_loot', name: 'Treasure Hunter', desc: 'Open 5 Relic Chests.', key: 'chests', goal: 5 },
  { id: 'a_shatter', name: 'Shattered', desc: 'Shatter 5 frozen foes.', key: 'shatters', goal: 5 },
  { id: 'a_parry', name: 'Parry Master', desc: 'Land 5 Perfect Parries.', key: 'parries', goal: 5 },
  { id: 'a_elite', name: 'Elite Hunter', desc: 'Slay 5 Possessed demons.', key: 'elites', goal: 5 },
  { id: 'a_crate', name: 'Demolition', desc: 'Smash 15 Supply Crates.', key: 'crates', goal: 15 },
  { id: 'a_react', name: 'Mad Scientist', desc: 'Trigger 5 elemental reactions.', key: 'reactions', goal: 5 },
  { id: 'a_boss', name: 'Giant Killer', desc: 'Defeat a Guardian Boss.', key: 'bosses', goal: 1 },
  { id: 'a_lvl', name: 'Veteran', desc: 'Reach Level 8.', key: 'level', goal: 8 },
  { id: 'a_items', name: 'Collector', desc: 'Hold 10 relics at once.', key: 'items', goal: 10 },
  { id: 'a_wave', name: 'Pit Survivor', desc: 'Reach Wave 8 in the Arena.', key: 'wave', goal: 8 },
  { id: 'a_obj', name: 'Overachiever', desc: 'Complete 6 side objectives.', key: 'objectives', goal: 6 },
];

export const LORE = [
  'TABLET I — The Vigil Charter: "The Living Lullaby was never a weapon. It was a song to keep the Abyssal Choir asleep."',
  'TABLET II — Brother Anselm: "The Warden\'s ash-eye burns with the same fire as the Choir. They hear her. They are afraid of her."',
  'TABLET III — Ashfield Survivor: "They came out of the foundry fires. Garrul tended those furnaces before the Choir took him."',
  'TABLET IV — Ossuary Ledger: "Arachne was the kindest healer in the lower wards. Then the Abyss taught her to hunger."',
  'TABLET V — Rime Keeper: "Do not look at the Valkyrie when she sings. The ice remembers every voice."',
  'TABLET VI — Rika\'s Journal: "Every demon I cut down, I see my own face in their eyes. How much of me is still human?"',
  'TABLET VII — Vigil Roll: "Vex trained beside Rika in the Night Watch. He asked to be released when the Choir first spoke to him."',
  'TABLET VIII — Kess the Peddler: "I sell what I scavenge. I don\'t ask whose it was. Nobody left to ask."',
  'TABLET IX — Sealed Door: "The Core of Ash is a heart, beating for the Choir. Silence it, and silence them all."',
  'TABLET X — Lyra\'s Hand: "If you are reading this, Rika, sing. Just sing."',
];

// Tip 56: Weapon Mastery Milestones
export const WEAPON_MASTERIES = {
  0: { name: 'Repeater Crossbow', killsRequired: 40, perk: 'Piercing Rounds (+20% vs Armor)' },
  1: { name: 'Hell-Shot Blunderbuss', killsRequired: 40, perk: 'Choked Spread & Fast Cocking' },
  2: { name: 'Rune Lance', killsRequired: 30, perk: 'Overcharged Beam (+25% beam width)' },
  3: { name: 'Storm-Coil', killsRequired: 50, perk: 'Lightning Cascade (+2 Chain Targets)' },
  4: { name: 'Abyss-Orb', killsRequired: 20, perk: 'Void Vortex (Vacuums demons)' },
};

// Tip 58: Dynamic Heat / Ascension Modifiers (Ordeal of the Damned)
export const ASCENSION_SKULLS = [
  { id: 'skull_haste', name: 'Skull of Fervor', desc: '+25% Demon Movement & Attack Cycling', mult: 1.25 },
  { id: 'skull_flesh', name: 'Skull of Iron', desc: '+40% Demon Vitality & Armor', mult: 1.35 },
  { id: 'skull_desolation', name: 'Skull of Desolation', desc: 'No Natural Healing Pickups', mult: 1.5 },
];

// Rika's cloaks. Those with `unlock` are earned by slaying the named secret boss.
export const CLOAKS = [
  { id: 'crimson', name: 'Obsidian Inquisitor', fill: '#4a141b', border: '#ff2255' },
  { id: 'frost', name: 'Frost-Worn Hermit', fill: '#16283b', border: '#3af2ff' },
  { id: 'saint', name: 'Blood-Stained Saint', fill: '#3d341e', border: '#ffd700' },
  { id: 'ashen', name: 'Ashen Pilgrim', fill: '#2a2826', border: '#b8b0a4' },
  { id: 'belfry', name: 'Belfry Ember', fill: '#4a2410', border: '#ff9a2a', unlock: 'bellringer' },
  { id: 'grave', name: 'Gravemoss Shroud', fill: '#1e2a16', border: '#9cff5a', unlock: 'gravemother' },
  { id: 'pale', name: "Pale Knight's Mantle", fill: '#a8acb6', border: '#ffffff', unlock: 'paleknight' },
  { id: 'cardinal', name: "Cardinal's Vestment", fill: '#6a0a14', border: '#ffcc55', unlock: 'cardinal' },
  { id: 'eclipse', name: 'Eclipse Veil', fill: '#120a1e', border: '#b06aff', unlock: 'choir' },
  { id: 'lullaby', name: "Lyra's Lullaby", fill: '#dfe6f2', border: '#8ad8ff', unlock: 'shadow' },
];

export const MERCHANT_LINES = [
  'Kess: "The catacombs are burning, Warden. My prices are not. Take a look."',
  'Kess: "Ossuary damp gets into everything. Good thing I\'m not selling bread."',
  'Kess: "Freezing out here. Spend some shards, warm your pockets."',
  'Kess: "Up this high, the air is thin and the margins are thinner."',
  'Kess: "Last stop before the Vault. Buy something. You won\'t need the shards after."',
  'Kess: "The pit pays well in shards. Spend them wisely."',
];

export function rollItem(stageIdx = 0, rng = Math.random) {
  const w = {
    common: RARITY.common.weight,
    rare: RARITY.rare.weight,
    epic: RARITY.epic.weight * (1 + stageIdx * 0.25),
    legendary: RARITY.legendary.weight * (1 + stageIdx * 0.4),
  };
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let r = rng() * total;
  let rarity = 'common';
  for (const k of Object.keys(w)) {
    r -= w[k];
    if (r <= 0) { rarity = k; break; }
  }
  const pool = ITEMS.filter((i) => i.rarity === rarity);
  return pool[Math.floor(rng() * pool.length)];
}

export function computeStats(skills, items) {
  const s = baseStats();
  for (const sk of SKILLS) {
    const r = skills[sk.id] | 0;
    if (r > 0) sk.apply(s, r);
  }
  for (const it of ITEMS) {
    const n = items[it.id] | 0;
    if (n > 0) it.apply(s, n);
  }
  return s;
}

export const DIFFICULTIES = {
  normal: { name: 'NORMAL', hp: 1, dmg: 1, shards: 1 },
  hard: { name: 'HARD', hp: 1.45, dmg: 1.3, shards: 1.3 },
  nightmare: { name: 'NIGHTMARE', hp: 2.1, dmg: 1.9, shards: 1.9 },
};
