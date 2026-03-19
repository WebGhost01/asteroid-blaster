# Asteroid Blaster

  A physics-based Asteroids game built with HTML5 Canvas and React.

  ## Features

  ### Physics Engine
  - Ship with rotation + directional thrust (momentum-based movement)
  - Inertia and drag simulation
  - Asteroid spin and velocity inheritance on split

  ### Asteroid Splitting
  - Large asteroids → 2 Medium
  - Medium asteroids → 2 Small
  - Small asteroids → destroyed
  - Asteroids inherit parent velocity on split

  ### Power-Up System
  - ⚡ **Rapid Fire** — Machine-gun fire rate for 5 seconds
  - 🛡 **Shield** — Absorbs 1 hit, 6 seconds duration
  - 🎯 **Homing** — Bullets auto-target nearest asteroid
  - 💣 **Bomb** — Press B to destroy all medium/small asteroids

  ### Visual Effects
  - Particle explosion system (color-coded by asteroid size)
  - Ship engine flame with animation
  - Shield glow ring
  - Neon bullet trails with glow
  - Procedurally-generated asteroid shapes

  ### Game Systems
  - Score system (Large: 100pts, Medium: 50pts, Small: 25pts)
  - Lives system with respawn
  - Levels with increasing difficulty
  - Persistent high score (localStorage)
  - HUD with score, hi-score, lives, level, power-up timers

  ## Controls
  | Key | Action |
  |-----|--------|
  | ← / → | Rotate ship |
  | ↑ / W | Thrust |
  | Space | Fire / Start |
  | B | Bomb |
  | P | Pause |

  ## Tech Stack
  React 19 · TypeScript · HTML5 Canvas · Tailwind CSS · Vite

  ## Getting Started
  ```bash
  npm install
  npm run dev
  ```