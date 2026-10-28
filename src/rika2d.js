/**
 * RIKA 2D — Ultimate Adventure Edition
 * Articulated Doom-Armor Cyber-Slayer with:
 * - 5 Switchable Weapons (Pulse Rifle, Super Shotgun, Railgun, Tesla Arc, BFG-Nova)
 * - Crucible Plasma Blade & Glory Kill Executions ([X])
 * - Magnetic Grapple / Meat-Hook Zip ([F])
 * - Wall-Slide & Wall-Jump Parkour
 * - Pilotable Halcyon Titan-Walker Mech Suit ([G])
 * - 4 Tactical Abilities (Phase Dash [Shift], Doom Cluster [Q], Hush Aegis [E], Red-Eye Laser [V/RMB])
 */
import { AMMO_TYPES } from './status.js';
import { baseStats, CLOAKS } from './items.js';

export class Rika2D {
  /** Total damage multiplier = shop upgrades x skills/items x Berserker Chip bonus */
  get damageMult() {
    const berserk = 1 + (this.stats?.berserk || 0) * (1 - this.hp / this.maxHp);
    return this.baseDmg * (this.stats?.dmg || 1) * berserk;
  }

  currentAmmo() {
    return AMMO_TYPES[this.ammoIdx];
  }

  cycleAmmo(onMsg) {
    this.ammoIdx = (this.ammoIdx + 1) % AMMO_TYPES.length;
    onMsg?.(`AMMO LOADED: ${AMMO_TYPES[this.ammoIdx].name} ROUNDS${AMMO_TYPES[this.ammoIdx].element ? ' — applies ' + AMMO_TYPES[this.ammoIdx].element.toUpperCase() : ''}`);
  }

  // Tip 18: Momentum Slide Under Low Hazards
  trySlide(keys, game) {
    if (!this.alive || !this.onGround || this.slideTimer > 0 || this.slideCd > 0 || this.inMech || this.dashTimer > 0) return;
    const dir = keys.KeyD || keys.ArrowRight ? 1 : keys.KeyA || keys.ArrowLeft ? -1 : this.facing;
    this.slideTimer = 0.44;
    this.slideCd = 0.85;
    this.slideDir = dir;
    this.slideHit.clear();
    this.crouching = true;
    this.invulnTimer = Math.max(this.invulnTimer, 0.44); // slips safely below projectiles and hazards
    this.sfx?.dash();
    game.spawnParticles(this.x, this.y - 4, 14, '#ffaa33', 220);
    game.spawnParticles(this.x - dir * 18, this.y - 2, 8, '#775533', 140);
  }

  triggerGravityWell(game, onMsg) {
    if (!this.alive || this.wellCd > 0) return;
    this.wellCd = this.wellMaxCd;
    game.spawnWell(game.mouseWorld.x, game.mouseWorld.y);
    onMsg?.('SINGULARITY WELL DEPLOYED — enemies dragged in, projectiles absorbed!');
  }

  constructor(x, y, sfx) {
    this.sfx = sfx;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.w = 42;
    this.h = 78;

    this.facing = 1;       // 1 = right, -1 = left
    this.aimAngle = 0;     // radians in world space
    this.onGround = false;
    this.wallSide = 0;     // -1 = touching left wall, 1 = touching right wall
    this.crouching = false;
    this.dropTimer = 0;    // pass through one-way platforms when pressing S/C
    this.jumpsLeft = 2;

    // Stats & Resources
    this.maxHp = 140;
    this.hp = 140;
    this.maxShield = 100;
    this.shield = 100;
    this.rage = 100;       // Red-Eye Overdrive energy (0..100)
    this.baseDmg = 1.0;    // Upgraded at Cyber-Armory

    // RPG progression, items & ammo
    this.stats = baseStats();
    this.skills = {};
    this.items = {};
    this.level = 1;
    this.xp = 0;
    this.skillPoints = 0;
    this.reviveCharges = 0;
    this.ammoIdx = 0;
    this.appliedHp = 0;
    this.appliedShield = 0;
    this.appliedMag = 0;

    // Slide & Singularity Well
    this.slideTimer = 0;
    this.slideCd = 0;
    this.slideDir = 1;
    this.slideHit = new Set();
    this.wellCd = 0;
    this.wellMaxCd = 11;
    this.standingPlat = null;
    this.alive = true;

    // Platforming Polish & Precision Feel (Category 2)
    this.coyoteTimer = 0;       // Tip 11: 130ms grace window after leaving ledges
    this.jumpBufferTimer = 0;   // Tip 12: 140ms pre-landing jump queue
    this.squashX = 1.0;         // Tip 20: Procedural squash & stretch
    this.squashY = 1.0;
    this.wasGrounded = true;
    this.prevFallVy = 0;
    this.dashGhostTimer = 0;    // Tip 16: Dash ghost snapshot interval

    // 5 Weapon Modes: 1=Pulse, 2=Shotgun, 3=Railgun, 4=Tesla Arc, 5=BFG-Nova
    this.weaponMode = 1;
    this.altFireCd = 0;
    this.magMax = 45;
    this.mag = 45;
    this.reloadTimer = 0;
    this.fireCd = 0;
    this.shotCounter = 0;
    this.recoil = 0;
    this.muzzleFlash = 0;
    this.stealthTimer = 0;

    // Tip 60 & 79: Cosmetic Cloak Skin & Verlet Cloth Cape
    this.capeSkin = 'crimson';
    this.capeNodes = [
      { x: 0, y: -30, oldX: 0, oldY: -30 },
      { x: -6, y: -16, oldX: -6, oldY: -16 },
      { x: -14, y: 0, oldX: -14, oldY: 0 },
      { x: -22, y: 16, oldX: -22, oldY: 16 },
    ];

    // Crucible Plasma Blade ([X])
    this.bladeCd = 0;
    this.bladeMaxCd = 0.42;
    this.bladeSwingTimer = 0;
    this.bladeCombo = 0;

    // Magnetic Grapple / Meat-Hook ([F])
    this.grappleCd = 0;
    this.grappleMaxCd = 1.8;
    this.grappleTarget = null; // { x, y, enemy }
    this.grappleTimer = 0;

    // Phase Dash ([Shift])
    this.dashCd = 0;
    this.dashMaxCd = 1.5;
    this.dashTimer = 0;
    this.dashVx = 0;
    this.dashVy = 0;
    this.dashHitSet = new Set();

    // Doom Cluster Bomb ([Q])
    this.grenadeCd = 0;
    this.grenadeMaxCd = 3.6;

    // Hush Aegis Reflect Dome ([E])
    this.aegisCd = 0;
    this.aegisMaxCd = 6.8;
    this.aegisTimer = 0;

    // Red-Eye Overdrive ([V / RMB])
    this.redEyeCd = 0;
    this.redEyeMaxCd = 8.5;
    this.redEyeTimer = 0;

    // Pilotable Halcyon Titan-Walker Mech State
    this.inMech = false;
    this.mechHp = 0;
    this.mechMaxHp = 320;
    this.mechRocketCd = 0;

    // Animation state
    this.walkPhase = 0;
    this.invulnTimer = 0;
    this.afterimages = [];

    // Cybernetic Augment Perks unlocked between stages
    this.perks = {
      vampiric: false,     // Heal on kill & Glory Kill bonus
      chainArc: false,     // Bullets arc lightning to nearby foes
      tripleJump: false,   // +1 mid-air thruster jump & faster dash
      twinDrone: false,    // Orbiting assault drone that auto-fires
      omegaBeam: false,    // +45% Red-Eye Laser, Railgun & BFG damage
    };
    this.droneAngle = 0;
    this.droneFireCd = 0;
  }

  healFullForNextStage(spawnX, spawnY) {
    this.x = spawnX;
    this.y = spawnY;
    this.vx = 0;
    this.vy = 0;
    this.hp = this.maxHp;
    this.shield = this.maxShield;
    this.rage = 100;
    this.mag = this.magMax;
    this.reloadTimer = 0;
    this.bladeCd = 0;
    this.grappleCd = 0;
    this.grappleTarget = null;
    this.grappleTimer = 0;
    this.dashCd = 0;
    this.grenadeCd = 0;
    this.aegisCd = 0;
    this.redEyeCd = 0;
    this.aegisTimer = 0;
    this.redEyeTimer = 0;
    this.inMech = false;
    this.slideTimer = 0;
    this.slideCd = 0;
    this.wellCd = 0;
    this.afterimages = [];
  }

