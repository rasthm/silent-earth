# SILENT EARTH — Rika: The Lullaby of Ash & Bone
A 2D gothic horror action game that runs in the browser: five acts, five boss fights, hidden dungeons and secret bosses.

**Live demo:** https://silent-earth.orbit-fm.workers.dev/

---

## ⚡ Quick Start (Easiest Way to Play)

### Option 1: One-Click Launcher (Windows)
Simply **double-click** the file:
```
RUN_GAME.bat
```
This batch script will automatically check your environment, start the local Vite development server, and open the game in your default browser at `http://localhost:5173/`.

---

### Option 2: Terminal / Command Prompt

1. Open **Command Prompt** or **PowerShell** in this folder:
   ```powershell
   cd silent-earth
   ```

2. (Optional, if packages are missing) Install dependencies:
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   npx vite --port 5173 --host
   ```

4. Open your browser (Google Chrome recommended) and navigate to:
   ```
   http://localhost:5173/
   ```

---

## 🎮 Game Controls

### Keyboard & Mouse

| Action | Key / Input | Notes |
| :--- | :--- | :--- |
| **Move Left / Right** | `[A]` / `[D]` or `[←]` / `[→]` | Tactical sprint & wall slide |
| **Aim** | Mouse Cursor | Crosshair indicates aim line & spread |
| **Jump / Wall Kick** | `[W]` or `[Space]` or `[↑]` | Variable height; tap on wall for wall-kick |
| **Drop Down / Ground Slam** | `[S]` or `[↓]` | Drop through platforms on ground; ground slam in mid-air |
| **Crouch Slide** | `[S] + [Shift]` or `[C]` | Slip underneath low hazards & enemy shots |
| **Air Dash** | `[Shift]` | Dash with ghost trail afterimages & Flame Dash trail |
| **Primary Fire** | `[Left Mouse Button]` | Fire equipped weapon core |
| **Secondary Alt-Fire** | `[Right Mouse Button]` or `[Z]` | Damascus Grenade, Dragon's Breath, Ion Pierce, EMP cascade, Void Vortex |
| **Crucible Execution** | `[X]` | Glory Kill on staggered / elite demons |
| **Chain-Hook Grapple** | `[F]` or `[Middle Click]` | Latch to ledges, platforms, or drag enemies |
| **Interact / Open Chest** | `[G]` | Read Lore Tablets, rip Gore Nests, trade with Kess |
| **Weapon Selection** | `[1]`, `[2]`, `[3]`, `[4]`, `[5]` or `[Q]` / `[E]` | 1: Damascus, 2: Spreader, 3: Lance, 4: Tesla, 5: BFG |
| **Reload Manual** | `[R]` | Refill active weapon magazine |
| **Quick Respawn** | `[R]` (when dead) | Instant respawn at sanctuary beacon |
| **Swap Loadout Profile** | `[L]` | Toggle between Loadout A and Loadout B |
| **Chronicle Story Log** | `[J]` | Review Rika's journey narrative entries |
| **Sanctuary Options & Settings** | `[O]` or `[Esc]` or `⚙` icon | Adjust screenshake, colorblind filters, cloaks |
| **Live Dev Debug HUD** | `[F1]` | Toggle FPS counter, entity stats, and God Mode |

---

### Gamepad Controller Support (Xbox / PlayStation / Generic)

- **Left Stick**: Move Left / Right
- **[A] / [Cross]**: Jump & Wall-Kick
- **[B] / [Circle]**: Interact / Gore Nest
- **[X] / [Square]**: Crucible Blade Glory Kill Execution
- **[Y] / [Triangle]**: Chain-Hook Grapple
- **[RT] (Right Trigger)**: Primary Weapon Fire
- **[LT] (Left Trigger)**: Secondary Alt-Fire
- **[LB] (Left Bumper)**: Phase Dash / Flame Dash
- **[RB] (Right Bumper)**: Cluster Grenade / Aux Payload
- **D-Pad Left / Right**: Cycle Weapons

---

## 🏛️ Game Modes & Features

1. **The 2-Hour Story Campaign**:
   - **Act I**: Catacombs of Weeping Iron (Boss: *Lord Malak · The Iron Penitent*)
   - **Act II**: The Ossuary of Stolen Breath (Boss: *Matron Arachne · The Weeping Choir*)
   - **Act III**: Sunken Basilica of the Blind Choir (Boss: *Seraph Valkyrie · The Frozen Clockmaker*)
   - **Act IV**: Smoldering Foundry of Despair (Boss: *Vex · The Fallen Night Sentinel*)
   - **Act V**: The Core of Ash & Bone (Boss: *Davoth-Omega · Sovereign of the First Grief*)

2. **⚡ Dedicated Boss Rush Mode**:
   - Face all 5 Fallen Lords back-to-back in an intense sequential gauntlet with a live speedrun timer.

3. **Breakable Walls & Secrets**:
   - Look for cracked masonry along catacomb floors and walls. Shoot or blast them with explosives to discover hidden relic coffers and caches.

4. **Shootable Environmental Traps**:
   - Sever hanging iron ceiling chains with gunshots or grenades to drop heavy iron cages onto demons, crushing them for 260 damage.

5. **Ashen Cairn Death Recovery**:
   - Falling in the catacombs leaves an Ashen Cairn holding your lost soul shards. Return to the site of your death to recover them intact.


6. **Crypts & Vaults (Dungeons)**:
   - Every act hides an amber **Crypt** (three chamber trials, rewards a superpower) and a violet **Vault** (opened by the key the act's Warden drops, guarded by a secret boss).
   - Press `[G]` at a doorway to enter; a portal at the entrance lets you leave at any time.

7. **Secret Bosses**: The Bell-Ringer of Cinders, The Gravemother, The Pale Knight, The Hollow Cardinal, The Eyeless Choir, and a hidden sixth for those who slay all five.

8. **Relic Weapons `[6]`–`[9]`** (or the mouse wheel): Bone Reaper, Hellfire Censer, Soul Harp, Thunder Maul, each with an alt-fire.

9. **Superpowers `[B]`**: Wraith Veil, Blood Moon, Chrono Hush, Bone Storm, Heaven's Fall. Equip one in the **Armory**.

10. **Armory & Codex**: choose cloaks and superpowers on the title screen; the Codex records every demon you have faced.

---

## 📂 Project Architecture

```
silent-earth/
├── RUN_GAME.bat         <- Quick Windows 1-click launcher
├── RUN_GAME.ps1         <- PowerShell launcher script
├── README.md            <- Complete gameplay guide and documentation
├── package.json         <- Project dependencies (Vite)
├── index.html           <- Main game entrypoint with UI screens and HUD
├── public/              <- Static assets, sprites, audio, and style.css
│   ├── assets/          <- Boss figures, gargoyles, portraits, textures
│   └── style.css        <- Gothic HUD & UI modal stylesheets
├── src/                 <- Modular game engine architecture
│   ├── main.js          <- Game loop, input handling, rendering & camera
│   ├── stages.js        <- 5 Catacomb Act definitions, enemy AI, spawns & traps
│   ├── demons.js        <- Procedural animated art for all demons, Fallen Lords & secret bosses
│   ├── expansion.js     <- Dungeons, secret bosses, relic weapons, superpowers, profile save
│   ├── menu.js          <- Animated title screen, Armory & Codex
│   ├── rika2d.js        <- Rika physics, movement, weapons & cloth cape
│   ├── audio2d.js       <- WebAudio procedural sound synthesizer & music
│   ├── cutscene.js      <- Cinematic dialogues, camera shakes & portraits
│   ├── items.js         <- Relics, masteries, ascension skulls & shop items
│   ├── status.js        <- Elemental status effects (Cinder, Frost, Void)
│   └── story.js         <- Story chapters, lore tablets & boss scripts
└── dist/                <- Production pre-built distribution bundle
```

---

## 🛠️ Production Build (Optional)

To compile an optimized production distribution:
```bash
npm run build
```
This generates an ultra-fast, minified bundle in `./dist` ready for static hosting on any web server (Nginx, Apache, Netlify, Vercel, GitHub Pages).

To preview the production build locally:
```bash
npm run preview
```
