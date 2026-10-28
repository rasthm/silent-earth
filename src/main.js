import { Sound2D } from './audio2d.js';
import { Rika2D } from './rika2d.js';
import { CutsceneEngine } from './cutscene.js';
import { drawDemonDeath } from './demons.js';
import { Expansion } from './expansion.js';
import { initMenu } from './menu.js';
import { Horror } from './horror.js';
import {
  STAGE_DEFS,
  buildStage,
  buildArenaStage,
  createEnemy,
  makeElite,
  createMidBoss,
  createStageBoss,
  updateEnemiesAndBoss,
  drawEnemyOrBoss,
} from './stages.js';
import { ACT_STORIES } from './story.js';
import { applyStatus, statusOnHit, STATUS_INFO } from './status.js';
import {
  ITEMS,
  SKILLS,
  ACHIEVEMENTS,
  LORE,
  MERCHANT_LINES,
  RARITY,
  DIFFICULTIES,
  rollItem,
  computeStats,
} from './items.js';

// Tip 95: Modular Event Bus Architecture
class EventBus {
  constructor() { this.listeners = {}; }
  on(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  emit(event, data) {
    if (this.listeners[event]) {
      for (const fn of this.listeners[event]) fn(data);
    }
  }
}

/**
 * SILENT EARTH 2D — Ultimate Action-Adventure Engine
 */
class SilentEarth2DGame {
  constructor() {
    this.events = new EventBus();
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.miniCanvas = document.getElementById('minimap-canvas');
    this.miniCtx = this.miniCanvas ? this.miniCanvas.getContext('2d') : null;
    this.sfx = new Sound2D();
    this.cutscene = new CutsceneEngine(this);
    this.prologueSeen = false;

    // Accessibility, Options & UX (Category 9)
    this.shakeMult = 1.0;
    this.flashMult = 1.0;
    this.highContrast = false;
    this.colorblindMode = 'none';
    this.debugOverlay = false;
    this.godMode = false;
    this.currentLoadout = 'A';
    this.loadoutA = null;
    this.loadoutB = null;
    this.ashenCairn = null;
    this.activeSkulls = {};
    this.bossRushMode = false;
    this.bossRushTimer = 0;
    this.gamepadConnected = false;

    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Input state
    this.keys = {};
    this.mouseScreen = { x: window.innerWidth * 0.65, y: window.innerHeight * 0.5 };
    this.mouseWorld = { x: 400, y: 500 };
    this.mouseDown = false;

    // Campaign & Entities
    this.state = 'menu';
    this.selectedStartStage = 0;
    this.stageIndex = 0;
    this.stage = null;
    this.rika = new Rika2D(160, 640, this.sfx);
    this.expansion?.applyLoadout(this.rika);
    this.enemies = [];
    this.bullets = [];
    this.missiles = [];
    this.bfgOrbs = [];
    this.grenades = [];
    this.beams = [];
    this.particles = [];
    this.weatherParticles = [];
    this.shells = [];
    this.pickups = [];
    this.floatingTexts = [];
    this.corpses = [];
    this.redEyeLaser = null;
    this.bossLaser = null;

    // Camera, Combo & Juice (Category 1: Combat Feel & Game Juice)
    this.camX = 0;
    this.camY = 0;
    this.camZoom = 1.0;
    this.shake = 0;
    this.shakeDirX = 0;
    this.shakeDirY = 0;
    this.hitStop = 0;
    this.slomoTimer = 0;
    this.slomoScale = 1.0;
    this.flashAlpha = 0;
    this.flashColor = '#ffffff';
    this.decals = []; // Permanent surface blood, ichor & scorch decals
    this.time = 0;
    this.score = 0;
    this.kills = 0;
    this.shards = 40;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.bossLagPct = 100;

    // Mega-systems state
    this.mode = 'campaign';
    this.menuMode = 'campaign';
    this.diffKey = 'normal';
    this.diff = DIFFICULTIES.normal;
    this.wells = [];
    this.counters = {};
    this.loreFound = [];
    this.journeyLog = [];
    this.lastJourneyBeat = null;
    this.journeyHideTimer = null;
    this.dlgLines = [];
    this.dlgIdx = 0;
    this.dlgCb = null;
    this.supplyTimer = 45;
    this.wave = 0;
    this.waveState = 'break';
    this.waveTimer = 0;
    this.waveTotal = 1;
    this.unlocked = {};
    this.bestWave = 0;
    this.loadSave();
    this.refreshMenuRecords();

    this.initWeather();
    this.bindInputs();
    this.bindUI();

    this.expansion = new Expansion(this);
    this.expansion.applyLoadout(this.rika);
    this.horror = new Horror(this);
    initMenu(this);

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  // The world is rendered at a fixed logical view height so every screen size sees the same
  // slice of the catacombs (small laptops no longer get a zoomed-in view hidden behind the HUD).
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(window.innerWidth * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);
    const VIEW_H = 820;
    this.dpr = dpr;
    this.viewScale = this.canvas.height / VIEW_H;
    this.viewW = this.canvas.width / this.viewScale;
    this.viewH = VIEW_H;
  }

  screenToView(px) {
    return (px * this.dpr) / this.viewScale;
  }

  initWeather() {
    this.weatherParticles = [];
    for (let i = 0; i < 65; i++) {
      this.weatherParticles.push({
        x: Math.random() * 2000,
        y: Math.random() * 1000,
        vx: (Math.random() - 0.5) * 40,
        vy: -30 - Math.random() * 50,
        size: 1.5 + Math.random() * 3,
        alpha: 0.25 + Math.random() * 0.55,
      });
    }
  }

  bindInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Tab') {
        e.preventDefault();
        if (this.state === 'playing') this.openChar();
        else if (this.state === 'char') this.closeChar();
        return;
      }
      if (e.code === 'KeyM') {
        const muted = this.sfx.toggleMute();
        this.setMsg(muted ? 'AUDIO MUTED' : 'AUDIO ON');
      }
      if (this.cutscene && this.cutscene.active) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          this.cutscene.advance();
        } else if (e.code === 'Escape') {
          e.preventDefault();
          this.cutscene.skip();
        }
        return;
      }
      if (this.state === 'dialogue') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          this.advanceDialogue();
        } else if (e.code === 'Escape') {
          e.preventDefault();
          this.finishDialogue();
        }
        return;
      }
      if (this.state !== 'playing') {
        if (e.code === 'Escape') {
          if (this.state === 'paused') this.resumeGame();
          else if (this.state === 'char') this.closeChar();
          else if (this.state === 'merchant') this.closeMerchant();
        } else if (e.code === 'KeyG' && this.state === 'merchant') {
          this.closeMerchant();
        }
        return;
      }
      if (e.code === 'KeyJ') {
        if (this.lastJourneyBeat) this.showJourneyBeat(this.lastJourneyBeat, true);
        return;
      }

      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        if (!(this.keys.KeyS || this.keys.KeyC || this.keys.ArrowDown)) {
          this.rika.pressJump(this);
        }
      } else if (e.code === 'KeyX') {
        this.rika.triggerCrucibleBlade(this, (m) => this.setMsg(m));
      } else if (e.code === 'KeyF') {
        this.rika.triggerGrapple(this, (m) => this.setMsg(m));
      } else if (e.code === 'KeyG') {
        this.tryInteractWorld();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        // Tip 18: Down + Shift triggers crouching momentum slide
        if (this.rika.onGround && (this.keys.KeyS || this.keys.KeyC || this.keys.ArrowDown)) {
          this.rika.trySlide(this.keys, this);
        } else {
          this.rika.triggerDash(this.keys, this, (m) => this.setMsg(m));
        }
      } else if (e.code === 'KeyQ') {
        this.rika.triggerClusterBomb(this, (m) => this.setMsg(m));
      } else if (e.code === 'KeyE') {
        this.rika.triggerAegis(this, (m) => this.setMsg(m));
      } else if (e.code === 'KeyV') {
        this.rika.triggerRedEye(this, (m) => this.setMsg(m));
      } else if (e.code === 'Digit1') {
        this.rika.switchWeapon(1, (m) => this.setMsg(m));
      } else if (e.code === 'Digit2') {
        this.rika.switchWeapon(2, (m) => this.setMsg(m));
      } else if (e.code === 'Digit3') {
        this.rika.switchWeapon(3, (m) => this.setMsg(m));
      } else if (e.code === 'Digit4') {
        this.rika.switchWeapon(4, (m) => this.setMsg(m));
      } else if (e.code === 'Digit5') {
        this.rika.switchWeapon(5, (m) => this.setMsg(m));
      } else if (e.code === 'Digit6' || e.code === 'Digit7' || e.code === 'Digit8' || e.code === 'Digit9') {
        this.expansion.selectWeapon(Number(e.code.slice(5)));
      } else if (e.code === 'KeyB') {
        this.expansion.castSigil();
      } else if (e.code === 'KeyT') {
        this.rika.cycleAmmo((m) => this.setMsg(m));
      } else if (e.code === 'KeyZ') {
        this.rika.triggerAltFire(this, (m) => this.setMsg(m));
      } else if (e.code === 'KeyC') {
        this.rika.trySlide(this.keys, this);
      } else if (e.code === 'KeyR') {
        if (this.state === 'dead') {
          this.retryCurrentStage();
        } else {
          this.rika.reload((m) => this.setMsg(m));
        }
      } else if (e.code === 'KeyO') {
        this.toggleOptionsModal();
      } else if (e.code === 'KeyL') {
        this.swapLoadout();
      } else if (e.code === 'F1') {
        e.preventDefault();
        this.toggleDebugOverlay();
      } else if (e.code === 'Escape') {
        if (!document.getElementById('options-modal')?.classList.contains('hidden')) {
          this.toggleOptionsModal();
        } else {
          this.pauseGame();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      // Tip 13: Variable Jump Height (early jump key release cuts ascent)
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.rika.releaseJump();
      }
    });

    window.addEventListener('mousemove', (e) => {
      this.mouseScreen.x = e.clientX;
      this.mouseScreen.y = e.clientY;
    });

    window.addEventListener('mousedown', (e) => {
      this.sfx.resume();
      if (this.state !== 'playing') return;
      if (e.button === 0) {
        this.mouseDown = true;
        this.rika.fire(this, (m) => this.setMsg(m));
      } else if (e.button === 1) {
        e.preventDefault();
        this.rika.triggerGrapple(this, (m) => this.setMsg(m));
      } else if (e.button === 2) {
        e.preventDefault();
        this.rika.triggerAltFire(this, (m) => this.setMsg(m));
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('wheel', (e) => {
      if (this.state !== 'playing' || Math.abs(e.deltaY) < 4) return;
      const now = performance.now();
      if (now - (this._wheelT || 0) < 120) return;
      this._wheelT = now;
      this.expansion.cycleWeapon(e.deltaY > 0 ? 1 : -1);
    }, { passive: true });
  }

  bindUI() {
    // Stage selector buttons on main menu
    document.querySelectorAll('.stage-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.stage-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedStartStage = Number(btn.dataset.stage || 0);
      });
    });

    document.querySelectorAll('.mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.menuMode = btn.dataset.mode || 'campaign';
      });
    });
    document.querySelectorAll('.diff-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.diffKey = btn.dataset.diff || 'normal';
      });
    });
    document.getElementById('btn-close-merchant')?.addEventListener('click', () => this.closeMerchant());
    document.getElementById('btn-close-char')?.addEventListener('click', () => this.closeChar());
    document.getElementById('btn-dlg-next')?.addEventListener('click', () => this.advanceDialogue());
    document.getElementById('btn-dlg-skip')?.addEventListener('click', () => this.finishDialogue());

    document.getElementById('btn-prologue')?.addEventListener('click', () => {
      this.sfx.resume();
      this.cutscene.playPrologue(() => {});
    });

    document.getElementById('btn-start')?.addEventListener('click', () => {
      this.sfx.resume();
      this.diff = DIFFICULTIES[this.diffKey];
      if (this.menuMode === 'arena') this.startArena();
      else this.startNewCampaign(this.selectedStartStage);
    });
    document.getElementById('btn-resume')?.addEventListener('click', () => this.resumeGame());
    document.getElementById('btn-restart-pause')?.addEventListener('click', () => this.returnToMenu());
    document.getElementById('btn-retry-stage')?.addEventListener('click', () => this.retryCurrentStage());
    document.getElementById('btn-retry')?.addEventListener('click', () => this.returnToMenu());
    document.getElementById('btn-again')?.addEventListener('click', () => this.returnToMenu());
    document.getElementById('btn-next-stage')?.addEventListener('click', () => {
      this.loadStage(this.stageIndex + 1);
    });
    document.getElementById('btn-proceed-level')?.addEventListener('click', () => {
      document.getElementById('screen-level-clear')?.classList.add('hidden');
      this.loadStage(this.stageIndex + 1);
    });
    document.getElementById('btn-forge-relics')?.addEventListener('click', () => {
      document.getElementById('screen-level-clear')?.classList.add('hidden');
      const actStory = this.stage?.actStory || ACT_STORIES[this.stageIndex] || ACT_STORIES[0];
      this.showBoonChoice(() => this.showUpgradeModal(), `${actStory?.verseName || 'LEVEL CLEARED'} — CLAIM A RELIC`);
    });

    // Options, Accessibility, Cloaks & Debug UI (Tips 81-85, 55, 58, 60, 100)
    document.getElementById('btn-top-options')?.addEventListener('click', () => this.toggleOptionsModal());
    document.getElementById('btn-close-options')?.addEventListener('click', () => this.toggleOptionsModal());
    document.getElementById('btn-boss-rush')?.addEventListener('click', () => this.startBossRush());

    const sShake = document.getElementById('slider-shake');
    if (sShake) {
      sShake.addEventListener('input', (e) => {
        this.shakeMult = Number(e.target.value) / 100;
        document.getElementById('val-shake').textContent = `${e.target.value}%`;
      });
    }
    const sFlash = document.getElementById('slider-flash');
    if (sFlash) {
      sFlash.addEventListener('input', (e) => {
        this.flashMult = Number(e.target.value) / 100;
        document.getElementById('val-flash').textContent = `${e.target.value}%`;
      });
    }
    document.getElementById('chk-contrast')?.addEventListener('change', (e) => {
      this.highContrast = e.target.checked;
    });
    document.getElementById('sel-colorblind')?.addEventListener('change', (e) => {
      this.colorblindMode = e.target.value;
      if (this.colorblindMode === 'protanopia') this.canvas.style.filter = 'contrast(1.1) saturate(1.2) hue-rotate(25deg)';
      else if (this.colorblindMode === 'deuteranopia') this.canvas.style.filter = 'contrast(1.1) saturate(1.1) hue-rotate(-20deg)';
      else if (this.colorblindMode === 'tritanopia') this.canvas.style.filter = 'contrast(1.15) hue-rotate(180deg)';
      else this.canvas.style.filter = '';
    });
    document.getElementById('sel-cloak')?.addEventListener('change', (e) => {
      this.rika.capeSkin = e.target.value;
      this.toast('CLOAK ATTIRE EQUIPPED', `Attire set to ${e.target.value.toUpperCase()}`, '#ffd24a');
    });
    document.getElementById('btn-swap-loadout')?.addEventListener('click', () => this.swapLoadout());

    // Debug Console buttons
    document.getElementById('btn-dbg-god')?.addEventListener('click', () => {
      this.godMode = !this.godMode;
      document.getElementById('btn-dbg-god').textContent = `God Mode: ${this.godMode ? 'ON' : 'OFF'}`;
    });
    document.getElementById('btn-dbg-boss')?.addEventListener('click', () => {
      this.rika.x = this.stage.bossTriggerX - 40;
    });
    document.getElementById('btn-dbg-next')?.addEventListener('click', () => {
      this.loadStage((this.stageIndex + 1) % 5);
    });
  }

  toggleOptionsModal() {
    const modal = document.getElementById('options-modal');
    if (!modal) return;
    const isHidden = modal.classList.contains('hidden');
    if (isHidden) {
      modal.classList.remove('hidden');
      if (this.state === 'playing') this.state = 'paused';
    } else {
      modal.classList.add('hidden');
      if (this.state === 'paused') this.state = 'playing';
    }
  }

  toggleDebugOverlay() {
    this.debugOverlay = !this.debugOverlay;
    document.getElementById('debug-overlay')?.classList.toggle('hidden', !this.debugOverlay);
  }

  swapLoadout() {
    if (this.currentLoadout === 'A') {
      this.loadoutA = { items: { ...this.items }, skills: { ...this.skills } };
      this.currentLoadout = 'B';
      this.items = this.loadoutB ? { ...this.loadoutB.items } : {};
      this.skills = this.loadoutB ? { ...this.loadoutB.skills } : {};
    } else {
      this.loadoutB = { items: { ...this.items }, skills: { ...this.skills } };
      this.currentLoadout = 'A';
      this.items = this.loadoutA ? { ...this.loadoutA.items } : {};
      this.skills = this.loadoutA ? { ...this.loadoutA.skills } : {};
    }
    this.recomputeStats();
    const btn = document.getElementById('btn-swap-loadout');
    if (btn) btn.textContent = `Active: Profile ${this.currentLoadout} (Click to Swap) [L]`;
    this.toast('LOADOUT PROFILE SWAPPED', `Switched to Profile ${this.currentLoadout}`, '#ffd24a');
  }

  startBossRush() {
    this.sfx.resume();
    this.bossRushMode = true;
    this.bossRushTimer = 0;
    this.mode = 'boss_rush';
    this.diff = DIFFICULTIES[this.diffKey];
    this.score = 0;
    this.kills = 0;
    this.shards = 200;
    this.items = {};
    this.skills = {};
    document.getElementById('screen-menu')?.classList.add('hidden');
    document.getElementById('hud')?.classList.remove('hidden');
    this.state = 'playing';
    this.loadStage(0);
    this.setMsg('⚡ BOSS RUSH ARENA: DEFEAT ALL FIVE ABYSSAL LORDS! ⚡');
  }

  pollGamepad() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (!gp) return;
    this.gamepadConnected = true;
    const deadzone = 0.22;
    if (Math.abs(gp.axes[0]) > deadzone) {
      this.keys.KeyD = gp.axes[0] > 0;
      this.keys.KeyA = gp.axes[0] < 0;
    }
    if (gp.buttons[0]?.pressed && !this._prevGpA) this.rika.pressJump(this);
    if (!gp.buttons[0]?.pressed && this._prevGpA) this.rika.releaseJump();
    this._prevGpA = gp.buttons[0]?.pressed;

    if (gp.buttons[2]?.pressed && !this._prevGpX) this.rika.triggerCrucibleBlade(this, (m) => this.setMsg(m));
    this._prevGpX = gp.buttons[2]?.pressed;

    if (gp.buttons[7]?.pressed) this.mouseDown = true;
    else if (this.gamepadConnected && !this.mouseIsRealDown) this.mouseDown = false;

    if (gp.buttons[6]?.pressed && !this._prevGpLT) this.rika.triggerAltFire(this, (m) => this.setMsg(m));
    this._prevGpLT = gp.buttons[6]?.pressed;

    if (gp.buttons[4]?.pressed && !this._prevGpLB) this.rika.triggerDash(this.keys, this, (m) => this.setMsg(m));
    this._prevGpLB = gp.buttons[4]?.pressed;

    if (gp.buttons[5]?.pressed && !this._prevGpRB) this.rika.triggerClusterBomb(this, (m) => this.setMsg(m));
    this._prevGpRB = gp.buttons[5]?.pressed;
  }

  returnToMenu() {
    this.state = 'menu';
    this.expansion.onLoadStage(null, -1, 'menu');
    this.horror.stopAmbience();
    this.bossRushMode = false;
    this.mouseDown = false;
    this.sfx.stopMusic();
    this.refreshMenuRecords();
    for (const id of ['hud', 'screen-pause', 'screen-dead', 'screen-win', 'screen-upgrade', 'screen-merchant', 'screen-char', 'screen-boon']) {
      document.getElementById(id)?.classList.add('hidden');
    }
    document.getElementById('screen-menu')?.classList.remove('hidden');
    this.titleMenu?.refresh();
  }

  startNewCampaign(startStage = 0) {
    this.mode = 'campaign';
    this.bossRushMode = false;
    this.ashenCairn = null;
    this.diff = DIFFICULTIES[this.diffKey];
    this.score = 0;
    this.kills = 0;
    this.shards = 45;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.counters = {};
    this.loreFound = [];
    this.stageIndex = startStage;
    this.rika = new Rika2D(160, 640, this.sfx);
    this.expansion?.applyLoadout(this.rika);
    this.recomputeStats();
    this.loadStage(startStage);
  }

  retryCurrentStage() {
    if (this.expansion.inDungeon) this.expansion.leaveDungeon(false);
    if (this.mode === 'arena') {
      this.startArena();
      return;
    }
    const st = this.stage;
    const r = this.rika;
    const cp = st.checkpointX || 160;
    if (st.bossSpawned && !st.bossDefeated) {
      this.enemies = this.enemies.filter((e) => !e.isBoss);
      st.bossSpawned = false;
      st.boss = null;
      document.getElementById('boss-hud')?.classList.add('hidden');
    }
    r.alive = true;
    this.bullets = [];
    this.missiles = [];
    this.bfgOrbs = [];
    this.grenades = [];
    this.beams = [];
    this.wells = [];
    this.redEyeLaser = null;
    this.bossLaser = null;
    r.healFullForNextStage(cp, st.groundY);
    r.invulnTimer = 1.5;
    const lost = Math.floor(this.shards * 0.15);
    this.shards -= lost;
    this.comboCount = 0;
    this.camX = Math.max(0, cp - this.viewW * 0.36);
    this.state = 'playing';
    document.getElementById('screen-dead')?.classList.add('hidden');
    document.getElementById('hud')?.classList.remove('hidden');
    this.toast('RESPAWNED AT BEACON', `Lost ${lost} shards`, '#ff6a6a');
  }

  loadStage(index) {
    this.stageIndex = index;
    this.stage = buildStage(index);
    this.enemies = this.stage.enemies;
    for (const e of this.enemies) this.scaleEnemy(e);
    this.wells = [];
    this.supplyTimer = 45;
    this.sfx.startMusic(index);
    this.bullets = [];
    this.missiles = [];
    this.bfgOrbs = [];
    this.grenades = [];
    this.beams = [];
    this.particles = [];
    this.shells = [];
    this.pickups = [];
    this.floatingTexts = [];
    this.corpses = [];
    this.redEyeLaser = null;
    this.bossLaser = null;

    if (this.bossRushMode) {
      const bX = Math.max(160, (this.stage.bossTriggerX || 3000) - 100);
      this.rika.healFullForNextStage(bX, this.stage.groundY);
      this.camX = Math.max(0, bX - 300);
    } else {
      this.rika.healFullForNextStage(160, this.stage.groundY);
      this.camX = 0;
    }
    this.camY = 0;
    this.state = 'playing';

    for (const id of ['screen-menu', 'screen-pause', 'screen-dead', 'screen-win', 'screen-upgrade', 'screen-merchant', 'screen-char', 'screen-boon', 'dialogue-modal']) {
      document.getElementById(id)?.classList.add('hidden');
    }
    document.getElementById('hud')?.classList.remove('hidden');
    document.getElementById('boss-hud')?.classList.add('hidden');

    // Attach Rika's Journey Chronicle Beats for this Act
    const actStory = ACT_STORIES[index] || ACT_STORIES[0];
    this.stage.actStory = actStory;
    this.expansion.onLoadStage(this.stage, index, this.mode);
    this.horror.onStage();
    this.stage.storyBeats = (actStory.beats || []).map((b) => ({ ...b, triggered: false }));

    const banner = document.getElementById('stage-banner');
    const bTitle = document.getElementById('banner-title');
    const bSub = document.getElementById('banner-sub');
    if (banner && bTitle && bSub) {
      bTitle.textContent = `${this.stage.code} · ${this.stage.name}`;
      bSub.textContent = this.stage.subtitle;
      banner.classList.remove('hidden');
      setTimeout(() => banner.classList.add('hidden'), 3200);
    }

    this.setMsg(`DESCENDED INTO ${this.stage.code}: ${this.stage.name} — Press [F] Chain-Hook, [X] Crucible Blade, [G] Interact, [J] Replay Story!`);

    if (index === 0 && !this.prologueSeen && this.mode === 'campaign') {
      this.prologueSeen = true;
      this.cutscene.playPrologue(() => {
        this.toast('THE DESCENT BEGINS', 'Reclaim the Five Verses of Lyra’s Soul', '#e6b868');
      });
    }
  }

  // ==========================================================================
  // RIKA'S JOURNEY CHRONICLE RIBBON & INTERACTIVE BOSS DIALOGUE CUTSCENES
  // ==========================================================================
  showJourneyBeat(beat, isReplay = false) {
    if (!beat) return;
    this.lastJourneyBeat = beat;
    if (!isReplay) {
      const entry = `[${beat.zone} — ${beat.title}] ${beat.text}`;
      if (!this.journeyLog.includes(entry)) this.journeyLog.push(entry);
    }
    const ribbon = document.getElementById('journey-ribbon');
    const zoneEl = document.getElementById('journey-zone');
    const titleEl = document.getElementById('journey-title');
    const textEl = document.getElementById('journey-text');
    if (ribbon && zoneEl && titleEl && textEl) {
      zoneEl.textContent = beat.zone;
      titleEl.textContent = beat.title;
      textEl.textContent = beat.text;
      ribbon.classList.remove('hidden');
      if (this.journeyHideTimer) clearTimeout(this.journeyHideTimer);
      this.journeyHideTimer = setTimeout(() => {
        ribbon.classList.add('hidden');
      }, 9200);
    }
  }

  startDialogue(lines, onComplete) {
    if (!lines || !lines.length) {
      onComplete?.();
      return;
    }
    this.dlgLines = lines;
    this.dlgIdx = 0;
    this.dlgCb = onComplete || null;
    this.state = 'dialogue';
    this.mouseDown = false;
    document.getElementById('journey-ribbon')?.classList.add('hidden');
    document.getElementById('dialogue-modal')?.classList.remove('hidden');
    this.renderDialogueLine();
  }

  renderDialogueLine() {
    const line = this.dlgLines[this.dlgIdx];
    if (!line) {
      this.finishDialogue();
      return;
    }
    const port = document.getElementById('dlg-portrait');
    const spk = document.getElementById('dlg-speaker');
    const role = document.getElementById('dlg-role');
    const txt = document.getElementById('dlg-text');
    const step = document.getElementById('dlg-step');
    const isRika = line.side === 'left';
    const isLyra = line.speaker && line.speaker.includes('LYRA');
    if (port) {
      port.className = `dialogue-portrait ${isRika || isLyra ? '' : 'boss'}`;
      port.textContent = isLyra ? '✦' : isRika ? '⚔' : '☠';
    }
    if (spk) spk.textContent = line.speaker || 'RIKA';
    if (role) role.textContent = line.role || '';
    if (txt) txt.textContent = line.text || '';
    if (step) step.textContent = `CONVERSATION ${this.dlgIdx + 1} / ${this.dlgLines.length}`;
  }

  advanceDialogue() {
    if (this.state !== 'dialogue') return;
    this.sfx.hit();
    this.dlgIdx++;
    if (this.dlgIdx >= this.dlgLines.length) {
      this.finishDialogue();
    } else {
      this.renderDialogueLine();
    }
  }

  finishDialogue() {
    if (this.state !== 'dialogue') return;
    document.getElementById('dialogue-modal')?.classList.add('hidden');
    this.state = 'playing';
    const cb = this.dlgCb;
    this.dlgCb = null;
    cb?.();
  }

  pauseGame() {
    this.state = 'paused';
    this.mouseDown = false;
    document.getElementById('screen-pause')?.classList.remove('hidden');
  }

  resumeGame() {
    this.state = 'playing';
    document.getElementById('screen-pause')?.classList.add('hidden');
  }

  onPlayerDeath(reason) {
    this.state = 'dead';
    this.mouseDown = false;
    const el = document.getElementById('dead-reason');
    if (el) el.textContent = this.mode === 'arena' ? `Fell on Wave ${this.wave}. Best wave: ${this.bestWave}.` : reason;
    const btn = document.getElementById('btn-retry-stage');
    if (btn) btn.textContent = this.mode === 'arena' ? 'RESTART ARENA' : 'RESPAWN AT BEACON (-15% SHARDS)';
    document.getElementById('screen-dead')?.classList.remove('hidden');
    // Tip 53: Ashen Cairn death recovery site
    const lost = Math.floor(this.shards * 0.15);
    if (lost > 0) {
      this.ashenCairn = {
        x: this.rika.x,
        y: this.rika.y,
        stageIndex: this.stageIndex,
        shards: lost,
      };
    }
  }

  // ==========================================================================
  // INTERACTIVE ADVENTURE OBJECTS ([G] KEY: GORE NESTS, SLIPGATES, MECH BAYS, CHESTS, TERMINALS)
  // ==========================================================================
  tryInteractWorld() {
    if (!this.stage) return;
    if (this.expansion.tryInteract()) return;
    const rx = this.rika.x;
    const ry = this.rika.y;

    // 0. Merchant Kess
    if (this.stage.merchant && Math.hypot(this.stage.merchant.x - rx, this.stage.merchant.y - ry) < 90) {
      this.openMerchant();
      return;
    }

    // 0b. Rip open Demonic Gore Nests ([G]) to trigger a DOOM Combat Wave!
    for (const gn of this.stage.goreNests || []) {
      if (!gn.ripped && Math.hypot(gn.x - rx, gn.y - ry) < 92) {
        this.ripGoreNest(gn);
        return;
      }
    }

    // 0c. Hell Slipgate Teleporters ([G])
    for (const sg of this.stage.slipgates || []) {
      if ((this.slipgateCd || 0) <= 0) {
        if (Math.hypot(sg.x1 - rx, sg.y1 - ry) < 76) {
          this.useSlipgate(sg.x2, sg.y2, sg.color);
          return;
        }
        if (Math.hypot(sg.x2 - rx, sg.y2 - ry) < 76) {
          this.useSlipgate(sg.x1, sg.y1, sg.color);
          return;
        }
      }
    }

    // 1. Check Pilotable Halcyon Titan-Walker Mech Bays
    for (const mb of this.stage.mechBays) {
      if (!mb.used && Math.hypot(mb.x - rx, mb.y - ry) < 88) {
        mb.used = true;
        this.rika.enterMech(this, (m) => this.setMsg(m));
        this.bump('mech');
        return;
      }
    }

    // 2. Check Secret Relic Chests
    for (const ch of this.stage.chests) {
      if (!ch.opened && Math.hypot(ch.x - rx, ch.y - ry) < 82) {
        this.openRelicChest(ch);
        return;
      }
    }

    // 3. Check Hackable Cyber-Terminals
    for (const tm of this.stage.terminals) {
      if (!tm.hacked && Math.hypot(tm.x - rx, tm.y - ry) < 82) {
        tm.hacked = true;
        this.sfx.powerup();
        this.gainShards(25);
        this.progressObjective('hack');
        this.readLore();
        if (tm.opensGate) {
          tm.opensGate.open = true;
          this.stage.walls = this.stage.walls.filter((w) => w !== tm.opensGate);
          this.addShake(14);
          this.spawnParticles(tm.opensGate.x, this.stage.groundY - 200, 40, '#ff3355', 320);
          this.setMsg('DEMONIC BLOOD-GATE UNSEALED — the path ahead is open!');
          return;
        }
        this.stage.turrets.push({
          x: tm.x,
          y: tm.y,
          fireCd: 0.1,
          aimAngle: 0,
        });
        // Call down an instant Orbital Laser Strike on up to 3 nearby enemies!
        let strikes = 0;
        for (const e of this.enemies) {
          if (!e.dead && Math.abs(e.x - tm.x) < 620 && strikes < 3) {
            strikes++;
            this.beams.push({
              x1: e.x,
              y1: e.y - 600,
              x2: e.x,
              y2: e.y,
              color: '#3af2ff',
              width: 16,
              life: 0.45,
              maxLife: 0.45,
            });
            this.damageEnemy(e, 140, e.x, e.y - e.h * 0.5, true);
          }
        }
        this.setMsg('LORE STONE AWAKENED — A Ballista Ward rises to guard you (+25 Souls)!');
        return;
      }
    }
  }

  ripGoreNest(gn) {
    if (!gn || gn.ripped) return;
    gn.ripped = true;
    this.sfx.bossRoar();
    this.addShake(20);
    this.flashAlpha = 0.35;
    this.flashColor = '#ff1e38';
    this.spawnParticles(gn.x, gn.y - 30, 55, '#ff1e38', 380);
    this.spawnParticles(gn.x, gn.y - 30, 28, '#ffaa11', 280);
    this.toast('☠ GORE NEST RIPPED OPEN!', 'Slay the summoned Hell-Wave for a Demonic Rune & Relic!', '#ff3344');
    this.setMsg('DEMONIC GORE NEST DESTROYED — RIP AND TEAR UNTIL IT IS DONE!');

    const st = this.stage;
    for (let i = 0; i < 7; i++) {
      let sx = gn.x + (i % 2 === 0 ? -1 : 1) * (180 + i * 55);
      sx = Math.max(90, Math.min(st.bossTriggerX - 200, sx));
      const type = st.roster[i % st.roster.length];
      const spawnY = (type === 'drone' || type === 'spitter') ? st.groundY - 190 : st.groundY;
      const en = createEnemy(type, sx, spawnY, this.stageIndex);
      if (i === 0 && type !== 'drone' && type !== 'sentry') makeElite(en);
      en.goreNestId = gn.id;
      this.scaleEnemy(en);
      this.enemies.push(en);
    }
  }

  useSlipgate(destX, destY, color = '#ff3311') {
    const r = this.rika;
    this.slipgateCd = 1.1;
    this.spawnParticles(r.x, r.y - 40, 28, color, 300);
    r.x = destX;
    r.y = destY;
    r.vy = -180;
    r.jumpsLeft = r.perks.tripleJump ? 2 : 1;
    r.invulnTimer = Math.max(r.invulnTimer, 0.45);
    this.sfx.bfgShoot();
    this.addShake(9);
    this.flashAlpha = 0.28;
    this.flashColor = color;
    this.spawnParticles(r.x, r.y - 40, 32, color, 340);
    this.setMsg('HELL SLIPGATE WARP — High-Deck Reposition!');
  }

  openRelicChest(ch) {
    if (ch.opened) return;
    ch.opened = true;
    if (ch.mimic) {
      const m = createEnemy('brute', ch.x, ch.y, this.stageIndex);
      makeElite(m);
      m.name = 'Relic Mimic';
      m.color = '#ffd24a';
      m.score *= 2;
      this.scaleEnemy(m);
      this.enemies.push(m);
      this.sfx.bossRoar();
      this.addShake(12);
      this.spawnParticles(ch.x, ch.y - 20, 30, '#ffd24a', 300);
      this.toast("IT'S A MIMIC!", 'The chest bites back — kill it for a guaranteed relic', '#ff6a6a');
      return;
    }
    this.sfx.chestOpen();
    this.gainShards(ch.shards);
    this.bump('chests');
    this.progressObjective('chests');
    if (Math.random() < 0.5) {
      this.pickups.push({ type: 'item', item: rollItem(this.luck()), x: ch.x, y: ch.y - 40, vy: -320, life: 40 });
    }
    this.score += 500;
    this.rika.maxHp += 15;
    this.rika.hp = this.rika.maxHp;
    this.rika.shield = this.rika.maxShield;
    this.rika.mag = this.rika.magMax;
    this.spawnParticles(ch.x, ch.y - 20, 36, '#ffd24a', 320);
    this.floatingTexts.push({
      x: ch.x,
      y: ch.y - 50,
      text: `+${ch.shards} SHARDS & +15 MAX HP!`,
      color: '#ffd24a',
      life: 1.4,
    });
    this.setMsg(`RELIC CHEST UNLOCKED — +${ch.shards} Soul Shards, +15 Max Blood & Full Restore!`);
  }

  // ==========================================================================
  // CYBER-ARMORY SHOP & AUGMENTATIONS BETWEEN STAGES
  // ==========================================================================
  showUpgradeModal() {
    this.state = 'upgrade';
    this.mouseDown = false;
    const container = document.getElementById('upgrade-cards');
    const shopRow = document.getElementById('shop-items');
    const shardEl = document.getElementById('shop-shards');
    const modal = document.getElementById('screen-upgrade');
    if (!container || !modal) return;

    if (shardEl) shardEl.textContent = this.shards;

    const allPerks = [
      {
        key: 'vampiric',
        tag: 'BIOTECH SIPHON',
        title: 'Vampiric Nanites',
        desc: 'Every demon slain restores +20 Blood & +22 Ward. Increases Max Blood by +30.',
      },
      {
        key: 'chainArc',
        tag: 'TESLA COIL',
        title: 'Arc-Lightning Rounds',
        desc: 'Your rifle & shotgun rounds arc high-voltage lightning to nearby enemies.',
      },
      {
        key: 'tripleJump',
        tag: 'KINETIC THRUSTERS',
        title: 'Triple-Jump & Hyper-Dash',
        desc: 'Unlocks a 3rd mid-air thruster jump and reduces Phase Dash cooldown by 35%.',
      },
      {
        key: 'twinDrone',
        tag: 'AUTONOMOUS SUPPORT',
        title: 'Ember Wisp Familiar',
        desc: 'Summons an orbiting ember wisp that automatically strikes nearby demons.',
      },
      {
        key: 'omegaBeam',
        tag: 'BIONIC OVERCLOCK',
        title: 'Omega-Lens Amplifier',
        desc: 'Increases Ashen Gaze, Lance and Abyss-Orb damage by +35–45%.',
      },
    ];

    const available = allPerks.filter((p) => !this.rika.perks[p.key]);
    const choices = (available.length >= 3 ? available : allPerks).slice(0, 3);

    let freePicked = false;
    container.innerHTML = '';
    for (const perk of choices) {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `
        <span class="tag">${perk.tag} (FREE PICK)</span>
        <h3>${perk.title}</h3>
        <p>${perk.desc}</p>
      `;
      card.addEventListener('click', () => {
        if (freePicked) return;
        freePicked = true;
        card.classList.add('selected');
        this.rika.perks[perk.key] = true;
        if (perk.key === 'vampiric') this.rika.maxHp += 30;
        this.sfx.powerup();
      });
      container.appendChild(card);
    }

    // Spendable Isotope Shard Upgrades in the Cyber-Armory
    const shopCatalog = [
      {
        title: 'WEAPON CORE OVERCLOCK',
        desc: 'Permanently increases all Weapon & Crucible Blade damage by +20%.',
        cost: 45,
        apply: () => { this.rika.damageMult += 0.2; },
      },
      {
        title: 'TITANIUM PLATING',
        desc: 'Permanently increases Max HP by +35 and Max Shield by +25.',
        cost: 40,
        apply: () => { this.rika.maxHp += 35; this.rika.maxShield += 25; },
      },
      {
        title: 'EXPANDED DRUM MAGAZINE',
        desc: 'Increases Magazine Capacity by +15 rounds & speeds up cooldowns.',
        cost: 35,
        apply: () => { this.rika.magMax += 15; this.rika.grenadeMaxCd *= 0.85; },
      },
    ];

    if (shopRow) {
      shopRow.innerHTML = '';
      for (const item of shopCatalog) {
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
          <h4>${item.title}</h4>
          <p>${item.desc}</p>
          <div class="cost">BUY FOR ${item.cost} ◆ SHARDS</div>
        `;
        div.addEventListener('click', () => {
          if (this.shards < item.cost) return;
          this.shards -= item.cost;
          item.apply();
          this.sfx.chestOpen();
          if (shardEl) shardEl.textContent = this.shards;
          div.querySelector('.cost').textContent = 'PURCHASED ✓';
          div.style.opacity = '0.6';
          div.style.pointerEvents = 'none';
        });
        shopRow.appendChild(div);
      }
    }

    modal.classList.remove('hidden');
  }

  onStageBossDefeated(boss) {
    this.bump('bosses');
    if (this.mode === 'arena') {
      this.stage.boss = null;
      document.getElementById('boss-hud')?.classList.add('hidden');
      this.score += 1500;
      this.gainShards(80);
      this.gainXp(180);
      this.kills++;
      this.sfx.bfgDetonate();
      this.addShake(24);
      this.hitStop = 0.12;
      this.flashAlpha = 0.5;
      this.flashColor = boss.color;
      this.spawnParticles(boss.x, boss.y - boss.h * 0.5, 90, boss.color, 480);
      this.pickups.push({ type: 'item', item: rollItem(this.luck() + 2), x: boss.x, y: boss.y - 60, vy: -300, life: 60 });
      this.setMsg('PIT GUARDIAN DEFEATED — a rare relic dropped!');
      return;
    }
    this.stage.bossDefeated = true;
    this.gainXp(220 + this.stageIndex * 60);
    this.score += 2000 * (this.stageIndex + 1);
    this.gainShards(65 + this.stageIndex * 20);
    this.kills++;
    this.sfx.bfgDetonate();
    this.addShake(26);
    this.hitStop = 0.14;
    this.flashAlpha = 0.55;
    this.flashColor = boss.color;
    this.spawnParticles(boss.x, boss.y - boss.h * 0.5, 95, boss.color, 480);
    this.spawnParticles(boss.x, boss.y - boss.h * 0.5, 55, '#ffffff', 360);

    document.getElementById('boss-hud')?.classList.add('hidden');

    const actStory = this.stage.actStory || ACT_STORIES[this.stageIndex] || ACT_STORIES[0];
    const postLines = actStory.bossPost || [];

    const afterPostDialogue = () => {
      if (this.bossRushMode) {
        if (this.stageIndex < 4) {
          this.toast('BOSS VANQUISHED!', `Advancing to Boss ${this.stageIndex + 2} / 5...`, '#ffd700');
          setTimeout(() => {
            if (this.rika.alive) this.loadStage(this.stageIndex + 1);
          }, 1200);
        } else {
          this.state = 'win';
          const stats = document.getElementById('win-stats');
          if (stats) {
            stats.textContent = `⚡ BOSS RUSH CONQUERED! ⚡ · TIME: ${Math.round(this.bossRushTimer || 0)}s · FINAL SCORE: ${this.score}`;
          }
          document.getElementById('screen-win')?.classList.remove('hidden');
        }
        return;
      }
      this.toast(`✦ ${actStory.verseName || 'VERSE RECLAIMED'}`, 'A fragment of Lyra’s soul returns to Rika’s heart.', '#e8b868');
      if (this.stageIndex < STAGE_DEFS.length - 1) {
        this.setMsg(`${boss.name} VANQUISHED! LEVEL ${this.stageIndex + 1} CLEARED!`);
        setTimeout(() => {
          if (this.rika.alive) {
            this.showLevelClearScreen(actStory);
          }
        }, 800);
      } else {
        this.setMsg('DAVOTH-OMEGA VANQUISHED! THE LULLABY OF ASH & BONE IS COMPLETE!');
        setTimeout(() => {
          this.state = 'win';
          const stats = document.getElementById('win-stats');
          if (stats) {
            stats.textContent = `FINAL SCORE: ${this.score} · DEMONS SLAIN: ${this.kills} · SOUL SHARDS: ${this.shards}`;
          }
          document.getElementById('screen-win')?.classList.remove('hidden');
        }, 1100);
      }
    };

    setTimeout(() => {
      if (this.rika.alive) {
        this.cutscene.playBossDefeat(boss, actStory, afterPostDialogue);
      }
    }, 1100);
  }

  showLevelClearScreen(actStory) {
    this.state = 'level_clear';
    this.mouseDown = false;
    for (const id of ['hud', 'boss-hud', 'screen-menu', 'screen-pause', 'screen-dead', 'screen-win', 'screen-upgrade', 'screen-merchant', 'screen-char', 'screen-boon', 'dialogue-modal']) {
      document.getElementById(id)?.classList.add('hidden');
    }

    const scr = document.getElementById('screen-level-clear');
    if (!scr) return;

    const lvlNum = this.stageIndex + 1;
    const titleEl = document.getElementById('clear-level-title');
    const verseEl = document.getElementById('clear-verse-title');
    const descEl = document.getElementById('clear-story-desc');
    const killsEl = document.getElementById('clear-stat-kills');
    const shardsEl = document.getElementById('clear-stat-shards');
    const scoreEl = document.getElementById('clear-stat-score');
    const sealEl = document.getElementById('clear-stat-seal');
    const proceedBtn = document.getElementById('btn-proceed-level');

    if (titleEl) titleEl.textContent = `LEVEL ${lvlNum} CLEARED!`;
    if (verseEl) verseEl.textContent = `✦ ${actStory?.verseName || 'VERSE OF LYRA RECOVERED'}`;
    if (descEl) descEl.textContent = `The seal of ${this.stage?.name || 'this dungeon'} is shattered. Rika reclaims the ${actStory?.verseName || 'verse'} and opens the descent to Level ${lvlNum + 1}.`;
    if (killsEl) killsEl.textContent = `${this.kills}`;
    if (shardsEl) shardsEl.textContent = `${this.shards} ◆`;
    if (scoreEl) scoreEl.textContent = `${this.score}`;
    if (sealEl) sealEl.textContent = `${lvlNum} / 5 RESTORED`;
    if (proceedBtn) {
      const nextStageDef = STAGE_DEFS[this.stageIndex + 1];
      proceedBtn.textContent = nextStageDef
        ? `PROCEED TO LEVEL ${lvlNum + 1}: ${nextStageDef.name} ▸`
        : 'PROCEED TO NEXT LEVEL ▸';
    }

    scr.classList.remove('hidden');
  }

  // ==========================================================================
  // COMBAT, COMBO RANK & WEAPON HELPERS
  // ==========================================================================
  setMsg(text) {
    const el = document.getElementById('messages');
    if (!el) return;
    el.textContent = text;
    el.style.opacity = '1';
    if (this.msgTimer) clearTimeout(this.msgTimer);
    this.msgTimer = setTimeout(() => {
      if (el) el.style.opacity = '0';
    }, 4500);
  }

  // Tip 2: Directional Impact Screenshake along impact vector
  addShake(amount, dirX = 0, dirY = 0) {
    this.shake = Math.min(32, Math.max(this.shake, amount));
    if (dirX !== 0 || dirY !== 0) {
      const len = Math.hypot(dirX, dirY) || 1;
      this.shakeDirX = dirX / len;
      this.shakeDirY = dirY / len;
    }
  }

  // Tip 4: Permanent Surface Blood & Ichor Splatters onto floors and platforms
  addDecal(x, y, type = 'blood', size = 16, color = '#78101a') {
    if (!this.stage) return;
    let surfaceY = this.stage.groundY;
    for (const p of this.stage.platforms || []) {
      if (p.gone) continue;
      if (x >= p.x - 8 && x <= p.x + p.w + 8 && Math.abs(y - p.y) < Math.abs(y - surfaceY)) {
        surfaceY = p.y;
      }
    }
    const decalY = Math.min(surfaceY, y + 12);
    this.decals.push({
      x,
      y: decalY,
      rx: size * (0.75 + Math.random() * 0.5),
      ry: size * 0.32 * (0.75 + Math.random() * 0.5),
      rotation: (Math.random() - 0.5) * 0.45,
      color,
      type,
      alpha: 0.68 + Math.random() * 0.24,
    });
    if (this.decals.length > 550) {
      this.decals.shift();
    }
  }

  spawnBloodDecalCluster(centerX, centerY, count = 6, color = '#8a121d') {
    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 64;
      const offsetY = Math.random() * 32;
      this.addDecal(centerX + offsetX, centerY + offsetY, 'blood', 9 + Math.random() * 14, color);
    }
  }

  // Tip 5: Slow-Motion Glory Kill Accents with 1.18x punch zoom
  triggerGloryKillJuice(x, y) {
    this.hitStop = 0.12;
    this.slomoTimer = 0.38;
    this.slomoScale = 0.22;
    this.camZoom = 1.18;
    this.flashAlpha = 0.45;
    this.flashColor = '#ff1e56';
    this.addShake(18, 0, 1);
    this.gainShards(16);
    this.addCombo(3);
    this.bump('gloryKills');
    this.progressObjective('glory');
    this.spawnParticles(x, y, 42, '#ff1e56', 380);
    this.spawnParticles(x, y, 24, '#2dff7a', 300);
    this.spawnParticles(x, y, 18, '#3af2ff', 280);
    this.spawnBloodDecalCluster(x, y, 12, '#9a1222');
    // DOOM Eternal Resource Pinata: Glory Kills shower Health Orbs & Ammo Bricks!
    this.pickups.push(
      { x: x - 22, y: y - 10, vy: -260, type: 'hp', life: 14 },
      { x: x + 22, y: y - 14, vy: -280, type: 'ammo', life: 14 }
    );
  }

  addCombo(amount = 1) {
    this.comboCount += amount;
    this.comboTimer = 4.5;
    this.setCounter('maxCombo', this.comboCount);
  }

  getComboInfo() {
    const c = this.comboCount;
    if (c >= 30) return { rank: 'SSS', title: 'ASHEN WARDEN!', mult: 2.2 };
    if (c >= 20) return { rank: 'SS', title: 'APOCALYPTIC!', mult: 1.85 };
    if (c >= 14) return { rank: 'S', title: 'SAVAGE!', mult: 1.6 };
    if (c >= 9) return { rank: 'A', title: 'ANNIHILATOR', mult: 1.4 };
    if (c >= 5) return { rank: 'B', title: 'BRUTAL', mult: 1.25 };
    if (c >= 2) return { rank: 'C', title: 'CARNAGE', mult: 1.1 };
    return { rank: 'D', title: 'DEADLY', mult: 1.0 };
  }

  getComboDamageMult() {
    return this.comboCount > 0 ? this.getComboInfo().mult : 1.0;
  }

  spawnParticles(x, y, count, color, speed = 200) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (0.25 + Math.random() * 0.85) * speed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 40,
        size: 2.5 + Math.random() * 4.5,
        color,
        life: 0.28 + Math.random() * 0.45,
        maxLife: 0.7,
      });
    }
  }

  spawnShell(x, y, vx, vy) {
    this.shells.push({
      x,
      y,
      vx,
      vy,
      rot: Math.random() * 6,
      vrot: (Math.random() - 0.5) * 22,
      life: 1.1,
    });
  }

  spawnBullet(b) {
    let color = b.color || '#ffaa22';
    let glow = b.glow || b.color || '#ff5500';
    const R = this.rika;
    let element = null;
    if (b.fromPlayer && R && !R.inMech) {
      const am = R.currentAmmo();
      if (am.element) {
        color = am.color;
        glow = am.glow;
        element = am.element;
      }
    }
    this.bullets.push({
      x: b.x,
      y: b.y,
      vx: b.vx,
      vy: b.vy,
      gravity: b.gravity || 0,
      dmg: b.dmg || 15,
      color,
      glow,
      element,
      radius: b.radius || 5,
      life: b.life || 2.2,
      bounce: b.fromPlayer && R ? R.stats.ricochet | 0 : 0,
      fromPlayer: !!b.fromPlayer,
      chain: !!b.chain,
      reflected: false,
      parryable: !!b.parryable,
      heavy: !!b.heavy,
      shooter: b.shooter || null,
    });
  }

  spawnHomingMissile(x, y, angle, dmg) {
    this.missiles.push({
      x,
      y,
      vx: Math.cos(angle) * 640,
      vy: Math.sin(angle) * 640,
      dmg,
      life: 2.4,
    });
  }

  spawnBFGOrb(orb) {
    this.bfgOrbs.push({
      x: orb.x,
      y: orb.y,
      vx: orb.vx,
      vy: orb.vy,
      dmg: orb.dmg,
      tendrilDps: orb.tendrilDps,
      radius: 20,
      life: 2.4,
    });
  }

  spawnGrenade(g) {
    this.grenades.push({
      x: g.x,
      y: g.y,
      vx: g.vx,
      vy: g.vy,
      radius: g.radius || 9,
      dmg: g.dmg || 90,
      blastRadius: g.blastRadius || 160,
      cluster: !!g.cluster,
      life: 1.5,
    });
  }

  fireRailBeam(x, y, angle, dmg) {
    const len = 1180;
    const x2 = x + Math.cos(angle) * len;
    const y2 = y + Math.sin(angle) * len;
    this.beams.push({
      x1: x,
      y1: y,
      x2,
      y2,
      color: '#3af2ff',
      width: 9,
      life: 0.22,
      maxLife: 0.22,
    });

    for (const e of this.enemies) {
      if (e.dead) continue;
      if (this.lineHitsRect(x, y, x2, y2, e.x - e.w * 0.5, e.y - e.h, e.w, e.h)) {
        this.damageEnemy(e, dmg, e.x, e.y - e.h * 0.5, true);
        this.spawnParticles(e.x, e.y - e.h * 0.5, 16, '#3af2ff', 260);
      }
    }
    this.checkBarrelsLine(x, y, x2, y2, dmg);
  }

  fireTeslaChain(x, y, angle, dmg) {
    // Find primary target near aim ray, then chain across up to 4 additional enemies!
    let currX = x;
    let currY = y;
    const hitSet = new Set();

    for (let hop = 0; hop < 5; hop++) {
      let best = null;
      let bestDist = hop === 0 ? 520 : 280;
      for (const e of this.enemies) {
        if (e.dead || hitSet.has(e)) continue;
        const ex = e.x;
        const ey = e.y - e.h * 0.5;
        const d = Math.hypot(ex - currX, ey - currY);
        if (hop === 0) {
          const angDiff = Math.abs(Math.atan2(ey - currY, ex - currX) - angle);
          if (angDiff > 0.65 && angDiff < Math.PI * 2 - 0.65) continue;
        }
        if (d < bestDist) {
          bestDist = d;
          best = e;
        }
      }

      if (!best) {
        if (hop === 0) {
          const endX = x + Math.cos(angle) * 380;
          const endY = y + Math.sin(angle) * 380;
          this.beams.push({
            x1: x,
            y1: y,
            x2: endX,
            y2: endY,
            color: '#b844ff',
            width: 5,
            life: 0.1,
            maxLife: 0.1,
          });
        }
        break;
      }

      hitSet.add(best);
      const nx = best.x;
      const ny = best.y - best.h * 0.5;
      this.beams.push({
        x1: currX,
        y1: currY,
        x2: nx,
        y2: ny,
        color: '#b844ff',
        width: 6 - hop * 0.8,
        life: 0.12,
        maxLife: 0.12,
      });
      this.damageEnemy(best, Math.round(dmg * Math.pow(0.85, hop)), nx, ny, hop === 0);
      this.spawnParticles(nx, ny, 5, '#b844ff', 180);
      currX = nx;
      currY = ny;
    }
  }

  updateRedEyeLaser(eyeX, eyeY, angle, dmgSlice) {
    const len = 1100;
    const x2 = eyeX + Math.cos(angle) * len;
    const y2 = eyeY + Math.sin(angle) * len;
    this.redEyeLaser = { x1: eyeX, y1: eyeY, x2, y2, timer: 0.06 };

    for (const e of this.enemies) {
      if (e.dead) continue;
      if (this.lineHitsRect(eyeX, eyeY, x2, y2, e.x - e.w * 0.5, e.y - e.h, e.w, e.h)) {
        this.damageEnemy(e, dmgSlice, e.x, e.y - e.h * 0.5, true, true);
        if (Math.random() < 0.35) {
          this.spawnParticles(e.x, e.y - e.h * 0.5, 3, '#ff1e38', 180);
        }
      }
    }
    this.checkBarrelsLine(eyeX, eyeY, x2, y2, dmgSlice * 2);
  }

  fireBossLaser(bx, by, angle, dt) {
    const len = 1100;
    const x2 = bx + Math.cos(angle) * len;
    const y2 = by + Math.sin(angle) * len;
    this.bossLaser = { x1: bx, y1: by, x2, y2, timer: 0.06 };

    const r = this.rika;
    if (this.lineHitsRect(bx, by, x2, y2, r.x - 18, r.y - 72, 36, 72)) {
      r.takeDamage(55 * dt, this);
    }
  }

  lineHitsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
    const cx = rx + rw * 0.5;
    const cy = ry + rh * 0.5;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / lenSq));
    const px = x1 + t * dx;
    const py = y1 + t * dy;
    return Math.abs(px - cx) <= rw * 0.65 && Math.abs(py - cy) <= rh * 0.65;
  }

  checkBarrelsLine(x1, y1, x2, y2, dmg) {
    if (!this.stage) return;
    for (const cr of this.stage.crates || []) {
      if (!cr.broken && this.lineHitsRect(x1, y1, x2, y2, cr.x - 16, cr.y - 30, 32, 30)) {
        cr.hp -= dmg;
        if (cr.hp <= 0) this.breakCrate(cr);
      }
    }
    for (const br of this.stage.barrels) {
      if (br.exploded) continue;
      if (this.lineHitsRect(x1, y1, x2, y2, br.x - 16, br.y - 38, 32, 38)) {
        br.hp -= dmg;
        if (br.hp <= 0) this.detonateBarrel(br);
      }
    }
    // Tip 42: Breakable Illusory Walls
    for (const bw of this.stage.breakableWalls || []) {
      if (!bw.broken && this.lineHitsRect(x1, y1, x2, y2, bw.x, bw.y, bw.w, bw.h)) {
        bw.hp -= dmg;
        bw.hitFlash = 0.2;
        this.spawnParticles(bw.x + bw.w * 0.5, bw.y + bw.h * 0.5, 6, '#8c765c', 140);
        this.sfx?.hit?.();
        if (bw.hp <= 0) {
          bw.broken = true;
          this.sfx?.explode?.();
          this.addShake(10);
          this.spawnParticles(bw.x + bw.w * 0.5, bw.y + bw.h * 0.5, 26, '#705c48', 250);
          this.setMsg('SECRET ALCOVE DISCOVERED!');
        }
      }
    }
    // Tip 46: Shootable Hanging Chain Traps
    for (const ch of this.stage.chains || []) {
      if (ch.trap && !ch.trapReleased && this.lineHitsRect(x1, y1, x2, y2, ch.x - 14, ch.cageY - 140, 28, 140)) {
        ch.trapReleased = true;
        this.sfx?.parry?.();
        this.floatingTexts.push({ x: ch.x, y: ch.cageY - 40, text: '⛓ CHAIN SNAPPED!', color: '#ffd700', life: 0.8 });
      }
    }
  }

  detonateBarrel(br) {
    if (br.exploded) return;
    br.exploded = true;
    this.sfx.explode();
    this.addShake(14);
    this.spawnParticles(br.x, br.y - 20, 42, '#ff6611', 360);
    this.spawnParticles(br.x, br.y - 20, 18, '#ffdd44', 240);

    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - br.x, (e.y - e.h * 0.5) - (br.y - 20));
      if (d < 195) {
        this.damageEnemy(e, 135, e.x, e.y - e.h * 0.5, true);
      }
    }
  }

  damageEnemy(e, amount, hitX, hitY, isCrit = false, continuous = false) {
    if (e.dead) return;
    const R = this.rika;
    if (!continuous) {
      if (!isCrit && Math.random() < R.stats.crit) {
        amount *= R.stats.critDmg;
        isCrit = true;
      }
      // DOOM Eternal Marauder Green-Eye Counter-Window: 2.2x Damage!
      if (e.bossId === 4 && e.greenEyeTimer > 0) {
        amount *= 2.2;
        isCrit = true;
        this.spawnParticles(hitX, hitY, 18, '#2dff7a', 280);
        this.floatText(e.x, e.y - e.h - 18, '★ PERFECT COUNTER x2.2!', '#2dff7a');
      }
      // Tip 33: Boss Posture Break Vulnerability Window: 2.2x Damage!
      if (e.isBoss && e.staggerTimer > 0) {
        amount *= 2.2;
        isCrit = true;
        this.spawnParticles(hitX, hitY, 14, '#ffd700', 240);
      }
      // Tip 34: Interruptible Boss Charge Attack Counter
      if (e.isBoss && e.interruptible) {
        e.interruptible = false;
        e.state = 'interrupted';
        e.stateTimer = 1.4;
        e.stagger = Math.min(e.maxStagger || 350, (e.stagger || 0) + 120);
        this.sfx?.bossStagger?.();
        this.addShake(16);
        this.floatingTexts.push({ x: e.x, y: e.y - e.h - 22, text: '⚡ COUNTER INTERRUPT! ⚡', color: '#ffd700', life: 1.0 });
        this.spawnParticles(hitX, hitY, 26, '#ffd700', 320);
      }
      // Tip 33: Stagger / Posture Accumulation on Bosses
      if (e.isBoss && e.staggerTimer <= 0 && !e.finisherReady) {
        const staggerAdd = (amount * 0.45) + (isCrit ? 35 : 0);
        e.stagger = (e.stagger || 0) + staggerAdd;
        if (e.stagger >= (e.maxStagger || 350)) {
          e.stagger = 0;
          e.staggerTimer = 4.0; // 4 second vulnerability stun
          this.sfx?.bossStagger?.();
          this.addShake(20);
          this.hitStop = Math.max(this.hitStop, 0.08);
          this.floatingTexts.push({ x: e.x, y: e.y - e.h - 26, text: '★ POSTURE SHATTERED! 2.2x VULNERABLE! ★', color: '#ffea44', life: 1.3 });
          this.spawnParticles(e.x, e.y - e.h * 0.5, 45, '#ffd700', 380);
        }
      }
      // DOOM Eternal Flame Belch Loop: hitting Burning demons sheds Armor/Shield shards!
      if (e.status && e.status.burn) {
        R.shield = Math.min(R.maxShield, R.shield + 4.5);
        this.spawnParticles(hitX, hitY, 4, '#3af2ff', 150);
      }
      amount = statusOnHit(e, amount, this);
      const el = R.currentAmmo().element;
      if (el && Math.random() < 0.3 * R.stats.statusChance) {
        applyStatus(e, el, 3.2 * R.stats.statusDur, this);
      }
      if (R.stats.lifesteal > 0) R.hp = Math.min(R.maxHp, R.hp + amount * R.stats.lifesteal);
    }
    if (e.armor) amount *= e.armor;
    e.hp -= amount;
    e.hitFlash = 0.18;
    e.hitCrit = isCrit;

    if (!continuous) {
      this.addCombo(1);
      // Tip 1: Micro Hitstop on solid hits (freeze-frame crunch)
      const stopDur = isCrit ? 0.055 : amount > 60 ? 0.038 : 0.022;
      this.hitStop = Math.max(this.hitStop, stopDur);

      // Tip 2: Directional Impact Screenshake along hit vector
      const hitDx = hitX - R.x;
      const hitDy = hitY - (R.y - 44);
      const hitDist = Math.hypot(hitDx, hitDy) || 1;
      const shakeAmt = isCrit ? 8.5 : amount > 50 ? 5.5 : 2.8;
      this.addShake(shakeAmt, hitDx / hitDist, hitDy / hitDist);

      // Tip 7: Mass-scaled knockback impulse
      const massMap = {
        drone: 0.65,
        spitter: 0.75,
        stalker: 0.9,
        sniper: 1.25,
        assassin: 1.35,
        pyro: 2.1,
        brute: 2.7,
        sentry: 3.0,
        archvile: 2.8,
      };
      const mass = e.isBoss ? 12.0 : (massMap[e.type] || 1.1);
      const impulse = Math.min(460, (amount * 5.2) / mass);
      const knockDirX = Math.sign(hitDx) || (e.facing ? -e.facing : 1);
      e.knockbackVx = (e.knockbackVx || 0) + knockDirX * impulse;
      e.knockbackVy = (e.knockbackVy || 0) - impulse * 0.26;

      // Tip 4: Spray permanent surface blood splatters on impactful hits
      if (amount > 30 || isCrit) {
        this.spawnBloodDecalCluster(hitX, hitY, isCrit ? 4 : 2, '#82101c');
      }
    }

    if (!continuous || Math.random() < 0.22) {
      this.floatingTexts.push({
        x: hitX + (Math.random() - 0.5) * 24,
        y: hitY - 12,
        text: `${Math.round(amount)}${isCrit ? '!' : ''}`,
        color: isCrit ? '#ffdd33' : '#ffffff',
        life: 0.65,
      });
    }

    if (!continuous) this.sfx.hit();

    if (e.hp <= 0) {
      if (e.isBoss) {
        // Tip 40: Kneeling Finisher Stance before true death
        if (!e.finisherReady && !e.finisherExecuted) {
          e.hp = 1;
          e.dead = false;
          e.finisherReady = true;
          e.finisherTimer = 4.2;
          this.cameraZoom = 1.22;
          this.timeDilation = 0.35;
          this.sfx?.bossStagger?.();
          this.floatingTexts.push({
            x: e.x,
            y: e.y - e.h - 32,
            text: '⚡ [X] SHATTER THE APOCALYPTIC SEAL ⚡',
            color: '#ffd24a',
            life: 2.5,
          });
          this.setMsg('⚡ PRESS [X] TO EXECUTE CRUCIBLE FINISHER! ⚡');
          return;
        }
        e.hp = 0;
        e.dead = true;
        this.spawnBloodDecalCluster(e.x, e.y - 12, 14, '#700c16');
        this.onStageBossDefeated(e);
        return;
      }

      e.hp = 0;
      e.dead = true;
      this.corpses.push({
        e: { ...e, dead: false, hitFlash: 0, telegraphing: false, enraged: false, elite: false, vx: 0 },
        t: 0,
        vy: e.flying ? -120 : 0,
      });
      // Tip 4: Rich permanent blood pool on surface when demon is banished
      this.spawnBloodDecalCluster(e.x, e.y - 12, 8, '#700c16');

      this.kills++;
      this.bump('kills');
      this.progressObjective('kills');
      this.score += Math.round((e.score || 150) * this.getComboDamageMult());
      this.gainShards(6);
      this.gainXp(e.elite ? 60 : 14 + this.stageIndex * 3);
      this.addCombo(2);
      this.spawnParticles(e.x, e.y - e.h * 0.5, 26, e.color, 280);

      if (e.elite) {
        this.bump('elites');
        this.progressObjective('elite');
        this.pickups.push({ type: 'item', item: rollItem(this.luck()), x: e.x, y: e.y - 30, vy: -300, life: 40 });
        this.toast('ELITE SLAIN', `${e.eliteLabel || 'Elite'} demon dropped a relic`, '#ffd24a');
        if (e.affix === 'explosive') {
          this.spawnParticles(e.x, e.y - 30, 40, '#ff6a2a', 360);
          this.addShake(12);
          this.sfx.explode();
          if (Math.hypot(this.rika.x - e.x, this.rika.y - 40 - (e.y - 30)) < 150) this.rika.takeDamage(30, this);
        }
      }
      if (R.stats.deathNova > 0 && !this._inNova && Math.random() < 0.5) {
        this._inNova = true;
        this.spawnParticles(e.x, e.y - 20, 22, '#ff9933', 300);
        for (const o of this.enemies) {
          if (!o.dead && o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 130) {
            this.damageEnemy(o, 40 * R.stats.deathNova, o.x, o.y - o.h * 0.5, false, true);
          }
        }
        this._inNova = false;
      }

      if (this.rika.perks.vampiric) {
        this.rika.hp = Math.min(this.rika.maxHp, this.rika.hp + 20);
        this.rika.shield = Math.min(this.rika.maxShield, this.rika.shield + 22);
      }

      if (Math.random() < 0.52) {
        const r = Math.random();
        this.pickups.push({
          x: e.x,
          y: e.y - 18,
          vy: -220,
          type: r < 0.32 ? 'hp' : r < 0.55 ? 'rage' : r < 0.8 ? 'shard' : 'ammo',
          life: 11,
        });
      }
    }
  }

  // ==========================================================================
  // MAIN GAME LOOP
  // ==========================================================================
  // ==========================================================================
  // MEGA SYSTEMS: relics, XP & skills, objectives, achievements, elemental
  // statuses, world events, merchant, arena waves, boons
  // ==========================================================================
  get diffDmg() {
    return this.diff.dmg;
  }

  luck() {
    return this.mode === 'arena' ? 1 + Math.floor(this.wave / 3) : this.stageIndex;
  }

  scaleEnemy(e) {
    e.maxHp = Math.round(e.maxHp * this.diff.hp);
    e.hp = e.maxHp;
    return e;
  }

  gainShards(n) {
    // Tip 10: Momentum multiplier bonus to Cinder shards based on combo rank
    const comboMult = this.comboCount >= 20 ? 1.5 : this.comboCount >= 10 ? 1.3 : this.comboCount >= 5 ? 1.15 : 1.0;
    const a = Math.round(n * this.rika.stats.shardMult * this.diff.shards * comboMult);
    this.shards += a;
    return a;
  }

  floatText(x, y, text, color = '#ffffff') {
    this.floatingTexts.push({ x, y, text, color, life: 0.9 });
  }

  toast(title, desc = '', color = '#ffd24a') {
    const stack = document.getElementById('toast-stack');
    if (!stack) return;
    const d = document.createElement('div');
    d.className = 'toast';
    d.style.borderLeftColor = color;
    d.innerHTML = `<div class="t-title" style="color:${color}">${title}</div>${desc ? `<div class="t-desc">${desc}</div>` : ''}`;
    stack.appendChild(d);
    setTimeout(() => d.remove(), 3800);
    while (stack.children.length > 5) stack.firstChild.remove();
  }

  loadSave() {
    try {
      this.unlocked = JSON.parse(localStorage.getItem('se_ach') || '{}');
      this.bestWave = Number(localStorage.getItem('se_best') || 0);
    } catch {
      this.unlocked = {};
      this.bestWave = 0;
    }
  }

  saveProgress() {
    try {
      localStorage.setItem('se_ach', JSON.stringify(this.unlocked));
      localStorage.setItem('se_best', String(this.bestWave));
    } catch { /* ignore */ }
  }

  refreshMenuRecords() {
    const bw = document.getElementById('best-wave');
    const ac = document.getElementById('ach-count');
    if (bw) bw.textContent = this.bestWave;
    if (ac) ac.textContent = `${Object.keys(this.unlocked).length}/${ACHIEVEMENTS.length}`;
  }

  bump(key, n = 1) {
    this.counters[key] = (this.counters[key] || 0) + n;
    this.checkAchievements();
  }

  setCounter(key, v) {
    if (v > (this.counters[key] || 0)) {
      this.counters[key] = v;
      this.checkAchievements();
    }
  }

  checkAchievements() {
    for (const a of ACHIEVEMENTS) {
      if (this.unlocked[a.id]) continue;
      if ((this.counters[a.key] || 0) >= a.goal) {
        this.unlocked[a.id] = true;
        this.saveProgress();
        this.shards += 25;
        this.toast(`★ ACHIEVEMENT: ${a.name}`, `${a.desc} (+25 shards)`, '#ffd24a');
        this.sfx.chestOpen();
      }
    }
  }

  recomputeStats() {
    const r = this.rika;
    r.stats = computeStats(r.skills, r.items);
    const s = r.stats;
    const dHp = s.hpBonus - r.appliedHp;
    r.maxHp = Math.max(40, r.maxHp + dHp);
    r.hp = Math.min(r.maxHp, r.hp + Math.max(0, dHp));
    r.appliedHp = s.hpBonus;
    const dSh = s.shieldBonus - r.appliedShield;
    r.maxShield += dSh;
    r.shield = Math.min(r.maxShield, r.shield + Math.max(0, dSh));
    r.appliedShield = s.shieldBonus;
    const dMag = s.magBonus - r.appliedMag;
    r.magMax += dMag;
    r.mag = Math.min(r.magMax, r.mag + Math.max(0, dMag));
    r.appliedMag = s.magBonus;
  }

  grantItem(item) {
    const r = this.rika;
    r.items[item.id] = (r.items[item.id] || 0) + 1;
    if (item.id === 'phoenix') r.reviveCharges++;
    this.recomputeStats();
    const rar = RARITY[item.rarity];
    this.toast(`${item.icon} ${item.name} [${rar.label}]`, item.desc, rar.color);
    this.sfx.powerup();
    this.setCounter('items', Object.values(r.items).reduce((a, b) => a + b, 0));
  }

  xpNeed(level) {
    return 60 + level * 40;
  }

  gainXp(n) {
    const r = this.rika;
    r.xp += n * r.stats.xpMult;
    let need = this.xpNeed(r.level);
    while (r.xp >= need) {
      r.xp -= need;
      r.level++;
      r.skillPoints++;
      r.hp = Math.min(r.maxHp, r.hp + r.maxHp * 0.3);
      this.sfx.levelUp();
      this.toast(`LEVEL ${r.level}!`, '+1 Skill Point — press [TAB] to spend it', '#3af2ff');
      this.setCounter('level', r.level);
      need = this.xpNeed(r.level);
    }
  }

  progressObjective(id, n = 1) {
    if (!this.stage || !this.stage.objectives) return;
    for (const o of this.stage.objectives) {
      if (o.id !== id || o.done) continue;
      o.progress = Math.min(o.goal, o.progress + n);
      if (o.progress >= o.goal) {
        o.done = true;
        this.gainShards(o.reward.shards);
        this.gainXp(o.reward.xp);
        this.bump('objectives');
        this.sfx.powerup();
        this.toast('OBJECTIVE COMPLETE', `${o.desc} — +${o.reward.shards}◆ +${o.reward.xp} XP`, '#66ffaa');
      }
    }
  }

  readLore() {
    const i = this.loreFound.length;
    if (i >= LORE.length) return;
    this.loreFound.push(LORE[i]);
    this.toast('DATA LOG RECOVERED', LORE[i], '#3af2ff');
  }

  // ---- Elemental status helpers ----
  applyStatusTo(e, type, dur) {
    applyStatus(e, type, dur * this.rika.stats.statusDur, this);
  }

  reaction(e, name, dmg, radius, color) {
    this.sfx.reaction();
    this.bump('reactions');
    this.floatText(e.x, e.y - e.h - 12, name, color);
    this.spawnParticles(e.x, e.y - e.h * 0.5, 30, color, 340);
    this.addShake(8);
    this.damageEnemy(e, dmg, e.x, e.y - e.h * 0.5, true, true);
    if (radius > 0) {
      for (const o of this.enemies) {
        if (o !== e && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < radius) {
          this.damageEnemy(o, dmg, o.x, o.y - o.h * 0.5, true, true);
        }
      }
    }
  }

  dotDamage(e, amt) {
    if (e.dead) return;
    e.dotAcc = (e.dotAcc || 0) + amt;
    if (e.dotAcc >= 6) {
      const a = e.dotAcc;
      e.dotAcc = 0;
      this.damageEnemy(e, a, e.x, e.y - e.h * 0.5, false, true);
    }
  }

  spreadBurn(e) {
    for (const o of this.enemies) {
      if (o !== e && !o.dead && !(o.status && o.status.burn) && Math.hypot(o.x - e.x, o.y - e.y) < 130) {
        applyStatus(o, 'burn', 2.5, this);
      }
    }
    for (const br of this.stage.barrels) {
      if (!br.exploded && Math.hypot(br.x - e.x, br.y - e.y) < 90) this.detonateBarrel(br);
    }
  }

  shockArc(e, dmg) {
    let best = null;
    let bd = 260;
    for (const o of this.enemies) {
      if (o === e || o.dead) continue;
      const d = Math.hypot(o.x - e.x, o.y - e.y);
      if (d < bd) { bd = d; best = o; }
    }
    if (!best) return;
    this.beams.push({ x1: e.x, y1: e.y - e.h * 0.5, x2: best.x, y2: best.y - best.h * 0.5, color: '#c06bff', width: 4, life: 0.14, maxLife: 0.14 });
    this.damageEnemy(best, dmg, best.x, best.y - best.h * 0.5, false, true);
  }

  stormBurst(x, y, n) {
    let hits = 0;
    const sorted = this.enemies
      .filter((e) => !e.dead && Math.hypot(e.x - x, e.y - y) < 420)
      .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
    for (const e of sorted) {
      if (hits >= 2 + n) break;
      hits++;
      this.beams.push({ x1: x, y1: y, x2: e.x, y2: e.y - e.h * 0.5, color: '#c06bff', width: 5, life: 0.18, maxLife: 0.18 });
      this.damageEnemy(e, 45 * n * this.rika.damageMult, e.x, e.y - e.h * 0.5, true, true);
      applyStatus(e, 'shock', 3, this);
    }
  }

  thornsBurst(x, y, n) {
    this.spawnParticles(x, y, 16, '#ff5a7a', 260);
    for (const e of this.enemies) {
      if (!e.dead && Math.hypot(e.x - x, e.y - e.h * 0.5 - y) < 140) {
        this.damageEnemy(e, 35 * n, e.x, e.y - e.h * 0.5, false, true);
      }
    }
  }

  miniBlast(x, y, dmg, radius) {
    this.spawnParticles(x, y, 14, '#ff9933', 260);
    this.sfx.explode();
    for (const e of this.enemies) {
      if (!e.dead && Math.hypot(e.x - x, e.y - e.h * 0.5 - y) < radius) {
        this.damageEnemy(e, dmg, e.x, e.y - e.h * 0.5, false, true);
      }
    }
  }

  phoenixRevive(x, y) {
    this.spawnParticles(x, y, 70, '#ffb630', 460);
    this.addShake(22);
    this.flashAlpha = 0.6;
    this.flashColor = '#ffb630';
    this.sfx.bfgDetonate();
    for (const e of this.enemies) {
      if (!e.dead && Math.hypot(e.x - x, e.y - e.h * 0.5 - y) < 300) {
        this.damageEnemy(e, 160, e.x, e.y - e.h * 0.5, true);
      }
    }
    this.toast('✦ PHOENIX CORE', 'You rose from the ashes!', '#ffb630');
  }

  bloatExplode(e) {
    if (e.dead) return;
    this.spawnParticles(e.x, e.y - 20, 36, '#ff6a2a', 340);
    this.addShake(9);
    this.sfx.explode();
    if (Math.hypot(this.rika.x - e.x, this.rika.y - 30 - (e.y - 22)) < 130) this.rika.takeDamage(32, this);
    this.damageEnemy(e, 99999, e.x, e.y - 20, false, true);
  }

  onPerfectParry(x, y) {
    this.hitStop = 0.12;
    this.flashAlpha = 0.28;
    this.flashColor = '#bff6ff';
    this.sfx.parry();
    this.bump('parries');
    this.progressObjective('parry');
    this.floatText(x, y - 50, 'PERFECT PARRY!', '#bff6ff');
    const r = this.rika;
    r.shield = r.maxShield;
    r.rage = Math.min(100, r.rage + 25);
    r.bladeCd = 0;
    for (const e of this.enemies) {
      if (!e.dead && Math.hypot(e.x - x, e.y - e.h * 0.5 - y) < 300) applyStatus(e, 'stun', 1.4, this);
    }
    this.spawnParticles(x, y, 24, '#bff6ff', 320);
  }

  bladeBreak(cx, cy, reach) {
    for (const cr of this.stage.crates || []) {
      if (!cr.broken && Math.hypot(cr.x - cx, cr.y - 15 - cy) < reach) this.breakCrate(cr);
    }
    for (const br of this.stage.barrels) {
      if (!br.exploded && Math.hypot(br.x - cx, br.y - 19 - cy) < reach) this.detonateBarrel(br);
    }
  }

  breakCrate(cr) {
    if (cr.broken) return;
    cr.broken = true;
    this.sfx.hit();
    this.spawnParticles(cr.x, cr.y - 15, 14, '#c8924a', 220);
    this.bump('crates');
    this.progressObjective('crates');
    const r = Math.random();
    const type = r < 0.08 ? 'item' : r < 0.4 ? 'shard' : r < 0.62 ? 'hp' : r < 0.82 ? 'ammo' : 'rage';
    this.pickups.push({
      x: cr.x,
      y: cr.y - 24,
      vy: -240,
      type,
      item: type === 'item' ? rollItem(this.luck()) : null,
      life: 14,
    });
  }

  // ---- Singularity Wells ----
  spawnWell(x, y) {
    this.wells.push({ x, y, t: 3.4, maxT: 3.4 });
    this.sfx.bfgShoot();
    this.spawnParticles(x, y, 20, '#b06bff', 260);
  }

  updateWells(dt) {
    for (let i = this.wells.length - 1; i >= 0; i--) {
      const w = this.wells[i];
      w.t -= dt;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const ex = e.x;
        const ey = e.y - e.h * 0.5;
        const dx = w.x - ex;
        const dy = w.y - ey;
        const d = Math.hypot(dx, dy);
        if (d < 340) {
          const pull = (e.isBoss ? 0.12 : 1) * 320 * (1.1 - d / 340);
          if (d > 12) {
            e.x += (dx / d) * pull * dt;
            if (e.flying) e.y += (dy / d) * pull * dt * 0.8;
          }
          this.damageEnemy(e, 40 * this.rika.damageMult * dt, ex, ey, false, true);
        }
      }
      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const b = this.bullets[j];
        if (!b.fromPlayer && Math.hypot(b.x - w.x, b.y - w.y) < 120) {
          this.bullets.splice(j, 1);
          if (Math.random() < 0.4) this.spawnParticles(b.x, b.y, 2, '#b06bff', 80);
        }
      }
      if (w.t <= 0) {
        this.sfx.explode();
        this.addShake(12);
        this.spawnParticles(w.x, w.y, 40, '#b06bff', 380);
        for (const e of this.enemies) {
          if (!e.dead && Math.hypot(e.x - w.x, e.y - e.h * 0.5 - w.y) < 230) {
            this.damageEnemy(e, 85 * this.rika.damageMult, e.x, e.y - e.h * 0.5, true);
          }
        }
        this.wells.splice(i, 1);
      }
    }
  }

  // ---- Per-frame world logic: crumble, beacons, hazards, ambush, monkey bars, gore nests, slipgates, supply drops, arena waves ----
  updateWorldSystems(dt) {
    const st = this.stage;
    const r = this.rika;
    this.updateWells(dt);

    if (this.monkeyCd > 0) this.monkeyCd = Math.max(0, this.monkeyCd - dt);
    if (this.slipgateCd > 0) this.slipgateCd = Math.max(0, this.slipgateCd - dt);

    // Rika's Journey Chronicle Milestones: trigger inner monologue as she explores each dungeon landmark!
    if (st.storyBeats && this.mode === 'campaign') {
      for (const beat of st.storyBeats) {
        if (!beat.triggered && r.x >= beat.x) {
          beat.triggered = true;
          this.showJourneyBeat(beat);
          break;
        }
      }
    }

    // Mid-Dungeon Warden Boss Encounter (halfway through each Act!)
    if (this.mode === 'campaign' && st.midBossTriggerX && !st.midBossSpawned && r.x >= st.midBossTriggerX) {
      st.midBossSpawned = true;
      const warden = createMidBoss(this.stageIndex, st);
      this.scaleEnemy(warden);
      st.midBoss = warden;
      this.enemies.push(warden);
      this.sfx.bossRoar();
      this.addShake(14);
      const actStory = st.actStory || ACT_STORIES[this.stageIndex];
      if (actStory?.midBoss?.pre) {
        this.cutscene.playMidBoss(warden, actStory.midBoss.pre, () => {
          this.toast(`⚔ WARDEN ENGAGED: ${warden.name}`, 'Slay the Mid-Dungeon Warden to unseal the Inner Sanctum!', '#e6b868');
        });
      }
    }
    if (st.midBoss && st.midBoss.dead && !st.midBossDefeated) {
      st.midBossDefeated = true;
      this.gainShards(55);
      this.gainXp(140);
      this.pickups.push({ type: 'item', item: rollItem(this.luck() + 1), x: st.midBoss.x, y: st.midBoss.y - 45, vy: -320, life: 45 });
      this.toast('★ DUNGEON WARDEN VANQUISHED!', 'The Inner Sanctum is open · Relic & +55 Soul Shards dropped!', '#e6b868');
    }

    // DOOM Eternal Monkey Bars: automatic aerial swing & vault when jumping through!
    if ((this.monkeyCd || 0) <= 0 && !r.onGround && st.monkeyBars) {
      for (const mb of st.monkeyBars) {
        const cx = mb.x + mb.w * 0.5;
        if (Math.abs(r.x - cx) < mb.w * 0.5 + 16 && Math.abs((r.y - 38) - mb.y) < 30) {
          this.monkeyCd = 0.55;
          r.vy = -660;
          r.vx = r.facing * 620;
          r.jumpsLeft = r.perks.tripleJump ? 2 : 1;
          r.dashCd = 0;
          this.sfx.grapple();
          this.spawnParticles(cx, mb.y, 18, '#ffd24a', 260);
          this.floatText(cx, mb.y - 18, 'MONKEY-BAR VAULT!', '#ffd24a');
          break;
        }
      }
    }

    // Demonic Gore Nests: check if active Gore-Nest wave is cleared!
    for (const gn of st.goreNests || []) {
      if (gn.ripped && !gn.cleared && !this.enemies.some((e) => !e.dead && e.goreNestId === gn.id)) {
        gn.cleared = true;
        this.progressObjective('ambush');
        this.gainShards(45);
        this.gainXp(110);
        r.maxHp += 20;
        r.hp = r.maxHp;
        r.shield = r.maxShield;
        this.sfx.levelUp();
        this.spawnParticles(gn.x, gn.y - 30, 45, '#2dff7a', 340);
        this.pickups.push({ type: 'item', item: rollItem(this.luck() + 1), x: gn.x, y: gn.y - 45, vy: -320, life: 45 });
        this.toast('★ GORE NEST PURGED!', '+20 Max HP, Full Restore & Demonic Relic Dropped!', '#2dff7a');
      }
    }

    // Crumbling platforms
    for (const p of st.platforms) {
      if (!p.crumble) continue;
      if (p.gone) {
        p.respawnT -= dt;
        if (p.respawnT <= 0) {
          p.gone = false;
          p.crumbleT = 0;
        }
      } else if (r.standingPlat === p) {
        p.crumbleT += dt;
        if (p.crumbleT > 0.7) {
          p.gone = true;
          p.respawnT = 5;
          this.spawnParticles(p.x + p.w * 0.5, p.y, 16, '#8a7a6a', 200);
        }
      } else if (p.crumbleT > 0) {
        p.crumbleT = Math.max(0, p.crumbleT - dt * 0.5);
      }
    }

    // Beacons / checkpoints
    for (const b of st.beacons) {
      if (!b.lit && Math.abs(r.x - b.x) < 70 && r.y >= st.groundY - 120) {
        b.lit = true;
        st.checkpointX = b.x;
        r.hp = Math.min(r.maxHp, r.hp + r.maxHp * 0.4);
        r.shield = r.maxShield;
        r.mag = r.magMax;
        this.sfx.powerup();
        this.spawnParticles(b.x, st.groundY - 70, 24, '#3af2ff', 260);
        this.toast('BEACON ACTIVATED', 'Checkpoint saved · +40% HP · ammo restocked', '#3af2ff');
      }
    }

    // Floor spikes
    for (const sp of st.spikes) {
      if (r.x > sp.x && r.x < sp.x + sp.w && r.y >= st.groundY - 18 && r.invulnTimer <= 0 && r.dashTimer <= 0) {
        r.takeDamage(22, this);
        r.vy = -460;
        r.onGround = false;
      }
    }

    // Laser gates (timed): jump over, dash through while off, or Phase Dash through while on
    for (const l of st.lasers) {
      const ph = (this.time + l.offset) % l.period;
      l.active = ph < l.onFor;
      l.warn = !l.active && ph > l.period - 0.6;
      if (l.active && Math.abs(r.x - l.x) < 16 && r.y > l.y - l.h) r.takeDamage(26, this);
    }

    // Ambush encounters
    for (const a of st.ambushes) {
      if (!a.triggered && r.x > a.x && !st.bossSpawned) {
        a.triggered = true;
        this.sfx.bossRoar();
        this.addShake(10);
        this.setMsg('AMBUSH! Demons are closing in from both sides!');
        this.toast('AMBUSH!', 'Defeat them all for a relic drop', '#ff6a6a');
        for (let i = 0; i < 6; i++) {
          let x = i % 2 === 0 ? r.x - 620 - i * 40 : r.x + 620 + i * 40;
          x = Math.max(80, Math.min(st.bossTriggerX - 220, x));
          const type = st.roster[Math.floor(Math.random() * st.roster.length)];
          const e = createEnemy(type, x, type === 'drone' ? st.groundY - 200 : st.groundY, this.stageIndex);
          if (i === 0 && type !== 'drone' && type !== 'sentry') makeElite(e);
          e.ambushId = a.id;
          this.scaleEnemy(e);
          this.enemies.push(e);
        }
      }
      if (a.triggered && !a.done && !this.enemies.some((e) => !e.dead && e.ambushId === a.id)) {
        a.done = true;
        this.progressObjective('ambush');
        this.pickups.push({ type: 'item', item: rollItem(this.luck()), x: r.x, y: r.y - 50, vy: -300, life: 40 });
        this.toast('AMBUSH CLEARED', 'A relic dropped!', '#66ffaa');
      }
    }

    // Random supply drops
    if (!st.bossSpawned || this.mode === 'arena') {
      this.supplyTimer -= dt;
      if (this.supplyTimer <= 0) {
        this.supplyTimer = 55 + Math.random() * 25;
        const maxX = (this.mode === 'arena' ? st.width : st.bossTriggerX - 300) - 120;
        const x = Math.max(120, Math.min(maxX, r.x + (Math.random() < 0.5 ? -1 : 1) * (300 + Math.random() * 200)));
        st.chests.push({ x, y: st.groundY, opened: false, mimic: false, drop: true, shards: 30 + this.stageIndex * 8 });
        this.spawnParticles(x, st.groundY - 20, 24, '#ffd24a', 280);
        this.addShake(6);
        this.toast('SUPPLY DROP', 'A crate landed nearby — open it with [G] or shoot it', '#ffd24a');
      }
    }

    // Arena wave director
    if (this.mode === 'arena') {
      const alive = this.enemies.some((e) => !e.dead);
      if (this.waveState === 'fighting' && !alive) {
        this.waveState = 'break';
        this.waveTimer = 1.6;
        const w = this.wave;
        this.gainShards(18 + w * 4);
        this.gainXp(40 + w * 12);
        this.score += 300 * w;
        r.hp = Math.min(r.maxHp, r.hp + r.maxHp * 0.25);
        this.enemies = this.enemies.filter((e) => !e.dead);
        this.toast(`WAVE ${w} CLEARED`, 'Choose a relic…', '#66ffaa');
      } else if (this.waveState === 'break') {
        this.waveTimer -= dt;
        if (this.waveTimer <= 0) {
          this.waveState = 'choose';
          if (this.wave > 0) this.showBoonChoice(() => this.startNextWave(), 'PICK ONE RELIC FOR THE NEXT WAVE');
          else this.startNextWave();
        }
      }
    }
  }

  // ---- Survival Arena ----
  startArena() {
    this.mode = 'arena';
    this.expansion.onLoadStage(null, -1, 'arena');
    this.horror.onStage();
    this.diff = DIFFICULTIES[this.diffKey];
    this.score = 0;
    this.kills = 0;
    this.shards = 60;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.counters = {};
    this.loreFound = [];
    this.stageIndex = 0;
    this.rika = new Rika2D(300, 640, this.sfx);
    this.expansion?.applyLoadout(this.rika);
    this.recomputeStats();
    this.stage = buildArenaStage();
    this.enemies = this.stage.enemies;
    this.bullets = [];
    this.missiles = [];
    this.bfgOrbs = [];
    this.grenades = [];
    this.beams = [];
    this.particles = [];
    this.shells = [];
    this.pickups = [];
    this.floatingTexts = [];
    this.corpses = [];
    this.wells = [];
    this.redEyeLaser = null;
    this.bossLaser = null;
    this.supplyTimer = 40;
    this.wave = 0;
    this.waveState = 'break';
    this.waveTimer = 1.5;
    this.waveTotal = 1;
    this.rika.healFullForNextStage(300, this.stage.groundY);
    this.camX = 0;
    this.camY = 0;
    this.state = 'playing';
    for (const id of ['screen-menu', 'screen-pause', 'screen-dead', 'screen-win', 'screen-upgrade', 'screen-merchant', 'screen-char', 'screen-boon']) {
      document.getElementById(id)?.classList.add('hidden');
    }
    document.getElementById('hud')?.classList.remove('hidden');
    document.getElementById('boss-hud')?.classList.add('hidden');
    this.sfx.startMusic(5);
    this.setMsg('SURVIVAL ARENA — survive endless waves, a boss arrives every 5th wave. Merchant Kess is at the left!');
  }

  startNextWave() {
    const st = this.stage;
    this.wave++;
    const w = this.wave;
    this.waveState = 'fighting';
    this.state = 'playing';
    st.merchant.stock = null;
    this.setCounter('wave', w);
    if (w > this.bestWave) {
      this.bestWave = w;
      this.saveProgress();
    }
    const banner = document.getElementById('stage-banner');
    const bTitle = document.getElementById('banner-title');
    const bSub = document.getElementById('banner-sub');
    if (banner && bTitle && bSub) {
      bTitle.textContent = w % 5 === 0 ? `WAVE ${w} · BOSS` : `WAVE ${w}`;
      bSub.textContent = 'SURVIVE';
      banner.classList.remove('hidden');
      setTimeout(() => banner.classList.add('hidden'), 1800);
    }

    let count = Math.min(26, 3 + Math.floor(w * 1.7));
    if (w % 5 === 0) {
      const cycle = Math.floor(w / 5) - 1;
      const boss = createStageBoss(cycle % 5, st);
      boss.maxHp = Math.round(boss.maxHp * (1 + Math.floor(cycle / 5) * 0.4));
      boss.hp = boss.maxHp;
      this.scaleEnemy(boss);
      st.boss = boss;
      this.enemies.push(boss);
      this.bossLagPct = 100;
      document.getElementById('boss-hud')?.classList.remove('hidden');
      this.sfx.bossRoar();
      this.addShake(16);
      count = 4;
    }

    const tier = Math.min(4, Math.floor(w / 3));
    for (let i = 0; i < count; i++) {
      const type = st.roster[Math.floor(Math.random() * st.roster.length)];
      let x = 100 + Math.random() * (st.width - 200);
      if (Math.abs(x - this.rika.x) < 520) x = this.rika.x < st.width / 2 ? st.width - 140 - Math.random() * 200 : 140 + Math.random() * 200;
      const e = createEnemy(type, x, type === 'drone' ? st.groundY - 200 : st.groundY, tier);
      if (type !== 'drone' && type !== 'sentry' && Math.random() < Math.min(0.4, 0.06 + w * 0.02)) makeElite(e);
      e.maxHp = Math.round(e.maxHp * (1 + w * 0.05));
      e.hp = e.maxHp;
      this.scaleEnemy(e);
      this.enemies.push(e);
    }
    this.waveTotal = Math.max(1, this.enemies.filter((e) => !e.dead).length);
    this.setMsg(`WAVE ${w} — ${this.waveTotal} hostiles inbound!`);
  }

  // ---- Boon (pick 1 of 3 relics, Hades style) ----
  showBoonChoice(cb, sub = 'PICK ONE RELIC') {
    this.state = 'boon';
    this.mouseDown = false;
    const wrap = document.getElementById('boon-cards');
    const subEl = document.getElementById('boon-sub');
    if (!wrap) { cb?.(); return; }
    if (subEl) subEl.textContent = sub;
    const picks = [];
    let guard = 0;
    while (picks.length < 3 && guard++ < 60) {
      const it = rollItem(this.luck());
      if (!picks.includes(it)) picks.push(it);
    }
    wrap.innerHTML = '';
    for (const it of picks) {
      const rar = RARITY[it.rarity];
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.style.borderColor = rar.color;
      const owned = this.rika.items[it.id] || 0;
      card.innerHTML = `<span class="rarity" style="color:${rar.color}">${rar.label}${owned ? ` · OWNED x${owned}` : ''}</span><h3>${it.icon} ${it.name}</h3><p>${it.desc}</p>`;
      card.addEventListener('click', () => {
        this.grantItem(it);
        document.getElementById('screen-boon')?.classList.add('hidden');
        this.state = 'playing';
        cb?.();
      });
      wrap.appendChild(card);
    }
    document.getElementById('screen-boon')?.classList.remove('hidden');
  }

  // ---- Merchant ----
  openMerchant() {
    const m = this.stage.merchant;
    if (!m) return;
    if (!m.stock) {
      const mk = (item) => ({ kind: 'item', item, cost: Math.round(RARITY[item.rarity].price * (0.9 + Math.random() * 0.3)), sold: false });
      m.stock = [
        { kind: 'heal', name: 'FIELD MEDKIT', desc: 'Restore full HP & Shield.', cost: 30, sold: false, repeat: true },
        { kind: 'ammo', name: 'AMMO CACHE', desc: 'Refill magazine and reset Cluster / Dome / Well cooldowns.', cost: 25, sold: false, repeat: true },
        mk(rollItem(this.luck())),
        mk(rollItem(this.luck())),
        { kind: 'skill', name: 'SKILL MANUAL', desc: '+1 Skill Point.', cost: 110, sold: false },
      ];
    }
    this.state = 'merchant';
    this.mouseDown = false;
    const line = document.getElementById('merchant-line');
    if (line) line.textContent = MERCHANT_LINES[this.mode === 'arena' ? 5 : Math.min(this.stageIndex, 4)];
    document.getElementById('screen-merchant')?.classList.remove('hidden');
    this.renderMerchant();
  }

  renderMerchant() {
    const m = this.stage.merchant;
    const wrap = document.getElementById('merchant-items');
    const sh = document.getElementById('merchant-shards');
    if (sh) sh.textContent = this.shards;
    if (!wrap || !m) return;
    wrap.innerHTML = '';
    for (const s of m.stock) {
      const div = document.createElement('div');
      div.className = 'shop-item';
      let title;
      let desc;
      let color = '#ffd24a';
      if (s.kind === 'item') {
        const rar = RARITY[s.item.rarity];
        title = `${s.item.icon} ${s.item.name}`;
        desc = s.item.desc;
        color = rar.color;
      } else {
        title = s.name;
        desc = s.desc;
      }
      const sold = s.sold && !s.repeat;
      div.innerHTML = `<h4 style="color:${color}">${title}</h4><p>${desc}</p><div class="cost">${sold ? 'SOLD OUT' : `${s.cost} ◆ SHARDS`}</div>`;
      if (sold || this.shards < s.cost) div.style.opacity = '0.5';
      div.addEventListener('click', () => {
        if (sold || this.shards < s.cost) return;
        this.shards -= s.cost;
        const r = this.rika;
        if (s.kind === 'heal') {
          r.hp = r.maxHp;
          r.shield = r.maxShield;
        } else if (s.kind === 'ammo') {
          r.mag = r.magMax;
          r.grenadeCd = 0;
          r.aegisCd = 0;
          r.wellCd = 0;
        } else if (s.kind === 'skill') {
          r.skillPoints++;
        } else if (s.kind === 'item') {
          this.grantItem(s.item);
        }
        if (!s.repeat) s.sold = true;
        this.sfx.chestOpen();
        this.renderMerchant();
      });
      wrap.appendChild(div);
    }
  }

  closeMerchant() {
    if (this.state !== 'merchant') return;
    this.state = 'playing';
    document.getElementById('screen-merchant')?.classList.add('hidden');
  }

  // ---- Character screen ----
  openChar() {
    this.state = 'char';
    this.mouseDown = false;
    document.getElementById('screen-char')?.classList.remove('hidden');
    this.renderChar();
  }

  closeChar() {
    if (this.state !== 'char') return;
    this.state = 'playing';
    document.getElementById('screen-char')?.classList.add('hidden');
  }

  renderChar() {
    const r = this.rika;
    const body = document.getElementById('char-body');
    if (!body) return;
    const s = r.stats;
    const need = this.xpNeed(r.level);
    const branches = {};
    for (const sk of SKILLS) (branches[sk.branch] = branches[sk.branch] || []).push(sk);
    let skillsHtml = '';
    for (const [name, list] of Object.entries(branches)) {
      skillsHtml += `<div class="skill-branch">${name}</div>`;
      for (const sk of list) {
        const rank = r.skills[sk.id] | 0;
        skillsHtml += `<div class="skill-row ${rank >= sk.max ? 'maxed' : ''}" data-skill="${sk.id}"><span>${sk.name}<small>${sk.desc}</small></span><b>${rank}/${sk.max}</b></div>`;
      }
    }
    const owned = ITEMS.filter((i) => r.items[i.id] > 0);
    const relics = owned
      .map((i) => `<div class="relic-row" style="color:${RARITY[i.rarity].color}">${i.icon} ${i.name} x${r.items[i.id]}<small>${i.desc}</small></div>`)
      .join('');
    const gotCount = Object.keys(this.unlocked).length;
    const ach = ACHIEVEMENTS.map((a) => `<div class="ach-row ${this.unlocked[a.id] ? 'got' : ''}">${this.unlocked[a.id] ? '★' : '☆'} ${a.name} — ${a.desc}</div>`).join('');
    const lore = this.loreFound.map((l) => `<div class="lore-row">${l}</div>`).join('') || '<div class="lore-row">Commune with Whispering Stones [G] to recover ancient lore.</div>';
    const jLog = this.journeyLog.map((j) => `<div class="lore-row">${j}</div>`).join('') || '<div class="lore-row">Venture deeper into the catacombs to record Rika’s journey.</div>';
    body.innerHTML = `
      <div class="char-head">LEVEL ${r.level} · VIGIL XP ${Math.floor(r.xp)}/${need} · SKILL POINTS: <b>${r.skillPoints}</b><br/>
      DMG x${r.damageMult.toFixed(2)} · CRIT ${(s.crit * 100).toFixed(0)}% (x${s.critDmg.toFixed(2)}) · LIFESTEAL ${(s.lifesteal * 100).toFixed(0)}% · COOLDOWN x${s.cdr.toFixed(2)} · SPEED x${s.move.toFixed(2)}</div>
      <div class="char-cols">
        <div class="char-col"><h3>VIGIL VOWS (click to spend points)</h3>${skillsHtml}</div>
        <div class="char-col"><h3>RELICS (${owned.length})</h3>${relics || '<div class="relic-row">None yet — slay Possessed Demons, open coffers, purge Blood Altars.</div>'}<h3 style="margin-top:12px">RIKA’S JOURNEY CHRONICLE</h3>${jLog}<h3 style="margin-top:12px">WHISPERING STONES</h3>${lore}</div>
        <div class="char-col"><h3>OATHS FULFILLED (${gotCount}/${ACHIEVEMENTS.length})</h3>${ach}</div>
      </div>`;
    body.querySelectorAll('[data-skill]').forEach((el) => {
      el.addEventListener('click', () => {
        const sk = SKILLS.find((x) => x.id === el.dataset.skill);
        const rank = r.skills[sk.id] | 0;
        if (r.skillPoints > 0 && rank < sk.max) {
          r.skillPoints--;
          r.skills[sk.id] = rank + 1;
          this.recomputeStats();
          this.sfx.powerup();
          this.renderChar();
        }
      });
    });
  }

  // ---- Extra HUD ----
  syncExtraHUD() {
    const r = this.rika;
    const st = this.stage;
    const xpBar = document.getElementById('bar-xp');
    if (xpBar) xpBar.style.width = `${(r.xp / this.xpNeed(r.level)) * 100}%`;
    const xpTxt = document.getElementById('txt-xp');
    if (xpTxt) xpTxt.textContent = `LV ${r.level}${r.skillPoints > 0 ? ' ★' : ''}`;

    const am = r.currentAmmo();
    const amEl = document.getElementById('ammo-type');
    if (amEl) {
      amEl.textContent = am.name;
      amEl.style.color = am.color;
    }
    const cdWell = document.getElementById('cd-well');
    if (cdWell) cdWell.style.height = `${(r.wellCd / r.wellMaxCd) * 100}%`;

    let html;
    if (this.mode === 'arena') {
      const alive = this.enemies.filter((e) => !e.dead).length;
      html = `<div class="obj-title">SURVIVAL ARENA</div><div class="obj-row"><span>Wave</span><b>${this.wave}</b></div><div class="obj-row"><span>Hostiles left</span><b>${alive}</b></div><div class="obj-row"><span>Best wave</span><b>${this.bestWave}</b></div>`;
      const badge = document.getElementById('stage-badge');
      if (badge) badge.textContent = `ARENA · WAVE ${this.wave}`;
    } else {
      html = '<div class="obj-title">SIDE OBJECTIVES</div>' + st.objectives
        .map((o) => `<div class="obj-row ${o.done ? 'done' : ''}"><span>${o.desc}</span><b>${o.progress}/${o.goal}</b></div>`)
        .join('');
    }
    if (html !== this._objHtml) {
      this._objHtml = html;
      const el = document.getElementById('objectives-panel');
      if (el) el.innerHTML = html;
    }

    const chips = ITEMS.filter((i) => r.items[i.id] > 0)
      .map((i) => `<span class="item-chip" style="color:${RARITY[i.rarity].color}" title="${i.name}: ${i.desc}">${i.icon}${r.items[i.id] > 1 ? '×' + r.items[i.id] : ''}</span>`)
      .join('');
    if (chips !== this._chipHtml) {
      this._chipHtml = chips;
      const el = document.getElementById('item-strip');
      if (el) el.innerHTML = chips;
    }
  }

  drawStatusOverlay(ctx, e) {
    if (e.dead || !e.status) return;
    let i = 0;
    for (const t of Object.keys(e.status)) {
      const info = STATUS_INFO[t];
      if (!info) continue;
      ctx.fillStyle = info.color;
      ctx.beginPath();
      ctx.arc(e.x - 12 + i * 11, e.y - e.h - 26, 4, 0, Math.PI * 2);
      ctx.fill();
      i++;
    }
    if (e.status.freeze) {
      ctx.fillStyle = 'rgba(150, 240, 255, 0.4)';
      ctx.fillRect(e.x - e.w / 2 - 3, e.y - e.h - 3, e.w + 6, e.h + 3);
    }
    if (e.status.burn) {
      ctx.fillStyle = 'rgba(255, 120, 30, 0.22)';
      ctx.fillRect(e.x - e.w / 2, e.y - e.h, e.w, e.h);
    }
    if (e.status.poison) {
      ctx.fillStyle = 'rgba(120, 255, 60, 0.18)';
      ctx.fillRect(e.x - e.w / 2, e.y - e.h, e.w, e.h);
    }
  }

  renderWorldExtras(ctx) {
    const st = this.stage;

    // Tip 72: Low-Lying Creeping Mist along Catacomb Floors
    ctx.save();
    ctx.fillStyle = 'rgba(180, 160, 140, 0.08)';
    const mistBaseY = st.groundY - 14;
    for (let mx = this.camX - 80; mx < this.camX + this.viewW + 80; mx += 100) {
      const mistOff = Math.sin((mx + this.time * 36) * 0.018) * 10;
      ctx.beginPath();
      ctx.ellipse(mx, mistBaseY + mistOff, 75, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Tip 42: Breakable Illusory Masonry Walls
    if (st.breakableWalls) {
      for (const bw of st.breakableWalls) {
        if (bw.broken) continue;
        ctx.save();
        ctx.fillStyle = bw.hitFlash > 0 ? '#d4bda8' : '#281d17';
        ctx.strokeStyle = '#6e523c';
        ctx.lineWidth = 2.5;
        ctx.fillRect(bw.x, bw.y, bw.w, bw.h);
        ctx.strokeRect(bw.x, bw.y, bw.w, bw.h);
        // Cracked stone fissure details
        ctx.strokeStyle = '#a67d58';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bw.x + 6, bw.y + 24);
        ctx.lineTo(bw.x + 22, bw.y + 60);
        ctx.lineTo(bw.x + 10, bw.y + 110);
        ctx.lineTo(bw.x + 24, bw.y + 155);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Tip 44: Pre-Boss Sanctuary Chapel
    if (st.sanctuary) {
      const sx = st.sanctuary.x;
      const sy = st.groundY;
      ctx.save();
      // Glowing stained glass cathedral arched backdrop
      ctx.fillStyle = 'rgba(212, 160, 60, 0.12)';
      ctx.beginPath();
      ctx.arc(sx, sy - 90, 60, Math.PI, 0);
      ctx.lineTo(sx + 60, sy);
      ctx.lineTo(sx - 60, sy);
      ctx.closePath();
      ctx.fill();
      // Chapel Stone Altar & Communion Vessel
      ctx.fillStyle = '#2a221b';
      ctx.strokeStyle = '#c89642';
      ctx.lineWidth = 2;
      ctx.fillRect(sx - 36, sy - 34, 72, 34);
      ctx.strokeRect(sx - 36, sy - 34, 72, 34);
      // Flickering votive candle cluster
      for (let c = -3; c <= 3; c++) {
        const cx = sx + c * 12;
        const cy = sy - 34;
        ctx.fillStyle = '#ffeedd';
        ctx.fillRect(cx - 2, cy - 8, 4, 8);
        ctx.fillStyle = '#ffaa33';
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(cx, cy - 11 + Math.sin(this.time * 9 + c) * 1.5, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#e6b868';
      ctx.font = 'bold 11px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('SANCTUARY CHAPEL [G]', sx, sy - 85);
      ctx.restore();
    }

    // Tip 49: Environmental Lore Tablets (Ancient Obelisks)
    if (st.loreTablets) {
      for (const lt of st.loreTablets) {
        ctx.save();
        ctx.fillStyle = '#1c1612';
        ctx.strokeStyle = lt.read ? '#6c5844' : '#e6a844';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lt.x - 14, lt.y);
        ctx.lineTo(lt.x - 10, lt.y - 68);
        ctx.lineTo(lt.x, lt.y - 82);
        ctx.lineTo(lt.x + 10, lt.y - 68);
        ctx.lineTo(lt.x + 14, lt.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Glowing glyph
        ctx.fillStyle = lt.read ? '#8c7658' : '#ffd24a';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🕮', lt.x, lt.y - 36);
        ctx.restore();
      }
    }

    // Tip 57: Ashen Cairn Blood Echo
    if (this.ashenCairn && this.ashenCairn.stageIndex === this.stageIndex) {
      ctx.save();
      const ac = this.ashenCairn;
      ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
      ctx.beginPath();
      ctx.arc(ac.x, ac.y - 20, 28 + Math.sin(this.time * 6) * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 18;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('☥', ac.x, ac.y - 18 + Math.sin(this.time * 4) * 5);
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`ASHEN CAIRN (${ac.shards} SOULS)`, ac.x, ac.y - 48);
      ctx.restore();
    }

    // Hanging Wrought-Iron Chains & Skeleton Cages from the Vault Ceiling
    for (const chn of st.chains || []) {
      ctx.save();
      const sway = Math.sin(this.time * 1.6 + chn.x * 0.01) * 6;
      ctx.strokeStyle = '#3a3028';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(chn.x, st.groundY - 620);
      ctx.quadraticCurveTo(chn.x + sway * 0.5, st.groundY - 620 + (chn.h || 180) * 0.5, chn.x + sway, st.groundY - 620 + (chn.h || 180));
      ctx.stroke();
      if (chn.cage || chn.trap) {
        const cx = chn.x + sway;
        const cy = chn.cageY || (st.groundY - 620 + (chn.h || 180));
        ctx.fillStyle = '#1b1512';
        ctx.strokeStyle = chn.trap ? '#b86638' : '#524336';
        ctx.lineWidth = 2;
        ctx.fillRect(cx - 14, cy, 28, 38);
        ctx.strokeRect(cx - 14, cy, 28, 38);
        ctx.beginPath();
        ctx.moveTo(cx - 7, cy);
        ctx.lineTo(cx - 7, cy + 38);
        ctx.moveTo(cx + 7, cy);
        ctx.lineTo(cx + 7, cy + 38);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Flickering Dungeon Wall Torches & Warm Subterranean Glow
    for (const t of st.torches || []) {
      ctx.save();
      ctx.translate(t.x, t.y);
      const flicker = Math.sin(this.time * 14 + t.phase) * 0.15 + Math.cos(this.time * 23 + t.phase) * 0.08;
      const rad = 86 + flicker * 28;
      const glow = ctx.createRadialGradient(0, -14, 4, 0, -14, rad);
      glow.addColorStop(0, 'rgba(235, 155, 52, 0.34)');
      glow.addColorStop(0.5, 'rgba(195, 92, 24, 0.14)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, -14, rad, 0, Math.PI * 2);
      ctx.fill();

      // Iron wall sconce bracket
      ctx.fillStyle = '#2b221c';
      ctx.fillRect(-3, -10, 6, 22);
      ctx.fillStyle = '#4a3a2e';
      ctx.fillRect(-6, -12, 12, 4);

      // Torch flame
      ctx.fillStyle = '#e88b28';
      ctx.beginPath();
      ctx.arc(0, -16 + flicker * 3, 6 + flicker * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff0c2';
      ctx.beginPath();
      ctx.arc(0, -15, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Supply crates
    for (const c of st.crates) {
      if (c.broken) continue;
      ctx.fillStyle = '#3d2b1a';
      ctx.strokeStyle = '#9c7444';
      ctx.lineWidth = 2;
      ctx.fillRect(c.x - 16, c.y - 30, 32, 30);
      ctx.strokeRect(c.x - 16, c.y - 30, 32, 30);
      ctx.beginPath();
      ctx.moveTo(c.x - 16, c.y - 30);
      ctx.lineTo(c.x + 16, c.y);
      ctx.moveTo(c.x + 16, c.y - 30);
      ctx.lineTo(c.x - 16, c.y);
      ctx.stroke();
    }
    // Supply drop light beams
    for (const ch of st.chests) {
      if (ch.drop && !ch.opened) {
        ctx.fillStyle = 'rgba(216, 152, 64, 0.13)';
        ctx.fillRect(ch.x - 14, ch.y - 600, 28, 600);
      }
    }
    // Sanctuary Braziers (Checkpoints)
    for (const b of st.beacons) {
      ctx.save();
      ctx.translate(b.x, st.groundY);
      ctx.fillStyle = '#241d18';
      ctx.strokeStyle = '#5c4938';
      ctx.lineWidth = 2;
      ctx.fillRect(-10, -64, 20, 64);
      ctx.strokeRect(-10, -64, 20, 64);
      const col = b.lit ? '#e09232' : '#4a3f37';
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = b.lit ? 18 : 0;
      ctx.beginPath();
      ctx.arc(0, -72, 10 + (b.lit ? Math.sin(this.time * 7) * 2.5 : 0), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (b.lit) {
        ctx.fillStyle = 'rgba(224, 146, 50, 0.11)';
        ctx.fillRect(-16, -360, 32, 360);
      }
      ctx.restore();
    }
    // Merchant Kess
    if (st.merchant) {
      const m = st.merchant;
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.fillStyle = '#2a2230';
      ctx.strokeStyle = '#ffd24a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(-12, -56);
      ctx.lineTo(12, -56);
      ctx.lineTo(20, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffd24a';
      ctx.fillRect(-4, -48, 8, 6);
      ctx.fillStyle = '#ffb630';
      ctx.shadowColor = '#ffb630';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(28, -22, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffd24a';
      ctx.font = 'bold 11px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('KESS · SHOP [G]', 0, -72 + Math.sin(this.time * 5) * 2);
      ctx.restore();
    }
    // Spikes
    ctx.fillStyle = '#9aa6b4';
    for (const sp of st.spikes) {
      for (let x = sp.x; x < sp.x + sp.w; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, st.groundY);
        ctx.lineTo(x + 6, st.groundY - 20);
        ctx.lineTo(x + 12, st.groundY);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Laser gates
    for (const l of st.lasers) {
      ctx.fillStyle = '#2a3340';
      ctx.fillRect(l.x - 10, l.y - l.h - 8, 20, 10);
      ctx.fillRect(l.x - 10, l.y - 4, 20, 8);
      if (l.active) {
        ctx.save();
        ctx.strokeStyle = '#ff2255';
        ctx.shadowColor = '#ff0033';
        ctx.shadowBlur = 18;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(l.x, l.y - l.h);
        ctx.lineTo(l.x, l.y);
        ctx.stroke();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      } else if (l.warn && Math.floor(this.time * 18) % 2 === 0) {
        ctx.strokeStyle = 'rgba(255, 60, 90, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(l.x, l.y - l.h);
        ctx.lineTo(l.x, l.y);
        ctx.stroke();
      }
    }
    // Singularity wells
    for (const w of this.wells) {
      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.rotate(this.time * 6);
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = `rgba(176, 107, 255, ${0.8 - i * 0.2})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 34 + i * 26, i, i + Math.PI * 1.4);
        ctx.stroke();
      }
      ctx.fillStyle = '#05010a';
      ctx.shadowColor = '#b06bff';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // DOOM Eternal Monkey Bars (Aerial Swing Bars)
    for (const mb of st.monkeyBars || []) {
      ctx.save();
      ctx.strokeStyle = '#ffd24a';
      ctx.fillStyle = '#ff8811';
      ctx.shadowColor = '#ffaa11';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(mb.x, mb.y);
      ctx.lineTo(mb.x + mb.w, mb.y);
      ctx.stroke();
      ctx.fillRect(mb.x - 4, mb.y - 6, 8, 12);
      ctx.fillRect(mb.x + mb.w - 4, mb.y - 6, 8, 12);
      ctx.restore();
    }

    // Hell Slipgate Teleporters
    for (const sg of st.slipgates || []) {
      for (const [px, py] of [[sg.x1, sg.y1], [sg.x2, sg.y2]]) {
        ctx.save();
        ctx.translate(px, py);
        ctx.strokeStyle = sg.color;
        ctx.shadowColor = sg.color;
        ctx.shadowBlur = 18;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, -34, 22, 34, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.28 + Math.sin(this.time * 8) * 0.1;
        ctx.fillStyle = sg.color;
        ctx.fill();
        ctx.restore();
      }
    }

    // Demonic Gore Nests (DOOM Combat Encounter Pods!)
    for (const gn of st.goreNests || []) {
      ctx.save();
      ctx.translate(gn.x, gn.y);
      if (!gn.ripped) {
        const pulse = 1 + Math.sin(this.time * 9) * 0.08;
        ctx.scale(pulse, pulse);
        // Bone rib-cage spikes cradling the Gore Nest
        ctx.strokeStyle = '#d8c39a';
        ctx.lineWidth = 4;
        for (const side of [-1, 1]) {
          for (let r = 0; r < 3; r++) {
            ctx.beginPath();
            ctx.moveTo(side * 10, -8 - r * 12);
            ctx.quadraticCurveTo(side * 38, -24 - r * 14, side * 18, -52 - r * 10);
            ctx.stroke();
          }
        }
        // Pulsating crimson flesh sac
        ctx.fillStyle = '#7a0e1c';
        ctx.strokeStyle = '#ff1e38';
        ctx.shadowColor = '#ff1e38';
        ctx.shadowBlur = 20;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, -32, 24, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffaa11';
        ctx.beginPath();
        ctx.arc(0, -34, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff4455';
        ctx.font = 'bold 11px Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('☠ GORE NEST [G]', 0, -72);
      } else if (!gn.cleared) {
        // Active demonic pentagram beacon while Gore Nest wave is alive
        ctx.strokeStyle = '#ff1e38';
        ctx.shadowColor = '#ff1e38';
        ctx.shadowBlur = 20;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, -4, 48 + Math.sin(this.time * 10) * 6, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  loop(now) {
    const rawDt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (this.state === 'playing') {
      if (this.hitStop > 0) {
        this.hitStop -= rawDt;
      } else {
        // Tip 5: Slow-Motion Glory Kill Time Dilation
        let stepDt = rawDt;
        if (this.slomoTimer > 0) {
          this.slomoTimer -= rawDt;
          stepDt = rawDt * this.slomoScale;
        }
        this.update(stepDt);
      }
    }
    // The title screen has its own animated canvas covering everything; don't draw the level beneath it
    if (this.state !== 'menu') this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(rawDt) {
    if (this.cutscene && this.cutscene.active) {
      this.time += rawDt;
    if (this.bossRushMode) {
      this.bossRushTimer += rawDt;
    }
      this.shake = Math.max(0, this.shake - rawDt * 32);
      this.flashAlpha = Math.max(0, this.flashAlpha - rawDt * 1.8);
      return;
    }
    const worldDt = this.rika.redEyeTimer > 0 ? rawDt * 0.42 : rawDt;
    this.time += rawDt;
    if (this.bossRushMode) {
      this.bossRushTimer += rawDt;
    }

    // Smooth camera punch-zoom recovery
    this.camZoom += (1.0 - this.camZoom) * Math.min(1, rawDt * 7.5);

    // Tip 2: Directional screenshake decay
    this.shake = Math.max(0, this.shake - rawDt * 32);
    if (this.shake <= 0.1) {
      this.shakeDirX = 0;
      this.shakeDirY = 0;
    }
    this.flashAlpha = Math.max(0, this.flashAlpha - rawDt * 1.8);

    if (this.comboTimer > 0) {
      this.comboTimer -= rawDt;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }

    this.mouseWorld.x = this.screenToView(this.mouseScreen.x) + this.camX;
    this.mouseWorld.y = this.screenToView(this.mouseScreen.y) + this.camY;

    this.pollGamepad();

    if (this.mouseDown) {
      this.rika.fire(this, (m) => this.setMsg(m));
    }

    this.rika.update(rawDt, this.keys, this.mouseWorld, this, (m) => this.setMsg(m));

    // Tip 63: Critical Health Audio Filter & Heartbeat
    this.sfx?.setLowHealth?.(this.rika.hp < this.rika.maxHp * 0.25);

    // Tip 61: Dynamic Combat Music Intensity Layering
    let alertDemons = 0;
    for (const e of this.enemies) {
      if (!e.dead && (e.alerted || e.isBoss) && Math.abs(e.x - this.rika.x) < 680) alertDemons++;
    }
    const combatLvl = (this.stage.bossSpawned && !this.stage.bossDefeated) ? 1.0 : alertDemons > 2 ? 0.8 : alertDemons > 0 ? 0.45 : 0;
    this.sfx?.setCombatIntensity?.(combatLvl);

    // Tip 46: Update Falling Chain Traps
    for (const ch of this.stage.chains || []) {
      if (ch.trap && ch.trapReleased && !ch.trapGrounded) {
        ch.cageY = (ch.cageY || (this.stage.groundY - 210)) + 920 * rawDt;
        if (ch.cageY >= this.stage.groundY - 38) {
          ch.cageY = this.stage.groundY - 38;
          ch.trapGrounded = true;
          this.sfx?.explode?.();
          this.addShake(15);
          this.spawnParticles(ch.x, this.stage.groundY, 24, '#7c5a3c', 280);
          for (const e of this.enemies) {
            if (!e.dead && Math.abs(e.x - ch.x) < 95 && Math.abs(e.y - this.stage.groundY) < 70) {
              this.damageEnemy(e, 260, e.x, e.y - e.h * 0.5, true);
              this.floatingTexts.push({ x: e.x, y: e.y - e.h - 16, text: 'CRUSHED 260!', color: '#ff4411', life: 0.9 });
            }
          }
        }
      }
    }

    // Tip 48: Dynamic Gauntlet Lockdown Challenges
    for (const ld of this.stage.lockdowns || []) {
      if (!ld.cleared) {
        if (!ld.active && this.rika.x > ld.gateLeft + 30 && this.rika.x < ld.gateRight - 30) {
          ld.active = true;
          this.sfx?.bossRoar?.();
          this.addShake(14);
          this.setMsg('⚠ DEMONIC LOCKDOWN ENGAGED — PURGE WAVES TO BREAK SEAL! ⚠');
          for (let k = 0; k < ld.killsNeeded; k++) {
            const spawnX = ld.gateLeft + 40 + (k / ld.killsNeeded) * (ld.gateRight - ld.gateLeft - 80);
            const demon = createEnemy(Math.random() < 0.5 ? 'stalker' : 'spitter', spawnX, this.stage.groundY, this.stageIndex);
            this.scaleEnemy(demon);
            demon.isLockdown = true;
            this.enemies.push(demon);
          }
        }
        if (ld.active) {
          this.rika.x = Math.max(ld.gateLeft + 24, Math.min(ld.gateRight - 24, this.rika.x));
          const alive = this.enemies.filter(e => !e.dead && e.isLockdown).length;
          if (alive === 0) {
            ld.active = false;
            ld.cleared = true;
            this.sfx?.powerup?.();
            this.toast('LOCKDOWN LIFTED', 'Abyssal seal shattered! +50 Souls', '#2dff7a');
            this.gainShards(50);
          }
        }
      }
    }

    // Tip 57: Blood Echo Ashen Cairn Reclamation
    if (this.ashenCairn && this.ashenCairn.stageIndex === this.stageIndex) {
      if (Math.hypot(this.rika.x - this.ashenCairn.x, this.rika.y - this.ashenCairn.y) < 65) {
        const amt = this.ashenCairn.shards;
        this.gainShards(amt);
        this.toast('BLOOD ECHO RECLAIMED', `+${amt} Lost Souls reclaimed!`, '#ffd24a');
        this.sfx?.powerup?.();
        this.ashenCairn = null;
      }
    }

    // Check Environmental Hazard Pits
    if (this.stage.hazards) {
      for (const hz of this.stage.hazards) {
        if (this.rika.x > hz.x && this.rika.x < hz.x + hz.w && this.rika.y >= this.stage.groundY - 4) {
          this.rika.takeDamage(28 * rawDt, this);
        }
      }
    }

    this.updateWorldSystems(rawDt);

    // Check Boss Arena Trigger + Pre-Fight Story Conversation between Rika and the Fallen Lord!
    if (!this.stage.bossSpawned && this.rika.x >= this.stage.bossTriggerX) {
      this.stage.bossSpawned = true;
      const boss = createStageBoss(this.stageIndex, this.stage);
      this.stage.boss = boss;
      this.scaleEnemy(boss);
      this.enemies.push(boss);
      this.bossLagPct = 100;
      this.sfx.bossRoar();
      this.addShake(18);
      document.getElementById('boss-hud')?.classList.remove('hidden');

      const actStory = this.stage.actStory || ACT_STORIES[this.stageIndex] || ACT_STORIES[0];
      const showIntroBanner = () => {
        const introCard = document.getElementById('boss-intro-card');
        const introTitle = document.getElementById('boss-intro-title');
        const introSub = document.getElementById('boss-intro-sub');
        if (introCard && introTitle && introSub) {
          introTitle.textContent = this.stage.bossTitle || boss.name;
          introSub.textContent = this.stage.bossSub || 'FALLEN LORD OF THE SEAL';
          introCard.classList.remove('hidden');
          setTimeout(() => introCard.classList.add('hidden'), 2600);
        }
        this.setMsg(`FALLEN LORD ENGAGED: ${boss.name}`);
      };

      if (actStory?.bossPre?.length) {
        this.cutscene.playBossIntro(boss, actStory, showIntroBanner);
      } else {
        showIntroBanner();
      }
    }

    if (this.stage.bossSpawned && !this.stage.bossDefeated) {
      // Tip 38: Physical Occult Boundary Pushback (No Invisible Walls)
      if (this.rika.x <= this.stage.arenaLeft + 36) {
        this.rika.x = this.stage.arenaLeft + 36;
        this.rika.vx = Math.max(0, this.rika.vx + 260);
        this.spawnParticles(this.stage.arenaLeft + 12, this.rika.y - 40, 4, '#ff2244', 160);
      } else if (this.rika.x >= this.stage.arenaRight - 36) {
        this.rika.x = this.stage.arenaRight - 36;
        this.rika.vx = Math.min(0, this.rika.vx - 260);
        this.spawnParticles(this.stage.arenaRight - 12, this.rika.y - 40, 4, '#ff2244', 160);
      }
    }

    updateEnemiesAndBoss(worldDt, this);

    // Update Homing Micro-Missiles
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.life -= rawDt;
      let nearest = null;
      let bestD = 550;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - m.x, (e.y - e.h * 0.5) - m.y);
        if (d < bestD) { bestD = d; nearest = e; }
      }
      if (nearest) {
        const targetAng = Math.atan2((nearest.y - nearest.h * 0.5) - m.y, nearest.x - m.x);
        const curAng = Math.atan2(m.vy, m.vx);
        let diff = targetAng - curAng;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const nextAng = curAng + Math.max(-rawDt * 7.5, Math.min(rawDt * 7.5, diff));
        m.vx = Math.cos(nextAng) * 720;
        m.vy = Math.sin(nextAng) * 720;
      }
      m.x += m.vx * rawDt;
      m.y += m.vy * rawDt;

      if (Math.random() < 0.6) {
        this.spawnParticles(m.x, m.y, 1, '#ffaa33', 60);
      }

      let hit = m.life <= 0 || m.y >= this.stage.groundY;
      for (const e of this.enemies) {
        if (!e.dead && Math.abs(m.x - e.x) < e.w * 0.5 + 12 && m.y > e.y - e.h && m.y < e.y) {
          this.damageEnemy(e, m.dmg, m.x, m.y, true);
          this.spawnParticles(m.x, m.y, 16, '#ff6622', 240);
          hit = true;
          break;
        }
      }
      if (hit) this.missiles.splice(i, 1);
    }

    // Update BFG-9000 Singularity Orbs (Zaps all nearby enemies with tendrils as it flies!)
    for (let i = this.bfgOrbs.length - 1; i >= 0; i--) {
      const orb = this.bfgOrbs[i];
      orb.life -= rawDt;
      orb.x += orb.vx * rawDt;
      orb.y += orb.vy * rawDt;

      // Continuous tendril zaps to every enemy within 340px!
      for (const e of this.enemies) {
        if (e.dead) continue;
        const ex = e.x;
        const ey = e.y - e.h * 0.5;
        if (Math.hypot(ex - orb.x, ey - orb.y) < 340) {
          this.damageEnemy(e, orb.tendrilDps * rawDt, ex, ey, true, true);
          if (Math.random() < 0.35) {
            this.beams.push({
              x1: orb.x,
              y1: orb.y,
              x2: ex,
              y2: ey,
              color: '#33ff66',
              width: 3.5,
              life: 0.06,
              maxLife: 0.06,
            });
          }
        }
      }

      let detonate = orb.life <= 0 || orb.y >= this.stage.groundY;
      for (const e of this.enemies) {
        if (!e.dead && Math.abs(orb.x - e.x) < e.w * 0.5 + 18 && orb.y > e.y - e.h && orb.y < e.y) {
          detonate = true;
          break;
        }
      }
      if (detonate) {
        this.sfx.bfgDetonate();
        this.addShake(22);
        this.flashAlpha = 0.35;
        this.flashColor = '#33ff66';
        this.spawnParticles(orb.x, orb.y, 65, '#33ff66', 440);
        this.spawnParticles(orb.x, orb.y, 35, '#ffffff', 320);
        for (const e of this.enemies) {
          if (!e.dead && Math.hypot(e.x - orb.x, (e.y - e.h * 0.5) - orb.y) < 280) {
            this.damageEnemy(e, orb.dmg, e.x, e.y - e.h * 0.5, true);
          }
        }
        this.bfgOrbs.splice(i, 1);
      }
    }

    // Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      const bDt = b.fromPlayer ? rawDt : worldDt;
      b.life -= bDt;
      b.vy += (b.gravity || 0) * bDt;
      b.x += b.vx * bDt;
      b.y += b.vy * bDt;

      if (b.bounce > 0 && b.y >= this.stage.groundY && b.vy > 0) {
        b.vy = -b.vy * 0.8;
        b.y = this.stage.groundY - 2;
        b.bounce--;
        this.spawnParticles(b.x, b.y, 3, b.color, 100);
      }

      if (b.life <= 0 || b.y >= this.stage.groundY) {
        if (b.y >= this.stage.groundY && b.gravity) {
          this.spawnParticles(b.x, this.stage.groundY, 8, b.color, 160);
        }
        this.bullets.splice(i, 1);
        continue;
      }

      if (b.fromPlayer) {
        for (const cr of this.stage.crates) {
          if (!cr.broken && Math.abs(b.x - cr.x) < 20 && b.y > cr.y - 32 && b.y < cr.y) {
            cr.hp -= b.dmg;
            if (cr.hp <= 0) this.breakCrate(cr);
            b.life = 0;
            break;
          }
        }
        if (b.life <= 0) {
          this.bullets.splice(i, 1);
          continue;
        }

        // Also allow shooting Demonic Gore Nests to rip them open!
        for (const gn of this.stage.goreNests || []) {
          if (!gn.ripped && Math.abs(b.x - gn.x) < 32 && b.y > gn.y - 68 && b.y < gn.y) {
            gn.hp -= b.dmg;
            this.spawnParticles(b.x, b.y, 6, '#ff1e38', 180);
            if (gn.hp <= 0) this.ripGoreNest(gn);
            b.life = 0;
            break;
          }
        }

        // Also allow shooting Relic Chests to pop them open!
        for (const ch of this.stage.chests) {
          if (!ch.opened && Math.abs(b.x - ch.x) < 24 && b.y > ch.y - 32 && b.y < ch.y) {
            this.openRelicChest(ch);
            b.life = 0;
            break;
          }
        }

        for (const br of this.stage.barrels) {
          if (!br.exploded && Math.abs(b.x - br.x) < 18 && b.y > br.y - 40 && b.y < br.y) {
            br.hp -= b.dmg;
            if (br.hp <= 0) this.detonateBarrel(br);
            b.life = 0;
            break;
          }
        }
        if (b.life <= 0) {
          this.bullets.splice(i, 1);
          continue;
        }

        let hit = false;
        for (const e of this.enemies) {
          if (e.dead) continue;
          if (Math.abs(b.x - e.x) < e.w * 0.5 + b.radius && b.y > e.y - e.h && b.y < e.y) {
            const isHeadshot = b.y < e.y - e.h * 0.68;
            const finalDmg = isHeadshot ? Math.round(b.dmg * 1.45) : b.dmg;
            this.damageEnemy(e, finalDmg, b.x, b.y, isHeadshot);
            this.spawnParticles(b.x, b.y, 6, b.color, 180);
            if (this.rika.stats.explode > 0 && Math.random() < 0.12 * this.rika.stats.explode) {
              this.miniBlast(b.x, b.y, 50 * this.rika.damageMult, 100);
            }

            if (b.chain) {
              for (const other of this.enemies) {
                if (other !== e && !other.dead && Math.hypot(other.x - e.x, other.y - e.y) < 230) {
                  this.damageEnemy(other, Math.round(finalDmg * 0.55), other.x, other.y - other.h * 0.5, false);
                  this.beams.push({
                    x1: e.x,
                    y1: e.y - e.h * 0.5,
                    x2: other.x,
                    y2: other.y - other.h * 0.5,
                    color: '#3af2ff',
                    width: 3,
                    life: 0.12,
                    maxLife: 0.12,
                  });
                  break;
                }
              }
            }
            hit = true;
            break;
          }
        }
        if (hit) this.bullets.splice(i, 1);
      } else {
        // Tip 24: Demon Infighting (Friendly Fire from heavy demon artillery/explosives!)
        if (b.heavy || b.gravity || b.dmg >= 16) {
          let hitOther = false;
          for (const other of this.enemies) {
            if (other.dead || other === b.shooter) continue;
            if (Math.abs(b.x - other.x) < other.w * 0.45 + b.radius && b.y > other.y - other.h && b.y < other.y) {
              const infightDmg = Math.round(b.dmg * 0.85);
              this.damageEnemy(other, infightDmg, b.x, b.y, false);
              this.spawnParticles(b.x, b.y, 8, b.color, 160);
              this.floatingTexts.push({
                x: other.x,
                y: other.y - other.h - 14,
                text: `INFIGHT ${infightDmg}!`,
                color: '#ffaa33',
                life: 0.65,
              });
              hitOther = true;
              break;
            }
          }
          if (hitOther) {
            this.bullets.splice(i, 1);
            continue;
          }
        }

        const distToRika = Math.hypot(b.x - this.rika.x, b.y - (this.rika.y - 40));
        if (this.rika.aegisTimer > 0 && distToRika < (this.rika.inMech ? 80 : 58)) {
          b.fromPlayer = true;
          b.reflected = true;
          b.vx = -b.vx * 1.65;
          b.vy = -b.vy * 1.65;
          b.dmg = Math.round(b.dmg * 2.5);
          b.color = '#3af2ff';
          b.glow = '#00ffff';
          b.life = 1.6;
          this.sfx.reflect();
          this.spawnParticles(b.x, b.y, 10, '#3af2ff', 220);
          continue;
        }

        const hitH = this.rika.inMech ? 120 : this.rika.crouching ? 50 : 74;
        if (Math.abs(b.x - this.rika.x) < 22 && b.y > this.rika.y - hitH && b.y < this.rika.y) {
          this.rika.takeDamage(b.dmg, this);
          this.bullets.splice(i, 1);
        }
      }
    }

    // Update Doom Cluster Grenades
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.life -= rawDt;
      g.vy += 1280 * rawDt;
      g.x += g.vx * rawDt;
      g.y += g.vy * rawDt;

      let detonate = g.life <= 0 || g.y >= this.stage.groundY;
      for (const e of this.enemies) {
        if (!e.dead && Math.abs(g.x - e.x) < e.w * 0.5 + 12 && g.y > e.y - e.h && g.y < e.y) {
          detonate = true;
          break;
        }
      }

      if (detonate) {
        this.sfx.explode();
        this.addShake(15);
        this.spawnParticles(g.x, g.y - 10, 44, '#ff4411', 380);
        this.spawnParticles(g.x, g.y - 10, 22, '#ffdd44', 260);

        for (const e of this.enemies) {
          if (e.dead) continue;
          const d = Math.hypot(e.x - g.x, (e.y - e.h * 0.5) - g.y);
          if (d < g.blastRadius) {
            this.damageEnemy(e, g.dmg, e.x, e.y - e.h * 0.5, true);
          }
        }

        if (g.cluster) {
          for (const dir of [-1.2, -0.45, 0.45, 1.2]) {
            this.grenades.push({
              x: g.x,
              y: g.y - 14,
              vx: dir * 240,
              vy: -340 - Math.random() * 110,
              radius: 6,
              dmg: 52,
              blastRadius: 120,
              cluster: false,
              life: 0.65,
            });
          }
        }
        this.grenades.splice(i, 1);
      }
    }

    // Update Pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.life -= rawDt;
      p.vy += 980 * rawDt;
      p.y += p.vy * rawDt;
      if (p.y >= this.stage.groundY) {
        p.y = this.stage.groundY;
        p.vy = 0;
      }
      // Tip 88: Magnetic Auto-Loot pull within 150px radius
      const dToRika = Math.hypot(p.x - this.rika.x, p.y - (this.rika.y - 36));
      const magnetRange = 150 + this.rika.stats.magnet;
      if (dToRika < magnetRange && dToRika > 38) {
        const pullSpeed = 480 * (1 - dToRika / magnetRange);
        p.x += ((this.rika.x - p.x) / dToRika) * pullSpeed * rawDt;
        p.y += (((this.rika.y - 36) - p.y) / dToRika) * pullSpeed * rawDt;
      }

      if (Math.hypot(p.x - this.rika.x, (p.y - 14) - (this.rika.y - 36)) < 50 + this.rika.stats.magnet) {
        if (p.type === 'hp') {
          this.rika.hp = Math.min(this.rika.maxHp, this.rika.hp + 32);
          this.rika.shield = Math.min(this.rika.maxShield, this.rika.shield + 28);
          this.floatingTexts.push({ x: this.rika.x, y: this.rika.y - 85, text: '+32 HP', color: '#2dff7a', life: 0.8 });
        } else if (p.type === 'rage') {
          this.rika.rage = Math.min(100, this.rika.rage + 35);
          this.rika.redEyeCd = Math.max(0, this.rika.redEyeCd - 3);
          this.floatingTexts.push({ x: this.rika.x, y: this.rika.y - 85, text: '+RED-EYE ENERGY', color: '#ff2a6d', life: 0.8 });
        } else if (p.type === 'item') {
          this.grantItem(p.item);
        } else if (p.type === 'ammo') {
          this.rika.mag = this.rika.magMax;
          this.rika.grenadeCd = Math.max(0, this.rika.grenadeCd - 2);
          this.floatingTexts.push({ x: this.rika.x, y: this.rika.y - 85, text: 'AMMO RESTOCKED', color: '#ffaa22', life: 0.8 });
        } else {
          const got = this.gainShards(15);
          this.floatingTexts.push({ x: this.rika.x, y: this.rika.y - 85, text: `+${got} SHARDS ◆`, color: '#ffd24a', life: 0.8 });
        }
        this.sfx.powerup();
        this.pickups.splice(i, 1);
        continue;
      }
      if (p.life <= 0) this.pickups.splice(i, 1);
    }

    // Update Beams, Particles, Shells & Floating Texts
    for (let i = this.beams.length - 1; i >= 0; i--) {
      this.beams[i].life -= rawDt;
      if (this.beams[i].life <= 0) this.beams.splice(i, 1);
    }
    if (this.redEyeLaser) {
      this.redEyeLaser.timer -= rawDt;
      if (this.redEyeLaser.timer <= 0) this.redEyeLaser = null;
    }
    if (this.bossLaser) {
      this.bossLaser.timer -= rawDt;
      if (this.bossLaser.timer <= 0) this.bossLaser = null;
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= rawDt;
      pt.x += pt.vx * rawDt;
      pt.y += pt.vy * rawDt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.life -= rawDt;
      s.vy += 1100 * rawDt;
      s.x += s.vx * rawDt;
      s.y += s.vy * rawDt;
      s.rot += s.vrot * rawDt;
      if (s.y >= this.stage.groundY) {
        s.y = this.stage.groundY;
        s.vy = -s.vy * 0.35;
        s.vx *= 0.6;
      }
      if (s.life <= 0) this.shells.splice(i, 1);
    }
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const c = this.corpses[i];
      c.t += rawDt;
      if (c.e.flying && c.e.y < this.stage.groundY) {
        c.vy += 1700 * rawDt;
        c.e.y = Math.min(this.stage.groundY, c.e.y + c.vy * rawDt);
      }
      if (c.t > 0.9) this.corpses.splice(i, 1);
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= rawDt;
      ft.y -= 48 * rawDt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    // Update Weather Particles
    for (const wp of this.weatherParticles) {
      wp.x += wp.vx * rawDt;
      wp.y += (this.stage.weather === 'snow' ? Math.abs(wp.vy) * 1.4 : wp.vy) * rawDt;
      if (wp.y < 0) wp.y = this.viewH;
      if (wp.y > this.viewH) wp.y = 0;
      if (wp.x < 0) wp.x = this.viewW;
      if (wp.x > this.viewW) wp.x = 0;
    }

    // Smooth Camera Follow
    const targetCamX = this.stage.bossSpawned && !this.stage.bossDefeated
      ? ((this.stage.arenaLeft + this.stage.arenaRight) * 0.5) - this.viewW * 0.5
      : this.rika.x - this.viewW * 0.4;
    const maxCamX = Math.max(0, this.stage.width - this.viewW);
    this.camX += (Math.max(0, Math.min(maxCamX, targetCamX)) - this.camX) * Math.min(1, rawDt * 8);
    const targetCamY = Math.min(
      this.stage.groundY - this.viewH * 0.7,
      this.rika.y - this.viewH * 0.55
    );
    this.camY += (targetCamY - this.camY) * Math.min(1, rawDt * 7);

    this.expansion.update(worldDt);
    this.horror.update(rawDt);
    this.syncHUD(rawDt);
    this.renderMiniMap();
  }

  syncHUD(dt) {
    const r = this.rika;
    const st = this.stage;
    if (!st) return;

    document.getElementById('stage-badge').textContent = `${st.code} / 5 · ${st.name}`;
    this.syncExtraHUD();
    const pct = Math.min(100, Math.max(0, (r.x / st.bossTriggerX) * 100));
    document.getElementById('progress-fill').style.width = `${pct}%`;
    document.getElementById('progress-rika').style.left = `${pct}%`;
    document.getElementById('shards-val').textContent = this.shards;
    document.getElementById('score-val').textContent = this.score;
    document.getElementById('kills-val').textContent = this.kills;

    // Status Title (Shows Dreadnought Golem Armor when piloting!)
    const statusTitle = document.getElementById('char-status-title');
    if (statusTitle) {
      statusTitle.textContent = r.inMech
        ? `DREADNOUGHT GOLEM ARMOR · PLATE ${Math.ceil(r.mechHp)}`
        : 'RIKA · ASHEN PILGRIM';
    }

    // Vitals
    document.getElementById('bar-hp').style.width = `${(r.hp / r.maxHp) * 100}%`;
    document.getElementById('txt-hp').textContent = `${Math.ceil(r.hp)}/${r.maxHp}`;
    document.getElementById('bar-shield').style.width = `${(r.shield / r.maxShield) * 100}%`;
    document.getElementById('txt-shield').textContent = `${Math.round(r.shield)}%`;
    document.getElementById('bar-rage').style.width = `${r.rage}%`;
    document.getElementById('txt-rage').textContent = r.redEyeTimer > 0 ? 'OVERDRIVE!' : `${Math.round(r.rage)}%`;

    const activePerks = Object.entries(r.perks)
      .filter(([, v]) => v)
      .map(([k]) => k.toUpperCase());
    document.getElementById('perk-list').textContent = activePerks.length
      ? `AUGMENTS: ${activePerks.join(' · ')}`
      : `DMG MULT: ${(r.damageMult * 100).toFixed(0)}%`;

    for (const m of [1, 2, 3, 4, 5]) {
      document.getElementById(`wep-${m}`)?.classList.toggle('active', r.weaponMode === m);
    }
    this.expansion.syncHUD();
    document.getElementById('ammo-txt').innerHTML = r.inMech
      ? `INFINITE`
      : r.reloadTimer > 0
        ? `RELOADING...`
        : `${r.mag} / ${r.magMax} <span>[R]</span>`;

    // 6 Ability Cooldown Overlays
    document.getElementById('cd-blade').style.height = `${(r.bladeCd / r.bladeMaxCd) * 100}%`;
    document.getElementById('cd-grapple').style.height = `${(r.grappleCd / r.grappleMaxCd) * 100}%`;
    document.getElementById('cd-dash').style.height = `${(r.dashCd / r.dashMaxCd) * 100}%`;
    document.getElementById('cd-grenade').style.height = `${(r.grenadeCd / r.grenadeMaxCd) * 100}%`;
    document.getElementById('cd-shield').style.height = `${(r.aegisCd / r.aegisMaxCd) * 100}%`;
    document.getElementById('cd-redeye').style.height = `${(r.redEyeCd / r.redEyeMaxCd) * 100}%`;

    // Stylish Combo Rank Panel
    const comboPanel = document.getElementById('combo-panel');
    if (comboPanel) {
      if (this.comboCount >= 2) {
        const info = this.getComboInfo();
        comboPanel.classList.remove('hidden');
        document.getElementById('combo-rank').textContent = info.rank;
        document.getElementById('combo-title').textContent = info.title;
        document.getElementById('combo-count').textContent = `${this.comboCount} HITS · ${info.mult.toFixed(2)}x DMG`;
        document.getElementById('combo-bar-fill').style.width = `${(this.comboTimer / 4.5) * 100}%`;
      } else {
        comboPanel.classList.add('hidden');
      }
    }

    // World Interact Prompt ([G])
    let promptText = '';
    for (const gn of st.goreNests || []) {
      if (!gn.ripped && Math.hypot(gn.x - r.x, gn.y - r.y) < 92) {
        promptText = '[G] SHATTER DEMONIC BLOOD ALTAR (COMBAT TRIAL)';
      }
    }
    for (const sg of st.slipgates || []) {
      if (Math.hypot(sg.x1 - r.x, sg.y1 - r.y) < 76 || Math.hypot(sg.x2 - r.x, sg.y2 - r.y) < 76) {
        promptText = '[G] STEP THROUGH ABYSSAL RIFT GATE';
      }
    }
    for (const mb of st.mechBays) {
      if (!mb.used && Math.hypot(mb.x - r.x, mb.y - r.y) < 88) {
        promptText = '[G] DON DREADNOUGHT GOLEM ARMOR';
      }
    }
    for (const ch of st.chests) {
      if (!ch.opened && Math.hypot(ch.x - r.x, ch.y - r.y) < 82) {
        promptText = '[G] UNSEAL ANCIENT RELIC COFFER';
      }
    }
    for (const tm of st.terminals) {
      if (!tm.hacked && Math.hypot(tm.x - r.x, tm.y - r.y) < 82) {
        promptText = '[G] COMMUNE WITH WHISPERING LORE STONE';
      }
    }
    // Tip 49: Lore Tablets
    for (const lt of st.loreTablets || []) {
      if (!lt.read && Math.hypot(lt.x - r.x, lt.y - r.y) < 85) {
        promptText = '[G] COMMUNE WITH PILGRIM LORE OBELISK';
      }
    }
    // Tip 44: Pre-Boss Sanctuary Chapel
    if (st.sanctuary && Math.hypot(st.sanctuary.x - r.x, st.sanctuary.y - r.y) < 95) {
      promptText = '[G] SANCTUARY CHAPEL: RELIC FORGE & RESTORATION';
    }
    if (st.merchant && Math.hypot(st.merchant.x - r.x, st.merchant.y - r.y) < 90) {
      promptText = '[G] BARTER WITH KESS THE QUARTERMASTER';
    }
    promptText = this.expansion.promptText() || promptText;
    const promptEl = document.getElementById('interact-prompt');
    if (promptEl) {
      if (promptText) {
        promptEl.textContent = promptText;
        promptEl.classList.remove('hidden');
      } else {
        promptEl.classList.add('hidden');
      }
    }

    // Boss or Mid-Boss Warden Health Bar
    const activeBoss = (st.boss && !st.boss.dead) ? st.boss : (st.midBoss && !st.midBoss.dead ? st.midBoss : null);
    if (activeBoss) {
      const bPct = Math.max(0, (activeBoss.hp / activeBoss.maxHp) * 100);
      this.bossLagPct += (bPct - this.bossLagPct) * Math.min(1, dt * 4);
      document.getElementById('boss-name').textContent = activeBoss.name;
      const phaseEl = document.getElementById('boss-phase');
      if (phaseEl) {
        if (activeBoss.finisherReady) {
          phaseEl.textContent = '⚡ KNEELING — PRESS [X] CRUCIBLE FINISHER ⚡';
          phaseEl.style.color = '#ffd700';
        } else if (activeBoss.staggerTimer > 0) {
          phaseEl.textContent = '★ POSTURE SHATTERED (2.2x DAMAGE) ★';
          phaseEl.style.color = '#ffea44';
        } else {
          phaseEl.textContent = activeBoss.subtitle
            ? activeBoss.subtitle
            : activeBoss.isMidBoss
            ? 'INNER SANCTUM WARDEN'
            : `SEAL ${activeBoss.phase} / ${activeBoss.maxPhases}`;
          phaseEl.style.color = '';
        }
      }
      document.getElementById('boss-bar-fill').style.width = `${bPct}%`;
      document.getElementById('boss-bar-lag').style.width = `${this.bossLagPct}%`;

      // Tip 33: Synchronize Posture / Stagger Bar
      const staggerEl = document.getElementById('boss-stagger-fill');
      if (staggerEl) {
        const maxStag = activeBoss.maxStagger || 350;
        const sPct = Math.min(100, Math.max(0, ((activeBoss.stagger || 0) / maxStag) * 100));
        staggerEl.style.width = activeBoss.staggerTimer > 0 ? '100%' : `${sPct}%`;
        staggerEl.style.background = activeBoss.staggerTimer > 0
          ? 'linear-gradient(90deg, #ffea44, #ff5500, #ffea44)'
          : 'linear-gradient(90deg, #b8860b, #ffd700)';
      }

      // Tip 90: Multi-Phase HP Bar Notch Dividers
      const notchWrap = document.getElementById('boss-phase-notches');
      if (notchWrap && activeBoss.maxPhases > 1) {
        const pCount = activeBoss.maxPhases;
        if (notchWrap.dataset.p !== String(pCount)) {
          notchWrap.dataset.p = String(pCount);
          notchWrap.innerHTML = '';
          for (let p = 1; p < pCount; p++) {
            const notch = document.createElement('div');
            notch.className = 'boss-phase-notch';
            notch.style.left = `${(p / pCount) * 100}%`;
            notchWrap.appendChild(notch);
          }
        }
      }
    } else if (st.midBoss && st.midBoss.dead && !st.bossSpawned) {
      document.getElementById('boss-hud')?.classList.add('hidden');
    }

    // Tip 100: Live Dev Debug Console [F1]
    if (this.debugOverlay) {
      const fpsEl = document.getElementById('debug-fps');
      const entEl = document.getElementById('debug-entities');
      const posEl = document.getElementById('debug-pos');
      if (fpsEl) fpsEl.textContent = `FPS: ${Math.round(1 / Math.max(0.001, dt))}`;
      if (entEl) entEl.textContent = `Enemies: ${this.enemies.filter(e => !e.dead).length} | Bullets: ${this.bullets.length} | Pickups: ${this.pickups.length}`;
      if (posEl) posEl.textContent = `Rika: X:${Math.round(r.x)}, Y:${Math.round(r.y)} | God: ${this.godMode ? 'ON' : 'OFF'}`;
    }
  }

  /**
   * Renders the Top-Right Live Tactical Exploration Mini-Map
   */
  renderMiniMap() {
    if (!this.miniCtx || !this.stage) return;
    const mctx = this.miniCtx;
    const mw = this.miniCanvas.width;
    const mh = this.miniCanvas.height;
    const st = this.stage;

    mctx.fillStyle = '#0c0907';
    mctx.fillRect(0, 0, mw, mh);

    const scaleX = mw / st.width;
    const scaleY = mh / 720;

    // Ground line
    mctx.fillStyle = st.groundTrim;
    mctx.fillRect(0, st.groundY * scaleY, mw, 2);

    // Platforms
    mctx.fillStyle = 'rgba(180, 148, 108, 0.45)';
    for (const p of st.platforms) {
      mctx.fillRect(p.x * scaleX, p.y * scaleY, Math.max(3, p.w * scaleX), 2);
    }

    // Chests (Gold dots)
    mctx.fillStyle = '#d8a648';
    for (const ch of st.chests) {
      if (!ch.opened) mctx.fillRect(ch.x * scaleX - 2, (ch.y - 12) * scaleY - 2, 4, 4);
    }

    // Mech Bays (Bronze squares)
    mctx.fillStyle = '#c87a28';
    for (const mb of st.mechBays) {
      if (!mb.used) mctx.fillRect(mb.x * scaleX - 2.5, (mb.y - 20) * scaleY - 2.5, 5, 5);
    }

    // Enemies & Boss (Crimson dots)
    for (const e of this.enemies) {
      if (e.dead) continue;
      mctx.fillStyle = e.isBoss ? '#d83b2b' : '#a83228';
      const sz = e.isBoss ? 6 : 3;
      mctx.fillRect(e.x * scaleX - sz * 0.5, (e.y - e.h * 0.5) * scaleY - sz * 0.5, sz, sz);
    }

    // Rika (Warm Torchlight Gold Beacon)
    mctx.fillStyle = '#f2c178';
    mctx.fillRect(this.rika.x * scaleX - 3, (this.rika.y - 40) * scaleY - 3, 6, 6);

    // Current viewport frame
    mctx.strokeStyle = 'rgba(216, 178, 120, 0.35)';
    mctx.lineWidth = 1;
    mctx.strokeRect(this.camX * scaleX, 2, this.viewW * scaleX, mh - 4);
  }

  // ==========================================================================
  // 2D CANVAS RENDERER
  // ==========================================================================
  render() {
    const ctx = this.ctx;
    const w = this.viewW;
    const h = this.viewH;
    const st = this.stage || STAGE_DEFS[0];
    ctx.setTransform(this.viewScale, 0, 0, this.viewScale, 0, 0);

    // 1. Atmospheric Sky Gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, st.skyTop);
    sky.addColorStop(0.55, st.skyMid);
    sky.addColorStop(1, st.skyBot);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    if (this.rika.redEyeTimer > 0) {
      ctx.fillStyle = 'rgba(255, 16, 48, 0.11)';
      ctx.fillRect(0, 0, w, h);
    }

    if (!this.stage) return;

    // Tip 2: Directional Impact Screenshake along impact vector
    const dirFactor = (this.shakeDirX !== 0 || this.shakeDirY !== 0) ? Math.sin(this.time * 52) : 0;
    const shakeX = this.shakeDirX * dirFactor * this.shake + (Math.random() - 0.5) * (this.shake * 0.42);
    const shakeY = this.shakeDirY * dirFactor * this.shake + (Math.random() - 0.5) * (this.shake * 0.42);

    // 1b. Subterranean Vaulted Ceiling & Occult Cathedral Rosette Seal
    ctx.save();
    // Dark cavern roof silhouette with natural stalactite vaulting
    ctx.fillStyle = 'rgba(10, 7, 9, 0.92)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= w + 40; x += 80) {
      const archH = 38 + Math.sin((x + this.camX * 0.04) * 0.018) * 22 + Math.cos(x * 0.05) * 10;
      ctx.lineTo(x, archH);
    }
    ctx.lineTo(w, 0);
    ctx.closePath();
    ctx.fill();

    // Ancient Carved Stone Occult Seal / Gothic Cathedral Rosette (Embedded in background stone)
    const sealX = w * 0.72 - this.camX * 0.04;
    const sealY = Math.max(85, h * 0.22);
    ctx.translate(sealX, sealY);
    const pulse = Math.sin(this.time * 1.5) * 0.1 + 0.9;
    ctx.strokeStyle = st.accent;
    ctx.shadowColor = st.accent;
    ctx.shadowBlur = 16;
    ctx.globalAlpha = 0.24 * pulse;
    ctx.lineWidth = 2;
    // Concentric stone rings
    ctx.beginPath();
    ctx.arc(0, 0, 80, 0, Math.PI * 2);
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.stroke();
    // 8 Gothic Tracery Cusps & Runic Spokes
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4 + this.time * 0.035;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * 70, Math.sin(ang) * 70);
      ctx.arc(Math.cos(ang) * 52, Math.sin(ang) * 52, 8, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Towering Chained Demon Colossus Silhouette Entombed in the Horizon Cavern
    const titanX = 640 - this.camX * 0.1;
    const titanY = this.stage.groundY - this.camY;
    if (titanX > -280 && titanX < w + 280) {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 8, 11, 0.78)';
      ctx.beginPath();
      ctx.moveTo(titanX - 95, titanY);
      ctx.lineTo(titanX - 68, titanY - 330);
      ctx.lineTo(titanX + 68, titanY - 330);
      ctx.lineTo(titanX + 95, titanY);
      ctx.closePath();
      ctx.fill();
      // Petrified Colossus Horns
      ctx.strokeStyle = 'rgba(28, 12, 16, 0.88)';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(titanX - 35, titanY - 330);
      ctx.quadraticCurveTo(titanX - 115, titanY - 400, titanX - 85, titanY - 460);
      ctx.moveTo(titanX + 35, titanY - 330);
      ctx.quadraticCurveTo(titanX + 115, titanY - 400, titanX + 85, titanY - 460);
      ctx.stroke();
      // Heavy Chained Bindings across the torso
      ctx.strokeStyle = 'rgba(64, 42, 34, 0.65)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(titanX - 90, titanY - 210);
      ctx.lineTo(titanX + 90, titanY - 170);
      ctx.moveTo(titanX - 85, titanY - 140);
      ctx.lineTo(titanX + 85, titanY - 110);
      ctx.stroke();
      // Glowing Smoldering Amber Eye Slits
      ctx.fillStyle = st.accent;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(titanX - 22, titanY - 308, 12, 5);
      ctx.fillRect(titanX + 10, titanY - 308, 12, 5);
      ctx.restore();
    }

    this.horror.renderBackground(ctx, w, h);

    // 2. Parallax Gothic Catacomb Vaults, Stone Buttresses & Crypt Altar Niches
    for (const d of this.stage.decors) {
      const sx = d.x - this.camX * d.layer + shakeX * 0.3;
      const sy = this.stage.groundY - this.camY - d.h + shakeY * 0.3;
      if (sx + d.w < -100 || sx > w + 100) continue;

      // Dark Weathered Ashlar Stone Masonry Pillar
      ctx.fillStyle = d.layer < 0.35 ? 'rgba(15, 10, 13, 0.78)' : 'rgba(24, 15, 20, 0.92)';
      ctx.fillRect(sx, sy, d.w, d.h + 160);

      // Horizontal Stone Mortar Courses
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      for (let my = sy + 32; my < sy + d.h + 100; my += 36) {
        ctx.fillRect(sx, my, d.w, 2);
      }

      // Pointed Gothic Lancet Corbel / Vaulted Arch Capital
      ctx.fillStyle = d.layer < 0.35 ? 'rgba(20, 13, 17, 0.85)' : 'rgba(32, 20, 26, 0.95)';
      ctx.beginPath();
      ctx.moveTo(sx - 8, sy);
      ctx.quadraticCurveTo(sx + d.w * 0.5, sy - 36, sx + d.w + 8, sy);
      ctx.lineTo(sx + d.w, sy + 18);
      ctx.lineTo(sx, sy + 18);
      ctx.closePath();
      ctx.fill();

      // Carved Crypt Niches with Flickering Votive Shrine Candles (replaces modern skyscraper windows)
      if (d.windows) {
        for (let wy = sy + 28; wy < sy + d.h - 32; wy += 48) {
          // Left Gothic Niche
          ctx.fillStyle = 'rgba(8, 5, 7, 0.82)';
          ctx.beginPath();
          ctx.arc(sx + 20, wy + 8, 8, Math.PI, 0);
          ctx.rect(sx + 12, wy + 8, 16, 20);
          ctx.fill();
          // Right Gothic Niche
          ctx.beginPath();
          ctx.arc(sx + d.w - 20, wy + 8, 8, Math.PI, 0);
          ctx.rect(sx + d.w - 28, wy + 8, 16, 20);
          ctx.fill();

          // Warm Flickering Votive Candle flame in each niche
          const flick1 = Math.sin(this.time * 9 + wy * 0.1) * 2;
          const flick2 = Math.cos(this.time * 8 + wy * 0.15) * 2;
          ctx.fillStyle = '#ff9e3b';
          ctx.shadowColor = '#d86e24';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(sx + 20, wy + 20 + flick1, 3, 0, Math.PI * 2);
          ctx.arc(sx + d.w - 20, wy + 20 + flick2, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        // Central recessed runic groove
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(sx + d.w * 0.46, sy + 22, 6, d.h - 10);
      }

      // Ancient Ossuary Roots & Chained Iron Wrappings
      if (d.flesh) {
        ctx.strokeStyle = 'rgba(120, 36, 44, 0.52)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy + d.h * 0.22);
        ctx.quadraticCurveTo(sx + d.w * 0.5, sy + d.h * 0.42, sx + d.w, sy + d.h * 0.62);
        ctx.moveTo(sx + d.w, sy + d.h * 0.35);
        ctx.quadraticCurveTo(sx + d.w * 0.4, sy + d.h * 0.55, sx, sy + d.h * 0.78);
        ctx.stroke();
      }
    }

    // Dynamic Biome Weather Particles
    ctx.fillStyle = st.accent;
    for (const wp of this.weatherParticles) {
      ctx.globalAlpha = wp.alpha;
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, wp.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    // Tip 5: Slow-motion camera zoom punch centered on screen
    if (this.camZoom !== 1.0) {
      ctx.translate(w * 0.5, h * 0.5);
      ctx.scale(this.camZoom, this.camZoom);
      ctx.translate(-w * 0.5, -h * 0.5);
    }
    ctx.translate(-this.camX + shakeX, -this.camY + shakeY);

    // 3. Stage Ground, Walls, Hazards & Tactical Platforms
    const groundGrad = ctx.createLinearGradient(0, st.groundY, 0, st.groundY + 220);
    groundGrad.addColorStop(0, st.groundColor);
    groundGrad.addColorStop(1, '#060403');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, st.groundY, st.width, 450);
    // Flagstone courses (only across the visible span)
    const gx0 = Math.floor((this.camX - 80) / 72) * 72;
    const gx1 = this.camX + w + 80;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    for (let gx = gx0; gx < gx1; gx += 72) {
      ctx.fillRect(gx, st.groundY + 4, 2, 26);
      ctx.fillRect(gx + 36, st.groundY + 32, 2, 30);
    }
    ctx.fillRect(gx0, st.groundY + 30, gx1 - gx0, 2);
    ctx.fillRect(gx0, st.groundY + 62, gx1 - gx0, 2);
    ctx.fillStyle = 'rgba(255, 220, 170, 0.05)';
    for (let gx = gx0; gx < gx1; gx += 72) ctx.fillRect(gx + 2, st.groundY + 4, 34, 3);
    ctx.fillStyle = st.groundTrim;
    ctx.fillRect(0, st.groundY, st.width, 3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, st.groundY + 3, st.width, 2);

    // Environmental Hazard Pools
    if (st.hazards) {
      for (const hz of st.hazards) {
        ctx.fillStyle = st.accent;
        ctx.shadowColor = st.accent;
        ctx.shadowBlur = 16;
        ctx.fillRect(hz.x, hz.y, hz.w, hz.h);
        ctx.shadowBlur = 0;
      }
    }

    // Vertical Wall-Jump Stone Pillars & Portcullis Gates
    if (st.walls) {
      for (const wl of st.walls) {
        ctx.fillStyle = wl.gate ? '#241412' : '#1b1612';
        ctx.strokeStyle = wl.gate ? '#b83228' : st.groundTrim;
        ctx.lineWidth = 2;
        ctx.fillRect(wl.x, wl.y, wl.w, wl.h);
        ctx.strokeRect(wl.x, wl.y, wl.w, wl.h);
        if (wl.gate) {
          ctx.fillStyle = '#d86b48';
          ctx.font = 'bold 11px Georgia, serif';
          ctx.textAlign = 'center';
          ctx.fillText('PORTCULLIS SEALED', wl.x + wl.w / 2, st.groundY - 40);
          ctx.fillText('COMMUNE STONE', wl.x + wl.w / 2, st.groundY - 24);
        }
      }
    }

    // Tip 38: Occult Physical Boundary Barriers (No Invisible Walls)
    if (st.bossSpawned && !st.bossDefeated) {
      for (const wallX of [st.arenaLeft, st.arenaRight]) {
        // Curtains of spectral demonic flame
        const flameGrad = ctx.createLinearGradient(wallX - 22, 0, wallX + 22, 0);
        flameGrad.addColorStop(0, 'rgba(255, 34, 68, 0)');
        flameGrad.addColorStop(0.5, 'rgba(255, 50, 40, 0.42)');
        flameGrad.addColorStop(1, 'rgba(255, 34, 68, 0)');
        ctx.fillStyle = flameGrad;
        ctx.fillRect(wallX - 22, st.groundY - 560, 44, 560);

        // Core runic barrier column
        ctx.fillStyle = '#ff1e38';
        ctx.shadowColor = '#ff2244';
        ctx.shadowBlur = 14;
        ctx.fillRect(wallX - 3, st.groundY - 560, 6, 560);
        ctx.shadowBlur = 0;

        // Suspended runic binding chains and occult seals
        ctx.strokeStyle = '#dfc088';
        ctx.lineWidth = 2.5;
        const timeVal = this.time || 0;
        for (let yOff = 40; yOff < 540; yOff += 75) {
          const rY = st.groundY - yOff;
          const osc = Math.sin(timeVal * 4 + yOff) * 4;
          ctx.beginPath();
          ctx.arc(wallX + osc, rY, 9, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#ffcc44';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('⚡', wallX + osc, rY + 3);
        }
      }
    }

    // Weathered Stone Masonry & Wrought-Iron Platforms
    for (const p of st.platforms) {
      if (p.gone) continue;
      const shake = p.crumble && p.crumbleT > 0 ? (Math.random() - 0.5) * 4 : 0;
      const py = p.y + shake;
      // Moving lifts hang from iron chains
      if (p.moving) {
        ctx.strokeStyle = '#4a3c30';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(p.x + 14, py);
        ctx.lineTo(p.x + 14, py - 900);
        ctx.moveTo(p.x + p.w - 14, py);
        ctx.lineTo(p.x + p.w - 14, py - 900);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // Soft drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(p.x + 6, py + p.h, p.w - 12, 5);
      // Weathered stone slab
      const slab = ctx.createLinearGradient(0, py, 0, py + p.h);
      slab.addColorStop(0, p.crumble ? '#4a3626' : p.moving ? '#4a3a2c' : '#3a2f27');
      slab.addColorStop(1, '#14100d');
      ctx.fillStyle = slab;
      ctx.fillRect(p.x, py, p.w, p.h);
      // Block seams
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      for (let sx = p.x + 30 + (Math.abs(p.baseX * 7) % 14); sx < p.x + p.w - 8; sx += 36) {
        ctx.fillRect(sx, py + 3, 2, p.h - 3);
      }
      // Lit top edge and dark outline
      ctx.fillStyle = p.crumble ? '#b8834a' : p.moving ? '#e0a050' : st.groundTrim;
      ctx.fillRect(p.x, py, p.w, 2.5);
      ctx.strokeStyle = '#0c0807';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(p.x, py, p.w, p.h);
      // Crumbling slabs show cracks
      if (p.crumble) {
        ctx.strokeStyle = 'rgba(10, 6, 4, 0.9)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let cx = p.x + 18; cx < p.x + p.w - 10; cx += 46) {
          ctx.moveTo(cx, py + 2);
          ctx.lineTo(cx + 6, py + 8);
          ctx.lineTo(cx + 2, py + 13);
          ctx.lineTo(cx + 9, py + p.h);
        }
        ctx.stroke();
      }
    }

    // Tip 4: Permanent Surface Blood, Ichor & Scorch Decals on Floors and Platforms
    for (const d of this.decals) {
      if (d.x < this.camX - 120 || d.x > this.camX + w + 120) continue;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rotation);
      ctx.globalAlpha = d.alpha;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, d.rx, d.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Overhead Iron Grapple Rings ([F])
    if (st.grapplePoints) {
      for (const gp of st.grapplePoints) {
        ctx.save();
        ctx.translate(gp.x, gp.y);
        ctx.strokeStyle = '#c88638';
        ctx.fillStyle = '#1c1612';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#e6aa52';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Updraft Flame Vents (Jump Pads)
    for (const jp of st.jumpPads) {
      ctx.fillStyle = '#d88b32';
      ctx.shadowColor = '#d88b32';
      ctx.shadowBlur = 10;
      ctx.fillRect(jp.x - 24, jp.y - 8, 48, 8);
      ctx.shadowBlur = 0;
    }

    // Ancient Relic Coffers (Chests)
    for (const ch of st.chests) {
      ctx.save();
      ctx.translate(ch.x, ch.y);
      if (!ch.opened) {
        const pulse = 0.55 + Math.sin(this.time * 3 + ch.x) * 0.15;
        const halo = ctx.createRadialGradient(0, -16, 2, 0, -16, 46);
        halo.addColorStop(0, `rgba(255, 200, 100, ${0.32 * pulse})`);
        halo.addColorStop(1, 'rgba(255, 200, 100, 0)');
        ctx.fillStyle = halo;
        ctx.fillRect(-46, -62, 92, 92);
      }
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(-22, -2, 44, 3);
      // Wooden body with iron bands
      const wood = ctx.createLinearGradient(0, -20, 0, 0);
      wood.addColorStop(0, ch.opened ? '#3a2818' : '#6a4422');
      wood.addColorStop(1, '#2a1a0c');
      ctx.fillStyle = wood;
      ctx.fillRect(-20, -20, 40, 20);
      ctx.fillStyle = ch.opened ? '#4a4038' : '#8a7656';
      ctx.fillRect(-15, -20, 4, 20);
      ctx.fillRect(11, -20, 4, 20);
      ctx.strokeStyle = '#120a05';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-20, -20, 40, 20);
      if (ch.opened) {
        // Lid thrown back, dark empty interior
        ctx.fillStyle = '#0e0805';
        ctx.fillRect(-18, -22, 36, 4);
        ctx.save();
        ctx.translate(-20, -20);
        ctx.rotate(-1.9);
        ctx.fillStyle = '#3a2818';
        ctx.fillRect(0, -10, 40, 10);
        ctx.strokeRect(0, -10, 40, 10);
        ctx.restore();
      } else {
        // Domed lid
        ctx.beginPath();
        ctx.moveTo(-21, -20);
        ctx.quadraticCurveTo(0, -36, 21, -20);
        ctx.closePath();
        const lid = ctx.createLinearGradient(0, -32, 0, -20);
        lid.addColorStop(0, ch.secret ? '#8a5a2a' : '#7a4e26');
        lid.addColorStop(1, '#3a2412');
        ctx.fillStyle = lid;
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#d8a648';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-21, -20);
        ctx.quadraticCurveTo(0, -36, 21, -20);
        ctx.stroke();
        // Gold lock plate
        ctx.fillStyle = '#e8b858';
        ctx.fillRect(-4, -24, 8, 9);
        ctx.fillStyle = '#2a1a0c';
        ctx.fillRect(-1, -21, 2, 4);
      }
      ctx.restore();
    }

    // Whispering Lore Stones (Terminals)
    for (const tm of st.terminals) {
      ctx.save();
      ctx.translate(tm.x, tm.y);
      ctx.fillStyle = '#1e1814';
      ctx.strokeStyle = tm.hacked ? '#689c54' : '#c89242';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-15, 0);
      ctx.lineTo(-12, -46);
      ctx.lineTo(0, -56);
      ctx.lineTo(12, -46);
      ctx.lineTo(15, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = tm.hacked ? '#7ab864' : '#e0a64e';
      ctx.fillRect(-4, -38, 8, 18);
      ctx.restore();
    }

    // Friendly Deployed Ballista Wards (Turrets)
    for (const tr of st.turrets) {
      ctx.save();
      ctx.translate(tr.x, tr.y);
      ctx.fillStyle = '#261e18';
      ctx.strokeStyle = '#c8963e';
      ctx.lineWidth = 2;
      ctx.fillRect(-14, -22, 28, 22);
      ctx.translate(0, -24);
      ctx.rotate(tr.aimAngle);
      ctx.fillRect(-6, -5, 26, 10);
      ctx.restore();
    }

    // Ancient Dreadnought Golem Armor Reliquaries (Mech Bays)
    for (const mb of st.mechBays) {
      if (mb.used) continue;
      ctx.save();
      ctx.translate(mb.x, mb.y);
      ctx.strokeStyle = '#c88a38';
      ctx.fillStyle = '#211a14';
      ctx.lineWidth = 2.5;
      ctx.fillRect(-28, -96, 56, 60);
      ctx.strokeRect(-28, -96, 56, 60);
      ctx.fillRect(-22, -36, 16, 36);
      ctx.fillRect(6, -36, 16, 36);
      ctx.fillStyle = '#e0aa52';
      ctx.font = 'bold 11px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('GOLEM ARMOR [G]', 0, -108 + Math.sin(this.time * 8) * 3);
      ctx.restore();
    }

    this.renderWorldExtras(ctx);
    this.expansion.renderWorld(ctx, this.time);
    this.horror.renderWorld(ctx);

    // Alchemical Fire Barrels
    for (const br of st.barrels) {
      if (br.exploded) continue;
      ctx.save();
      ctx.translate(br.x, br.y);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(-15, -2, 30, 3);
      // Bulging staved keg
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.quadraticCurveTo(-17, -19, -12, -38);
      ctx.lineTo(12, -38);
      ctx.quadraticCurveTo(17, -19, 12, 0);
      ctx.closePath();
      const keg = ctx.createLinearGradient(-16, 0, 16, 0);
      keg.addColorStop(0, '#2a0e0a');
      keg.addColorStop(0.4, '#7a2a1a');
      keg.addColorStop(1, '#2a0e0a');
      ctx.fillStyle = keg;
      ctx.fill();
      ctx.strokeStyle = '#100604';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Iron hoops
      ctx.strokeStyle = '#5a5048';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-14, -8);
      ctx.lineTo(14, -8);
      ctx.moveTo(-14, -30);
      ctx.lineTo(14, -30);
      ctx.stroke();
      // Volatile glowing rune
      const flick = 0.6 + Math.sin(this.time * 6 + br.x) * 0.25;
      const runeGlow = ctx.createRadialGradient(0, -19, 1, 0, -19, 18);
      runeGlow.addColorStop(0, `rgba(255, 150, 50, ${flick})`);
      runeGlow.addColorStop(1, 'rgba(255, 90, 20, 0)');
      ctx.fillStyle = runeGlow;
      ctx.fillRect(-18, -37, 36, 36);
      ctx.strokeStyle = '#ffc060';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-4, -24);
      ctx.lineTo(0, -14);
      ctx.lineTo(4, -24);
      ctx.moveTo(-5, -19);
      ctx.lineTo(5, -19);
      ctx.stroke();
      ctx.restore();
    }

    // Pickups
    for (const pk of this.pickups) {
      const rarCol = pk.type === 'item' && pk.item ? RARITY[pk.item.rarity].color : null;
      const col = rarCol || (pk.type === 'hp' ? '#7ab864' : pk.type === 'rage' ? '#c83b2b' : pk.type === 'ammo' ? '#d88b32' : '#e0b862');
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y - 12 + Math.sin(this.time * 6) * 4, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Brass Shells
    ctx.fillStyle = '#c8963e';
    for (const s of this.shells) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.fillRect(-3, -1.5, 6, 3);
      ctx.restore();
    }

    // 4. Dying demons, then living Enemies & Multi-Phase Bosses
    for (const c of this.corpses) drawDemonDeath(ctx, c, this.time);
    for (const e of this.enemies) {
      drawEnemyOrBoss(ctx, e, this.time);
      this.drawStatusOverlay(ctx, e);

      if (!e.dead && this.rika.redEyeTimer > 0) {
        ctx.save();
        ctx.translate(e.x, e.y - e.h * 0.72);
        ctx.rotate(this.time * 4);
        ctx.strokeStyle = '#c83228';
        ctx.lineWidth = 2;
        ctx.strokeRect(-14, -14, 28, 28);
        ctx.restore();
      }
    }

    this.horror.renderActors(ctx);

    // 5. Rika 2D Character (or Dreadnought Golem Armor)
    this.rika.draw(ctx, this.time);
    this.expansion.renderFx(ctx, this.time);

    // Tip 84: High-Contrast Actor Outlines Toggle
    if (this.highContrast) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 6;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(this.rika.x - 20, this.rika.y - 58, 40, 58);
      ctx.strokeStyle = '#ff2244';
      ctx.shadowColor = '#ff0033';
      for (const e of this.enemies) {
        if (!e.dead) ctx.strokeRect(e.x - e.w * 0.5, e.y - e.h, e.w, e.h);
      }
      ctx.restore();
    }

    // 6. Railgun Beams, Lightning Arcs, Crimson Eye & Boss Beams
    for (const bm of this.beams) {
      ctx.save();
      ctx.globalAlpha = bm.life / bm.maxLife;
      ctx.strokeStyle = bm.color;
      ctx.shadowColor = bm.color;
      ctx.shadowBlur = 14;
      ctx.lineWidth = bm.width;
      ctx.beginPath();
      ctx.moveTo(bm.x1, bm.y1);
      ctx.lineTo(bm.x2, bm.y2);
      ctx.stroke();
      ctx.restore();
    }

    if (this.redEyeLaser) {
      const l = this.redEyeLaser;
      ctx.save();
      ctx.strokeStyle = '#c82820';
      ctx.shadowColor = '#a81810';
      ctx.shadowBlur = 18;
      ctx.lineWidth = 10 + Math.sin(this.time * 40) * 3;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
      ctx.strokeStyle = '#f5d7a1';
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.restore();
    }

    if (this.bossLaser) {
      const l = this.bossLaser;
      ctx.save();
      ctx.strokeStyle = '#c82820';
      ctx.shadowColor = '#a81810';
      ctx.shadowBlur = 20;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
      ctx.strokeStyle = '#f5d7a1';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }

    // 7. Bullets, Homing Missiles, Soul-Pyre Orbs & Cluster Grenades
    for (const b of this.bullets) {
      ctx.save();
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.glow;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();

      // Tip 28: Radiant Golden Parryable Halo
      if (b.parryable && !b.fromPlayer) {
        ctx.strokeStyle = '#fff8b0';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 14;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius + 3.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    for (const m of this.missiles) {
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(Math.atan2(m.vy, m.vx));
      ctx.fillStyle = '#e0a648';
      ctx.shadowColor = '#c85818';
      ctx.shadowBlur = 8;
      ctx.fillRect(-7, -3, 14, 6);
      ctx.restore();
    }

    for (const orb of this.bfgOrbs) {
      ctx.save();
      ctx.fillStyle = '#d89b38';
      ctx.shadowColor = '#c86418';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius + Math.sin(this.time * 25) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff0c8';
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const g of this.grenades) {
      ctx.save();
      ctx.fillStyle = '#c84220';
      ctx.shadowColor = '#a83214';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 8. Particles & Floating Damage Numbers
    for (const pt of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size * 0.5, pt.y - pt.size * 0.5, pt.size, pt.size);
      ctx.restore();
    }

    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, ft.life * 1.6);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore(); // end world camera transform

    // 8b. 2.5D Foreground Stone Crypt Pillars (Parallax 1.24x)
    if (this.stage.fgPillars) {
      ctx.save();
      for (const fp of this.stage.fgPillars) {
        const fx = fp.x - this.camX * 1.24 + shakeX * 1.2;
        if (fx + fp.w < -60 || fx > w + 60) continue;
        ctx.fillStyle = 'rgba(8, 5, 4, 0.58)';
        ctx.fillRect(fx, 0, fp.w, h);
        ctx.fillStyle = st.accent;
        ctx.globalAlpha = 0.14;
        ctx.fillRect(fx + fp.w - 3, 0, 3, h);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    this.horror.renderDarkness(ctx, w, h, shakeX, shakeY);

    // 8c. Subterranean Dungeon Torchlight Vignette (Frames the catacombs in atmospheric shadow)
    const rScreenX = this.rika.x - this.camX;
    const rScreenY = (this.rika.y - 44) - this.camY;
    const vig = ctx.createRadialGradient(rScreenX, rScreenY, h * 0.25, w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(0.65, 'rgba(8, 5, 3, 0.22)');
    vig.addColorStop(1, 'rgba(4, 2, 1, 0.62)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    this.expansion.renderOverlay(ctx, w, h);

    // Screen Impact Flash
    if (this.flashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // Tip 23: Off-Screen Threat Warning Chevrons on screen boundaries
    if (this.offscreenWarnings && this.offscreenWarnings.length > 0) {
      for (let i = this.offscreenWarnings.length - 1; i >= 0; i--) {
        const ow = this.offscreenWarnings[i];
        ow.timer -= 0.016;
        if (ow.timer <= 0) {
          this.offscreenWarnings.splice(i, 1);
          continue;
        }
        const onRight = ow.x > this.camX + w;
        const iconX = onRight ? w - 32 : 32;
        const iconY = Math.max(90, Math.min(h - 90, ow.y - this.camY));
        const pulse = Math.sin(this.time * 26) * 0.25 + 0.75;
        ctx.save();
        ctx.fillStyle = '#ff2244';
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 14;
        ctx.globalAlpha = Math.min(1.0, ow.timer * 2.0) * pulse;
        ctx.font = 'bold 15px Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(onRight ? '▶ ⚠' : '⚠ ◀', iconX, iconY);
        ctx.restore();
      }
    }

    this.horror.renderPost(ctx, w, h);

    // 9. Forged Iron & Gold Crosshair at Cursor
    if (this.state === 'playing') {
      const mx = this.screenToView(this.mouseScreen.x);
      const my = this.screenToView(this.mouseScreen.y);
      ctx.save();
      ctx.translate(mx, my);
      ctx.strokeStyle = this.rika.redEyeTimer > 0 ? '#d83b2b' : '#e0aa52';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.moveTo(-18, 0);
      ctx.lineTo(-7, 0);
      ctx.moveTo(7, 0);
      ctx.lineTo(18, 0);
      ctx.moveTo(0, -18);
      ctx.lineTo(0, -7);
      ctx.moveTo(0, 7);
      ctx.lineTo(0, 18);
      ctx.stroke();
      ctx.restore();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new SilentEarth2DGame();
  if (import.meta.env?.DEV) window.__game = game;
});