  enterMech(game, onMsg) {
    this.inMech = true;
    this.mechMaxHp = 320;
    this.mechHp = 320;
    this.invulnTimer = 0.8;
    this.sfx?.bossRoar();
    game.addShake(12);
    game.spawnParticles(this.x, this.y - 50, 32, '#ffaa22', 280);
    onMsg?.('GOLEM ARMOR AWAKENED — Twin Ash-Cannons & Siege Fist Active!');
  }

  ejectMech(game, onMsg) {
    if (!this.inMech) return;
    this.inMech = false;
    this.vy = -720;
    this.invulnTimer = 1.2;
    this.sfx?.explode();
    game.addShake(20);
    game.spawnParticles(this.x, this.y - 60, 55, '#ff5511', 380);
    // Self-destruct blast damages nearby enemies
    for (const e of game.enemies) {
      if (!e.dead && Math.hypot(e.x - this.x, (e.y - e.h * 0.5) - (this.y - 50)) < 240) {
        game.damageEnemy(e, 180, e.x, e.y - e.h * 0.5, true);
      }
    }
    onMsg?.('GOLEM ARMOR SHATTERED — Its Core Erupts!');
  }

  switchWeapon(mode, onMsg) {
    if (this.weaponMode === mode) return;
    if (mode >= 6) {
      this.weaponMode = mode;
      this.sfx?.weaponSwitch?.();
      onMsg?.(this.expansionWeaponName?.(mode) || '');
      return;
    }
    this.weaponMode = mode;
    this.sfx?.weaponSwitch?.();
    const names = {
      1: '[1] REPEATER CROSSBOW · Alt: Cinder Grenade',
      2: "[2] HELL-SHOT BLUNDERBUSS · Alt: Dragon's Breath",
      3: '[3] RUNE LANCE · Alt: Piercing Beam',
      4: '[4] STORM-COIL · Alt: Thunder Cascade',
      5: '[5] ABYSS-ORB · Alt: Void Vortex',
    };
    onMsg?.(names[mode]);
  }

  // Tip 52: Alternate Fire Weapon Modes ([RMB] / [Z])
  triggerAltFire(game, onMsg) {
    if (!this.alive || this.altFireCd > 0) return;
    this.altFireCd = 1.1;
    const mode = this.weaponMode;
    if (mode >= 6) {
      game.expansion?.altFire(this, onMsg);
      return;
    }

    if (mode === 1) {
      this.sfx?.explode?.();
      game.grenades.push({
        x: this.x + Math.cos(this.aimAngle) * 26,
        y: this.y - 42 + Math.sin(this.aimAngle) * 26,
        vx: Math.cos(this.aimAngle) * 760,
        vy: Math.sin(this.aimAngle) * 760,
        radius: 8,
        dmg: 95 * this.damageMult,
        blastRadius: 155,
        cluster: true,
        life: 1.1,
      });
      onMsg?.('DAMASCUS ALT-FIRE: UNDER-BARREL CLUSTER GRENADE!');
    } else if (mode === 2) {
      this.sfx?.shootShotgun?.();
      for (let i = -4; i <= 4; i++) {
        const a = this.aimAngle + i * 0.08;
        game.spawnBullet({
          x: this.x + Math.cos(this.aimAngle) * 28,
          y: this.y - 42 + Math.sin(this.aimAngle) * 28,
          vx: Math.cos(a) * 880,
          vy: Math.sin(a) * 880,
          dmg: 18 * this.damageMult,
          color: '#ff4411',
          glow: '#ffaa00',
          radius: 5.5,
          fromPlayer: true,
        });
      }
      onMsg?.('HELLFIRE SPREADER: DRAGON-BREATH CONE!');
    } else if (mode === 3) {
      this.sfx?.shootRail?.();
      game.fireLaser(this.x, this.y - 42, this.aimAngle, 220 * this.damageMult);
      onMsg?.('RUNE LANCE: PIERCING BEAM!');
    } else if (mode === 4) {
      this.sfx?.teslaArc?.();
      this.fireTesla(game);
      onMsg?.('TESLA CANNON: OVERLOADED EMP CASCADE!');
    } else {
      this.sfx?.bfgShoot?.();
      game.bfgOrbs.push({
        x: this.x + Math.cos(this.aimAngle) * 32,
        y: this.y - 42 + Math.sin(this.aimAngle) * 32,
        vx: Math.cos(this.aimAngle) * 320,
        vy: Math.sin(this.aimAngle) * 320,
        radius: 24,
        dmg: 340 * this.damageMult,
        life: 3.5,
      });
      onMsg?.('ABYSS-ORB: VOID VORTEX!');
    }
  }

  reload(onMsg) {
    if (this.reloadTimer > 0 || this.mag >= this.magMax) return;
    this.reloadTimer = 0.78 * this.stats.reload;
    this.sfx?.reload();
    onMsg?.('Reloading Weapon Core...');
  }

  // Tip 12: Jump Input Buffering
  pressJump(game) {
    this.jumpBufferTimer = 0.14;
    this.tryJump(game);
  }

  // Tip 13: Variable Jump Height (releasing early cuts ascent in half)
  releaseJump() {
    if (this.vy < -200) {
      this.vy *= 0.52;
    }
  }

  tryJump(game) {
    if (!this.alive) return;
    const maxJumps = this.perks.tripleJump ? 3 : 2;

    // Tip 11: Ground Jump OR Coyote Time grace window (130ms)
    if (this.onGround || this.coyoteTimer > 0) {
      this.vy = this.inMech ? -590 : -670;
      this.onGround = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.jumpsLeft = maxJumps - 1;
      this.sfx?.jump(false);
      game.spawnParticles(this.x, this.y, 8, '#ff8844', 140);
      // Tip 20: Stretch on jump takeoff
      this.squashX = 0.88;
      this.squashY = 1.15;
    } else if (this.wallSide !== 0 && !this.inMech) {
      // Wall-Kick Parkour!
      this.vy = -640;
      this.vx = -this.wallSide * 490;
      this.jumpsLeft = maxJumps - 1;
      this.wallSide = 0;
      this.jumpBufferTimer = 0;
      this.sfx?.jump(true);
      game.spawnParticles(this.x, this.y - 40, 14, '#3af2ff', 220);
      this.squashX = 0.9;
      this.squashY = 1.14;
    } else if (this.jumpsLeft > 0) {
      this.vy = -620;
      this.jumpsLeft--;
      this.jumpBufferTimer = 0;
      this.sfx?.jump(true);
      game.spawnParticles(this.x - this.facing * 14, this.y - 44, 16, '#ff4422', 220);
      game.spawnParticles(this.x - this.facing * 14, this.y - 44, 8, '#3af2ff', 180);
      this.squashX = 0.92;
      this.squashY = 1.12;
    }
  }

