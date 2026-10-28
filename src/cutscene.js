/**
 * SILENT EARTH — CINEMATIC CUTSCENE ENGINE
 * Authentic widescreen 2.39:1 letterboxed cinematic cutscenes with
 * character & demon boss portraits, typewriter dialogues, camera choreography,
 * dramatic title cards, screen quakes, and orchestral audio stings.
 */

export const PORTRAITS = {
  rika: 'assets/rika_portrait.webp',
  boss1: 'assets/boss1_malakor.webp',
  boss2: 'assets/boss2_vespera.webp',
  boss3: 'assets/boss3_kaelen.webp',
  boss4: 'assets/boss4_vane.webp',
  boss5: 'assets/boss5_davoth.webp',
  warden: 'assets/midboss_warden.webp',
  prologue: 'assets/prologue_catacombs.webp',
};

export class CutsceneEngine {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.inSplash = false;
    this.splashTimer = null;
    this.splashCb = null;
    this.mode = 'idle'; // 'prologue' | 'boss_intro' | 'boss_defeat' | 'mid_boss' | 'victory'
    this.lines = [];
    this.lineIndex = 0;
    this.typewriterTimer = null;
    this.displayedText = '';
    this.fullText = '';
    this.isTyping = false;
    this.onComplete = null;

    this.dom = {
      overlay: document.getElementById('cutscene-overlay'),
      barTop: document.getElementById('cutscene-bar-top'),
      barBottom: document.getElementById('cutscene-bar-bottom'),
      artWrap: document.getElementById('cutscene-art-wrap'),
      artImg: document.getElementById('cutscene-art-img'),
      speakerLeft: document.getElementById('cutscene-speaker-left'),
      leftImg: document.getElementById('cutscene-left-img'),
      leftName: document.getElementById('cutscene-left-name'),
      leftTitle: document.getElementById('cutscene-left-title'),
      speakerRight: document.getElementById('cutscene-speaker-right'),
      rightImg: document.getElementById('cutscene-right-img'),
      rightName: document.getElementById('cutscene-right-name'),
      rightTitle: document.getElementById('cutscene-right-title'),
      box: document.getElementById('cutscene-box'),
      dialogueText: document.getElementById('cutscene-dialogue-text'),
      counter: document.getElementById('cutscene-counter'),
      btnNext: document.getElementById('cutscene-btn-next'),
      btnSkip: document.getElementById('cutscene-btn-skip'),
      splash: document.getElementById('cutscene-boss-splash'),
      splashTag: document.getElementById('cutscene-splash-tag'),
      splashTitle: document.getElementById('cutscene-splash-title'),
      splashSub: document.getElementById('cutscene-splash-sub'),
    };

