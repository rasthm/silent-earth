/**
 * DEMON ART — procedural, animated 2D renderers for every catacomb demon and Fallen Lord.
 *
 * Every renderer draws in a local space where (0, 0) is the creature's feet, +x is "forward"
 * (the caller has already flipped the context by `facing`) and units are tuned to the
 * archetype's base height. `drawDemon` / `drawBossFigure` scale by the live hitbox so
 * elites and mid-boss Wardens grow automatically.
 *
 * Animation is driven purely by existing entity fields:
 *   animPhase (walk / flap cycle), vx (moving?), telegraphing (wind-up pose),
 *   attackCd jumps (strike pose), hitFlash, enraged, boss.state / phase.
 */

const FLASH = '#fff3e2';
const INK = '#0b0506';
const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function grad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (let i = 0; i < stops.length; i++) g.addColorStop(i / (stops.length - 1), stops[i]);
  return g;
}

function radial(ctx, x, y, r0, r1, inner, outer) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  return g;
}

/** Soft additive light bloom (much cheaper than shadowBlur). */
function glow(ctx, x, y, r, color, alpha = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = radial(ctx, x, y, 0, r, color, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Glowing demon eye: bloom + hot core. */
function eye(ctx, x, y, r, color, intensity = 1) {
  glow(ctx, x, y, r * 4.2, color, 0.55 * intensity);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.25, r * 0.8, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff6d8';
  ctx.beginPath();
  ctx.arc(x + r * 0.2, y, r * 0.42, 0, TAU);
  ctx.fill();
}

/** Tapered capsule between two joints — the building block for limbs, horns and tails. */
function seg(ctx, ax, ay, bx, by, ra, rb, fill, stroke = INK, lw = 1.4) {
  const ang = Math.atan2(by - ay, bx - ax);
  const nx = Math.cos(ang + Math.PI / 2);
  const ny = Math.sin(ang + Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(ax + nx * ra, ay + ny * ra);
  ctx.lineTo(bx + nx * rb, by + ny * rb);
  ctx.arc(bx, by, rb, ang + Math.PI / 2, ang - Math.PI / 2, true);
  ctx.lineTo(ax - nx * ra, ay - ny * ra);
  ctx.arc(ax, ay, ra, ang - Math.PI / 2, ang + Math.PI / 2, true);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

/** Two-bone limb from a root with angles (radians, 0 = straight down). Returns the end point. */
function limb(ctx, x, y, a1, l1, a2, l2, r0, r1, r2, fill) {
  const kx = x + Math.sin(a1) * l1;
  const ky = y + Math.cos(a1) * l1;
  const ex = kx + Math.sin(a1 + a2) * l2;
  const ey = ky + Math.cos(a1 + a2) * l2;
  seg(ctx, kx, ky, ex, ey, r1, r2, fill);
  seg(ctx, x, y, kx, ky, r0, r1, fill);
  return { kx, ky, ex, ey };
}

/** Curved, ridged horn. */
function horn(ctx, x, y, cx, cy, tx, ty, base, F) {
  ctx.beginPath();
  const ang = Math.atan2(cy - y, cx - x) + Math.PI / 2;
  const nx = Math.cos(ang) * base;
  const ny = Math.sin(ang) * base;
  ctx.moveTo(x + nx, y + ny);
  ctx.quadraticCurveTo(cx + nx * 0.6, cy + ny * 0.6, tx, ty);
  ctx.quadraticCurveTo(cx - nx * 0.6, cy - ny * 0.6, x - nx, y - ny);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, x, y, tx, ty, [F('#5a4632'), F('#b9a079'), F('#efe2c4')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

/** Claw fan at a hand position. */
function claws(ctx, x, y, dir, len, F, count = 3) {
  ctx.strokeStyle = F('#e8dcc0');
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const a = dir + (i - (count - 1) / 2) * 0.38;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.7, y + Math.sin(a) * len * 0.7, x + Math.cos(a + 0.4) * len, y + Math.sin(a + 0.4) * len);
    ctx.stroke();
  }
}

function groundShadow(ctx, w, alpha = 0.5) {
  ctx.fillStyle = radial(ctx, 0, 0, 0, w, `rgba(0,0,0,${alpha})`, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.scale(1, 0.22);
  ctx.beginPath();
  ctx.arc(0, 0, w, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Small flickering flame tongue. */
function flame(ctx, x, y, h, t, seed = 0, hot = '#ffd36a', mid = '#ff6a1a') {
  const flick = Math.sin(t * 17 + seed) * 0.18 + Math.sin(t * 29 + seed * 2) * 0.1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = radial(ctx, x, y - h * 0.35, 0, h * 0.75, mid, 'rgba(120,20,0,0)');
  ctx.beginPath();
  ctx.moveTo(x - h * 0.28, y);
  ctx.quadraticCurveTo(x - h * 0.32, y - h * 0.5, x + flick * h, y - h);
  ctx.quadraticCurveTo(x + h * 0.32, y - h * 0.45, x + h * 0.28, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = hot;
  ctx.globalAlpha *= 0.75;
  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.22, h * 0.12, h * 0.26, flick * 0.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Tracks attack moments so the renderers can play a short strike pose. */
function strikeAmount(e, time) {
  const cd = e.attackCd ?? 0;
  if (e._prevCd !== undefined && cd > e._prevCd + 0.25) e._strikeT = time;
  e._prevCd = cd;
  if (e._strikeT === undefined) return 0;
  const k = (time - e._strikeT) / 0.28;
  return k >= 0 && k < 1 ? Math.sin(k * Math.PI) : 0;
}

// ---------------------------------------------------------------------------
// Regular demons
// ---------------------------------------------------------------------------

/** Catacomb Imp — hunched, digitigrade ember-skinned imp with a spade tail. */
function drawImp(ctx, e, t, F, a) {
  const moving = Math.abs(e.vx) > 8;
  const cyc = e.animPhase * 1.6;
  const sw = moving ? Math.sin(cyc) : 0;
  const bob = moving ? Math.abs(Math.cos(cyc)) * 2.5 : Math.sin(t * 3 + e.animPhase) * 1;
  const skin = F('#5a1a12');
  const skinLit = F('#8c2c18');

  groundShadow(ctx, 24);
  ctx.translate(0, -bob);

  // Tail
  ctx.strokeStyle = skin;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, -26);
  ctx.bezierCurveTo(-24, -24, -26, -8 + Math.sin(t * 4) * 4, -34, -14 + Math.sin(t * 4 + 1) * 6);
  ctx.stroke();
  ctx.fillStyle = skin;
  ctx.save();
  ctx.translate(-34, -14 + Math.sin(t * 4 + 1) * 6);
  ctx.rotate(-0.6);
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(-7, 0);
  ctx.lineTo(0, 5);
  ctx.lineTo(-2, 0);
  ctx.fill();
  ctx.restore();

  // Back leg (digitigrade)
  const leg = (ox, ph, fill) => {
    const s1 = Math.sin(ph) * 0.55;
    const lift = Math.max(0, -Math.cos(ph)) * 0.5;
    const k = limb(ctx, ox, -28, -0.35 + s1, 13, 1.1 + lift, 10, 5, 3.5, 2.6, fill);
    seg(ctx, k.ex, k.ey, k.ex + 6, -1 + (moving ? -lift * 4 : 0), 2.4, 2, fill);
    claws(ctx, k.ex + 6, -1 + (moving ? -lift * 4 : 0), 0.1, 4, F, 2);
  };
  leg(-4, cyc + Math.PI, F('#3e120c'));

  // Back arm
  const armSwing = moving ? -sw * 0.5 : Math.sin(t * 2.4) * 0.12;
  const backArm = limb(ctx, 0, -46, 0.6 + armSwing, 12, -0.9, 12, 4, 3, 2.4, F('#3e120c'));
  claws(ctx, backArm.ex, backArm.ey, 0.6, 5, F);

  // Torso — hunched forward
  ctx.beginPath();
  ctx.moveTo(-10, -28);
  ctx.bezierCurveTo(-14, -40, -8, -52, 4, -54);
  ctx.bezierCurveTo(14, -54, 17, -46, 14, -38);
  ctx.bezierCurveTo(12, -30, 8, -24, -2, -23);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -12, -54, 14, -24, [skinLit, skin, F('#2a0b08')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Ember cracks across ribs
  ctx.strokeStyle = F('#ff8a2a');
  ctx.globalAlpha = 0.65 + Math.sin(t * 6 + e.animPhase) * 0.25;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(4, -46);
  ctx.lineTo(8, -40);
  ctx.lineTo(5, -34);
  ctx.moveTo(10, -44);
  ctx.lineTo(12, -38);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Spine spikes
  ctx.fillStyle = F('#cdb48a');
  for (let i = 0; i < 4; i++) {
    const px = -11 + i * 4.5;
    const py = -36 - i * 4.8;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - 7, py - 3);
    ctx.lineTo(px + 1, py - 5);
    ctx.closePath();
    ctx.fill();
  }

  leg(5, cyc, skin);

  // Head
  ctx.save();
  ctx.translate(13, -54);
  ctx.rotate(-0.12 + a * 0.15);
  horn(ctx, -2, -6, -8, -16, -14, -14, 2.4, F);
  horn(ctx, 3, -7, 0, -18, -6, -20, 2.6, F);
  ctx.beginPath();
  ctx.moveTo(-6, -6);
  ctx.bezierCurveTo(-4, -11, 8, -11, 11, -4);
  ctx.lineTo(13, 1);
  ctx.lineTo(4, 5 + a * 3);
  ctx.bezierCurveTo(-2, 5, -7, 1, -6, -6);
  ctx.fillStyle = grad(ctx, -6, -10, 12, 5, [skinLit, skin]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Fanged maw
  ctx.fillStyle = '#1a0304';
  ctx.beginPath();
  ctx.moveTo(4, 1);
  ctx.lineTo(12, 0);
  ctx.lineTo(6, 4 + a * 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = F('#f2e6cc');
  ctx.beginPath();
  ctx.moveTo(7, 0.6);
  ctx.lineTo(8, 3);
  ctx.lineTo(9, 0.4);
  ctx.moveTo(10, 0.3);
  ctx.lineTo(10.6, 2.4);
  ctx.lineTo(11.4, 0.2);
  ctx.fill();
  eye(ctx, 5.5, -4, 1.7, e.telegraphing ? '#fff1a8' : '#ffb02e', e.telegraphing ? 1.4 : 1);
  ctx.restore();

  // Front arm — raises a fire-orb during wind-up, lashes out on strike
  const raise = e.telegraphing ? 1 : 0;
  const fa = 0.9 - raise * 2.2 + a * 1.6 + (moving ? sw * 0.5 : 0);
  const fArm = limb(ctx, 6, -47, fa, 12, -0.7 + raise * 0.4, 12, 4.2, 3.2, 2.6, skin);
  claws(ctx, fArm.ex, fArm.ey, fa > 0.5 ? 0.4 : -0.6, 6, F);
  if (e.telegraphing) {
    glow(ctx, fArm.ex, fArm.ey - 4, 14, '#ff7a1a', 0.9);
    flame(ctx, fArm.ex, fArm.ey - 1, 12, t, e.animPhase);
  }
}

/** Abyssal gargoyle — bat-winged flying demon that spits bile. */
function drawGargoyle(ctx, e, t, F, a) {
  const flap = Math.sin(t * 11 + e.animPhase);
  const hover = Math.sin(t * 3.2 + e.animPhase) * 3;
  const skin = F('#4b1a22');
  const skinLit = F('#7d2c34');
  ctx.translate(0, -e.h * 0.5 / (e._s || 1) + hover);

  const wing = (side, fill) => {
    ctx.save();
    ctx.translate(-4, -10);
    ctx.scale(1, side);
    ctx.rotate(-0.25 + flap * 0.55 * side);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-10, -22);
    ctx.lineTo(-34, -30);
    ctx.quadraticCurveTo(-30, -18, -38, -10);
    ctx.quadraticCurveTo(-26, -8, -30, 2);
    ctx.quadraticCurveTo(-18, -2, -16, 8);
    ctx.quadraticCurveTo(-8, 2, 0, 6);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    // Wing bones
    ctx.strokeStyle = F('#c9a985');
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-10, -22);
    ctx.lineTo(-34, -30);
    ctx.moveTo(-10, -22);
    ctx.lineTo(-38, -10);
    ctx.moveTo(-10, -22);
    ctx.lineTo(-30, 2);
    ctx.moveTo(-10, -22);
    ctx.lineTo(-16, 8);
    ctx.stroke();
    ctx.restore();
  };
  // Far wing is darker and drawn first
  wing(1, grad(ctx, -30, -30, 0, 0, [F('#2a0c14'), F('#4a1420')]));

  // Tail
  ctx.strokeStyle = skin;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-6, 8);
  ctx.bezierCurveTo(-16, 18, -6, 26 + Math.sin(t * 5) * 3, -18, 30);
  ctx.stroke();

  // Dangling legs
  seg(ctx, -2, 8, -6, 18 + flap * 2, 3.4, 2.4, F('#3a1018'));
  seg(ctx, 4, 8, 4, 19 - flap * 2, 3.6, 2.4, skin);
  claws(ctx, 4, 19 - flap * 2, 1.4, 4, F, 3);

  // Body
  ctx.beginPath();
  ctx.ellipse(1, -2, 11, 14, 0.25, 0, TAU);
  ctx.fillStyle = grad(ctx, -8, -16, 10, 12, [skinLit, skin, F('#260a10')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Belly plates
  ctx.strokeStyle = F('#a0584a');
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(5, -4 + i * 5, 5, 0.3, 1.6);
    ctx.stroke();
  }

  // Arms reaching forward
  const reach = e.telegraphing ? 0.8 : 0.3 + Math.sin(t * 4) * 0.1;
  const arm = limb(ctx, 6, -8, 1.3 + reach * 0.4, 9, -0.8, 8, 3, 2.4, 2, skin);
  claws(ctx, arm.ex, arm.ey, 0.1, 5, F);

  // Head with horns and jaw
  ctx.save();
  ctx.translate(10, -16);
  horn(ctx, -3, -4, -8, -14, -16, -16, 2.2, F);
  horn(ctx, 1, -5, 2, -14, -4, -20, 2.2, F);
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.bezierCurveTo(-5, -9, 6, -9, 10, -3);
  ctx.lineTo(11, 2);
  ctx.lineTo(2, 4);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -6, -8, 10, 4, [skinLit, skin]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  // Jaw drops open while spitting
  const jaw = 1 + (e.telegraphing ? 3 : 0) + a * 5;
  ctx.beginPath();
  ctx.moveTo(1, 3);
  ctx.lineTo(10, 2);
  ctx.lineTo(4, 3 + jaw);
  ctx.closePath();
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.stroke();
  if (e.telegraphing || a > 0) glow(ctx, 9, 3, 12, '#9cff4a', 0.8);
  eye(ctx, 4, -4, 1.6, '#ffcf3a');
  ctx.restore();

  // Near wing over the body
  wing(-1, grad(ctx, -30, -30, 0, 0, [F('#5e1c26'), F('#3a0f18')]));
}

/** Hell Baron — towering horned brute with furnace chest and stone fists. */
function drawBaron(ctx, e, t, F, a) {
  const moving = Math.abs(e.vx) > 8;
  const cyc = e.animPhase * 1.1;
  const bob = moving ? Math.abs(Math.cos(cyc)) * 3 : Math.sin(t * 2.2) * 1.2;
  const skin = F('#5c1a14');
  const skinLit = F('#933322');
  const dark = F('#34100c');

  groundShadow(ctx, 36, 0.6);
  ctx.translate(0, -bob);

  const leg = (ox, ph, fill) => {
    const s1 = moving ? Math.sin(ph) * 0.42 : 0;
    const lift = moving ? Math.max(0, -Math.cos(ph)) * 0.35 : 0;
    const k = limb(ctx, ox, -40, -0.25 + s1, 18, 0.65 + lift, 16, 8, 6, 4.6, fill);
    // Cloven hoof
    ctx.fillStyle = F('#1b1210');
    ctx.beginPath();
    ctx.moveTo(k.ex - 6, k.ey - 2);
    ctx.lineTo(k.ex + 8, k.ey - 2);
    ctx.lineTo(k.ex + 9, k.ey + 4 - (moving ? lift * 6 : 0));
    ctx.lineTo(k.ex - 7, k.ey + 4 - (moving ? lift * 6 : 0));
    ctx.closePath();
    ctx.fill();
  };
  leg(-8, cyc + Math.PI, dark);

  // Back arm
  const bArm = limb(ctx, -12, -78, 0.2 + (moving ? Math.sin(cyc) * 0.3 : 0), 18, -0.4, 16, 7, 6, 7, dark);

  // Loincloth + belt
  ctx.fillStyle = F('#2a1a12');
  ctx.beginPath();
  ctx.moveTo(-16, -44);
  ctx.lineTo(16, -44);
  ctx.lineTo(10, -24 + Math.sin(t * 3) * 1.5);
  ctx.lineTo(-12, -26);
  ctx.closePath();
  ctx.fill();

  // Torso — broad V
  ctx.beginPath();
  ctx.moveTo(-24, -84);
  ctx.bezierCurveTo(-8, -96, 18, -96, 28, -82);
  ctx.bezierCurveTo(26, -64, 18, -50, 14, -42);
  ctx.lineTo(-16, -42);
  ctx.bezierCurveTo(-22, -54, -28, -70, -24, -84);
  ctx.fillStyle = grad(ctx, -24, -96, 24, -42, [skinLit, skin, F('#2b0c09')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Pectoral / abdominal definition
  ctx.strokeStyle = F('#2a0a07');
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(2, -84);
  ctx.quadraticCurveTo(0, -70, 2, -48);
  ctx.moveTo(-14, -74);
  ctx.quadraticCurveTo(-4, -70, 2, -74);
  ctx.quadraticCurveTo(10, -70, 20, -74);
  ctx.stroke();
  // Furnace heart showing through cracked sternum
  const heat = 0.7 + Math.sin(t * 5) * 0.2 + (e.telegraphing ? 0.4 : 0);
  glow(ctx, 4, -64, 22, '#ff6a1a', heat);
  ctx.strokeStyle = F('#ffb347');
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-2, -70);
  ctx.lineTo(4, -64);
  ctx.lineTo(0, -58);
  ctx.lineTo(6, -52);
  ctx.moveTo(4, -64);
  ctx.lineTo(12, -66);
  ctx.stroke();
  // Iron chain slung over the shoulder
  ctx.strokeStyle = F('#6d6158');
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const cx = -20 + i * 6.5;
    const cy = -84 + i * 5.6;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 3, 2, 0.7, 0, TAU);
    ctx.stroke();
  }

  leg(9, cyc, skin);

  // Head
  ctx.save();
  ctx.translate(8, -92);
  horn(ctx, -6, -4, -26, -10, -22, -30, 3.6, F);
  horn(ctx, 6, -4, 22, -12, 18, -32, 3.6, F);
  ctx.beginPath();
  ctx.moveTo(-8, -6);
  ctx.bezierCurveTo(-6, -14, 10, -14, 13, -6);
  ctx.lineTo(16, 4);
  ctx.bezierCurveTo(10, 10, -2, 10, -8, 4);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -8, -14, 14, 10, [skinLit, skin]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Heavy brow + snout ring
  ctx.fillStyle = dark;
  ctx.fillRect(-4, -7, 16, 3);
  ctx.strokeStyle = F('#c9a24a');
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(14, 5, 2.5, 0, TAU);
  ctx.stroke();
  eye(ctx, 7, -3, 1.9, e.telegraphing ? '#ffffff' : '#ffd13a', e.telegraphing ? 1.5 : 1);
  ctx.restore();

  // Front arm — raises overhead and slams
  const up = e.telegraphing ? 1 : 0;
  const shoulderA = 0.5 - up * 2.6 + a * 2.2 + (moving ? -Math.sin(cyc) * 0.3 : Math.sin(t * 2) * 0.05);
  const fArm = limb(ctx, 18, -80, shoulderA, 18, -0.5 + up * 0.3, 16, 8, 6.5, 8, skin);
  // Rock-knuckled fist
  ctx.beginPath();
  ctx.arc(fArm.ex, fArm.ey, 9, 0, TAU);
  ctx.fillStyle = grad(ctx, fArm.ex - 9, fArm.ey - 9, fArm.ex + 9, fArm.ey + 9, [skinLit, F('#3a120c')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.stroke();
  if (e.telegraphing || a > 0) glow(ctx, fArm.ex, fArm.ey, 22, '#ff7a1a', 0.9);
  void bArm;
}

/** Ossuary Revenant — skeletal archer in a tattered shroud with a bone longbow. */
function drawRevenant(ctx, e, t, F, a) {
  const moving = Math.abs(e.vx) > 8;
  const cyc = e.animPhase * 1.3;
  const bone = F('#d9ccb0');
  const boneDark = F('#9c8e74');
  const sway = Math.sin(t * 2.4 + e.animPhase) * 1.2;

  groundShadow(ctx, 22);

  // Legs (thin bones)
  const leg = (ox, ph, fill) => {
    const s1 = moving ? Math.sin(ph) * 0.45 : 0;
    const k = limb(ctx, ox, -36, s1, 17, moving ? Math.max(0, -Math.cos(ph)) * 0.6 : 0.05, 17, 2.2, 1.8, 1.6, fill);
    ctx.fillStyle = fill;
    ctx.fillRect(k.ex - 2, k.ey - 1.5, 7, 3);
  };
  leg(-3, cyc + Math.PI, boneDark);

  // Tattered shroud
  ctx.beginPath();
  ctx.moveTo(-8, -64);
  ctx.lineTo(10, -64);
  ctx.lineTo(13, -36);
  for (let i = 0; i <= 5; i++) {
    const x = 13 - i * 5;
    const y = -26 + (i % 2) * 6 + Math.sin(t * 4 + i) * 1.5;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(-14, -34);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, 0, -64, 0, -24, [F('#2b2833'), F('#17151c')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  leg(4, cyc, bone);

  // Exposed ribcage
  ctx.strokeStyle = bone;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(1 + sway * 0.3, -58 + i * 5, 6 - i * 0.6, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(1, -62);
  ctx.lineTo(1, -38);
  ctx.stroke();
  // Spectral heart-light
  glow(ctx, 2, -52, 12, '#59c9ff', 0.55 + Math.sin(t * 4) * 0.2);

  // Skull with hood
  ctx.save();
  ctx.translate(3 + sway * 0.4, -70);
  ctx.beginPath();
  ctx.moveTo(-10, 4);
  ctx.bezierCurveTo(-12, -12, 8, -16, 11, -2);
  ctx.lineTo(8, 6);
  ctx.closePath();
  ctx.fillStyle = F('#1f1c26');
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(2, -2, 6, 7, 0, 0, TAU);
  ctx.fillStyle = grad(ctx, -4, -9, 6, 5, [F('#efe5cf'), bone]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.fillStyle = '#0d0a0c';
  ctx.beginPath();
  ctx.ellipse(4, -3, 2.2, 2.6, 0, 0, TAU);
  ctx.fill();
  ctx.fillRect(1, 3, 6, 2.5);
  ctx.strokeStyle = bone;
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(2 + i * 2, 3);
    ctx.lineTo(2 + i * 2, 5.5);
    ctx.stroke();
  }
  eye(ctx, 4, -3, 1.4, '#7fe0ff', e.telegraphing ? 1.6 : 1);
  ctx.restore();

  // Bow arm extended forward, draw arm pulls back during telegraph
  const draw = e.telegraphing ? 1 : a > 0 ? 0 : 0.2;
  seg(ctx, 2, -60, 14, -58, 2, 1.8, bone);
  seg(ctx, 14, -58, 24, -58, 1.8, 1.6, bone);
  // Bone longbow
  ctx.strokeStyle = F('#c8b48c');
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(22, -80);
  ctx.quadraticCurveTo(34, -58, 22, -36);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // String + nocked arrow
  const pull = 22 - draw * 12;
  ctx.strokeStyle = F('#e8e0cc');
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(22, -80);
  ctx.lineTo(pull, -58);
  ctx.lineTo(22, -36);
  ctx.stroke();
  seg(ctx, 0, -60, pull - 2, -58, 1.8, 1.6, boneDark);
  if (draw > 0.5) {
    ctx.strokeStyle = F('#8fe6ff');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(pull, -58);
    ctx.lineTo(36, -58);
    ctx.stroke();
    glow(ctx, 36, -58, 10, '#59c9ff', 0.9);
  }
}

/** Shadow Prowler — lean, three-eyed shadow stalker with scythe forearms and smoke wisps. */
function drawProwler(ctx, e, t, F, a) {
  const moving = Math.abs(e.vx) > 8;
  const cyc = e.animPhase * 1.9;
  const crouch = e.telegraphing ? 6 : moving ? 2 : 0;
  const skin = F('#241430');
  const skinLit = F('#43275a');

  groundShadow(ctx, 22);
  // Smoke wisps trailing behind
  ctx.save();
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 4; i++) {
    const k = (t * 1.6 + i * 0.25 + e.animPhase) % 1;
    ctx.fillStyle = F('#4b2e66');
    ctx.beginPath();
    ctx.arc(-12 - k * 26, -40 + i * 6 - k * 14, 6 * (1 - k) + 2, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.translate(0, crouch);

  const leg = (ox, ph, fill) => {
    const s1 = moving ? Math.sin(ph) * 0.6 : 0;
    const k = limb(ctx, ox, -30, -0.4 + s1, 14, 1.0 + (moving ? Math.max(0, -Math.cos(ph)) * 0.5 : 0) + crouch * 0.04, 12, 4, 3, 2, fill);
    seg(ctx, k.ex, k.ey, k.ex + 6, k.ey + 2, 2, 1.4, fill);
  };
  leg(-3, cyc + Math.PI, F('#160b1e'));

  // Back blade-arm
  const bArm = limb(ctx, -2, -50, 1.2 + (moving ? Math.sin(cyc) * 0.4 : 0), 11, -1.2, 11, 3, 2.4, 2, F('#160b1e'));
  ctx.fillStyle = F('#8c7aa6');
  ctx.beginPath();
  ctx.moveTo(bArm.ex, bArm.ey);
  ctx.quadraticCurveTo(bArm.ex - 10, bArm.ey + 10, bArm.ex - 2, bArm.ey + 18);
  ctx.quadraticCurveTo(bArm.ex - 4, bArm.ey + 8, bArm.ex + 2, bArm.ey + 2);
  ctx.fill();

  // Lean torso
  ctx.beginPath();
  ctx.moveTo(-8, -30);
  ctx.bezierCurveTo(-12, -44, -6, -56, 4, -58);
  ctx.bezierCurveTo(12, -56, 13, -46, 9, -36);
  ctx.lineTo(4, -28);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -10, -58, 12, -28, [skinLit, skin, F('#0f0714')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Violet sigil scars
  ctx.strokeStyle = F('#b77dff');
  ctx.globalAlpha = 0.6 + Math.sin(t * 5) * 0.3;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(2, -50);
  ctx.lineTo(6, -44);
  ctx.lineTo(2, -38);
  ctx.stroke();
  ctx.globalAlpha = 1;

  leg(4, cyc, skin);

  // Head — long, eyeless crest with three burning eyes
  ctx.save();
  ctx.translate(8, -60);
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.bezierCurveTo(-12, -10, -2, -14, 6, -8);
  ctx.lineTo(13, -2);
  ctx.lineTo(4, 5);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -8, -12, 12, 5, [skinLit, skin]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  // Back-swept crest spines
  ctx.fillStyle = F('#6a4c86');
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-4 + i * 3, -9 + i);
    ctx.lineTo(-18 + i * 2, -14 + i * 4);
    ctx.lineTo(-2 + i * 3, -6 + i);
    ctx.fill();
  }
  const eyeCol = e.telegraphing ? '#ffffff' : '#d79bff';
  eye(ctx, 6, -5, 1.3, eyeCol);
  eye(ctx, 9, -2, 1.1, eyeCol);
  eye(ctx, 3, -7.5, 1, eyeCol);
  ctx.restore();

  // Front scythe arm — cocks back on wind-up, slashes on strike
  const fa = 1.1 - (e.telegraphing ? 1.8 : 0) + a * 2.2 + (moving ? -Math.sin(cyc) * 0.4 : 0);
  const fArm = limb(ctx, 6, -52, fa, 11, -1.1, 11, 3.2, 2.6, 2.2, skin);
  ctx.save();
  ctx.translate(fArm.ex, fArm.ey);
  ctx.rotate(fa - 1.1);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(16, -6, 22, 10);
  ctx.quadraticCurveTo(12, 2, 2, 4);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, 0, 0, 22, 10, [F('#bba8d6'), F('#e8dcff')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.stroke();
  if (a > 0) {
    ctx.strokeStyle = 'rgba(215,155,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 22, -1.2, 1.2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Forge Mancubus — corpulent ash-demon with a grilled furnace belly and flame gauntlet. */
function drawMancubus(ctx, e, t, F, a) {
  const moving = Math.abs(e.vx) > 8;
  const cyc = e.animPhase * 0.9;
  const bob = moving ? Math.abs(Math.cos(cyc)) * 2.4 : Math.sin(t * 2) * 1;
  const skin = F('#6a4232');
  const skinLit = F('#a06a50');

  groundShadow(ctx, 36, 0.6);
  ctx.translate(0, -bob);

  const leg = (ox, ph, fill) => {
    const s1 = moving ? Math.sin(ph) * 0.3 : 0;
    const k = limb(ctx, ox, -26, s1, 12, 0.1, 12, 8, 7, 6.5, fill);
    ctx.fillStyle = F('#231914');
    ctx.fillRect(k.ex - 8, k.ey - 3, 17, 5);
  };
  leg(-10, cyc + Math.PI, F('#2e1d17'));

  // Smokestack horns venting soot
  for (const sx of [-12, -2]) {
    ctx.fillStyle = F('#2b2420');
    ctx.fillRect(sx - 3, -84, 6, 14);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx - 3, -84, 6, 14);
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#2a2420';
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.9 + i / 3 + sx * 0.03) % 1;
      ctx.beginPath();
      ctx.arc(sx - k * 8, -86 - k * 26, 3 + k * 6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // Bloated body
  ctx.beginPath();
  ctx.ellipse(0, -48, 28, 30, 0, 0, TAU);
  ctx.fillStyle = grad(ctx, -24, -78, 24, -18, [skinLit, skin, F('#22140f')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Riveted iron bands
  ctx.strokeStyle = F('#5d5752');
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, -48, 28, 30, 0, -2.2, -0.9);
  ctx.stroke();
  // Furnace grille in the belly
  const heat = 0.75 + Math.sin(t * 7) * 0.15 + (e.telegraphing ? 0.5 : 0) + a;
  ctx.fillStyle = radial(ctx, 8, -42, 2, 15, F('#ffd36a'), F('#c43a0a'));
  ctx.beginPath();
  ctx.ellipse(8, -42, 13, 11, 0, 0, TAU);
  ctx.fill();
  glow(ctx, 8, -42, 30, '#ff6a1a', heat * 0.8);
  ctx.strokeStyle = F('#241a16');
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(8 + i * 5, -52);
    ctx.lineTo(8 + i * 5, -32);
    ctx.stroke();
  }

  leg(10, cyc, skin);

  // Small sunken head
  ctx.save();
  ctx.translate(14, -76);
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 8, 0, 0, TAU);
  ctx.fillStyle = grad(ctx, -8, -8, 8, 8, [skinLit, skin]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.stroke();
  // Iron jaw-cage
  ctx.strokeStyle = F('#6b625b');
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-2, 3);
  ctx.lineTo(9, 3);
  ctx.moveTo(1, 1);
  ctx.lineTo(1, 7);
  ctx.moveTo(5, 1);
  ctx.lineTo(5, 7);
  ctx.stroke();
  eye(ctx, 3, -2, 1.4, '#ffb02e');
  eye(ctx, 7, -3, 1.1, '#ffb02e');
  ctx.restore();

  // Flame gauntlet arm
  const aim = e.telegraphing ? -0.15 : 0.25 + Math.sin(t * 2) * 0.05;
  ctx.save();
  ctx.translate(20, -58);
  ctx.rotate(aim);
  seg(ctx, 0, 0, 14, 4, 7, 6, skin);
  ctx.fillStyle = grad(ctx, 12, -6, 12, 12, [F('#6e6660'), F('#2e2a28')]);
  ctx.fillRect(12, -4, 18, 14);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.3;
  ctx.strokeRect(12, -4, 18, 14);
  ctx.fillStyle = F('#1a1412');
  ctx.fillRect(30, -1, 5, 8);
  if (e.telegraphing || a > 0) {
    glow(ctx, 36, 3, 16, '#ff7a1a', 1);
  } else {
    // Pilot light
    glow(ctx, 36, 3, 6, '#ff9a3a', 0.7 + Math.sin(t * 20) * 0.3);
  }
  ctx.restore();
}

/** Wailing Skull — horned, burning skull with a screaming jaw. */
function drawSkull(ctx, e, t, F, a) {
  ctx.translate(0, -e.h * 0.5 / (e._s || 1));
  const bob = Math.sin(t * 6 + e.animPhase) * 2;
  ctx.translate(0, bob);
  // Flame mane trailing back
  for (let i = 0; i < 5; i++) {
    const k = i / 5;
    flame(ctx, -6 - i * 4, 6 - k * 4, 20 - i * 2.5, t, i * 1.7 + e.animPhase, '#ffe08a', i < 2 ? '#ff7a1a' : '#c8401a');
  }
  glow(ctx, 0, 0, 24, '#ff5a14', 0.5);
  // Horns
  horn(ctx, -4, -8, -14, -12, -16, -24, 2.4, F);
  horn(ctx, 3, -9, 0, -18, -8, -24, 2.2, F);
  // Cranium
  ctx.beginPath();
  ctx.moveTo(-10, 2);
  ctx.bezierCurveTo(-12, -14, 10, -16, 13, -2);
  ctx.lineTo(12, 4);
  ctx.lineTo(-6, 6);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -10, -14, 12, 6, [F('#f3ead6'), F('#c7b896'), F('#8a7a5c')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Cracks
  ctx.strokeStyle = F('#6b5c42');
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-4, -11);
  ctx.lineTo(-2, -6);
  ctx.lineTo(-5, -2);
  ctx.stroke();
  // Eye socket
  ctx.fillStyle = '#120507';
  ctx.beginPath();
  ctx.ellipse(5, -3, 3.4, 3, 0, 0, TAU);
  ctx.fill();
  eye(ctx, 5, -3, 1.8, '#ff6a1a', 1.3);
  // Nasal cavity
  ctx.fillStyle = '#120507';
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(12, 3);
  ctx.lineTo(9, 3);
  ctx.fill();
  // Screaming jaw
  const open = 3 + Math.abs(Math.sin(t * 9 + e.animPhase)) * 2 + (e.telegraphing ? 4 : 0) + a * 4;
  ctx.beginPath();
  ctx.moveTo(-4, 5);
  ctx.lineTo(12, 4);
  ctx.lineTo(11, 6 + open);
  ctx.lineTo(-2, 6 + open * 0.8);
  ctx.closePath();
  ctx.fillStyle = F('#c7b896');
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#ffdb8a';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(-1 + i * 3, 4, 1.6, 2.4);
  }
}

/** Plague Tick — bloated pustule-sac on skittering legs that bursts on death. */
function drawTick(ctx, e, t, F, a) {
  const moving = Math.abs(e.vx) > 8;
  const pulse = 1 + Math.sin(t * 9 + e.animPhase) * 0.06 + (e.telegraphing ? 0.12 : 0);
  groundShadow(ctx, 26);
  // Six skittering legs
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1;
    const j = i % 3;
    const ph = e.animPhase * 3 + i * 1.3;
    const lift = moving ? Math.max(0, Math.sin(ph)) * 4 : 0;
    const rootX = -6 + j * 6;
    const kneeX = rootX + side * 4 + (j - 1) * 8;
    const footX = rootX + (j - 1) * 14 + side * 3;
    ctx.strokeStyle = F(side < 0 ? '#2a1410' : '#3d1d16');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rootX, -12);
    ctx.lineTo(kneeX, -20 - lift);
    ctx.lineTo(footX, -lift * 0.3);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(0, -22);
  ctx.scale(pulse, 1 / pulse);
  // Swollen abdomen
  ctx.beginPath();
  ctx.ellipse(-3, 0, 19, 15, -0.1, 0, TAU);
  ctx.fillStyle = grad(ctx, -18, -14, 14, 14, [F('#8a4a2a'), F('#5a2416'), F('#2a0f0a')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Veins
  ctx.strokeStyle = F('#b0402a');
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-14, -4);
  ctx.quadraticCurveTo(-6, -10, 0, -6);
  ctx.moveTo(-10, 6);
  ctx.quadraticCurveTo(-2, 2, 6, 8);
  ctx.stroke();
  // Glowing volatile pustules
  for (const [px, py, pr, ph] of [[2, -6, 4.2, 0], [-9, 3, 3.4, 1.4], [-4, -10, 2.6, 2.2], [6, 5, 2.8, 3]]) {
    const g = 0.7 + Math.sin(t * 8 + ph) * 0.3;
    ctx.fillStyle = radial(ctx, px - pr * 0.3, py - pr * 0.3, 0, pr, F('#fff2a0'), F('#ff8a1a'));
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, TAU);
    ctx.fill();
    glow(ctx, px, py, pr * 3, '#ff8a1a', 0.5 * g);
  }
  ctx.restore();
  // Head with mandibles
  ctx.save();
  ctx.translate(15, -20);
  ctx.beginPath();
  ctx.ellipse(0, 0, 6, 5, 0, 0, TAU);
  ctx.fillStyle = F('#3a1a12');
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.stroke();
  const m = Math.sin(t * 14) * 0.25 + a * 0.5;
  ctx.strokeStyle = F('#d9c7a2');
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(4, -2);
  ctx.quadraticCurveTo(10, -4 - m * 6, 9, 0);
  ctx.moveTo(4, 2);
  ctx.quadraticCurveTo(10, 4 + m * 6, 9, 0);
  ctx.stroke();
  eye(ctx, 2, -2, 1, '#ffd23a');
  ctx.restore();
}

/** Blood Deacon — floating hooded priest swinging a blood censer that heals allies. */
function drawDeacon(ctx, e, t, F, a) {
  const float = Math.sin(t * 2.6 + e.animPhase) * 3;
  groundShadow(ctx, 18, 0.35);
  ctx.translate(0, -6 + float);
  // Robe hem tatters waving
  ctx.beginPath();
  ctx.moveTo(-10, -56);
  ctx.lineTo(10, -56);
  ctx.bezierCurveTo(16, -36, 18, -16, 16, -6);
  for (let i = 0; i <= 6; i++) {
    const x = 16 - i * 5.3;
    const y = -6 + (i % 2 ? 6 : 0) + Math.sin(t * 5 + i) * 2;
    ctx.lineTo(x, y);
  }
  ctx.bezierCurveTo(-18, -16, -16, -36, -10, -56);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -16, -56, 16, 0, [F('#5a1424'), F('#3a0c18'), F('#1c060c')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Gold trim and stole
  ctx.strokeStyle = F('#c9a24a');
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-2, -54);
  ctx.lineTo(-4, -10);
  ctx.moveTo(4, -54);
  ctx.lineTo(6, -10);
  ctx.stroke();
  ctx.fillStyle = F('#c9a24a');
  ctx.fillRect(-1.5, -40, 7, 2);
  ctx.fillRect(0.5, -44, 3, 10);

  // Hood
  ctx.save();
  ctx.translate(2, -62);
  ctx.beginPath();
  ctx.moveTo(-11, 8);
  ctx.bezierCurveTo(-13, -8, -2, -16, 6, -12);
  ctx.bezierCurveTo(12, -8, 13, 2, 11, 8);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -10, -14, 12, 8, [F('#6e1a2c'), F('#2c0a14')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.stroke();
  // Shadowed face with skull glint
  ctx.fillStyle = '#0a0306';
  ctx.beginPath();
  ctx.ellipse(4, 0, 5.5, 7, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = F('#b8a888');
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(5, 2, 3, 4, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  eye(ctx, 4, -1, 1.1, '#ff3a4a');
  eye(ctx, 7, -1.4, 1, '#ff3a4a');
  ctx.restore();

  // Arm holding the censer chain
  const swing = Math.sin(t * 3 + e.animPhase) * 0.6 + (e.telegraphing ? -0.8 : 0);
  const hand = limb(ctx, 6, -48, 1.2, 8, -0.5, 8, 3, 2.4, 2, F('#4a1020'));
  const cx = hand.ex + Math.sin(swing) * 16;
  const cy = hand.ey + Math.cos(swing) * 16;
  ctx.strokeStyle = F('#8a7a5a');
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(hand.ex, hand.ey);
  ctx.lineTo(cx, cy);
  ctx.stroke();
  ctx.fillStyle = grad(ctx, cx - 5, cy - 5, cx + 5, cy + 5, [F('#e0b860'), F('#6a4a1a')]);
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy);
  ctx.lineTo(cx, cy - 5);
  ctx.lineTo(cx + 5, cy);
  ctx.lineTo(cx, cy + 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.stroke();
  glow(ctx, cx, cy, 14 + (e.telegraphing ? 8 : 0), '#ff2a44', 0.75);
  // Blood mist from the censer
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#a0182a';
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.8 + i / 3) % 1;
    ctx.beginPath();
    ctx.arc(cx - k * 6, cy - k * 18, 2 + k * 4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  void a;
}

/** Archvile Cantor — tall, gaunt summoner with raised arms and orbiting fire runes. */
function drawCantor(ctx, e, t, F, a) {
  const sway = Math.sin(t * 1.8 + e.animPhase) * 1.5;
  const cast = e.telegraphing ? 1 : 0;
  groundShadow(ctx, 22);
  // Summoning circle under feet while casting
  if (cast) {
    ctx.save();
    ctx.scale(1, 0.25);
    ctx.strokeStyle = 'rgba(255,170,60,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  // Robe
  ctx.beginPath();
  ctx.moveTo(-6, -66);
  ctx.lineTo(8, -66);
  ctx.bezierCurveTo(14, -40, 16, -14, 14, 0);
  ctx.lineTo(-14, 0);
  ctx.bezierCurveTo(-14, -20, -12, -44, -6, -66);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -14, -66, 14, 0, [F('#5a2a14'), F('#3a1a0c'), F('#1a0b06')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Rune embroidery
  ctx.strokeStyle = F('#e0a03a');
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const y = -50 + i * 12;
    ctx.beginPath();
    ctx.moveTo(-2, y);
    ctx.lineTo(2, y - 4);
    ctx.lineTo(4, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Emaciated arms — raised high while casting
  const armUp = -2.6 * cast - 0.4 + Math.sin(t * 2) * 0.1;
  const skin = F('#8a6a52');
  const back = limb(ctx, -4, -62, armUp - 0.3, 14, -0.3, 14, 2.6, 2, 1.8, F('#5e4636'));
  const front = limb(ctx, 6, -62, armUp + 0.5 + a * 1.2, 14, -0.4, 14, 2.8, 2.2, 1.8, skin);
  claws(ctx, front.ex, front.ey, -1.4, 6, F, 4);
  claws(ctx, back.ex, back.ey, -1.6, 5, F, 3);
  if (cast) {
    flame(ctx, front.ex, front.ey - 2, 18, t, 1);
    flame(ctx, back.ex, back.ey - 2, 14, t, 2);
  }

  // Long skull-head with a crown of bone spikes
  ctx.save();
  ctx.translate(3 + sway * 0.3, -72);
  ctx.beginPath();
  ctx.moveTo(-6, 6);
  ctx.bezierCurveTo(-8, -6, -2, -12, 4, -12);
  ctx.bezierCurveTo(10, -10, 11, -2, 9, 4);
  ctx.lineTo(6, 12);
  ctx.lineTo(0, 12);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -6, -12, 10, 12, [F('#c8ad88'), F('#7a6046')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.fillStyle = F('#e8d8b0');
  for (let i = 0; i < 5; i++) {
    const x = -5 + i * 3.4;
    ctx.beginPath();
    ctx.moveTo(x - 1.4, -10 + Math.abs(i - 2) * 1.2);
    ctx.lineTo(x, -20 + Math.abs(i - 2) * 3);
    ctx.lineTo(x + 1.4, -10 + Math.abs(i - 2) * 1.2);
    ctx.fill();
  }
  ctx.fillStyle = '#140806';
  ctx.beginPath();
  ctx.ellipse(5, -2, 2.4, 3, 0, 0, TAU);
  ctx.fill();
  ctx.fillRect(2, 6, 6, 2);
  eye(ctx, 5, -2, 1.4, '#ffc23a', cast ? 1.6 : 1);
  ctx.restore();

  // Orbiting hellfire runes
  for (let i = 0; i < 3; i++) {
    const ang = t * (2.2 + cast * 2) + (i * TAU) / 3;
    const ox = Math.cos(ang) * (22 + cast * 6);
    const oy = -48 + Math.sin(ang) * 10;
    const front2 = Math.sin(ang) > 0;
    ctx.globalAlpha = front2 ? 1 : 0.5;
    glow(ctx, ox, oy, 10, '#ff9a2a', 0.8);
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.arc(ox, oy, 2.4, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** Arachno-Reliquary — a gilded reliquary with a stained-glass eye, carried on spider legs. */
function drawReliquary(ctx, e, t, F, a) {
  groundShadow(ctx, 32);
  const idle = Math.sin(t * 2 + e.animPhase) * 1.5;
  // Four jointed legs
  for (const [side, depth] of [[-1, 1], [1, 1], [-1, 0], [1, 0]]) {
    const col = F(depth ? '#2a2420' : '#4a403a');
    const tw = Math.sin(t * 3 + side + depth) * 1.5;
    ctx.strokeStyle = col;
    ctx.lineWidth = depth ? 2.6 : 3.2;
    ctx.lineCap = 'round';
    const rx = side * (depth ? 6 : 10);
    ctx.beginPath();
    ctx.moveTo(rx, -26 + idle);
    ctx.lineTo(side * (depth ? 20 : 26), -40 + tw);
    ctx.lineTo(side * (depth ? 26 : 34), 0);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  ctx.translate(0, idle);
  // Reliquary casket body
  ctx.beginPath();
  ctx.moveTo(-18, -24);
  ctx.lineTo(18, -24);
  ctx.lineTo(16, -46);
  ctx.lineTo(0, -56);
  ctx.lineTo(-16, -46);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -18, -56, 18, -24, [F('#6a5a3a'), F('#3a2e1e'), F('#1e160e')]);
  ctx.fill();
  ctx.strokeStyle = F('#c9a24a');
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Spire
  ctx.fillStyle = F('#c9a24a');
  ctx.beginPath();
  ctx.moveTo(-2, -56);
  ctx.lineTo(0, -66);
  ctx.lineTo(2, -56);
  ctx.fill();
  ctx.fillRect(-3, -63, 6, 1.6);
  // Stained-glass eye that tracks and charges
  const charge = e.telegraphing ? 1 : 0;
  ctx.save();
  ctx.translate(2, -38);
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 9, 0, 0, TAU);
  ctx.fillStyle = radial(ctx, 0, 0, 0, 9, F('#ff9a8a'), F('#7a0a1a'));
  ctx.fill();
  ctx.strokeStyle = F('#c9a24a');
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * TAU;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(ang) * 9, Math.sin(ang) * 9);
    ctx.stroke();
  }
  ctx.fillStyle = '#100204';
  ctx.beginPath();
  ctx.ellipse(3, 0, 2, 5 - charge * 2, 0, 0, TAU);
  ctx.fill();
  glow(ctx, 0, 0, 20 + charge * 14 + a * 10, '#ff2a3a', 0.55 + charge * 0.5);
  ctx.restore();
  // Censer-cannon barrel
  ctx.fillStyle = grad(ctx, 16, -36, 16, -28, [F('#8a7a5a'), F('#3a2e1e')]);
  ctx.fillRect(14, -36, 14, 7);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.strokeRect(14, -36, 14, 7);
  if (charge || a > 0) glow(ctx, 30, -32, 12, '#ff4a3a', 1);
}

const DEMON_RENDERERS = {
  stalker: [drawImp, 64],
  spitter: [drawGargoyle, 54],
  brute: [drawBaron, 88],
  sniper: [drawRevenant, 74],
  assassin: [drawProwler, 68],
  pyro: [drawMancubus, 76],
  drone: [drawSkull, 36],
  bloat: [drawTick, 44],
  medic: [drawDeacon, 70],
  summoner: [drawCantor, 82],
  sentry: [drawReliquary, 58],
};

/**
 * Draws a regular demon. The context must be translated to the demon's feet and flipped by facing.
 */
export function drawDemon(ctx, e, time, flash) {
  const entry = DEMON_RENDERERS[e.art || e.type] || DEMON_RENDERERS.stalker;
  const [fn, baseH] = entry;
  const s = e.h / baseH;
  e._s = s;
  const F = flash ? () => FLASH : (c) => c;
  const a = strikeAmount(e, time);
  ctx.save();
  // Elites, Wardens and enraged demons radiate a corrupt aura behind them
  if (e.elite || e.isMidBoss || e.enraged) {
    const col = e.isMidBoss ? '#ff8a2a' : e.enraged ? '#ff2244' : '#ffcc55';
    const pulse = 0.55 + Math.sin(time * 5 + e.animPhase) * 0.15;
    glow(ctx, 0, -e.h * 0.5, Math.max(e.w, e.h) * 0.85, col, pulse * 0.45);
  }
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  fn(ctx, e, time, F, a);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Fallen Lords (stage bosses)
// ---------------------------------------------------------------------------

/** Lord Malak — the Iron Penitent: horned knight whose caged chest holds a furnace. */
function drawMalak(ctx, b, t, F, s) {
  const moving = Math.abs(b.vx) > 20;
  const charging = b.state === 'charge' || b.state === 'charge_windup';
  const cyc = t * (moving ? 7 : 0);
  const bob = moving ? Math.abs(Math.cos(cyc)) * 4 : Math.sin(t * 1.6) * 1.5;
  const iron = F('#3a3634');
  const ironLit = F('#6a625c');
  const ironDark = F('#1c1a19');
  const lean = charging ? 0.18 : 0;
  groundShadow(ctx, 70, 0.65);
  ctx.translate(0, -bob);
  ctx.rotate(lean);

  const leg = (ox, ph, fill) => {
    const s1 = moving ? Math.sin(ph) * 0.4 : 0;
    const k = limb(ctx, ox, -66, s1 - 0.05, 32, moving ? Math.max(0, -Math.cos(ph)) * 0.5 : 0.08, 30, 14, 11, 10, fill);
    ctx.fillStyle = grad(ctx, k.ex, k.ey - 8, k.ex, k.ey + 4, [ironLit, ironDark]);
    ctx.beginPath();
    ctx.moveTo(k.ex - 12, k.ey + 4);
    ctx.lineTo(k.ex - 10, k.ey - 8);
    ctx.lineTo(k.ex + 14, k.ey - 6);
    ctx.lineTo(k.ex + 18, k.ey + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.stroke();
    // Knee spike
    ctx.fillStyle = ironLit;
    ctx.beginPath();
    ctx.moveTo(k.kx - 4, k.ky - 6);
    ctx.lineTo(k.kx + 12, k.ky - 2);
    ctx.lineTo(k.kx - 2, k.ky + 6);
    ctx.fill();
  };
  leg(-14, cyc + Math.PI, ironDark);

  // Back arm (behind the torso)
  limb(ctx, -30, -132, 0.3 + (moving ? Math.sin(cyc) * 0.3 : 0), 30, -0.3, 28, 12, 10, 10, ironDark);

  // Tattered tabard
  ctx.beginPath();
  ctx.moveTo(-26, -76);
  ctx.lineTo(24, -76);
  for (let i = 0; i <= 6; i++) {
    ctx.lineTo(24 - i * 8, -34 + (i % 2) * 8 + Math.sin(t * 3 + i) * 2);
  }
  ctx.closePath();
  ctx.fillStyle = grad(ctx, 0, -76, 0, -30, [F('#4a1810'), F('#24100a')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.stroke();

  // Torso armor
  ctx.beginPath();
  ctx.moveTo(-40, -138);
  ctx.bezierCurveTo(-10, -152, 22, -152, 44, -136);
  ctx.lineTo(34, -96);
  ctx.lineTo(24, -74);
  ctx.lineTo(-24, -74);
  ctx.lineTo(-36, -100);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -40, -150, 40, -74, [ironLit, iron, ironDark]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Lava veins across the plates
  const heat = 0.7 + Math.sin(t * 4) * 0.2 + (b.phase >= 2 ? 0.3 : 0) + (charging ? 0.3 : 0);
  ctx.strokeStyle = F('#ff7a2a');
  ctx.globalAlpha = Math.min(1, heat);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-30, -130);
  ctx.lineTo(-22, -120);
  ctx.lineTo(-26, -108);
  ctx.moveTo(30, -132);
  ctx.lineTo(22, -118);
  ctx.lineTo(28, -104);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Ribcage furnace
  ctx.fillStyle = radial(ctx, 2, -108, 2, 26, F('#ffe08a'), F('#c43a0a'));
  ctx.beginPath();
  ctx.ellipse(2, -108, 20, 22, 0, 0, TAU);
  ctx.fill();
  glow(ctx, 2, -108, 70, '#ff5a14', heat * 0.7);
  ctx.strokeStyle = ironDark;
  ctx.lineWidth = 3.4;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(2 + i * 6, -128);
    ctx.lineTo(2 + i * 6.5, -88);
    ctx.stroke();
  }
  // Embers rising from the furnace
  for (let i = 0; i < 5; i++) {
    const k = (t * 0.7 + i / 5) % 1;
    ctx.fillStyle = `rgba(255,${160 + i * 15},60,${1 - k})`;
    ctx.fillRect(-6 + i * 4 + Math.sin(t * 3 + i) * 4, -110 - k * 70, 2.4, 2.4);
  }

  leg(16, cyc, iron);

  // Great helm with sweeping ram horns
  ctx.save();
  ctx.translate(6, -152);
  horn(ctx, -10, -8, -50, -10, -40, -46, 6, F);
  horn(ctx, 10, -10, 44, -16, 30, -50, 6, F);
  ctx.beginPath();
  ctx.moveTo(-16, 10);
  ctx.lineTo(-16, -14);
  ctx.quadraticCurveTo(0, -30, 18, -14);
  ctx.lineTo(20, 10);
  ctx.lineTo(2, 18);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -16, -26, 20, 18, [ironLit, iron, ironDark]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Visor slit blazing
  ctx.fillStyle = '#1a0a06';
  ctx.fillRect(-8, -6, 26, 6);
  glow(ctx, 6, -3, 26, '#ff6a1a', 0.9);
  ctx.fillStyle = F('#ffcf6a');
  ctx.fillRect(-6, -4.5, 22, 3);
  // Crest ridge
  ctx.strokeStyle = ironLit;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(2, -24);
  ctx.lineTo(2, 14);
  ctx.stroke();
  ctx.restore();

  // Front arm wielding a huge notched cleaver
  const raise = b.state === 'charge_windup' || b.state === 'ultimate_windup' ? 1 : 0;
  const swing = b.state === 'charge' ? Math.sin(t * 16) * 0.5 : 0;
  const armA = 0.7 - raise * 2.3 + swing;
  const arm = limb(ctx, 38, -132, armA, 30, -0.6 + raise * 0.4, 26, 12, 10, 10, iron);
  // Pauldron
  ctx.beginPath();
  ctx.arc(36, -134, 18, Math.PI * 0.95, Math.PI * 2.1);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, 20, -152, 52, -124, [ironLit, ironDark]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.save();
  ctx.translate(arm.ex, arm.ey);
  ctx.rotate(armA - 0.2);
  ctx.fillStyle = F('#4a2a1a');
  ctx.fillRect(-4, -18, 8, 28);
  ctx.beginPath();
  ctx.moveTo(-14, 10);
  ctx.lineTo(16, 10);
  ctx.lineTo(22, 96);
  ctx.lineTo(4, 110);
  ctx.lineTo(-12, 92);
  ctx.lineTo(-8, 70);
  ctx.lineTo(-14, 62);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -14, 10, 22, 110, [F('#8a827a'), F('#4a4440'), F('#2a2624')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = F('#ff7a2a');
  ctx.globalAlpha = 0.5 + heat * 0.3;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(2, 16);
  ctx.lineTo(4, 90);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = F('#6a625c');
  ctx.fillRect(-16, 6, 34, 6);
  ctx.restore();
  void s;
}

/** Matron Arachne — the Weeping Choir: veiled spider-matron hanging from a silk thread. */
function drawArachne(ctx, b, t, F) {
  const sway = Math.sin(t * 1.4) * 0.06;
  // Silk thread up into the dark
  ctx.strokeStyle = 'rgba(220,230,200,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -b.h * 0.9);
  ctx.lineTo(0, -1200);
  ctx.stroke();
  ctx.translate(0, -b.h * 0.45);
  ctx.rotate(sway);

  // Eight legs: four each side, articulated, twitching
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1;
    const j = i % 4;
    const ph = t * 3 + i * 0.9;
    const twitch = Math.sin(ph) * 0.12;
    const baseA = (-0.9 + j * 0.55) + twitch;
    const kx = side * (34 + j * 6) + Math.cos(baseA) * 18 * side;
    const ky = -10 + Math.sin(baseA) * 30 - 18;
    const fx = side * (58 + j * 10);
    const fy = 40 + j * 10 + Math.sin(ph + 1) * 4;
    const col = F(j % 2 ? '#2a3020' : '#3a4230');
    ctx.strokeStyle = col;
    ctx.lineWidth = 4.6 - j * 0.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(side * 10, 6);
    ctx.lineTo(kx, ky);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = F('#d8d0b0');
    ctx.beginPath();
    ctx.arc(kx, ky, 2, 0, TAU);
    ctx.fill();
  }

  // Swollen abdomen with a skull-marking
  ctx.beginPath();
  ctx.ellipse(-6, 22, 34, 28, -0.25, 0, TAU);
  ctx.fillStyle = grad(ctx, -40, -6, 28, 50, [F('#5a6a40'), F('#2e3a22'), F('#141a0e')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = F('#d8d0a8');
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.ellipse(-8, 22, 10, 9, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#141a0e';
  ctx.beginPath();
  ctx.arc(-11, 20, 2.4, 0, TAU);
  ctx.arc(-5, 20, 2.4, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  glow(ctx, -6, 22, 50, '#a8d86a', 0.25 + Math.sin(t * 2) * 0.1);

  // Pale upper body of the matron (drawn larger so she reads at a distance)
  ctx.save();
  ctx.translate(0, 4);
  ctx.scale(1.45, 1.45);
  ctx.translate(0, -4);
  ctx.beginPath();
  ctx.moveTo(-12, 4);
  ctx.bezierCurveTo(-16, -18, -12, -36, 0, -40);
  ctx.bezierCurveTo(12, -36, 16, -18, 12, 4);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -14, -40, 14, 4, [F('#d8d2c0'), F('#a8a08a'), F('#6a6452')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Black lace bodice
  ctx.fillStyle = F('#1a1a14');
  ctx.beginPath();
  ctx.moveTo(-12, -14);
  ctx.quadraticCurveTo(0, -6, 12, -14);
  ctx.lineTo(10, 4);
  ctx.lineTo(-10, 4);
  ctx.closePath();
  ctx.fill();

  // Arms — four of them, two raised in a choir conductor's gesture
  const conduct = Math.sin(t * 2.4) * 0.3;
  const armCol = F('#b8b09a');
  for (const [sx, a1, a2] of [[-10, 2.4 + conduct, -0.8], [10, -2.4 - conduct, 0.8], [-10, 1.2, -0.6], [10, -1.2, 0.6]]) {
    const arm = limb(ctx, sx, -30, a1, 16, a2, 16, 3, 2.4, 2, armCol);
    claws(ctx, arm.ex, arm.ey, -Math.PI / 2, 6, F, 3);
  }

  // Veiled head with weeping eyes
  ctx.save();
  ctx.translate(0, -50);
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 12, 0, 0, TAU);
  ctx.fillStyle = F('#c8c0aa');
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.stroke();
  // Veil
  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.quadraticCurveTo(0, -24, 14, -8);
  ctx.lineTo(18, 30 + Math.sin(t * 2) * 3);
  ctx.lineTo(-18, 30 + Math.sin(t * 2 + 1) * 3);
  ctx.closePath();
  ctx.fillStyle = 'rgba(20,24,14,0.72)';
  ctx.fill();
  // Crown of thorns
  ctx.strokeStyle = F('#a8d86a');
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const x = -10 + i * 3.3;
    ctx.moveTo(x, -10);
    ctx.lineTo(x + 1, -18 - (i % 2) * 4);
  }
  ctx.stroke();
  eye(ctx, -4, -1, 1.8, '#c8ff7a');
  eye(ctx, 4, -1, 1.8, '#c8ff7a');
  // Glowing tears
  ctx.strokeStyle = 'rgba(200,255,122,0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-4, 2);
  ctx.lineTo(-5, 10);
  ctx.moveTo(4, 2);
  ctx.lineTo(5, 10);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/** Seraph Valkyrie — the Frozen Clockmaker: six-winged ice seraph with a clockwork halo. */
function drawValkyrie(ctx, b, t, F) {
  ctx.translate(0, -b.h * 0.5);
  const hover = Math.sin(t * 2) * 3;
  ctx.translate(0, hover);
  const ice = b.phase >= 2 ? '#ffd27a' : '#8fe6ff';

  // Six crystalline wings
  for (const side of [-1, 1]) {
    for (let w = 0; w < 3; w++) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.rotate(-0.6 + w * 0.42 + Math.sin(t * 2.6 + w) * 0.06);
      ctx.beginPath();
      ctx.moveTo(10, -6);
      ctx.lineTo(78 - w * 12, -16);
      ctx.lineTo(70 - w * 10, -2);
      ctx.lineTo(56 - w * 8, 2);
      ctx.lineTo(44 - w * 6, 10);
      ctx.closePath();
      ctx.fillStyle = grad(ctx, 10, -10, 78, 0, [F('#e8f8ff'), F(b.phase >= 2 ? '#d8a050' : '#5aa8d8'), 'rgba(40,90,140,0.4)']);
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = F('#f4fcff');
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }

  // Clockwork halo
  ctx.save();
  ctx.translate(0, -64);
  ctx.strokeStyle = F(ice);
  ctx.lineWidth = 2.4;
  glow(ctx, 0, 0, 40, ice, 0.4);
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * 22, Math.sin(ang) * 22);
    ctx.lineTo(Math.cos(ang) * 26, Math.sin(ang) * 26);
    ctx.stroke();
  }
  // Clock hands sweep — fast while casting
  ctx.lineWidth = 2;
  const hs = t * (b.state === 'ultimate_windup' ? 6 : 0.8);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(hs) * 20, Math.sin(hs) * 20);
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(hs / 12) * 13, Math.sin(hs / 12) * 13);
  ctx.stroke();
  ctx.restore();

  // Flowing robe of frost
  ctx.beginPath();
  ctx.moveTo(-14, -40);
  ctx.lineTo(14, -40);
  ctx.bezierCurveTo(24, -10, 26, 30, 18, 58);
  for (let i = 0; i <= 5; i++) ctx.lineTo(18 - i * 7.2, 58 + (i % 2) * 8 + Math.sin(t * 3 + i) * 3);
  ctx.bezierCurveTo(-26, 30, -24, -10, -14, -40);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -24, -40, 24, 60, [F('#2a4058'), F('#16243a'), F('#0a1220')]);
  ctx.fill();
  ctx.strokeStyle = F('#a8dcff');
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Frozen heart
  glow(ctx, 0, -14, 30, ice, 0.8);
  ctx.fillStyle = F('#eafaff');
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(7, -14);
  ctx.lineTo(0, -4);
  ctx.lineTo(-7, -14);
  ctx.closePath();
  ctx.fill();

  // Arms holding a clock-hand spear
  const arm = limb(ctx, 12, -36, -1.9 + Math.sin(t * 1.5) * 0.2, 16, 0.6, 16, 3.6, 3, 2.6, F('#c8d8e8'));
  limb(ctx, -12, -36, 0.5, 16, -0.4, 14, 3.6, 3, 2.6, F('#8aa0b8'));
  ctx.strokeStyle = F('#e0f4ff');
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(arm.ex - 20, arm.ey + 40);
  ctx.lineTo(arm.ex + 10, arm.ey - 40);
  ctx.stroke();
  ctx.fillStyle = F(ice);
  ctx.beginPath();
  ctx.moveTo(arm.ex + 10, arm.ey - 52);
  ctx.lineTo(arm.ex + 15, arm.ey - 38);
  ctx.lineTo(arm.ex + 6, arm.ey - 40);
  ctx.closePath();
  ctx.fill();

  // Porcelain mask
  ctx.save();
  ctx.translate(0, -48);
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 11, 0, 0, TAU);
  ctx.fillStyle = grad(ctx, -9, -11, 9, 11, [F('#ffffff'), F('#c8d4dc')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = F('#6a8090');
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(2, -10);
  ctx.lineTo(0, -2);
  ctx.lineTo(3, 4);
  ctx.stroke();
  eye(ctx, -3.5, -1, 1.5, ice);
  eye(ctx, 3.5, -1, 1.5, ice);
  ctx.restore();
}

/** Vex — the Fallen Night Sentinel: horned war-general with a molten great-axe. */
function drawVex(ctx, b, t, F) {
  const moving = Math.abs(b.vx) > 20;
  const cyc = t * (moving ? 8 : 0);
  const bob = moving ? Math.abs(Math.cos(cyc)) * 3 : Math.sin(t * 2) * 1;
  const green = b.greenEyeTimer > 0;
  const plate = F('#3a2a26');
  const plateLit = F('#6a4c40');
  const plateDark = F('#1a1210');
  groundShadow(ctx, 44, 0.6);
  ctx.translate(0, -bob);

  const leg = (ox, ph, fill) => {
    const s1 = moving ? Math.sin(ph) * 0.5 : 0;
    const k = limb(ctx, ox, -46, s1, 22, moving ? Math.max(0, -Math.cos(ph)) * 0.6 : 0.06, 22, 8, 6.5, 6, fill);
    ctx.fillStyle = plateDark;
    ctx.fillRect(k.ex - 6, k.ey - 3, 16, 5);
  };
  leg(-8, cyc + Math.PI, plateDark);

  // Cape of molten-edged ash
  ctx.beginPath();
  ctx.moveTo(-14, -96);
  ctx.bezierCurveTo(-30, -70, -36 + Math.sin(t * 3) * 4, -40, -40 + Math.sin(t * 3) * 6, -10);
  ctx.lineTo(-10, -20);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -40, -96, -10, -10, [F('#4a1a14'), F('#200a08')]);
  ctx.fill();
  ctx.strokeStyle = F('#ff6a2a');
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Torso — carved with screaming faces of the condemned
  ctx.beginPath();
  ctx.moveTo(-20, -100);
  ctx.bezierCurveTo(-6, -108, 14, -108, 24, -98);
  ctx.lineTo(18, -48);
  ctx.lineTo(-16, -48);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -20, -108, 24, -48, [plateLit, plate, plateDark]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = F('#7a5a48');
  for (const [fx, fy] of [[-6, -84], [8, -86], [1, -66]]) {
    ctx.beginPath();
    ctx.ellipse(fx, fy, 4, 5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#140806';
    ctx.beginPath();
    ctx.ellipse(fx, fy + 1.5, 1.4, 2, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = F('#7a5a48');
  }

  leg(9, cyc, plate);

  // Back arm on the axe haft
  const raise = b.state === 'ultimate_windup' ? 1 : 0;
  const swingA = Math.sin(t * 2) * 0.1 - raise * 1.6;

  // Helmeted head with dripping ram horns and a third eye
  ctx.save();
  ctx.translate(3, -112);
  horn(ctx, -6, -6, -30, -2, -26, -24, 4, F);
  horn(ctx, 6, -6, 30, -4, 24, -26, 4, F);
  ctx.beginPath();
  ctx.moveTo(-10, 10);
  ctx.lineTo(-10, -8);
  ctx.quadraticCurveTo(0, -20, 12, -8);
  ctx.lineTo(12, 10);
  ctx.lineTo(1, 14);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -10, -18, 12, 14, [plateLit, plateDark]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  const eyeCol = green ? '#2dff7a' : '#ff2a3a';
  eye(ctx, -2, 0, 1.6, eyeCol, green ? 2 : 1);
  eye(ctx, 6, 0, 1.6, eyeCol, green ? 2 : 1);
  eye(ctx, 2, -8, 1.3, eyeCol, green ? 2 : 1);
  if (green) {
    ctx.strokeStyle = '#2dff7a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(2, -2, 16 + Math.sin(t * 30) * 3, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();

  // Front arm + molten great-axe
  const arm = limb(ctx, 18, -96, 0.8 + swingA, 20, -1.3, 18, 7, 6, 5.5, plate);
  ctx.beginPath();
  ctx.arc(18, -98, 11, Math.PI, TAU);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, 8, -110, 28, -94, [plateLit, plateDark]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.save();
  ctx.translate(arm.ex, arm.ey);
  ctx.rotate(-0.5 + swingA);
  ctx.fillStyle = F('#2a1a12');
  ctx.fillRect(-2.5, -60, 5, 96);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.strokeRect(-2.5, -60, 5, 96);
  // Double-bitted head
  ctx.beginPath();
  ctx.moveTo(2, -56);
  ctx.quadraticCurveTo(30, -70, 36, -40);
  ctx.quadraticCurveTo(22, -46, 2, -36);
  ctx.closePath();
  ctx.moveTo(-2, -54);
  ctx.quadraticCurveTo(-20, -60, -22, -44);
  ctx.quadraticCurveTo(-12, -46, -2, -40);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -22, -70, 36, -36, [F('#a8a098'), F('#5a524c')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Molten edge
  ctx.strokeStyle = F('#ff6a1a');
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(30, -62);
  ctx.quadraticCurveTo(38, -52, 36, -40);
  ctx.stroke();
  glow(ctx, 30, -50, 22, '#ff5a14', 0.8);
  ctx.restore();
}

/** Davoth-Omega — the Seraph of the Eclipse: crowned, winged final sovereign of grief. */
function drawDavoth(ctx, b, t, F) {
  ctx.translate(0, -b.h * 0.5);
  const hover = Math.sin(t * 1.4) * 5;
  ctx.translate(0, hover);
  const fury = b.phase >= 3;
  const core = fury ? '#ff1e56' : b.phase === 2 ? '#ffaa2a' : '#ff3a3a';

  // Eclipse disc behind — black sun with a burning corona
  glow(ctx, 0, -40, 130, core, 0.35);
  ctx.fillStyle = '#050203';
  ctx.beginPath();
  ctx.arc(0, -40, 62, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(0, -40);
  ctx.rotate(t * (fury ? 1.4 : 0.5));
  ctx.strokeStyle = core;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, 64, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * TAU;
    const len = 72 + (i % 2) * 14 + Math.sin(t * 4 + i) * 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * 66, Math.sin(ang) * 66);
    ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Great tattered wings — feathered on one side, bone-and-membrane on the other
  const flap = Math.sin(t * 2.2) * 0.12;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.rotate(-0.3 - flap);
    for (let f = 0; f < 6; f++) {
      ctx.beginPath();
      const len = 110 - f * 12;
      const ang = -0.9 + f * 0.28;
      ctx.moveTo(18, -60);
      ctx.quadraticCurveTo(18 + Math.cos(ang) * len * 0.6, -60 + Math.sin(ang) * len * 0.5 - 20, 18 + Math.cos(ang) * len, -60 + Math.sin(ang) * len);
      ctx.lineTo(18 + Math.cos(ang + 0.16) * (len - 18), -60 + Math.sin(ang + 0.16) * (len - 18));
      ctx.closePath();
      ctx.fillStyle = side < 0
        ? grad(ctx, 18, -60, 18 + len, -60, [F('#3a1018'), F('#14060a')])
        : grad(ctx, 18, -60, 18 + len, -60, [F('#2a2a30'), F('#0e0c10')]);
      ctx.fill();
      ctx.strokeStyle = F(fury ? '#ff3a5a' : '#6a3a40');
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Robed body descending into smoke
  ctx.beginPath();
  ctx.moveTo(-26, -62);
  ctx.lineTo(26, -62);
  ctx.bezierCurveTo(34, -20, 30, 30, 22, 74);
  for (let i = 0; i <= 6; i++) ctx.lineTo(22 - i * 7.3, 74 + (i % 2) * 12 + Math.sin(t * 2.4 + i) * 4);
  ctx.bezierCurveTo(-30, 30, -34, -20, -26, -62);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -30, -62, 30, 80, [F('#4a0c1a'), F('#24060e'), F('#0a0204')]);
  ctx.fill();
  ctx.strokeStyle = F('#c9a24a');
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Pentagram sigil burning on the chest
  ctx.save();
  ctx.translate(0, -30);
  ctx.rotate(t * 0.6);
  ctx.strokeStyle = F(core);
  ctx.lineWidth = 1.8;
  glow(ctx, 0, 0, 34, core, 0.7);
  ctx.beginPath();
  for (let i = 0; i <= 5; i++) {
    const ang = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const px = Math.cos(ang) * 14;
    const py = Math.sin(ang) * 14;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();

  // Four arms — two in prayer, two outstretched with crimson fire
  const reach = b.laserActive > 0 || b.state === 'ultimate_windup' ? 1 : 0;
  const skin = F('#6a4a46');
  const r1 = limb(ctx, 24, -56, -1.2 - reach * 0.6 + Math.sin(t * 1.6) * 0.15, 28, 0.5, 26, 6, 5, 4, skin);
  const r2 = limb(ctx, -24, -56, 1.2 + reach * 0.6 - Math.sin(t * 1.6) * 0.15, 28, -0.5, 26, 6, 5, 4, F('#4a3230'));
  flame(ctx, r1.ex, r1.ey, 24, t, 1, '#ffe0e8', core);
  flame(ctx, r2.ex, r2.ey, 20, t, 2, '#ffe0e8', core);
  limb(ctx, 14, -50, 0.4, 18, 1.4, 14, 5, 4, 3.4, skin);
  limb(ctx, -14, -50, -0.4, 18, -1.4, 14, 5, 4, 3.4, skin);

  // Crowned goat-skull head with three eyes
  ctx.save();
  ctx.translate(0, -78);
  horn(ctx, -8, -8, -44, -18, -40, -56, 6, F);
  horn(ctx, 8, -8, 44, -18, 40, -56, 6, F);
  horn(ctx, -4, -10, -14, -30, -6, -44, 3, F);
  horn(ctx, 4, -10, 14, -30, 6, -44, 3, F);
  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.bezierCurveTo(-14, -22, 14, -22, 14, -8);
  ctx.lineTo(8, 18);
  ctx.lineTo(0, 26);
  ctx.lineTo(-8, 18);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -14, -22, 14, 26, [F('#e8dcc4'), F('#a89878'), F('#5a4c3a')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Golden eclipse crown
  ctx.fillStyle = F('#d8b050');
  ctx.beginPath();
  ctx.moveTo(-14, -14);
  for (let i = 0; i <= 6; i++) {
    ctx.lineTo(-14 + i * 4.66, -14 - (i % 2 ? 4 : 12));
  }
  ctx.lineTo(14, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#0a0204';
  ctx.beginPath();
  ctx.ellipse(-6, 0, 4, 3.4, 0.2, 0, TAU);
  ctx.ellipse(6, 0, 4, 3.4, -0.2, 0, TAU);
  ctx.fill();
  eye(ctx, -6, 0, 2.2, core, 1.4);
  eye(ctx, 6, 0, 2.2, core, 1.4);
  eye(ctx, 0, -9, 1.8, core, 1.6);
  ctx.restore();
}

const BOSS_RENDERERS = {
  1: [drawMalak, 154],
  2: [drawArachne, 120],
  3: [drawValkyrie, 128],
  4: [drawVex, 108],
  5: [drawDavoth, 174],
};

/**
 * Draws a stage boss figure. The context must be translated to the boss's feet (not flipped).
 */
export function drawBossFigure(ctx, b, time) {
  const [fn, baseH] = BOSS_RENDERERS[b.bossId] || BOSS_RENDERERS[1];
  const s = b.h / baseH;
  const F = b.hitFlash > 0 ? () => FLASH : (c) => c;
  ctx.save();
  ctx.scale(b.facing, 1);
  // Staggered / kneeling bosses sag toward the ground
  if (b.state === 'staggered' || b.state === 'kneeling' || b.finisherReady) {
    ctx.translate(0, b.h * 0.06);
    ctx.rotate(0.12);
  }
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  fn(ctx, b, time, F, s);
  ctx.restore();
}

/**
 * Death animation for a regular demon: it reels back and topples (flyers drop to the floor),
 * then burns away. `c` is a corpse record { e (frozen snapshot), t (seconds since death) }.
 */
export function drawDemonDeath(ctx, c, time) {
  const e = c.e;
  const t = c.t;
  const k = Math.min(1, t / 0.35);
  const fade = t < 0.45 ? 1 : Math.max(0, 1 - (t - 0.45) / 0.4);
  if (fade <= 0) return;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.globalAlpha = fade;
  ctx.scale(e.facing, 1);
  // Topple backwards around the feet and sink slightly into the floor
  ctx.rotate(-k * k * (e.flying ? 0.5 : 1.25));
  ctx.translate(-k * 6, k * e.h * 0.06);
  drawDemon(ctx, e, time, t < 0.08);
  // Burn-away: the body chars dark from the edges as it fades
  if (t > 0.3) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(20,6,4,${Math.min(0.85, (t - 0.3) * 2.2)})`;
    ctx.fillRect(-e.w * 2, -e.h * 2, e.w * 4, e.h * 3);
  }
  ctx.restore();
  // Rising ash embers
  if (t > 0.35) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 10; i++) {
      const p = ((t - 0.35) * 1.3 + i * 0.09) % 1;
      const ex = e.x + Math.sin(i * 7.7) * e.w * 0.5 + Math.sin(time * 3 + i) * 4;
      const ey = e.y - e.h * 0.3 - p * e.h * 0.9;
      ctx.globalAlpha = fade * (1 - p);
      ctx.fillStyle = i % 3 ? '#ff8a2a' : '#ffd36a';
      ctx.fillRect(ex, ey, 2.4, 2.4);
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Secret bosses (dungeon vault guardians)
// ---------------------------------------------------------------------------

/** The Bell-Ringer of Cinders — a hunched giant hauling a burning bronze bell. */
function drawBellRinger(ctx, e, t, F, a) {
  const moving = Math.abs(e.vx) > 8;
  const cyc = e.animPhase * 0.8;
  const bob = moving ? Math.abs(Math.cos(cyc)) * 3 : Math.sin(t * 1.5) * 1.5;
  const robe = F('#3a2618');
  const skin = F('#7a5a48');
  groundShadow(ctx, 70, 0.6);
  ctx.translate(0, -bob);
  // Legs
  for (const [ox, ph, col] of [[-16, cyc + Math.PI, F('#2a1a10')], [14, cyc, robe]]) {
    const k = limb(ctx, ox, -50, moving ? Math.sin(ph) * 0.35 : 0, 24, 0.2, 22, 11, 9, 8, col);
    ctx.fillStyle = F('#1a120c');
    ctx.fillRect(k.ex - 10, k.ey - 3, 22, 6);
  }
  // The great bell on its back, slung from a yoke
  const sway = Math.sin(t * 1.8) * 0.12 + (e.telegraphing ? Math.sin(t * 20) * 0.08 : 0);
  ctx.save();
  ctx.translate(-30, -132);
  ctx.rotate(sway);
  ctx.strokeStyle = F('#4a3a2a');
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-40, -10);
  ctx.lineTo(50, -18);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-26, -6);
  ctx.bezierCurveTo(-30, 30, -46, 60, -50, 82);
  ctx.lineTo(42, 82);
  ctx.bezierCurveTo(38, 60, 22, 30, 18, -6);
  ctx.quadraticCurveTo(-4, -18, -26, -6);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -50, -10, 42, 82, [F('#c89a48'), F('#8a5a22'), F('#3a2410')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Verdigris band
  ctx.strokeStyle = F('#4a7a5a');
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-40, 50);
  ctx.quadraticCurveTo(-4, 56, 34, 50);
  ctx.stroke();
  // Fire inside the bell mouth
  const heat = 0.7 + Math.sin(t * 6) * 0.2 + (e.telegraphing ? 0.6 : 0) + a;
  ctx.fillStyle = radial(ctx, -4, 84, 2, 46, F('#ffe08a'), F('#7a1a04'));
  ctx.beginPath();
  ctx.ellipse(-4, 82, 46, 10, 0, 0, TAU);
  ctx.fill();
  glow(ctx, -4, 82, 80, '#ff6a1a', heat * 0.6);
  for (let i = 0; i < 4; i++) flame(ctx, -30 + i * 18, 84, 18 + Math.sin(t * 5 + i) * 4, t, i);
  ctx.restore();
  // Hooded, hunched torso
  ctx.beginPath();
  ctx.moveTo(-34, -48);
  ctx.bezierCurveTo(-44, -90, -30, -126, 0, -132);
  ctx.bezierCurveTo(30, -128, 40, -100, 34, -60);
  ctx.lineTo(26, -42);
  ctx.lineTo(-28, -40);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -40, -130, 40, -40, [F('#5a3a24'), robe, F('#1a0f08')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Chains across the chest
  ctx.strokeStyle = F('#6d6158');
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.ellipse(-26 + i * 7.4, -112 + i * 7, 3.5, 2.4, 0.8, 0, TAU);
    ctx.stroke();
  }
  // Head: deep cowl with a single burning eye
  ctx.save();
  ctx.translate(20, -128);
  ctx.beginPath();
  ctx.moveTo(-18, 10);
  ctx.bezierCurveTo(-20, -16, 10, -26, 24, -6);
  ctx.lineTo(22, 16);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -18, -20, 24, 16, [F('#5a3a24'), F('#24160c')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = '#0a0503';
  ctx.beginPath();
  ctx.ellipse(10, 2, 10, 11, 0, 0, TAU);
  ctx.fill();
  eye(ctx, 12, -1, 2.6, e.telegraphing ? '#ffffff' : '#ffb02e', 1.5);
  ctx.restore();
  // Arm with a great bell-clapper maul
  const up = e.telegraphing ? 1 : 0;
  const armA = 0.6 - up * 2.4 + a * 2.4;
  const arm = limb(ctx, 24, -112, armA, 30, -0.5 + up * 0.3, 28, 10, 8, 7, skin);
  ctx.save();
  ctx.translate(arm.ex, arm.ey);
  ctx.rotate(armA - 0.4);
  ctx.fillStyle = F('#3a2a1a');
  ctx.fillRect(-3, -6, 6, 52);
  ctx.beginPath();
  ctx.ellipse(0, 54, 15, 18, 0, 0, TAU);
  ctx.fillStyle = grad(ctx, -15, 36, 15, 72, [F('#b89058'), F('#4a3018')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  if (a > 0 || up) glow(ctx, 0, 54, 34, '#ff8a2a', 0.8);
  ctx.restore();
}

/** The Gravemother — a vast pale brood-queen, candles burning in her flesh. */
function drawGravemother(ctx, e, t, F, a) {
  const pulse = Math.sin(t * 2.2) * 0.04;
  groundShadow(ctx, 95, 0.6);
  // Segmented abdomen stretching behind her
  for (let i = 5; i >= 0; i--) {
    const sx = -24 - i * 22;
    const sy = -26 - Math.sin(t * 2 + i * 0.7) * 3;
    const r = 28 - i * 2.4;
    ctx.beginPath();
    ctx.ellipse(sx, sy, r * (1 + pulse), r * 0.9, 0, 0, TAU);
    ctx.fillStyle = grad(ctx, sx, sy - r, sx, sy + r, [F('#e2d6c0'), F('#a8987a'), F('#5a4c3a')]);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    if (i % 2 === 0) {
      // Glowing egg-sacs
      ctx.fillStyle = radial(ctx, sx, sy + 6, 0, 9, F('#e0ff9a'), F('#4a8a2a'));
      ctx.beginPath();
      ctx.arc(sx, sy + 8, 7, 0, TAU);
      ctx.fill();
      glow(ctx, sx, sy + 8, 20, '#9cff5a', 0.5);
    } else {
      // Candles burning in the flesh
      ctx.fillStyle = F('#efe4c8');
      ctx.fillRect(sx - 2, sy - r - 10, 5, 12);
      flame(ctx, sx + 0.5, sy - r - 10, 12, t, i);
    }
  }
  // Stubby grub legs
  ctx.strokeStyle = F('#7a6a52');
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const lx = -10 - i * 22;
    ctx.beginPath();
    ctx.moveTo(lx, -8);
    ctx.lineTo(lx + Math.sin(t * 5 + i) * 4, 0);
    ctx.stroke();
  }
  // Withered upper body rearing up
  ctx.beginPath();
  ctx.moveTo(-6, -34);
  ctx.bezierCurveTo(-10, -70, 0, -100, 14, -106);
  ctx.bezierCurveTo(28, -100, 34, -70, 26, -34);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -10, -106, 30, -34, [F('#d8ccb4'), F('#9a8a70'), F('#5a4c3a')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.strokeStyle = F('#7a6a52');
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(12, -86 + i * 9, 9 - i, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
  // Four arms: two cradle candles, two reach out
  const reach = e.telegraphing ? 1 : 0;
  const armCol = F('#b8a888');
  for (const [sx, a1, a2, cand] of [[4, 2.2, -0.8, true], [24, -2.0 - reach * 0.6, 0.6, false], [6, 1.2, -1.1, false], [24, -1.3 - a * 0.8, 1.0, true]]) {
    const arm = limb(ctx, sx, -92, a1, 18, a2, 16, 3.4, 2.8, 2.2, armCol);
    if (cand) {
      ctx.fillStyle = F('#efe4c8');
      ctx.fillRect(arm.ex - 2, arm.ey - 10, 4, 10);
      flame(ctx, arm.ex, arm.ey - 10, 12, t, sx);
    } else {
      claws(ctx, arm.ex, arm.ey, -0.4, 7, F, 4);
    }
  }
  // Head: crown of finger-bones, wide weeping maw
  ctx.save();
  ctx.translate(16, -114);
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 15, 0, 0, TAU);
  ctx.fillStyle = F('#cfc2a8');
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = F('#e8dcc0');
  for (let i = 0; i < 7; i++) {
    const x = -12 + i * 4;
    ctx.beginPath();
    ctx.moveTo(x - 1.6, -12);
    ctx.lineTo(x, -24 - (i % 2) * 6);
    ctx.lineTo(x + 1.6, -12);
    ctx.fill();
  }
  ctx.fillStyle = '#140a06';
  ctx.beginPath();
  ctx.ellipse(3, 6, 7, 4 + a * 4 + reach * 2, 0, 0, TAU);
  ctx.fill();
  if (reach || a > 0) glow(ctx, 3, 6, 18, '#9cff5a', 0.9);
  eye(ctx, -3, -3, 1.6, '#c8ff7a');
  eye(ctx, 7, -3, 1.6, '#c8ff7a');
  ctx.restore();
}

/** The Pale Knight — a tall, silent frost-knight with a cracked greatsword. */
function drawPaleKnight(ctx, e, t, F, a) {
  const moving = Math.abs(e.vx) > 8;
  const cyc = e.animPhase * 1.5;
  const steel = F('#b8bcc8');
  const steelLit = F('#eef2fa');
  const steelDark = F('#5a5e6a');
  groundShadow(ctx, 40, 0.5);
  // Frost mist pooling at the feet
  ctx.save();
  ctx.globalAlpha *= 0.35;
  for (let i = 0; i < 5; i++) {
    const k = (t * 0.4 + i / 5) % 1;
    ctx.fillStyle = '#cfe8ff';
    ctx.beginPath();
    ctx.ellipse(-30 + i * 15 + k * 10, -4 - k * 8, 14 * (1 - k) + 4, 5, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // Tattered white cape
  ctx.beginPath();
  ctx.moveTo(-8, -110);
  ctx.bezierCurveTo(-30, -80, -34 + Math.sin(t * 2.4) * 6, -40, -40 + Math.sin(t * 2.4) * 8, -8);
  for (let i = 0; i < 4; i++) ctx.lineTo(-30 + i * 7, -14 + (i % 2) * 10);
  ctx.lineTo(-4, -60);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -40, -110, 0, 0, [F('#f4f6fa'), F('#9aa0ac')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Legs
  for (const [ox, ph, col] of [[-6, cyc + Math.PI, steelDark], [7, cyc, steel]]) {
    const k = limb(ctx, ox, -62, moving ? Math.sin(ph) * 0.5 : 0, 30, moving ? Math.max(0, -Math.cos(ph)) * 0.6 : 0.05, 30, 7, 5.5, 5, col);
    ctx.fillStyle = steelDark;
    ctx.fillRect(k.ex - 6, k.ey - 3, 15, 5);
  }
  // Fluted breastplate
  ctx.beginPath();
  ctx.moveTo(-14, -112);
  ctx.bezierCurveTo(-2, -120, 14, -120, 20, -110);
  ctx.lineTo(14, -64);
  ctx.lineTo(-12, -64);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -14, -120, 20, -64, [steelLit, steel, steelDark]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = steelDark;
  ctx.lineWidth = 1;
  for (const fx of [-4, 2, 8]) {
    ctx.beginPath();
    ctx.moveTo(fx, -112);
    ctx.lineTo(fx - 1, -68);
    ctx.stroke();
  }
  glow(ctx, 3, -94, 18, '#8fe6ff', 0.6);
  // Helm with a crown of icicles
  ctx.save();
  ctx.translate(4, -124);
  ctx.beginPath();
  ctx.moveTo(-9, 10);
  ctx.lineTo(-10, -6);
  ctx.quadraticCurveTo(0, -18, 11, -6);
  ctx.lineTo(10, 10);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -10, -16, 11, 10, [steelLit, steelDark]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = F('#dff6ff');
  for (let i = 0; i < 5; i++) {
    const x = -8 + i * 4.2;
    ctx.beginPath();
    ctx.moveTo(x - 1.4, -10);
    ctx.lineTo(x, -22 - (i === 2 ? 6 : 0));
    ctx.lineTo(x + 1.4, -10);
    ctx.fill();
  }
  ctx.fillStyle = '#0a0c12';
  ctx.fillRect(-6, -2, 15, 3);
  eye(ctx, 4, -0.5, 1.6, '#8fe6ff', e.telegraphing ? 2 : 1.2);
  ctx.restore();
  // Greatsword: held low, raised high on wind-up, sweeping on strike
  const up = e.telegraphing ? 1 : 0;
  const armA = 0.4 - up * 2.6 + a * 2.6;
  const arm = limb(ctx, 14, -108, armA, 22, -0.4, 20, 5, 4.4, 4, steel);
  ctx.save();
  ctx.translate(arm.ex, arm.ey);
  ctx.rotate(armA - 1.5 + up * 0.3);
  ctx.fillStyle = F('#3a3a44');
  ctx.fillRect(-14, -3, 18, 6);
  ctx.fillStyle = F('#c8b070');
  ctx.fillRect(2, -9, 4, 18);
  ctx.beginPath();
  ctx.moveTo(6, -5);
  ctx.lineTo(96, -3);
  ctx.lineTo(104, 0);
  ctx.lineTo(96, 3);
  ctx.lineTo(6, 5);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, 6, -5, 6, 5, [F('#ffffff'), F('#a8c8e0')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = F('#7fd0ff');
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, -1);
  ctx.lineTo(42, 1);
  ctx.lineTo(56, -1);
  ctx.stroke();
  if (a > 0) {
    ctx.strokeStyle = 'rgba(160,230,255,0.6)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 90, -0.8, 0.8);
    ctx.stroke();
  }
  ctx.restore();
}

/** The Hollow Cardinal — a floating masked prelate ringed by a halo of knives. */
function drawCardinal(ctx, e, t, F, a) {
  ctx.translate(0, -70 + Math.sin(t * 1.6) * 5);
  const spin = t * (e.telegraphing ? 3 : 0.8);
  // Halo of knives
  for (let i = 0; i < 12; i++) {
    const ang = spin + (i / 12) * TAU;
    ctx.save();
    ctx.translate(Math.cos(ang) * 58, -40 + Math.sin(ang) * 58);
    ctx.rotate(ang + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(3, 4);
    ctx.lineTo(-3, 4);
    ctx.closePath();
    ctx.fillStyle = F('#e8e0d0');
    ctx.fill();
    ctx.fillStyle = F('#8a1a1a');
    ctx.fillRect(-2, 4, 4, 6);
    ctx.restore();
  }
  glow(ctx, 0, -40, 70, '#ff3a3a', 0.25);
  // Robe dissolving into dripping blood
  ctx.beginPath();
  ctx.moveTo(-22, -44);
  ctx.lineTo(22, -44);
  ctx.bezierCurveTo(30, -10, 30, 30, 22, 60);
  for (let i = 0; i <= 6; i++) ctx.lineTo(22 - i * 7.3, 60 + (i % 2) * 14 + Math.sin(t * 3 + i) * 3);
  ctx.bezierCurveTo(-30, 30, -30, -10, -22, -44);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -30, -44, 30, 70, [F('#a01020'), F('#6a0a14'), F('#2a0408')]);
  ctx.fill();
  ctx.strokeStyle = F('#ffcc55');
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = F('#8a0a14');
  for (let i = 0; i < 4; i++) {
    const k = (t * 0.8 + i / 4) % 1;
    ctx.beginPath();
    ctx.ellipse(-16 + i * 10, 70 + k * 40, 2, 3.5, 0, 0, TAU);
    ctx.fill();
  }
  // Gold stole and cross
  ctx.fillStyle = F('#e0b050');
  ctx.fillRect(-4, -40, 8, 70);
  ctx.fillRect(-10, -26, 20, 5);
  // Hands in prayer, parting to cast
  const part = e.telegraphing ? 1 : a;
  limb(ctx, -14, -38, 0.9 + part * 1.2, 16, -1.6, 14, 4, 3.4, 3, F('#c8b090'));
  limb(ctx, 14, -38, -0.9 - part * 1.2, 16, 1.6, 14, 4, 3.4, 3, F('#d8c0a0'));
  if (part) glow(ctx, 0, -20, 30, '#ff4a4a', 0.9);
  // Mitre and porcelain mask
  ctx.save();
  ctx.translate(0, -58);
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.lineTo(-8, -36);
  ctx.lineTo(0, -44);
  ctx.lineTo(8, -36);
  ctx.lineTo(12, -2);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -12, -44, 12, 0, [F('#c01828'), F('#5a0810')]);
  ctx.fill();
  ctx.strokeStyle = F('#ffcc55');
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = F('#ffcc55');
  ctx.fillRect(-1.5, -34, 3, 22);
  ctx.fillRect(-6, -26, 12, 3);
  ctx.beginPath();
  ctx.ellipse(0, 8, 10, 12, 0, 0, TAU);
  ctx.fillStyle = grad(ctx, -10, -4, 10, 20, [F('#ffffff'), F('#c8c0b4')]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.strokeStyle = F('#c0101c');
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-4, 8);
  ctx.lineTo(-5, 18);
  ctx.moveTo(4, 8);
  ctx.lineTo(5, 18);
  ctx.stroke();
  ctx.fillStyle = '#0a0204';
  ctx.beginPath();
  ctx.ellipse(-4, 6, 2.4, 1.4, 0, 0, TAU);
  ctx.ellipse(4, 6, 2.4, 1.4, 0, 0, TAU);
  ctx.fill();
  eye(ctx, -4, 6, 1.2, '#ff3a3a');
  eye(ctx, 4, 6, 1.2, '#ff3a3a');
  ctx.restore();
}

/** The Eyeless Choir — a tower of fused, masked singers before a cathedral organ. */
function drawChoir(ctx, e, t, F, a) {
  groundShadow(ctx, 70, 0.6);
  // Organ pipes behind
  for (let i = -4; i <= 4; i++) {
    const h = 110 + (4 - Math.abs(i)) * 14;
    const x = i * 13;
    ctx.fillStyle = grad(ctx, x - 5, 0, x + 5, 0, [F('#5a4a30'), F('#c8a860'), F('#5a4a30')]);
    ctx.fillRect(x - 5, -h - 20, 10, h);
    ctx.fillStyle = '#120a04';
    ctx.fillRect(x - 3, -h - 4, 6, 4);
  }
  // Column of robed flesh
  ctx.beginPath();
  ctx.moveTo(-38, 0);
  ctx.bezierCurveTo(-34, -50, -30, -110, -18, -150);
  ctx.lineTo(18, -150);
  ctx.bezierCurveTo(30, -110, 34, -50, 38, 0);
  ctx.closePath();
  ctx.fillStyle = grad(ctx, -38, -150, 38, 0, [F('#3a2a40'), F('#22162a'), F('#0e0812')]);
  ctx.fill();
  ctx.strokeStyle = F('#b06aff');
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Five fused singing masks
  const faces = [[-16, -40, 11], [14, -58, 12], [-10, -88, 12], [12, -114, 11], [0, -144, 14]];
  faces.forEach(([fx, fy, r], i) => {
    const sing = 0.5 + Math.sin(t * 4 + i * 1.3) * 0.5 + (e.telegraphing ? 0.6 : 0);
    ctx.beginPath();
    ctx.ellipse(fx, fy, r, r * 1.2, 0, 0, TAU);
    ctx.fillStyle = grad(ctx, fx - r, fy - r, fx + r, fy + r, [F('#f4eee4'), F('#a8a094')]);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Sewn-shut eyes
    ctx.strokeStyle = '#2a1a1a';
    ctx.lineWidth = 1;
    for (const ex of [-r * 0.4, r * 0.4]) {
      ctx.beginPath();
      ctx.moveTo(fx + ex - 3, fy - r * 0.2);
      ctx.lineTo(fx + ex + 3, fy - r * 0.2);
      for (let s = -2; s <= 2; s += 2) {
        ctx.moveTo(fx + ex + s, fy - r * 0.2 - 1.5);
        ctx.lineTo(fx + ex + s, fy - r * 0.2 + 1.5);
      }
      ctx.stroke();
    }
    // Open singing mouth with violet light
    ctx.fillStyle = '#0a0410';
    ctx.beginPath();
    ctx.ellipse(fx, fy + r * 0.45, r * 0.3, r * 0.2 + sing * r * 0.25, 0, 0, TAU);
    ctx.fill();
    glow(ctx, fx, fy + r * 0.45, r * 1.6, '#b06aff', 0.35 + sing * 0.4 + a * 0.4);
  });
  // Candelabra at the base
  for (const cx of [-30, 30]) {
    ctx.fillStyle = F('#c8a860');
    ctx.fillRect(cx - 1.5, -26, 3, 26);
    for (const dx of [-6, 0, 6]) {
      ctx.fillStyle = F('#efe4c8');
      ctx.fillRect(cx + dx - 1.5, -34, 3, 8);
      flame(ctx, cx + dx, -34, 9, t, cx + dx);
    }
  }
}

DEMON_RENDERERS.bellringer = [drawBellRinger, 150];
DEMON_RENDERERS.gravemother = [drawGravemother, 120];
DEMON_RENDERERS.paleknight = [drawPaleKnight, 130];
DEMON_RENDERERS.cardinal = [drawCardinal, 140];
DEMON_RENDERERS.choir = [drawChoir, 150];

/** Lets other modules add art (e.g. Lyra's Shadow, which reuses Rika's own renderer). */
export function registerDemonRenderer(key, fn, baseH) {
  DEMON_RENDERERS[key] = [fn, baseH];
}

// ---------------------------------------------------------------------------
// Tinted stamping: draw a figure into a scratch canvas, tint it once, stamp it back.
// Much cheaper than ctx.filter, which Chrome applies separately to every draw call.
// ---------------------------------------------------------------------------

const stampCanvas = document.createElement('canvas');
const stampCtx = stampCanvas.getContext('2d');

/**
 * Draws `draw(ctx)` (feet at the origin) tinted toward `tint` by `alpha`.
 * `size` is the local-space box (feet sit 80% down it); alpha 1 gives a solid silhouette.
 */
export function drawStamped(ctx, size, draw, tint, alpha) {
  const m = ctx.getTransform();
  const k = Math.min(4, Math.max(0.5, Math.hypot(m.a, m.b)));
  const px = Math.min(1024, Math.ceil(size * k));
  if (stampCanvas.width < px) {
    stampCanvas.width = px;
    stampCanvas.height = px;
  }
  const s = stampCtx;
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.globalCompositeOperation = 'source-over';
  s.globalAlpha = 1;
  s.clearRect(0, 0, px, px);
  s.setTransform(px / size, 0, 0, px / size, px * 0.5, px * 0.8);
  draw(s);
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.globalCompositeOperation = 'source-atop';
  s.globalAlpha = alpha;
  s.fillStyle = tint;
  s.fillRect(0, 0, px, px);
  s.globalCompositeOperation = 'source-over';
  s.globalAlpha = 1;
  ctx.drawImage(stampCanvas, 0, 0, px, px, -size * 0.5, -size * 0.8, size, size);
}