  // Ability [X]: Crucible Plasma Blade & Glory Kill Finisher
  triggerCrucibleBlade(game, onMsg) {
    if (!this.alive || this.bladeCd > 0) return;
    this.bladeCd = this.bladeMaxCd;
    this.bladeSwingTimer = 0.24;
    this.bladeCombo = (this.bladeCombo + 1) % 3;
    this.sfx?.swordSlash();
    game.addShake(6);
    game.bladeBreak?.(this.x + Math.cos(this.aimAngle) * 52, (this.y - 44) + Math.sin(this.aimAngle) * 52, 120 + this.stats.bladeReach);

    const reach = 128 + this.stats.bladeReach;
    const cx = this.x + Math.cos(this.aimAngle) * 52;
    const cy = (this.y - 44) + Math.sin(this.aimAngle) * 52;

    // Deflect any enemy bullets inside the Crucible slash arc!
    let deflected = 0;
    let perfect = false;
    for (const b of game.bullets) {
      if (!b.fromPlayer && Math.hypot(b.x - cx, b.y - cy) < reach * 0.85) {
        if (Math.hypot(b.x - cx, b.y - cy) < reach * 0.5) perfect = true;
        b.fromPlayer = true;
        b.reflected = true;
        b.vx = Math.cos(this.aimAngle) * 1150;
        b.vy = Math.sin(this.aimAngle) * 1150;
        b.dmg = Math.round(b.dmg * (b.parryable ? 4.5 : 3.0));
        b.color = b.parryable ? '#ffdd44' : '#ff1e56';
        b.glow = '#ffffff';
        b.life = 2.0;

        // Tip 28: Golden Parryable projectiles home directly back at their demonic creator!
        if (b.parryable && b.shooter && !b.shooter.dead) {
          const hx = b.shooter.x - b.x;
          const hy = (b.shooter.y - b.shooter.h * 0.5) - b.y;
          const hlen = Math.hypot(hx, hy) || 1;
          b.vx = (hx / hlen) * 1350;
          b.vy = (hy / hlen) * 1350;
        }
        deflected++;
      }
    }
    if (deflected > 0) {
      this.sfx?.reflect();
      onMsg?.(`CRUCIBLE PARRY — Deflected ${deflected} projectile(s)!`);
      if (perfect) game.onPerfectParry(this.x, this.y - 44);
    }

    // Check enemies in slash range + Glory Kill staggered foes!
    const baseDmg = Math.round(85 * this.damageMult * this.stats.bladeDmg);
    let executed = false;
    for (const e of game.enemies) {
      if (e.dead) continue;
      const dist = Math.hypot(e.x - cx, (e.y - e.h * 0.5) - cy);
      if (dist < reach + e.w * 0.45) {
        // Tip 40: Boss Cinematic Finisher Execution when Boss is in Kneeling Stance
        if (e.isBoss && e.finisherReady) {
          executed = true;
          e.finisherReady = false;
          e.finisherExecuted = true;
          this.x = e.x - this.facing * 34;
          this.invulnTimer = Math.max(this.invulnTimer, 2.2);
          game.timeDilation = 0.28;
          game.cameraZoom = 1.35;
          game.addShake(36);
          game.sfx?.gloryKill?.();
          game.sfx?.bossPhaseShift?.();
          game.spawnParticles(e.x, e.y - e.h * 0.5, 90, '#ffd700', 500);
          game.spawnBloodDecalCluster?.(e.x, e.y - 12, 16, '#700c16');
          onMsg?.(`★ APOCALYPTIC SEAL SHATTERED — ${e.name} HAS FALLEN! ★`);
          game.damageEnemy(e, 999999, e.x, e.y - e.h * 0.5, true);
          return;
        }

        // Tip 33: Bonus posture punish on staggered boss
        if (e.isBoss && e.staggerTimer > 0) {
          game.damageEnemy(e, baseDmg * 2.5, e.x, e.y - e.h * 0.5, true);
          game.spawnParticles(e.x, e.y - e.h * 0.5, 30, '#ffd700', 360);
          game.addShake(18);
          onMsg?.('★ CRUCIBLE POSTURE PUNISH — 2.5x CRIT! ★');
          continue;
        }

        const hpPct = e.hp / e.maxHp;
        // GLORY KILL if non-boss enemy is below 38% HP or if slash kills them!
        if (!e.isBoss && (hpPct <= (e.execAt ?? 0.38) || e.hp <= baseDmg * 1.35)) {
          executed = true;
          this.x = e.x - this.facing * 28;
          this.invulnTimer = Math.max(this.invulnTimer, 0.55);
          game.damageEnemy(e, e.hp + 999, e.x, e.y - e.h * 0.5, true);
          game.triggerGloryKillJuice(e.x, e.y - e.h * 0.5);
          this.hp = Math.min(this.maxHp, this.hp + 28 + this.stats.gloryHeal);
          this.shield = Math.min(this.maxShield, this.shield + 30);
          this.mag = Math.min(this.magMax, this.mag + 12);
          onMsg?.('★ GLORY KILL EXECUTION — +28 HP, +30 SHIELD & SHARDS! ★');
        } else {
          game.damageEnemy(e, baseDmg, e.x, e.y - e.h * 0.5, true);
          game.spawnParticles(e.x, e.y - e.h * 0.5, 18, '#ff1e56', 280);
          if (this.stats.bladeHeal > 0) this.hp = Math.min(this.maxHp, this.hp + this.stats.bladeHeal);
        }
      }
    }
    if (executed) this.sfx?.gloryKill();
  }

  // Ability [F]: Magnetic Grapple / DOOM Meat-Hook
  triggerGrapple(game, onMsg) {
    if (!this.alive || this.grappleCd > 0) return;

    // Find best Grapple Anchor or Enemy near cursor / aim direction
    let bestTarget = null;
    let bestScore = 560;

    if (game.stage?.grapplePoints) {
      for (const gp of game.stage.grapplePoints) {
        const dMouse = Math.hypot(gp.x - game.mouseWorld.x, gp.y - game.mouseWorld.y);
        const dRika = Math.hypot(gp.x - this.x, gp.y - (this.y - 44));
        if (dRika < 620 && dRika > 60 && dMouse < bestScore) {
          bestScore = dMouse;
          bestTarget = { x: gp.x, y: gp.y, enemy: null };
        }
      }
    }

    for (const e of game.enemies) {
      if (e.dead) continue;
      const ex = e.x;
      const ey = e.y - e.h * 0.5;
      const dMouse = Math.hypot(ex - game.mouseWorld.x, ey - game.mouseWorld.y);
      const dRika = Math.hypot(ex - this.x, ey - (this.y - 44));
      if (dRika < 580 && dRika > 55 && dMouse < bestScore) {
        bestScore = dMouse;
        bestTarget = { x: ex, y: ey, enemy: e };
      }
    }

    if (!bestTarget) {
      // Fallback: grapple-launch toward aim angle!
      bestTarget = {
        x: this.x + Math.cos(this.aimAngle) * 340,
        y: Math.max(120, Math.min(game.stage.groundY - 20, (this.y - 44) + Math.sin(this.aimAngle) * 340)),
        enemy: null,
      };
    }

    this.grappleCd = this.grappleMaxCd;
    this.grappleTarget = bestTarget;
    this.grappleTimer = 0.34;
    this.invulnTimer = Math.max(this.invulnTimer, 0.42);
    this.jumpsLeft = this.perks.tripleJump ? 3 : 2;
    this.sfx?.grapple();

    // Tip 54: Shadow Grapple Mutation
    if (this.stats.shadowGrapple) {
      this.stealthTimer = 2.0;
      game.floatingTexts.push({ x: this.x, y: this.y - 48, text: 'SHADOW CLOAK (+40% CRIT)', color: '#3af2ff', life: 1.1 });
    }

    onMsg?.(bestTarget.enemy ? 'MEAT-HOOK LOCKED — ZIPPING TO TARGET!' : 'MAGNETIC GRAPPLE ENGAGED!');
  }

  // Ability [Shift]: Phase Dash
  triggerDash(keys, game, onMsg) {
    if (!this.alive || this.dashCd > 0) return;
    const cd = this.perks.tripleJump ? this.dashMaxCd * 0.65 : this.dashMaxCd;
    this.dashCd = cd;
    this.dashTimer = 0.22;
    this.invulnTimer = Math.max(this.invulnTimer, 0.34);
    this.dashHitSet.clear();
    if (this.stats.storm) game.stormBurst(this.x, this.y - 40, this.stats.storm);

    // Tip 54: Flame Dash Mutation
    if (this.stats.flameDash) {
      for (let s = -2; s <= 2; s++) {
        game.spawnParticles(this.x + s * 18, this.y - 10, 8, '#ff5500', 160);
      }
      game.spawnBloodDecalCluster?.(this.x, this.y - 8, 4, '#ff3300');
    }

    let dx = 0;
    let dy = 0;
    if (keys.KeyD || keys.ArrowRight) dx = 1;
    else if (keys.KeyA || keys.ArrowLeft) dx = -1;
    if (keys.KeyW || keys.ArrowUp) dy = -0.45;
    else if (keys.KeyS || keys.ArrowDown) dy = 0.45;
    if (dx === 0 && dy === 0) dx = Math.cos(this.aimAngle) >= 0 ? 1 : -1;

    const len = Math.hypot(dx, dy) || 1;
    this.dashVx = (dx / len) * 1200;
    this.dashVy = (dy / len) * 680;
    this.sfx?.dash();
    game.addShake(6);
    game.spawnParticles(this.x, this.y - 38, 18, '#ff2a2a', 260);
    onMsg?.('PHASE DASH — Invulnerable Kinetic Slice!');
  }