    if (this.dom.btnNext) {
      this.dom.btnNext.onclick = (e) => {
        e?.stopPropagation();
        this.advance();
      };
    }
    if (this.dom.btnSkip) {
      this.dom.btnSkip.onclick = (e) => {
        e?.stopPropagation();
        this.skip();
      };
    }
    if (this.dom.overlay) {
      this.dom.overlay.onclick = (e) => {
        if (e.target && e.target.tagName === 'BUTTON') return;
        this.advance();
      };
    }
  }

  getBossPortrait(stageIndex) {
    const map = [
      PORTRAITS.boss1,
      PORTRAITS.boss2,
      PORTRAITS.boss3,
      PORTRAITS.boss4,
      PORTRAITS.boss5,
    ];
    return map[stageIndex] || PORTRAITS.boss1;
  }

  /**
   * PROLOGUE CINEMATIC: The Fall of Arcadia & The Five Broken Seals
   */
  playPrologue(onDone) {
    this.onComplete = onDone;
    this.mode = 'prologue';
    this.active = true;

    const prologueLines = [
      {
        speaker: 'NARRATOR',
        role: 'THE CHRONICLE OF ASH',
        text: 'Three hundred years ago, the Abyssal Choir rose from the deep mantle, swallowing the kingdoms of man in molten ash and deafening madness.',
        art: PORTRAITS.prologue,
        leftActive: false,
        rightActive: false,
      },
      {
        speaker: 'LYRA',
        role: 'THE LIVING LULLABY',
        text: '“Do not look away, sister. If my song can bind the Demon Lords to eternal sleep... then weave my soul into the stone.”',
        art: PORTRAITS.prologue,
        leftActive: false,
        rightActive: false,
      },
      {
        speaker: 'RIKA',
        role: 'FIRST WARDEN OF THE VIGIL',
        text: 'Seven years I guarded the sealed gates above. But grief does not sleep forever... The seals have fractured. Five Demon Lords have torn Lyra’s soul into five screaming verses.',
        portrait: PORTRAITS.rika,
        leftActive: true,
        rightActive: false,
      },
      {
        speaker: 'RIKA',
        role: 'FIRST WARDEN OF THE VIGIL',
        text: 'I care nothing for salvation. I care only for my sister. Hear me, Lords of the Deep: I descend with blade and ash, and I will tear Hell apart until she is home.',
        portrait: PORTRAITS.rika,
        leftActive: true,
        rightActive: false,
      },
    ];

    this.startSequence(prologueLines, onDone);
  }

  /**
   * MID-BOSS SANCTUARY WARDEN CINEMATIC
   */
  playMidBoss(midBoss, lines, onDone) {
    this.onComplete = onDone;
    this.mode = 'mid_boss';
    this.active = true;

    this.setupPortraits(PORTRAITS.rika, PORTRAITS.warden, 'RIKA', 'FIRST WARDEN', midBoss.name, 'INNER SANCTUM WARDEN');

    this.showSplash('SANCTUARY WARDEN ENGAGED', midBoss.name, 'INNER SANCTUM GUARDIAN OF THE SEAL', 2200, () => {
      this.startSequence(lines || [], onDone);
    });
  }

  /**
   * FALLEN LORD PRE-BATTLE CINEMATIC CUTSCENE
   */
  playBossIntro(boss, actStory, onDone) {
    this.onComplete = onDone;
    this.mode = 'boss_intro';
    this.active = true;

    const bossImg = this.getBossPortrait(this.game.stageIndex);
    this.setupPortraits(PORTRAITS.rika, bossImg, 'RIKA', 'FIRST WARDEN', boss.name, this.game.stage?.bossSub || 'FALLEN LORD');

    this.game.sfx?.cutsceneSting();
    this.game.addShake?.(20);

    const splashTitle = this.game.stage?.bossTitle || boss.name;
    const splashSub = this.game.stage?.bossSub || 'FALLEN LORD OF THE DEEP';
    this.showSplash('ABYSSAL SEAL BREACHED // FALLEN LORD MANIFEST', splashTitle, splashSub, 2600, () => {
      const conv = actStory?.bossPre || [];
      if (conv.length > 0) {
        this.startSequence(conv, onDone);
      } else {
        this.finish();
      }
    });
  }

  /**
   * FALLEN LORD DEFEAT & SEAL RECLAIM CUTSCENE
   */
  playBossDefeat(boss, actStory, onDone) {
    this.onComplete = onDone;
    this.mode = 'boss_defeat';
    this.active = true;

    const bossImg = this.getBossPortrait(this.game.stageIndex);
    this.setupPortraits(PORTRAITS.rika, bossImg, 'RIKA', 'FIRST WARDEN', boss.name, 'FALLEN LORD (VANQUISHED)');

    this.game.sfx?.lullabyChime();
    this.game.addShake?.(14);

    const conv = actStory?.bossPost || [];
    if (conv.length > 0) {
      this.startSequence(conv, () => {
        this.showSplash('VERSE OF LYRA RECLAIMED', actStory.title || 'THE SOUL REBOUND', 'LEVEL COMPLETE // ENTERING SANCTUARY', 2400, onDone);
      });
    } else {
      this.showSplash('VERSE OF LYRA RECLAIMED', 'SEAL SHATTERED', 'LEVEL COMPLETE // ENTERING SANCTUARY', 2400, onDone);
    }
  }

  /**
   * FINAL VICTORY CINEMATIC
   */
  playVictory(onDone) {
    this.onComplete = onDone;
    this.mode = 'victory';
    this.active = true;

    const victoryLines = [
      {
        speaker: 'LYRA',
        role: 'THE LIVING LULLABY',
        text: '“Rika... The song is ending. Can you hear the morning outside the stone?”',
        art: PORTRAITS.prologue,
      },
      {
        speaker: 'RIKA',
        role: 'THE ASHEN PILGRIM',
        text: '“I hear it, Lyra. Seven years in the dark... but the sun is breaking through the cathedral ceiling.”',
        portrait: PORTRAITS.rika,
      },
      {
        speaker: 'LYRA',
        role: 'THE LIVING LULLABY',
        text: '“Thank you for not leaving me to the ash. Rest your sword, sister. The Vigil is fulfilled.”',
        art: PORTRAITS.prologue,
      },
    ];

    this.startSequence(victoryLines, onDone);
  }

  setupPortraits(leftSrc, rightSrc, leftName, leftTitle, rightName, rightTitle) {
    if (this.dom.leftImg) this.dom.leftImg.src = leftSrc || PORTRAITS.rika;
    if (this.dom.leftName) this.dom.leftName.textContent = leftName;
    if (this.dom.leftTitle) this.dom.leftTitle.textContent = leftTitle;

    if (this.dom.rightImg) this.dom.rightImg.src = rightSrc || PORTRAITS.boss1;
    if (this.dom.rightName) this.dom.rightName.textContent = rightName;
    if (this.dom.rightTitle) this.dom.rightTitle.textContent = rightTitle;
  }

  showSplash(tag, title, sub, duration = 2400, cb) {
    this.active = true;
    this.inSplash = true;
    this.splashCb = cb;
    if (this.splashTimer) clearTimeout(this.splashTimer);

    this.dom.overlay?.classList.remove('hidden');
    this.dom.splash?.classList.remove('hidden');
    if (this.dom.splashTag) this.dom.splashTag.textContent = tag;
    if (this.dom.splashTitle) this.dom.splashTitle.textContent = title;
    if (this.dom.splashSub) this.dom.splashSub.textContent = sub;

    this.dom.box?.classList.add('hidden');
    this.dom.speakerLeft?.classList.add('hidden');
    this.dom.speakerRight?.classList.add('hidden');

    this.game.sfx?.bossRoar();

    this.splashTimer = setTimeout(() => {
      this.endSplash();
    }, duration);
  }

  endSplash() {
    if (this.splashTimer) {
      clearTimeout(this.splashTimer);
      this.splashTimer = null;
    }
    this.inSplash = false;
    this.dom.splash?.classList.add('hidden');
    const cb = this.splashCb;
    this.splashCb = null;
    if (cb) cb();
  }

  startSequence(lines, onDone) {
    this.active = true;
    this.inSplash = false;
    this.lines = lines || [];
    this.lineIndex = 0;
    this.onComplete = onDone;
    this.dom.overlay?.classList.remove('hidden');
    this.dom.box?.classList.remove('hidden');
    this.dom.speakerLeft?.classList.remove('hidden');
    this.dom.speakerRight?.classList.remove('hidden');

    this.renderLine();
  }

  renderLine() {
    if (this.lineIndex >= this.lines.length) {
      this.finish();
      return;
    }

    const item = this.lines[this.lineIndex];
    if (!item) {
      this.finish();
      return;
    }

    const isRika = item.speaker === 'RIKA';
    const isBoss = !isRika && item.speaker !== 'NARRATOR' && item.speaker !== 'LYRA';

    if (this.dom.speakerLeft) {
      this.dom.speakerLeft.classList.toggle('active-speaker', isRika);
      this.dom.speakerLeft.classList.toggle('dimmed-speaker', !isRika);
    }
    if (this.dom.speakerRight) {
      this.dom.speakerRight.classList.toggle('active-speaker', isBoss);
      this.dom.speakerRight.classList.toggle('dimmed-speaker', !isBoss);
    }

    if (item.art && this.dom.artImg) {
      this.dom.artImg.src = item.art;
      this.dom.artWrap?.classList.remove('hidden');
    } else {
      this.dom.artWrap?.classList.add('hidden');
    }

    if (this.dom.counter) {
      this.dom.counter.textContent = `${this.lineIndex + 1} / ${this.lines.length}`;
    }

    this.fullText = item.text || '';
    this.displayedText = '';
    this.isTyping = true;
    if (this.typewriterTimer) clearInterval(this.typewriterTimer);

    let charIdx = 0;
    if (this.dom.dialogueText) {
      this.dom.dialogueText.innerHTML = `<span class="speaker-pill ${isRika ? 'rika' : 'boss'}">${item.speaker}</span> `;
    }

    this.typewriterTimer = setInterval(() => {
      if (charIdx < this.fullText.length) {
        this.displayedText += this.fullText[charIdx];
        charIdx++;
        if (this.dom.dialogueText) {
          this.dom.dialogueText.innerHTML = `<span class="speaker-pill ${isRika ? 'rika' : 'boss'}">${item.speaker}</span> ${this.displayedText}`;
        }
        if (charIdx % 3 === 0) this.game.sfx?.dialogueTick();
      } else {
        clearInterval(this.typewriterTimer);
        this.typewriterTimer = null;
        this.isTyping = false;
      }
    }, 18);
  }

  advance() {
    if (!this.active) return;
    if (this.inSplash) {
      this.endSplash();
      return;
    }
    if (this.isTyping) {
      if (this.typewriterTimer) clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
      this.isTyping = false;
      const item = this.lines[this.lineIndex];
      const isRika = item?.speaker === 'RIKA';
      if (this.dom.dialogueText) {
        this.dom.dialogueText.innerHTML = `<span class="speaker-pill ${isRika ? 'rika' : 'boss'}">${item?.speaker || ''}</span> ${this.fullText}`;
      }
      return;
    }

    this.lineIndex++;
    if (this.lineIndex < this.lines.length) {
      this.renderLine();
    } else {
      this.finish();
    }
  }

  skip() {
    if (!this.active) return;
    if (this.typewriterTimer) {
      clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
    }
    if (this.splashTimer) {
      clearTimeout(this.splashTimer);
      this.splashTimer = null;
    }
    this.finish();
  }

  finish() {
    if (this.typewriterTimer) {
      clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
    }
    if (this.splashTimer) {
      clearTimeout(this.splashTimer);
      this.splashTimer = null;
    }
    this.active = false;
    this.inSplash = false;
    this.isTyping = false;

    this.dom.overlay?.classList.add('hidden');
    this.dom.box?.classList.add('hidden');
    this.dom.splash?.classList.add('hidden');
    this.dom.artWrap?.classList.add('hidden');
    this.dom.speakerLeft?.classList.add('hidden');
    this.dom.speakerRight?.classList.add('hidden');

    if (this.game) {
      this.game.state = 'playing';
      this.game.mouseDown = false;
    }

    const cb = this.onComplete;
    this.onComplete = null;
    if (cb) cb();
  }
}
