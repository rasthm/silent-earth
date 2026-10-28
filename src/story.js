/**
 * SILENT EARTH: THE LULLABY OF ASH & BONE
 * Complete 2-Hour Story Script, Rika's Journey Monologues, Mid-Boss Encounters & Boss Conversations
 */

export const ACT_STORIES = [
  // ==========================================================================
  // ACT I — THE CATACOMBS OF WEEPING IRON (Theme: Denial & Numbness)
  // ==========================================================================
  {
    act: 'ACT I',
    title: 'CATACOMBS OF WEEPING IRON',
    verseName: 'THE FIRST VERSE — EMBER OF MEMORY',
    openingQuote:
      '“Three hundred years I slept in the ash above the seal. Now the stone is cold, the chains are snapped, and my sister Lyra’s voice has been torn into five pieces.” — Rika, First Warden',
    beats: [
      {
        x: 220,
        zone: 'DEPTH I · THE OSSUARY GATE',
        title: 'THE BROKEN SEAL',
        text: '“Three hundred years I stood vigil above the chasm. Now the chains are snapped, and Lyra’s Lullaby has been torn into five verses. Hold on, little sister. I am coming down into the dark.”',
      },
      {
        x: 1750,
        zone: 'DEPTH I · THE RUSTING NAVE',
        title: 'TOMBS OF THE LIVING',
        text: '“These iron coffins were forged for the Knights of the Vigil. They bricked themselves inside while they were still breathing… terrified that if they looked at the sky, they would see what we failed to save.”',
      },
      {
        x: 3400,
        zone: 'DEPTH II · THE PENITENT FORGE',
        title: 'HAMMER-MARKS OF OLD',
        text: '“I know the hammer-marks on these dungeon pillars. Malak forged my first blade here. He used to laugh louder than the bellows—before the First Eclipse took his family in the upper ward.”',
      },
      {
        x: 5000,
        zone: 'DEPTH II · WARDEN’S THRESHOLD',
        title: 'THE IRON PENANCE',
        text: '“The stone is slick with molten slag and blood. Malak didn’t seal the demons down here… he locked himself in this dungeon with them so he could punish himself forever.”',
      },
      {
        x: 6800,
        zone: 'DEPTH III · HALL OF BROKEN SHIELDS',
        title: 'UNFEELING IRON',
        text: '“Every rusted shield on these walls bears a name I once marched beside. They thought hardening their hearts into iron would stop the hurting. It only turned them into monsters.”',
      },
      {
        x: 8300,
        zone: 'DEPTH III · THE CRUCIBLE ARCH',
        title: 'THE FIRST VERSE HUMS',
        text: '“I can hear the First Verse of Lyra’s song humming inside the great furnace ahead. And standing before the gate… my oldest shield-brother.”',
      },
    ],
    midBoss: {
      name: 'GARRUL, THE FORGEMASTER’S HUSK',
      title: 'WARDEN OF THE SLAG GATES',
      pre: [
        { speaker: 'GARRUL', role: 'FORGEMASTER HUSK', side: 'right', text: '“Turn back, Warden Rika! Lord Malak has decreed that no living heart may pass the Slag Gates! Only cold iron endures!”' },
        { speaker: 'RIKA', role: 'FIRST WARDEN', side: 'left', text: '“Forgemaster Garrul… even with your lungs full of cinders, you still guard his forge. Forgive me—I must quenched your fire.”' },
      ],
    },
    bossPre: [
      {
        speaker: 'MALAK, THE IRON PENITENT',
        role: 'LORD OF THE FIRST SEAL',
        side: 'right',
        text: '“Step back into the ash, Rika. Your cloak still carries the memory of surface wind. There is nothing left for you down in these catacombs.”',
      },
      {
        speaker: 'RIKA',
        role: 'FIRST WARDEN OF THE VIGIL',
        side: 'left',
        text: '“Malak… look at yourself. You poured molten dungeon iron over your own skin. You welded your armor to your bones. Why did you break the First Seal?”',
      },
      {
        speaker: 'MALAK, THE IRON PENITENT',
        role: 'LORD OF THE FIRST SEAL',
        side: 'right',
        text: '“Because the Lullaby made us remember! Every note of your sister’s song carried the voices of the children we failed to save at the Upper Gate! When I tore the First Verse from the shrine and buried it in my furnace, the memories finally went quiet.”',
      },
      {
        speaker: 'RIKA',
        role: 'FIRST WARDEN OF THE VIGIL',
        side: 'left',
        text: '“You didn’t silence your grief, old friend—you fed it to the Abyss. Give me back Lyra’s First Verse.”',
      },
      {
        speaker: 'MALAK, THE IRON PENITENT',
        role: 'LORD OF THE FIRST SEAL',
        side: 'right',
        text: '“If you wake her song, the pain comes back! I would rather be a beast of unfeeling iron than a man who remembers! Draw your blade, Rika—let us see if flesh is stronger than the forge!”',
      },
    ],
    bossPost: [
      {
        speaker: 'MALAK, THE IRON PENITENT',
        role: 'FALLEN SHIELD-BROTHER',
        side: 'right',
        text: '“The iron… is cracking. Gods… I can feel the warmth of the torchlight on my face again. It hurts, Rika… just like I feared it would.”',
      },
      {
        speaker: 'RIKA',
        role: 'FIRST WARDEN OF THE VIGIL',
        side: 'left',
        text: '“Pain is only the proof that you loved them, brother. Carry the iron no longer. Sleep in peace—not in chains, but in memory.”',
      },
    ],
  },

  // ==========================================================================
  // ACT II — THE OSSUARY OF PLAGUE & SILK (Theme: Bargaining & False Mercy)
  // ==========================================================================
  {
    act: 'ACT II',
    title: 'THE OSSUARY OF PLAGUE & SILK',
    verseName: 'THE SECOND VERSE — BREATH OF MERCY',
    openingQuote:
      '“Below the iron forge lies the old Infirmary of Saint Exultia. Here Matron Arachne bargained with the dark so that none of her patients would ever die.”',
    beats: [
      {
        x: 220,
        zone: 'DEPTH I · THE SUNKEN CLOISTER',
        title: 'INCENSE AND ROT',
        text: '“Below Malak’s forge lies the Sunken Infirmary. The dungeon air tastes of myrrh, damp silk, and stagnant blood. Matron Arachne carried the Second Verse into these vaults.”',
      },
      {
        x: 1900,
        zone: 'DEPTH I · THE WEBBED NAVE',
        title: 'COCOONS IN THE RAFTERS',
        text: '“There are hundreds of bodies wrapped in pale silk along the stone arches. Their chests are still rising and falling… after three centuries. She refused to let a single patient die.”',
      },
      {
        x: 3700,
        zone: 'DEPTH II · CISTERN OF HOLLOW PRAYERS',
        title: 'THE HEALER’S BARGAIN',
        text: '“When the grey plague followed the Eclipse, Arachne begged the Abyss for a miracle. It gave her silk that stops death—by devouring the soul inside the body.”',
      },
      {
        x: 5400,
        zone: 'DEPTH II · THEOSSUARY BRIDGE',
        title: 'APULSE WITHOUT A MIND',
        text: '“She calls this salvation. Keeping a heartbeat going in the pitch dark while the mind rots away into a demon.”',
      },
      {
        x: 7200,
        zone: 'DEPTH III · THE BROOD CHANCEL',
        title: 'THE CRADLE WEB',
        text: '“Lyra’s Second Verse is woven into the great cocoon above the high altar. It sounds like a mother humming to a child who will never wake.”',
      },
      {
        x: 8700,
        zone: 'DEPTH III · THE SILK SANCTUM',
        title: 'FALSE MERCY',
        text: '“Mercy without an ending isn’t mercy, Arachne. It is a cage.”',
      },
    ],
    midBoss: {
      name: 'MORbus, THE CARRION CANTOR',
      title: 'KEEPER OF THE PLAGUE BELLS',
      pre: [
        { speaker: 'MORBUS', role: 'CARRION CANTOR', side: 'right', text: '“Hush! Do not ring your steel in the infirmary! The Matron’s patients must never wake from their silk!”' },
        { speaker: 'RIKA', role: 'FIRST WARDEN', side: 'left', text: '“They are not sleeping, Cantor—they are trapped. Stand aside!”' },
      ],
    },
    bossPre: [
      {
        speaker: 'MATRON ARACHNE',
        role: 'WEAVER OF HOLLOW VOWS',
        side: 'right',
        text: '“Hush your heavy footsteps, Rika. You will startle my children. Three hundred years I have kept every last one of them breathing in my silk.”',
      },
      {
        speaker: 'RIKA',
        role: 'FIRST WARDEN OF THE VIGIL',
        side: 'left',
        text: '“Those aren’t patients anymore, Matron. They are hollow husks hanging in the catacomb dark, begging for a release you won’t allow them.”',
      },
      {
        speaker: 'MATRON ARACHNE',
        role: 'WEAVER OF HOLLOW VOWS',
        side: 'right',
        text: '“Death is the only enemy! I swore the Healer’s Vow—that no soul under my roof would ever cross the veil! With Lyra’s Second Verse pulsing in my web, their hearts will beat for eternity!”',
      },
      {
        speaker: 'RIKA',
        role: 'FIRST WARDEN OF THE VIGIL',
        side: 'left',
        text: '“A heartbeat without a soul is just a clock ticking in an empty tomb. Surrender the Second Verse, Arachne, and let these poor souls rest.”',
      },
      {
        speaker: 'MATRON ARACHNE',
        role: 'WEAVER OF HOLLOW VOWS',
        side: 'right',
        text: '“Never! Come closer, Warden—let me spin a cocoon for you too, so you never have to bleed or grieve again!”',
      },
    ],
    bossPost: [
      {
        speaker: 'MATRON ARACHNE',
        role: 'DYING HEALER',
        side: 'right',
        text: '“The silk… is parting. Listen… the cocoons in the rafters… they are sighing. Were they truly waiting to go all this time?”',
      },
      {
        speaker: 'RIKA',
        role: 'FIRST WARDEN OF THE VIGIL',
        side: 'left',
        text: '“Every song needs a final note to have meaning, Matron. Rest now—your vigil is over.”',
      },
    ],
  },

  // ==========================================================================
  // ACT III — THE FROZEN RELIQUARY OF ECHOES (Theme: Stasis & Fear of Loss)
  // ==========================================================================
  {
    act: 'ACT III',
    title: 'FROZEN RELIQUARY OF ECHOES',
    verseName: 'THE THIRD VERSE — CHIME OF AUTUMN',
    openingQuote:
      '“In the third depth, Seraph Valkyrie froze the entire cathedral in rime so that no tear could ever fall and no season could ever change.”',
    beats: [
      {
        x: 220,
        zone: 'DEPTH I · THE RIME NAVE',
        title: 'THE STILL HOUR',
        text: '“The third dungeon is silent as a glacier. Even the wall torches burn pale gold against the frost. Here Seraph Valkyrie guards the Third Verse.”',
      },
      {
        x: 2050,
        zone: 'DEPTH I · GALLERY OF STILL STATUES',
        title: 'PILGRIMS IN ICE',
        text: '“These aren’t carved stone statues. They are pilgrims frozen mid-step, mid-prayer, mid-embrace. She stopped time itself in this vault.”',
      },
      {
        x: 4000,
        zone: 'DEPTH II · THE SHATTERED BELFRY',
        title: 'SONG OF AUTUMN',
        text: '“When Lyra sang the Third Verse, she sang of autumn—of how leaves must fall so spring can return. Valkyrie hated that verse most of all.”',
      },
      {
        x: 5800,
        zone: 'DEPTH II · THE CLOISTER OF GLASS',
        title: 'FRAGILE ETERNITY',
        text: '“Look how carefully she preserves the past. One crack in the ice, and three centuries of grief come rushing in at once.”',
      },
      {
        x: 7600,
        zone: 'DEPTH III · THE MIRROR CRYPT',
        title: 'WHITE AT THE TEMPLES',
        text: '“I see my reflection in the frozen masonry. My hair has turned silver at the temples. How much of my own life did I leave behind when I descended into these dungeons?”',
      },
      {
        x: 9100,
        zone: 'DEPTH III · CHOIR OF FROST',
        title: 'THE THAW BEGINS',
        text: '“No winter lasts forever, Seraph. Even in the deepest cavern beneath the earth.”',
      },
    ],
    midBoss: {
      name: 'CAELUM, WARDEN OF THE GLASS BELFRY',
      title: 'SENTINEL OF THE FROZEN CLOCK',
      pre: [
        { speaker: 'CAELUM', role: 'GLASS WARDEN', side: 'right', text: '“Your warm blood steams in the Seraph’s cathedral, intruder! All motion is decay—stand still and be preserved!”' },
        { speaker: 'RIKA', role: 'FIRST WARDEN', side: 'left', text: '“I was not born to be a statue in your reliquary!”' },
      ],
    },
    bossPre: [
      {
        speaker: 'SERAPH VALKYRIE',
        role: 'KEEPER OF THE STILL HOUR',
        side: 'right',
        text: '“Look upon perfection, Rika. Not a single tear falls in my cathedral. Not a single flower withers. In the Still Hour, loss cannot exist.”',
      },
      {
        speaker: 'RIKA',
        role: 'FIRST WARDEN OF THE VIGIL',
        side: 'left',
        text: '“Nor can joy. Nor can tomorrow. You froze an entire sanctuary in rime because you were terrified of what comes after goodbye.”',
      },
      {
        speaker: 'SERAPH VALKYRIE',
        role: 'KEEPER OF THE STILL HOUR',
        side: 'right',
        text: '“Every tomorrow brings another grave! Your sister’s Third Verse wept for the passing of time—so I locked it inside a glacier of eternal stillness. Why would you thaw a world only so it can suffer again?”',
      },
      {
        speaker: 'RIKA',
        role: 'FIRST WARDEN OF THE VIGIL',
        side: 'left',
        text: '“Because a heart locked in ice cannot love. Stand aside, Valkyrie—or I will shatter your eternity.”',
      },
    ],
    bossPost: [
      {
        speaker: 'SERAPH VALKYRIE',
        role: 'FALLEN ARBITER',
        side: 'right',
        text: '“The ice… is melting from my wings. Listen… I can hear water dripping in the nave… like footsteps returning home.”',
      },
      {
        speaker: 'RIKA',
        role: 'FIRST WARDEN OF THE VIGIL',
        side: 'left',
        text: '“Spring always hurts when the frost breaks, Seraph. That is how the earth knows it is alive.”',
      },
    ],
  },

  // ==========================================================================
  // ACT IV — NEKRAVOL, SPIRE OF BROKEN OATHS (Theme: Guilt & Vengeance)
  // ==========================================================================
  {
    act: 'ACT IV',
    title: 'NEKRAVOL, SPIRE OF BROKEN OATHS',
    verseName: 'THE FOURTH VERSE — ASH OF FORGIVENESS',
    openingQuote:
      '“At the summit of the subterranean skull-spire waits Vex—who loved Lyra as fiercely as I did, and has hated me for three hundred years.”',
    beats: [
      {
        x: 220,
        zone: 'DEPTH I · THE BASALT CAUSEWAY',
        title: 'MARKS OF THE AXE',
        text: '“Nekravol. The subterranean fortress of the Night Sentinels. Only one warrior in our order ever left crescent axe-scars like these in basalt stone: Vex.”',
      },
      {
        x: 2150,
        zone: 'DEPTH I · THE TRIAL OF ASH',
        title: 'THE NIGHT OF THE ECLIPSE',
        text: '“Vex loved Lyra with all his fierce, stubborn heart. On the night of the First Eclipse, he begged me to take her and flee—to let the world burn so she could live.”',
      },
      {
        x: 4200,
        zone: 'DEPTH II · HALL OF ACCUSATION',
        title: 'THREE CENTURIES OF WRATH',
        text: '“When I allowed Lyra to bind her soul into the Lullaby, Vex shattered his Sentinel oath and swore he would never forgive me.”',
      },
      {
        x: 6100,
        zone: 'DEPTH II · THE GALLOWS BRIDGE',
        title: 'THE WEIGHT OF DUTY',
        text: '“Perhaps he has every right to hate me. I saved the world with my little sister’s voice… and left her singing alone in the dark.”',
      },
      {
        x: 7900,
        zone: 'DEPTH III · COURT OF THE FALLEN',
        title: 'OLD SPARRING GROUNDS',
        text: '“Vex and I trained in this very courtyard when we were initiates. He knows every feint, every parry, every rhythm of my blade.”',
      },
      {
        x: 9500,
        zone: 'DEPTH III · THE JUDGMENT ARCH',
        title: 'THE MIRROR KNIGHT',
        text: '“Four Verses remain. And the man who knows my greatest sin stands waiting at the altar.”',
      },
    ],
    midBoss: {
      name: 'Kaelen, THE ASH-HOUND EXECUTIONER',
      title: 'LIEUTENANT OF THE NIGHT WATCH',
      pre: [
        { speaker: 'KAELEN', role: 'NIGHT WATCH EXECUTIONER', side: 'right', text: '“Commander Vex said you would climb the Spire eventually, sister-killer! Let us see if the First Warden still remembers how to bleed!”' },
        { speaker: 'RIKA', role: 'FIRST WARDEN', side: 'left', text: '“My quarrel is not with you, Kaelen—do not throw your life away for Vex’s grudge!”' },
      ],
    },
    bossPre: [
      {
        speaker: 'VEX, THE FALLEN SENTINEL',
        role: 'FALLEN NIGHT SENTINEL',
        side: 'right',
        text: '“Three centuries, Rika! Three centuries I have honed this axe in the dark, waiting for the ‘noble First Warden’ to crawl down into Nekravol!”',
      },
      {
        speaker: 'RIKA',
        role: 'FIRST WARDEN OF THE VIGIL',
        side: 'left',
        text: '“Vex… you took the Fourth Verse. You let the Abyss hollow out your Sentinel vow.”',
      },
      {
        speaker: 'VEX, THE FALLEN SENTINEL',
        role: 'FALLEN NIGHT SENTINEL',
        side: 'right',
        text: '“I took the Fourth Verse so I could hear her voice without you standing between us! You were her older sister, Rika—you were supposed to protect her from the world, not sacrifice her to save it!”',
      },
      {
        speaker: 'RIKA',
        role: 'FIRST WARDEN OF THE VIGIL',
        side: 'left',
        text: '“Do you think a single hour has passed in three hundred years that I haven’t wished it was my soul in that seal instead of hers?! It was Lyra’s choice, Vex! And if we don’t unite the Five Verses now, her sacrifice dies in vain!”',
      },
      {
        speaker: 'VEX, THE FALLEN SENTINEL',
        role: 'FALLEN NIGHT SENTINEL',
        side: 'right',
        text: '“Excuses of a knight who chose duty over blood! Raise your blade, Rika—when my eyes flash green, face my judgment!”',
      },
    ],
    bossPost: [
      {
        speaker: 'VEX, THE FALLEN SENTINEL',
        role: 'FALLEN NIGHT SENTINEL',
        side: 'right',
        text: '“Hah… you still drop your left shoulder before a lunge… just like in the training yard. Take the Fourth Verse, Rika… and when you reach the bottom of the Abyss… tell Lyra I never stopped listening.”',
      },
      {
        speaker: 'RIKA',
        role: 'FIRST WARDEN OF THE VIGIL',
        side: 'left',
        text: '“I will tell her we both kept watch, Vex. Rest now, Sentinel.”',
      },
    ],
  },

  // ==========================================================================
  // ACT V — IMMORA, SANCTUM OF THE FIRST GRIEF (Theme: Acceptance & Dawn)
  // ==========================================================================
  {
    act: 'ACT V',
    title: 'IMMORA, SANCTUM OF THE FIRST GRIEF',
    verseName: 'THE FIFTH VERSE — DAWN AFTER LULLABY',
    openingQuote:
      '“A lullaby was never meant to lock the world in sleep forever. It was meant to comfort the dark until morning comes.”',
    beats: [
      {
        x: 220,
        zone: 'DEPTH I · THRESHOLD OF FIRST SORROW',
        title: 'FOUR VERSES UNITED',
        text: '“Four Verses sing together against my breastplate. Only the Fifth remains—held at the deepest root of the dungeon by Davoth-Omega, the First Grief.”',
      },
      {
        x: 2300,
        zone: 'DEPTH I · THE ROAD OF REMNANTS',
        title: 'WHY THE SEAL BROKE',
        text: '“Now I understand why our seal failed. A lullaby is meant to comfort a child through the night—not to lock the world in sleep forever.”',
      },
      {
        x: 4500,
        zone: 'DEPTH II · CATHEDRAL OF ECLIPSE',
        title: 'THE BIRTH OF DEMONS',
        text: '“Every demon I have slain in these catacombs was once a human fear given horns and iron. Denial. Bargaining. Despair. Guilt.”',
      },
      {
        x: 6600,
        zone: 'DEPTH II · THE ECHO OF LYRA',
        title: 'A SISTER’S WHISPER',
        text: '“I hear Lyra’s voice clearly now through the stone: ‘Sister, do not sing the Lullaby to close the Abyss again. Sing it to teach the darkness how to let go.’”',
      },
      {
        x: 8400,
        zone: 'DEPTH III · ALTAR OF THE FIRST ECLIPSE',
        title: 'NO MORE RUNNING',
        text: '“No more hiding in iron like Malak. No more silk cages like Arachne. No more frozen time like Valkyrie. No more bitter blame like Vex.”',
      },
      {
        x: 9900,
        zone: 'DEPTH III · THRONE OF THE DARK LORD',
        title: 'THE FINAL VERSE',
        text: '“The throne of Davoth-Omega rises ahead. Together, Lyra—let us finish the song and wake the earth.”',
      },
    ],
    midBoss: {
      name: 'SOL & MORG, APOSTLES OF THE FIRST ECLIPSE',
      title: 'GUARDIANS OF THE ABYSSAL THRONE',
      pre: [
        { speaker: 'APOSTLE SOL', role: 'THRONE GUARDIAN', side: 'right', text: '“Mortal Warden! Beyond this arch sits the First Grief of Mankind! None who carry hope may look upon His face!”' },
        { speaker: 'RIKA', role: 'FIRST WARDEN', side: 'left', text: '“I carry more than hope—I carry every tear it took to reach this gate!”' },
      ],
    },
    bossPre: [
      {
        speaker: 'DAVOTH-OMEGA',
        role: 'SOVEREIGN OF THE FIRST GRIEF',
        side: 'right',
        text: '“So the Little Warden arrives at the bottom of the earth, clutching four broken verses of a dead sister’s song. Do you truly know what I am, Rika?”',
      },
      {
        speaker: 'RIKA',
        role: 'FIRST WARDEN OF THE VIGIL',
        side: 'left',
        text: '“You are the Abyssal Core. The Sovereign who tore open the earth during the First Eclipse.”',
      },
      {
        speaker: 'DAVOTH-OMEGA',
        role: 'SOVEREIGN OF THE FIRST GRIEF',
        side: 'right',
        text: '“I am no stranger to humanity—I AM humanity! I was born from the first mother who wept over a cold cradle, the first soldier who cursed the dawn! Every time a mortal refuses to accept loss, my dungeon grows deeper! And your sister’s Fifth Verse is the sweetest sorrow I have ever devoured!”',
      },
      {
        speaker: 'RIKA',
        role: 'FIRST WARDEN OF THE VIGIL',
        side: 'left',
        text: '“Grief is the price we pay for having loved, Davoth. It was never meant to be a throne for a tyrant. I am not here to put you back to sleep—I am here to end the night!”',
      },
      {
        speaker: 'DAVOTH-OMEGA',
        role: 'SOVEREIGN OF THE FIRST GRIEF',
        side: 'right',
        text: '“Then drown in the mourning of ten thousand years! Come, Rika of the Vigil—sing your last!”',
      },
    ],
    bossPost: [
      {
        speaker: 'DAVOTH-OMEGA',
        role: 'SOVEREIGN OF THE FIRST GRIEF',
        side: 'right',
        text: '“Impossible… you do not fear the ending… Without the weight of eternal mourning, my crown turns to ash…”',
      },
      {
        speaker: 'LYRA’S VOICE',
        role: 'THE LIVING LULLABY',
        side: 'right',
        text: '“Thank you, Rika. Three hundred years ago, we sang the Lullaby because we were afraid of the dark. Today, you sang it so the morning could finally come. Let my voice rest now, big sister.”',
      },
      {
        speaker: 'RIKA',
        role: 'FIRST WARDEN OF THE VIGIL',
        side: 'left',
        text: '“Goodbye, Lyra. Whenever the wind moves through the tall grass on the surface… I will know you are singing.”',
      },
    ],
  },
];