  // Ability [Q]: Doom Cluster Bomb
  triggerClusterBomb(game, onMsg) {
    if (!this.alive || this.grenadeCd > 0) return;
    this.grenadeCd = this.grenadeMaxCd;
    const muzzleX = this.x + Math.cos(this.aimAngle) * 34;
    const muzzleY = this.y - 46 + Math.sin(this.aimAngle) * 34;
    game.spawnGrenade({
      x: muzzleX,
      y: muzzleY,
      vx: Math.cos(this.aimAngle) * 780 + this.vx * 0.25,
      vy: Math.sin(this.aimAngle) * 780 - 160,
      radius: 10,
      dmg: Math.round(105 * this.damageMult),
      blastRadius: 175,
      cluster: true,
    });
    this.sfx?.shootShotgun();
    onMsg?.('CINDER FLASK THROWN!');
  }

  // Ability [E]: Hush Aegis Reflect Dome
  triggerAegis(game, onMsg) {
    if (!this.alive || this.aegisCd > 0) return;
    this.aegisCd = this.aegisMaxCd;
    this.aegisTimer = 3.8;
    this.shield = Math.min(this.maxShield, this.shield + 40);
    this.sfx?.shield();
    game.spawnParticles(this.x, this.y - 40, 22, '#3af2ff', 220);
    onMsg?.('HUSH AEGIS ONLINE — Reflecting hostile projectiles at 250% power!');
  }

  // Ability [V / RMB]: Red-Eye Overdrive (Bullet-Time + Orbital Eye Beam)
  triggerRedEye(game, onMsg) {
    if (!this.alive || this.redEyeTimer > 0) return;
    if (this.redEyeCd > 0 && this.rage < 50) {
      onMsg?.('Red-Eye Overdrive recharging...');
      return;
    }
    this.redEyeCd = this.redEyeMaxCd;
    this.redEyeTimer = 4.8;
    this.rage = 100;
    this.sfx?.redEye();
    game.addShake(10);
    game.spawnParticles(this.x + this.facing * 8, this.y - 66, 28, '#ff1122', 320);
    onMsg?.('RED-EYE OVERDRIVE ACTIVATED — Time Slowed & Bionic Eye Beam Unleashed!');
  }

  fire(game, onMsg) {
    if (!this.alive || this.fireCd > 0 || this.reloadTimer > 0) return;

    // Special Pilotable Titan-Walker Mech Weapons!
    if (this.inMech) {
      this.fireCd = 0.085;
      this.recoil = 8;
      this.muzzleFlash = 0.06;
      const bx = this.x + Math.cos(this.aimAngle) * 56;
      const by = (this.y - 72) + Math.sin(this.aimAngle) * 56;
      for (const offset of [-8, 8]) {
        const ang = this.aimAngle + (Math.random() - 0.5) * 0.06;
        game.spawnBullet({
          x: bx,
          y: by + offset,
          vx: Math.cos(ang) * 1320,
          vy: Math.sin(ang) * 1320,
          dmg: Math.round(28 * this.damageMult),
          color: '#ffdd44',
          glow: '#ff5500',
          radius: 6.5,
          fromPlayer: true,
          chain: this.perks.chainArc,
        });
      }
      this.sfx?.shootPulse();
      game.addShake(3.2);
      if (this.mechRocketCd <= 0) {
        this.mechRocketCd = 0.95;
        game.spawnHomingMissile(this.x, this.y - 105, this.aimAngle, Math.round(75 * this.damageMult));
      }
      return;
    }

    if (this.weaponMode >= 6) {
      game.expansion?.fireWeapon(this, onMsg);
      return;
    }

    const costs = { 1: 1, 2: 2, 3: 3, 4: 1, 5: 8 };
    const cost = costs[this.weaponMode] || 1;
    if (this.mag < cost) {
      this.reload(onMsg);
      return;
    }
    this.mag -= cost;
    if (this.mag <= 0) {
      setTimeout(() => this.reload(onMsg), 120);
    }

    const critMult = (this.redEyeTimer > 0 ? 1.5 : 1.0)
      * (this.perks.omegaBeam ? 1.35 : 1.0)
      * this.damageMult
      * (game.getComboDamageMult ? game.getComboDamageMult() : 1.0);

    const barrelX = this.x + Math.cos(this.aimAngle) * 40;
    const barrelY = (this.y - (this.crouching ? 30 : 46)) + Math.sin(this.aimAngle) * 40;

    this.recoil = 10;
    this.muzzleFlash = 0.07;
    this.shotCounter++;

    // Eject brass casing
    game.spawnShell(
      this.x + Math.cos(this.aimAngle) * 16,
      this.y - 46 + Math.sin(this.aimAngle) * 16,
      -this.facing * (90 + Math.random() * 80),
      -180 - Math.random() * 90
    );

    if (this.weaponMode === 1) {
      // Mode 1: Heavy Pulse Rifle + Every 5th shot launches a Homing Micro-Missile!
      this.fireCd = this.redEyeTimer > 0 ? 0.07 : 0.095;
      const spread = (Math.random() - 0.5) * 0.045;
      const ang = this.aimAngle + spread;
      game.spawnBullet({
        x: barrelX,
        y: barrelY,
        vx: Math.cos(ang) * 1280,
        vy: Math.sin(ang) * 1280,
        dmg: Math.round(24 * critMult),
        color: '#ffaa22',
        glow: '#ff4411',
        radius: 5,
        fromPlayer: true,
        chain: this.perks.chainArc,
      });
      if (this.shotCounter % 5 === 0) {
        game.spawnHomingMissile(barrelX, barrelY - 8, this.aimAngle - 0.18 * this.facing, Math.round(46 * critMult));
      }
      this.sfx?.shootPulse();
      // Tip 9: Rifle micro-recoil impulse
      this.vx += -Math.cos(this.aimAngle) * 44;
      game.addShake(2.4, -Math.cos(this.aimAngle), -Math.sin(this.aimAngle));
    } else if (this.weaponMode === 2) {
      // Mode 2: Hellfire Super Shotgun (7 pellets)
      this.fireCd = 0.38;
      for (let i = -3; i <= 3; i++) {
        const ang = this.aimAngle + i * 0.055 + (Math.random() - 0.5) * 0.025;
        const spd = 1120 + Math.random() * 160;
        game.spawnBullet({
          x: barrelX,
          y: barrelY,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          dmg: Math.round(18 * critMult),
          color: '#ff5522',
          glow: '#ff1100',
          radius: 5.5,
          life: 0.45,
          fromPlayer: true,
          chain: this.perks.chainArc,
        });
      }
      this.sfx?.shootShotgun();
      // Tip 9: Massive Shotgun kickback (airborne recoil allows shotgun jumping!)
      this.vx += -Math.cos(this.aimAngle) * 165;
      if (!this.onGround) this.vy += -Math.sin(this.aimAngle) * 110;
      game.addShake(7.2, -Math.cos(this.aimAngle), -Math.sin(this.aimAngle));
    } else if (this.weaponMode === 3) {
      // Mode 3: Hyper-Velocity Plasma Railgun
      this.fireCd = 0.52;
      game.fireRailBeam(barrelX, barrelY, this.aimAngle, Math.round(98 * critMult));
      this.sfx?.shootRail();
      // Tip 9: Heavy plasma railgun kickback
      this.vx += -Math.cos(this.aimAngle) * 125;
      if (!this.onGround) this.vy += -Math.sin(this.aimAngle) * 65;
      game.addShake(8.8, -Math.cos(this.aimAngle), -Math.sin(this.aimAngle));
    } else if (this.weaponMode === 4) {
      // Mode 4: Tesla Chain-Arc Thrower (Branches lightning across up to 5 enemies!)
      this.fireCd = 0.11;
      game.fireTeslaChain(barrelX, barrelY, this.aimAngle, Math.round(30 * critMult));
      this.sfx?.teslaArc();
      this.vx += -Math.cos(this.aimAngle) * 32;
      game.addShake(2.5, -Math.cos(this.aimAngle), -Math.sin(this.aimAngle));
    } else if (this.weaponMode === 5) {
      // Mode 5: BFG-9000 Singularity Nova Orb!
      this.fireCd = 0.85;
      game.spawnBFGOrb({
        x: barrelX,
        y: barrelY,
        vx: Math.cos(this.aimAngle) * 440,
        vy: Math.sin(this.aimAngle) * 440,
        dmg: Math.round(210 * critMult),
        tendrilDps: Math.round(165 * critMult),
      });
      this.sfx?.bfgShoot();
      // Tip 9: Extreme Singularity artillery kickback
      this.vx += -Math.cos(this.aimAngle) * 230;
      if (!this.onGround) this.vy += -Math.sin(this.aimAngle) * 140;
      game.addShake(15, -Math.cos(this.aimAngle), -Math.sin(this.aimAngle));
      onMsg?.('ABYSS-ORB UNLEASHED!');
    }
    this.fireCd /= this.stats.rof;
  }

  takeDamage(amount, game) {
    if (!this.alive || this.invulnTimer > 0 || this.dashTimer > 0 || this.grappleTimer > 0) return;
    if (this.aegisTimer > 0) {
      amount *= 0.15;
    }
    amount *= game.diffDmg || 1;
    if (this.stats.thorns > 0) game.thornsBurst(this.x, this.y - 40, this.stats.thorns);

    // If piloting the Halcyon Titan-Walker Mech, the Mech's armor absorbs all damage first!
    if (this.inMech) {
      this.mechHp -= amount;
      this.invulnTimer = 0.28;
      this.sfx?.hurt();
      game.addShake(8);
      game.spawnParticles(this.x, this.y - 65, 12, '#ffaa22', 220);
      if (this.mechHp <= 0) {
        this.ejectMech(game, (m) => game.setMsg(m));
      }
      return;
    }

    this.invulnTimer = 0.45;
    if (this.shield > 0) {
      const absorb = Math.min(this.shield, amount * 0.75);
      this.shield -= absorb;
      amount -= absorb;
    }
    this.hp = Math.max(0, this.hp - amount);
    this.sfx?.hurt();
    game.addShake(9);
    game.spawnParticles(this.x, this.y - 40, 14, '#ff1122', 220);

    if (this.hp <= 0 && this.reviveCharges > 0) {
      this.reviveCharges--;
      this.items.phoenix = Math.max(0, (this.items.phoenix || 1) - 1);
      this.hp = this.maxHp * 0.6;
      this.shield = this.maxShield;
      this.invulnTimer = 2;
      game.phoenixRevive(this.x, this.y - 40);
      return;
    }
    if (this.hp <= 0) {
      this.alive = false;
      game.onPlayerDeath('Rika was overwhelmed by the demons of the catacombs.');
    }
  }

  update(dt, keys, mouseWorld, game, onMsg) {
    if (!this.alive) return;

    // Cooldowns & timers
    const cdt = dt * this.stats.cdr;
    this.fireCd = Math.max(0, this.fireCd - dt);
    this.bladeCd = Math.max(0, this.bladeCd - cdt);
    this.bladeSwingTimer = Math.max(0, this.bladeSwingTimer - dt);
    this.grappleCd = Math.max(0, this.grappleCd - cdt);
    this.dashCd = Math.max(0, this.dashCd - cdt);
    this.grenadeCd = Math.max(0, this.grenadeCd - cdt);
    this.aegisCd = Math.max(0, this.aegisCd - cdt);
    this.redEyeCd = Math.max(0, this.redEyeCd - cdt);
    this.wellCd = Math.max(0, this.wellCd - cdt);
    this.slideCd = Math.max(0, this.slideCd - dt);
    this.aegisTimer = Math.max(0, this.aegisTimer - dt);
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.dropTimer = Math.max(0, this.dropTimer - dt);
    this.mechRocketCd = Math.max(0, this.mechRocketCd - dt);
    this.recoil = Math.max(0, this.recoil - dt * 45);
    this.muzzleFlash = Math.max(0, this.muzzleFlash - dt);

    if (this.redEyeTimer > 0) {
      this.redEyeTimer = Math.max(0, this.redEyeTimer - dt);
      this.rage = (this.redEyeTimer / 4.8) * 100;
      const eyeX = this.x + this.facing * 8;
      const eyeY = this.y - (this.crouching ? 50 : 66);
      game.updateRedEyeLaser(eyeX, eyeY, this.aimAngle, dt * (this.perks.omegaBeam ? 210 : 145) * this.damageMult);
    } else {
      this.rage = Math.min(100, this.rage + dt * 12);
    }

    // Passive shield recharge
    this.shield = Math.min(this.maxShield, this.shield + dt * 6.5);

    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloadTimer = 0;
        this.mag = this.magMax;
        onMsg?.(`Weapon Core Reloaded (${this.mag}/${this.magMax})`);
      }
    }

    // Aim angle toward mouse cursor
    const shoulderY = this.y - (this.inMech ? 74 : this.crouching ? 32 : 48);
    this.aimAngle = Math.atan2(mouseWorld.y - shoulderY, mouseWorld.x - this.x);
    this.facing = Math.cos(this.aimAngle) >= 0 ? 1 : -1;

    // Movement, Grapple Zip, & Phase Dash
    this.crouching = !this.inMech && !!(keys.KeyS || keys.KeyC || keys.ArrowDown) && this.onGround;
    if ((keys.KeyS || keys.KeyC || keys.ArrowDown) && keys.Space) {
      this.dropTimer = 0.25;
    }

    if (this.grappleTimer > 0 && this.grappleTarget) {
      this.grappleTimer -= dt;
      if (this.grappleTarget.enemy && !this.grappleTarget.enemy.dead) {
        this.grappleTarget.x = this.grappleTarget.enemy.x;
        this.grappleTarget.y = this.grappleTarget.enemy.y - this.grappleTarget.enemy.h * 0.5;
      }
      const gdx = this.grappleTarget.x - this.x;
      const gdy = this.grappleTarget.y - (this.y - 40);
      const dist = Math.hypot(gdx, gdy);
      if (dist < 48 || this.grappleTimer <= 0) {
        this.grappleTimer = 0;
        // Tip 19: Grapple Slingshot Momentum Conservation
        const slingshotDirX = Math.sign(gdx) || this.facing;
        this.vx = slingshotDirX * 780;
        this.vy = -620; // energetic forward launch vault
        this.jumpsLeft = this.perks.tripleJump ? 3 : 2;
        this.sfx?.jump(true);
        game.spawnParticles(this.x, this.y - 30, 16, '#ffaa44', 240);
        if (this.grappleTarget.enemy && !this.grappleTarget.enemy.dead) {
          // Meat-Hook Explosive Impact Slam!
          game.damageEnemy(this.grappleTarget.enemy, Math.round(95 * this.damageMult), this.x, this.y - 40, true);
          game.spawnParticles(this.x, this.y - 40, 22, '#ff5522', 280);
          game.addShake(8, slingshotDirX, -0.5);
        }
        this.grappleTarget = null;
      } else {
        this.vx = (gdx / dist) * 1350;
        this.vy = (gdy / dist) * 1350;
        this.afterimages.push({ x: this.x, y: this.y, facing: this.facing, aim: this.aimAngle, alpha: 0.65 });
      }
    } else if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.vx = this.dashVx;
      this.vy = this.dashVy;
      // Tip 16: Dash Ghost Trails every 30ms
      this.dashGhostTimer -= dt;
      if (this.dashGhostTimer <= 0) {
        this.dashGhostTimer = 0.032;
        this.afterimages.push({
          x: this.x,
          y: this.y,
          facing: this.facing,
          aim: this.aimAngle,
          alpha: 0.85,
          color: this.afterimages.length % 2 === 0 ? '#ff2255' : '#ffd24a',
        });
      }
      for (const e of game.enemies) {
        if (!e.dead && !this.dashHitSet.has(e)) {
          if (Math.abs(e.x - this.x) < e.w * 0.6 + 38 && Math.abs((e.y - e.h * 0.5) - (this.y - 40)) < e.h * 0.6 + 38) {
            this.dashHitSet.add(e);
            game.damageEnemy(e, Math.round(75 * this.damageMult), this.x, this.y - 40, true);
            game.spawnParticles(e.x, e.y - e.h * 0.5, 14, '#3af2ff', 240);
          }
        }
      }
    } else {
      // Tip 10: Momentum multiplier bonus to movement speed while maintaining combo
      const comboSpeedMult = 1 + (game?.comboCount >= 20 ? 0.28 : game?.comboCount >= 10 ? 0.18 : game?.comboCount >= 4 ? 0.10 : 0);
      const moveSpeed = (this.inMech ? 330 : this.crouching ? 220 : 415) * this.stats.move * comboSpeedMult * (this.speedBuff || 1);
      let moveDir = 0;
      if (keys.KeyA || keys.ArrowLeft) moveDir -= 1;
      if (keys.KeyD || keys.ArrowRight) moveDir += 1;

      this.vx = moveDir * moveSpeed;
      if (this.slideTimer > 0) {
        this.slideTimer -= dt;
        this.vx = this.slideDir * 650 * this.stats.move;
        this.crouching = true;
        for (const e of game.enemies) {
          if (!e.dead && !this.slideHit.has(e) && Math.abs(e.x - this.x) < e.w * 0.5 + 30 && Math.abs((e.y - e.h * 0.5) - (this.y - 30)) < e.h * 0.6 + 20) {
            this.slideHit.add(e);
            game.damageEnemy(e, Math.round(42 * this.damageMult), e.x, e.y - e.h * 0.5, true);
            game.applyStatusTo(e, 'stun', 0.7);
          }
        }
        if (Math.random() < 0.5) game.spawnParticles(this.x - this.slideDir * 14, this.y - 4, 1, '#ffaa33', 120);
      }

      // Tip 14: Apex Gravity Float (reduces gravity by 38% near jump peak for agile aiming/air control)
      const isApex = !this.onGround && Math.abs(this.vy) < 130;
      const grav = isApex ? 980 : 1580;
      this.vy += grav * dt;

      // Tip 17: Wall-slide friction & sparks when pressing into a wall mid-air
      const pressingWall = (this.wallSide === 1 && (keys.KeyD || keys.ArrowRight)) || (this.wallSide === -1 && (keys.KeyA || keys.ArrowLeft));
      if (this.wallSide !== 0 && !this.onGround && this.vy > 120 && pressingWall) {
        this.vy = Math.min(this.vy, 135); // 65% fall speed reduction
        if (Math.random() < 0.65) {
          game.spawnParticles(this.x + this.wallSide * 18, this.y - 14, 2, '#ffdd44', 160);
          game.spawnParticles(this.x + this.wallSide * 16, this.y - 12, 1, '#ff6622', 120);
        }
      }
      if (this.vy > 1100) this.vy = 1100;

      if (moveDir !== 0 && this.onGround) {
        this.walkPhase += dt * (this.crouching ? 8 : 14) * moveDir * this.facing;
      } else if (!this.onGround) {
        this.walkPhase += dt * 4;
      } else {
        this.walkPhase *= 0.85;
      }
    }

    // Apply horizontal & vertical physics against stage platforms, walls & bounds
    const prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.onGround = false;
    this.wallSide = 0;
    this.standingPlat = null;
    const stage = game.stage;
    if (stage) {
      if (this.x <= 42) {
        this.x = 42;
        if (!this.onGround) this.wallSide = -1;
      } else if (this.x >= stage.width - 42) {
        this.x = stage.width - 42;
        if (!this.onGround) this.wallSide = 1;
      }

      // Check solid walls / pillars for wall-jumping
      if (stage.walls) {
        for (const w of stage.walls) {
          if (this.y > w.y && this.y - 70 < w.y + w.h) {
            if (this.vx > 0 && this.x + 18 > w.x && this.x < w.x + 12) {
              this.x = w.x - 18;
              this.wallSide = 1;
            } else if (this.vx < 0 && this.x - 18 < w.x + w.w && this.x > w.x + w.w - 12) {
              this.x = w.x + w.w + 18;
              this.wallSide = -1;
            }
          }
        }
      }

      // Tip 15: Corner Rounding / Ledge Forgiveness when ascending
      if (this.vy < 0) {
        for (const p of stage.platforms) {
          if (p.gone) continue;
          const headY = this.y - 70;
          if (headY <= p.y + p.h && headY >= p.y - 12) {
            // Nudge around left corner of platform
            if (this.x >= p.x - 14 && this.x < p.x + 8) {
              this.x = p.x - 16;
            }
            // Nudge around right corner of platform
            else if (this.x <= p.x + p.w + 14 && this.x > p.x + p.w - 8) {
              this.x = p.x + p.w + 16;
            }
          }
        }
      }

      // Check platforms (including moving platforms!)
      for (const p of stage.platforms) {
        if (p.gone) continue;
        if (this.x + 16 > p.x && this.x - 16 < p.x + p.w) {
          if (p.oneWay && this.dropTimer > 0) continue;
          if (this.vy >= 0 && prevY <= p.y + 12 && this.y >= p.y) {
            this.y = p.y;
            this.vy = 0;
            this.onGround = true;
            this.jumpsLeft = this.perks.tripleJump ? 3 : 2;
            if (p.vx) this.x += p.vx * dt;
            this.standingPlat = p;
          }
        }
      }

      // Check Jump Pads
      for (const jp of stage.jumpPads) {
        if (Math.abs(this.x - jp.x) < 36 && Math.abs(this.y - jp.y) < 24 && this.vy >= -100) {
          this.vy = -1060;
          this.onGround = false;
          this.jumpsLeft = this.perks.tripleJump ? 3 : 2;
          this.sfx?.jump(true);
          game.spawnParticles(jp.x, jp.y, 22, '#3af2ff', 280);
          this.squashX = 0.84;
          this.squashY = 1.22;
        }
      }

      // Ground floor
      if (this.y >= stage.groundY) {
        this.y = stage.groundY;
        this.vy = 0;
        this.onGround = true;
        this.jumpsLeft = this.perks.tripleJump ? 3 : 2;
      }

      // Tip 20: Smooth Fall Landing Squash & Stretch
      if (!this.wasGrounded && this.onGround) {
        if (this.prevFallVy > 360) {
          const impact = Math.min(1.0, (this.prevFallVy - 360) / 600);
          this.squashX = 1.0 + impact * 0.28;
          this.squashY = 1.0 - impact * 0.22;
          game.spawnParticles(this.x, this.y - 2, Math.round(4 + impact * 6), '#8a7662', 120);
        }
      }
      this.wasGrounded = this.onGround;
      this.prevFallVy = this.vy;

      // Elastic recovery of squash and stretch
      this.squashX += (1.0 - this.squashX) * Math.min(1, dt * 16);
      this.squashY += (1.0 - this.squashY) * Math.min(1, dt * 16);

      // Tip 11: Coyote time logic
      if (this.onGround) {
        this.coyoteTimer = 0.13;
      } else {
        this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
      }

      // Tip 12: Consume buffered jump if landed or near wall
      if (this.jumpBufferTimer > 0) {
        this.jumpBufferTimer -= dt;
        if (this.onGround || this.coyoteTimer > 0 || this.wallSide !== 0) {
          this.tryJump(game);
        }
      }
    }

    // Update afterimages
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].alpha -= dt * 3.4;
      if (this.afterimages[i].alpha <= 0) this.afterimages.splice(i, 1);
    }

    // Update Orbiting Assault Drone perk
    if (this.perks.twinDrone) {
      this.droneAngle += dt * 3.4;
      this.droneFireCd -= dt;
      if (this.droneFireCd <= 0 && game.enemies.length > 0) {
        const dx = this.x + Math.cos(this.droneAngle) * 52;
        const dy = this.y - 84 + Math.sin(this.droneAngle * 2) * 12;
        let nearest = null;
        let bestD = 560;
        for (const e of game.enemies) {
          if (e.dead) continue;
          const d = Math.hypot(e.x - dx, (e.y - e.h * 0.5) - dy);
          if (d < bestD) { bestD = d; nearest = e; }
        }
        if (nearest) {
          this.droneFireCd = 0.4;
          const ang = Math.atan2((nearest.y - nearest.h * 0.5) - dy, nearest.x - dx);
          game.spawnBullet({
            x: dx,
            y: dy,
            vx: Math.cos(ang) * 1020,
            vy: Math.sin(ang) * 1020,
            dmg: Math.round(16 * this.damageMult),
            color: '#3af2ff',
            glow: '#00aaff',
            radius: 4.5,
            fromPlayer: true,
          });
        }
      }
    }
  }

  draw(ctx, time) {
    // Draw Magnetic Grapple / Meat-Hook Chain if active
    if (this.grappleTimer > 0 && this.grappleTarget) {
      ctx.save();
      ctx.strokeStyle = '#ff6622';
      ctx.shadowColor = '#ff3300';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3.5;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - 44);
      ctx.lineTo(this.grappleTarget.x, this.grappleTarget.y);
      ctx.stroke();
      ctx.restore();
    }

    // Tip 16: Draw Phase Dash holographic afterimages with fiery hues
    for (const img of this.afterimages) {
      ctx.save();
      ctx.globalAlpha = img.alpha * 0.45;
      if (img.color) {
        ctx.shadowColor = img.color;
        ctx.shadowBlur = 10;
      }
      this.drawBody(ctx, img.x, img.y, img.facing, img.aim, 0, true);
      ctx.restore();
    }

    ctx.save();
    if (this.invulnTimer > 0 && Math.floor(time * 24) % 2 === 0 && this.dashTimer <= 0) {
      ctx.globalAlpha = 0.68;
    }
    // Tip 20: Procedural Squash & Stretch anchored at feet (y)
    if (this.squashX !== 1.0 || this.squashY !== 1.0) {
      ctx.translate(this.x, this.y);
      ctx.scale(this.squashX, this.squashY);
      ctx.translate(-this.x, -this.y);
    }
    if (this.inMech) {
      this.drawTitanMech(ctx, time);
    } else {
      this.drawBody(ctx, this.x, this.y, this.facing, this.aimAngle, time, false);
    }
    ctx.restore();

    // Tip 6: Rich Crucible Plasma Blade Crescent Slash Arc & Ghost After-Images
    if (this.bladeSwingTimer > 0) {
      const prog = 1 - (this.bladeSwingTimer / 0.24);
      ctx.save();
      ctx.translate(this.x, this.y - 44);
      ctx.rotate(this.aimAngle);

      const reach = 108 + this.stats.bladeReach * 0.35;
      const startAngle = -1.35 + prog * 0.55;
      const endAngle = 1.35 - (1 - prog) * 0.45;

      // Ghost After-Images (lagging 1-2 frames behind with decaying alpha)
      for (let g = 2; g >= 1; g--) {
        const gAlpha = (1 - prog) * (0.32 / g);
        const gSpread = g * 0.14;
        ctx.strokeStyle = `rgba(180, 20, 50, ${gAlpha})`;
        ctx.lineWidth = 18 - g * 4;
        ctx.beginPath();
        ctx.arc(0, 0, reach - g * 4, startAngle - gSpread, endAngle - gSpread);
        ctx.stroke();
      }

      // Outer Burning Crimson Flame Aura
      ctx.strokeStyle = '#ff1e56';
      ctx.shadowColor = '#ff0033';
      ctx.shadowBlur = 28;
      ctx.lineWidth = 16 * (1 - prog * 0.45);
      ctx.beginPath();
      ctx.arc(0, 0, reach, startAngle, endAngle);
      ctx.stroke();

      // Incandescent Inner Cutting Edge Ribbon
      ctx.strokeStyle = '#fff5e6';
      ctx.shadowColor = '#ffbb44';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 5 * (1 - prog * 0.3);
      ctx.beginPath();
      ctx.arc(0, 0, reach + 2, startAngle + 0.08, endAngle - 0.08);
      ctx.stroke();

      // Sharp blade tip flare
      const tipX = Math.cos(endAngle) * reach;
      const tipY = Math.sin(endAngle) * reach;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ff3366';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(tipX, tipY, Math.max(0.1, 7 * (1 - prog)), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Draw Hush Aegis Reflective Energy Dome if active
    if (this.aegisTimer > 0) {
      ctx.save();
      ctx.translate(this.x, this.y - (this.inMech ? 65 : 40));
      const pulse = (this.inMech ? 76 : 54) + Math.sin(time * 12) * 3;
      const grad = ctx.createRadialGradient(0, 0, pulse * 0.3, 0, 0, pulse);
      grad.addColorStop(0, 'rgba(58, 242, 255, 0.04)');
      grad.addColorStop(0.75, 'rgba(58, 242, 255, 0.22)');
      grad.addColorStop(1, 'rgba(58, 242, 255, 0.75)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = time * 2.5 + (i * Math.PI) / 3;
        const px = Math.cos(a) * pulse;
        const py = Math.sin(a) * pulse;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#3af2ff';
      ctx.stroke();
      ctx.restore();
    }

    // Draw Twin Assault Drone if unlocked
    if (this.perks.twinDrone) {
      const dx = this.x + Math.cos(this.droneAngle) * 52;
      const dy = this.y - 84 + Math.sin(this.droneAngle * 2) * 12;
      ctx.save();
      ctx.translate(dx, dy);
      ctx.fillStyle = '#1d2630';
      ctx.strokeStyle = '#3af2ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ff2a2a';
      ctx.beginPath();
      ctx.arc(3 * this.facing, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Renders the Pilotable Halcyon Titan-Walker Mech when Rika is inside!
   */
  drawTitanMech(ctx, time) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Mech Armor Bar overhead
    const bw = 76;
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(-bw / 2, -148, bw, 7);
    ctx.fillStyle = '#ffaa22';
    ctx.fillRect(-bw / 2, -148, bw * Math.max(0, this.mechHp / this.mechMaxHp), 7);

    ctx.scale(this.facing, 1);
    const stomp = Math.abs(this.vx) > 5 ? Math.sin(this.walkPhase) * 8 : 0;

    // Heavy Hydraulic Mech Legs
    ctx.fillStyle = '#242c36';
    ctx.strokeStyle = '#ffaa22';
    ctx.lineWidth = 2.5;
    ctx.fillRect(-26 + stomp, -52, 20, 52);
    ctx.strokeRect(-26 + stomp, -52, 20, 52);
    ctx.fillRect(6 - stomp, -52, 20, 52);
    ctx.strokeRect(6 - stomp, -52, 20, 52);

    // Armored Walker Cockpit Chassis
    ctx.fillStyle = '#1c242e';
    ctx.fillRect(-34, -122, 68, 72);
    ctx.strokeRect(-34, -122, 68, 72);

    // Glowing Red Canopy Visor showing Rika's Bionic Eye inside
    ctx.fillStyle = '#ff2222';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 16;
    ctx.fillRect(6, -106, 22, 14);
    ctx.shadowBlur = 0;

    // Dorsal Siege Missile Pod
    ctx.fillStyle = '#323a46';
    ctx.fillRect(-28, -138, 28, 16);
    ctx.fillStyle = '#ff4411';
    ctx.fillRect(-2, -135, 4, 10);

    // Aimed Twin Rotary Vulcan Cannons
    ctx.restore();
    ctx.save();
    ctx.translate(this.x, this.y - 74);
    ctx.rotate(this.aimAngle);
    ctx.fillStyle = '#2a323d';
    ctx.strokeStyle = '#ffaa22';
    ctx.lineWidth = 2;
    ctx.fillRect(0, -10, 54, 20);
    ctx.strokeRect(0, -10, 54, 20);
    if (this.muzzleFlash > 0) {
      ctx.fillStyle = '#ffee55';
      ctx.beginPath();
      ctx.arc(62, 0, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawBody(ctx, x, y, facing, aimAngle, time, isGhost) {
    const crouchOffset = this.crouching ? 14 : 0;
    const bob = this.onGround && Math.abs(this.vx) > 5 ? Math.abs(Math.sin(this.walkPhase * 2)) * 3.5 : Math.sin(time * 4) * 1.2;
    const hipY = y - 34 + crouchOffset + bob;

    const moving = Math.abs(this.vx) > 5 && this.onGround;
    const stride = moving ? Math.sin(this.walkPhase) * 0.62 : !this.onGround ? 0.42 : 0;
    const strideBack = moving ? -Math.sin(this.walkPhase) * 0.62 : !this.onGround ? -0.32 : 0;
    const kneeFront = moving ? Math.max(0, -Math.cos(this.walkPhase)) * 0.75 : !this.onGround ? 0.65 : this.crouching ? 0.55 : 0.08;
    const kneeBack = moving ? Math.max(0, Math.cos(this.walkPhase)) * 0.75 : !this.onGround ? 0.55 : this.crouching ? 0.55 : 0.08;

    ctx.save();
    ctx.translate(x, hipY);

    // 0. FLOWING ASHEN / CRIMSON CLOAK & CAPE (Waves dynamically behind Rika!)
    ctx.save();
    ctx.scale(facing, 1);
    // Tip 60: Cosmetic Cloak Skins (Obsidian Inquisitor, Frost-Worn Hermit, Blood-Stained Saint)
    const cColors = CLOAKS.find((c) => c.id === this.capeSkin) || CLOAKS[0];
    // Tip 79: Fluid cape simulation offset
    const capeFlap = -this.vx * facing * 0.045 + Math.sin(time * 7) * 4.5;
    ctx.fillStyle = isGhost ? 'rgba(216, 139, 50, 0.45)' : cColors.fill;
    ctx.strokeStyle = cColors.border;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-4, -30);
    ctx.quadraticCurveTo(-14 + capeFlap * 0.6, -10, -24 + capeFlap, 19);
    ctx.lineTo(-14 + capeFlap * 0.7, 21);
    ctx.lineTo(-20 + capeFlap * 0.8, 15);
    ctx.lineTo(-8 + capeFlap * 0.5, 18);
    ctx.quadraticCurveTo(-6, -10, 2, -30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sheathed Runic Broadsword strapped across back
    ctx.save();
    ctx.translate(-7, -24);
    ctx.rotate(-0.55);
    ctx.fillStyle = '#1c1714';
    ctx.strokeStyle = '#c89642';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-2.5, -20, 5, 34);
    ctx.strokeRect(-2.5, -20, 5, 34);
    // Sword pommel and crossguard
    ctx.fillStyle = '#d89b38';
    ctx.fillRect(-6, -21, 12, 3);
    ctx.fillRect(-2, -26, 4, 5);
    // Glowing runic vein along scabbard
    ctx.fillStyle = '#e6a848';
    ctx.fillRect(-0.8, -16, 1.6, 26);
    ctx.restore();
    ctx.restore();

    // 1. BACK LEG
    this.drawLeg(ctx, -4 * facing, 0, strideBack, kneeBack, facing, true, isGhost);

    // 2. FRONT LEG
    this.drawLeg(ctx, 4 * facing, 0, stride, kneeFront, facing, false, isGhost);

    // 3. TORSO, LEATHER CORSET, DARK IRON CUIRASS & BRONZE GORGET
    ctx.save();
    ctx.scale(facing, 1);

    // Leather belt and faulds
    ctx.fillStyle = isGhost ? '#e6b868' : '#231b16';
    ctx.strokeStyle = '#3e2e22';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-10, -5, 20, 8);
    ctx.strokeRect(-10, -5, 20, 8);
    ctx.fillStyle = '#c89642';
    ctx.fillRect(-3, -4, 6, 6);

    // Dark iron cuirass (slender waist, gothic breastplate)
    ctx.fillStyle = isGhost ? '#f2cb78' : '#2b231d';
    ctx.strokeStyle = '#785a3c';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-11, -5);
    ctx.lineTo(11, -5);
    ctx.lineTo(14, -28);
    ctx.lineTo(-12, -28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bronze chest crest & gorget
    ctx.fillStyle = '#c89642';
    ctx.beginPath();
    ctx.moveTo(-5, -28);
    ctx.lineTo(5, -28);
    ctx.lineTo(0, -18);
    ctx.closePath();
    ctx.fill();

    // Pauldron on shoulder
    ctx.fillStyle = isGhost ? '#f2cb78' : '#3d3026';
    ctx.strokeStyle = '#c89642';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(-8, -27, 7, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. HEAD: Gothic Warrior Heroine (Flowing Hair, Hood & Glowing Amber Eye)
    ctx.save();
    const localAim = Math.atan2(Math.sin(aimAngle), Math.cos(aimAngle) * facing);
    ctx.translate(1, -33);
    ctx.rotate(Math.max(-0.35, Math.min(0.35, localAim * 0.35)));

    // Slender neck
    ctx.fillStyle = '#c89676';
    ctx.fillRect(-3, -2, 6, 5);

    // Face / jaw
    ctx.fillStyle = '#dfab8c';
    ctx.beginPath();
    ctx.moveTo(-4, -13);
    ctx.lineTo(8, -13);
    ctx.lineTo(6, -3);
    ctx.lineTo(-2, -1);
    ctx.closePath();
    ctx.fill();

    // Flowing dark hair with ash-streaked tresses blowing back
    ctx.fillStyle = isGhost ? '#e6b868' : '#140f0c';
    ctx.beginPath();
    ctx.arc(-2, -14, 9, Math.PI * 0.8, Math.PI * 0.1, false);
    ctx.lineTo(-12, -5);
    ctx.lineTo(-8, -2);
    ctx.lineTo(-4, -12);
    ctx.fill();

    // Hair strands flowing behind
    ctx.strokeStyle = '#2b2018';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-4, -14);
    ctx.quadraticCurveTo(-14 - Math.abs(capeFlap * 0.4), -8, -18 - Math.abs(capeFlap * 0.6), -2);
    ctx.stroke();

    // Ashen Pilgrim circlet / headband
    ctx.fillStyle = '#8c6838';
    ctx.fillRect(-5, -16, 12, 2.5);

    // Glowing Amber Ashen Pilgrim Eye
    ctx.fillStyle = '#fff';
    ctx.fillRect(4, -11, 4, 3);
    ctx.fillStyle = '#f2cb78';
    ctx.shadowColor = '#d88b32';
    ctx.shadowBlur = this.redEyeTimer > 0 ? 18 : 8;
    ctx.beginPath();
    ctx.arc(6, -9.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
    ctx.restore();

    // 5. FRONT ARM + ORNATE RUNIC CATACOMB FIREARM
    ctx.save();
    ctx.translate(0, -22);
    ctx.rotate(aimAngle);
    if (facing < 0) ctx.scale(1, -1);

    const kick = -this.recoil;

    // Subtle warm amber aim sight ray (not harsh neon laser); display-only copies of Rika skip it
    if (!this.hideAimLine) {
    ctx.save();
    ctx.strokeStyle = this.redEyeTimer > 0 ? 'rgba(235, 60, 40, 0.75)' : 'rgba(224, 160, 50, 0.28)';
    ctx.lineWidth = this.redEyeTimer > 0 ? 2.2 : 1.2;
    ctx.beginPath();
    ctx.moveTo(34 + kick, -2);
    ctx.lineTo(340, -2);
    ctx.stroke();
    ctx.restore();
    }

    // Arm sleeve & leather glove
    ctx.fillStyle = '#3a2b20';
    ctx.strokeStyle = '#6e543c';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-4 + kick * 0.3, -4, 16, 7);
    ctx.strokeRect(-4 + kick * 0.3, -4, 16, 7);

    // Ornate Damascus rifle body with carved walnut stock
    ctx.fillStyle = '#221914';
    ctx.fillRect(4 + kick, -6, 12, 6);
    ctx.fillStyle = '#1c1b18';
    ctx.strokeStyle = '#8c6a42';
    ctx.lineWidth = 1.5;
    ctx.fillRect(10 + kick, -7, 28, 6);
    ctx.strokeRect(10 + kick, -7, 28, 6);

    // Glowing runic chamber
    const modeColors = { 1: '#f2cb78', 2: '#e65c28', 3: '#5cc8e6', 4: '#b868e6', 5: '#d88b32' };
    ctx.fillStyle = modeColors[this.weaponMode] || '#f2cb78';
    ctx.fillRect(16 + kick, -5.5, 12, 2.5);

    // Ornate barrel muzzle
    ctx.fillStyle = '#4a3f36';
    ctx.fillRect(36 + kick, -8, 6, 8);

    if (this.muzzleFlash > 0) {
      ctx.fillStyle = modeColors[this.weaponMode] || '#ffe088';
      ctx.shadowColor = '#e69832';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(42 + kick, -3);
      ctx.lineTo(60 + kick, -9);
      ctx.lineTo(54 + kick, -3);
      ctx.lineTo(62 + kick, 3);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
    ctx.restore();
  }

  drawLeg(ctx, offsetX, offsetY, hipAngle, kneeAngle, facing, isBack, isGhost) {
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(facing, 1);
    ctx.rotate(hipAngle);

    // Upper thigh (dark leather trousers)
    ctx.fillStyle = isGhost ? '#e6b868' : isBack ? '#181310' : '#261e18';
    ctx.strokeStyle = isBack ? '#36281e' : '#523e2b';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-4.5, 0, 9, 16);
    ctx.strokeRect(-4.5, 0, 9, 16);

    ctx.translate(0, 15);
    ctx.rotate(kneeAngle);

    // Weathered bronze knee guard
    ctx.fillStyle = '#8c6838';
    ctx.fillRect(-4.5, -2, 9, 5);

    // Lower calf & tall gothic leather boots
    ctx.fillStyle = isGhost ? '#e6b868' : isBack ? '#15110e' : '#1e1813';
    ctx.strokeStyle = '#4a3726';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-4, 2, 8, 14);
    ctx.strokeRect(-4, 2, 8, 14);

    // Bronze buckle clasp
    if (!isBack && !isGhost) {
      ctx.fillStyle = '#c89642';
      ctx.fillRect(-4.5, 4, 2, 4);
    }

    // Pointed combat boot
    ctx.fillStyle = '#140f0c';
    ctx.fillRect(-5, 14, 13, 5);

    ctx.restore();
  }
}
