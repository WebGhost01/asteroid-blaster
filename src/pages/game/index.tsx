import { useEffect, useRef, useState, useCallback } from "react";

type GameState = "idle" | "playing" | "paused" | "gameover" | "levelcomplete";

interface Bullet {
  x: number; y: number; vx: number; vy: number; fromEnemy: boolean;
}
interface Enemy {
  x: number; y: number; type: number; alive: boolean; points: number;
}
interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number;
}
interface Star {
  x: number; y: number; size: number; opacity: number; speed: number;
}

const PLAYER_W = 44, PLAYER_H = 30;
const BULLET_SPEED = 9;
const ENEMY_BULLET_SPEED = 4;
const ENEMY_COLS = 10, ENEMY_ROWS = 4;
const ENEMY_W = 36, ENEMY_H = 28, ENEMY_GAPX = 14, ENEMY_GAPY = 16;
const FIRE_COOLDOWN = 320;
const ENEMY_SHOOT_INTERVAL = 900;
const ENEMY_MOVE_BASE = 600;
const BUNKER_W = 60, BUNKER_H = 30;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number, color = "#60a5fa") {
  ctx.save();
  ctx.translate(x, y);
  const g = ctx.createLinearGradient(0, -PLAYER_H / 2, 0, PLAYER_H / 2);
  g.addColorStop(0, "#93c5fd");
  g.addColorStop(1, "#1d4ed8");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -PLAYER_H / 2);
  ctx.lineTo(PLAYER_W / 2, PLAYER_H / 2);
  ctx.lineTo(PLAYER_W / 3, PLAYER_H / 4);
  ctx.lineTo(-PLAYER_W / 3, PLAYER_H / 4);
  ctx.lineTo(-PLAYER_W / 2, PLAYER_H / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#bfdbfe";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#bfdbfe";
  ctx.beginPath();
  ctx.arc(0, -2, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1e40af";
  ctx.beginPath();
  ctx.arc(0, -2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, x: number, y: number, type: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  const bob = Math.sin(t * 0.003 + x * 0.1) * 2;
  ctx.translate(0, bob);
  const colors = ["#f472b6", "#a78bfa", "#34d399", "#fb923c"];
  const color = colors[type % colors.length];
  if (type === 0) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1e1b4b";
    ctx.beginPath();
    ctx.arc(-5, -2, 3, 0, Math.PI * 2);
    ctx.arc(5, -2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-14, 0); ctx.lineTo(-18, -6);
    ctx.moveTo(14, 0); ctx.lineTo(18, -6);
    ctx.stroke();
    const gr = ctx.createLinearGradient(0, -10, 0, 10);
    gr.addColorStop(0, color + "88");
    gr.addColorStop(1, "transparent");
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 1) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -12); ctx.lineTo(10, 0); ctx.lineTo(14, 12);
    ctx.lineTo(0, 8); ctx.lineTo(-14, 12); ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#0f0f23";
    ctx.beginPath();
    ctx.arc(-4, 2, 3, 0, Math.PI * 2);
    ctx.arc(4, 2, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 2) {
    ctx.fillStyle = color;
    ctx.fillRect(-12, -8, 24, 16);
    ctx.fillStyle = color;
    ctx.fillRect(-18, -4, 6, 8);
    ctx.fillRect(12, -4, 6, 8);
    ctx.fillStyle = "#0f0f23";
    ctx.fillRect(-8, -4, 6, 8);
    ctx.fillRect(2, -4, 6, 8);
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    const spikes = 6;
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 13, Math.sin(a) * 13);
      ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    ctx.fillStyle = "#0f0f23";
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    gameState: "idle" as GameState,
    playerX: 0, playerY: 0,
    playerVx: 0,
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    particles: [] as Particle[],
    stars: [] as Star[],
    score: 0,
    hiScore: parseInt(localStorage.getItem("spaceHiScore") || "0"),
    lives: 3,
    level: 1,
    enemyDir: 1,
    enemyMoveTimer: 0,
    enemyShootTimer: 0,
    enemyDescend: false,
    lastFireTime: 0,
    canvasW: 0, canvasH: 0,
    keys: {} as Record<string, boolean>,
    t: 0,
    bunkers: [] as Array<{ x: number; y: number; hp: number }>,
    playerHitTimer: 0,
    levelStartTimer: 0,
  });

  const [displayState, setDisplayState] = useState<GameState>("idle");
  const [displayScore, setDisplayScore] = useState(0);
  const [displayLives, setDisplayLives] = useState(3);
  const [displayLevel, setDisplayLevel] = useState(1);
  const [displayHiScore, setDisplayHiScore] = useState(parseInt(localStorage.getItem("spaceHiScore") || "0"));
  const rafRef = useRef<number>(0);

  const initLevel = useCallback((level: number) => {
    const s = stateRef.current;
    const cw = s.canvasW, ch = s.canvasH;
    const gridW = ENEMY_COLS * (ENEMY_W + ENEMY_GAPX);
    const startX = (cw - gridW) / 2;
    s.enemies = [];
    for (let row = 0; row < ENEMY_ROWS; row++) {
      for (let col = 0; col < ENEMY_COLS; col++) {
        s.enemies.push({
          x: startX + col * (ENEMY_W + ENEMY_GAPX) + ENEMY_W / 2,
          y: 80 + row * (ENEMY_H + ENEMY_GAPY) + ENEMY_H / 2,
          type: row % 4, alive: true,
          points: (ENEMY_ROWS - row) * 10,
        });
      }
    }
    s.bullets = [];
    s.enemyDir = 1;
    s.enemyMoveTimer = 0;
    s.enemyShootTimer = 0;
    s.enemyDescend = false;
    s.bunkers = [
      { x: cw * 0.15, y: ch - 140, hp: 10 },
      { x: cw * 0.38, y: ch - 140, hp: 10 },
      { x: cw * 0.62, y: ch - 140, hp: 10 },
      { x: cw * 0.85, y: ch - 140, hp: 10 },
    ];
  }, []);

  const spawnParticles = useCallback((x: number, y: number, color: string, count = 12) => {
    const s = stateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      s.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1, maxLife: 1,
        color,
        size: 2 + Math.random() * 4,
      });
    }
  }, []);

  const initGame = useCallback(() => {
    const s = stateRef.current;
    const canvas = canvasRef.current!;
    s.canvasW = canvas.width;
    s.canvasH = canvas.height;
    s.playerX = canvas.width / 2;
    s.playerY = canvas.height - 60;
    s.playerVx = 0;
    s.score = 0;
    s.lives = 3;
    s.level = 1;
    s.particles = [];
    s.stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 0.5 + Math.random() * 2,
      opacity: 0.3 + Math.random() * 0.7,
      speed: 0.1 + Math.random() * 0.4,
    }));
    initLevel(1);
    s.gameState = "playing";
    s.playerHitTimer = 0;
    s.levelStartTimer = 60;
    setDisplayState("playing");
    setDisplayScore(0);
    setDisplayLives(3);
    setDisplayLevel(1);
  }, [initLevel]);

  useEffect(() => {
    const s = stateRef.current;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let last = 0;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      s.canvasW = canvas.width;
      s.canvasH = canvas.height;
      s.playerX = canvas.width / 2;
      s.playerY = canvas.height - 60;
    };
    resize();
    window.addEventListener("resize", resize);

    const onKey = (e: KeyboardEvent, down: boolean) => {
      s.keys[e.code] = down;
      if (down && e.code === "Space") {
        e.preventDefault();
        if (s.gameState === "idle" || s.gameState === "gameover") {
          initGame();
        } else if (s.gameState === "playing") {
          const now = performance.now();
          if (now - s.lastFireTime > FIRE_COOLDOWN) {
            s.lastFireTime = now;
            s.bullets.push({ x: s.playerX, y: s.playerY - PLAYER_H / 2 - 2, vx: 0, vy: -BULLET_SPEED, fromEnemy: false });
          }
        } else if (s.gameState === "paused") {
          s.gameState = "playing";
          setDisplayState("playing");
        }
      }
      if (down && e.code === "KeyP" && s.gameState === "playing") {
        s.gameState = "paused";
        setDisplayState("paused");
      }
    };

    window.addEventListener("keydown", e => onKey(e, true));
    window.addEventListener("keyup", e => onKey(e, false));

    const loop = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      s.t += dt;
      const { keys, gameState, canvasW, canvasH } = s;

      if (gameState !== "playing") {
        ctx.fillStyle = "#030712";
        ctx.fillRect(0, 0, canvasW, canvasH);
        s.stars.forEach(star => {
          ctx.globalAlpha = star.opacity * (0.5 + 0.5 * Math.sin(s.t * 0.002 + star.x));
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      if (s.levelStartTimer > 0) { s.levelStartTimer--; }

      // Player movement
      const spd = 5;
      if (keys["ArrowLeft"] || keys["KeyA"]) s.playerVx = lerp(s.playerVx, -spd, 0.25);
      else if (keys["ArrowRight"] || keys["KeyD"]) s.playerVx = lerp(s.playerVx, spd, 0.25);
      else s.playerVx = lerp(s.playerVx, 0, 0.18);
      s.playerX = Math.max(PLAYER_W / 2, Math.min(canvasW - PLAYER_W / 2, s.playerX + s.playerVx));

      // Enemy movement
      const aliveEnemies = s.enemies.filter(e => e.alive);
      if (aliveEnemies.length === 0) {
        s.level++;
        s.levelStartTimer = 90;
        setDisplayLevel(s.level);
        initLevel(s.level);
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const speedFactor = 1 + (s.level - 1) * 0.25 + (1 - aliveEnemies.length / (ENEMY_COLS * ENEMY_ROWS)) * 0.8;
      s.enemyMoveTimer += dt;
      const moveInterval = ENEMY_MOVE_BASE / speedFactor;
      if (s.enemyMoveTimer >= moveInterval) {
        s.enemyMoveTimer = 0;
        const step = 12 * s.enemyDir;
        let hitWall = false;
        aliveEnemies.forEach(e => {
          e.x += step;
          if (e.x < 30 || e.x > canvasW - 30) hitWall = true;
        });
        if (hitWall) {
          s.enemyDir *= -1;
          aliveEnemies.forEach(e => { e.y += 20; });
        }
      }

      // Enemy shooting
      s.enemyShootTimer += dt;
      const shootInterval = Math.max(300, ENEMY_SHOOT_INTERVAL - (s.level - 1) * 80);
      if (s.enemyShootTimer >= shootInterval) {
        s.enemyShootTimer = 0;
        const bottomEnemies: Enemy[] = [];
        for (let col = 0; col < ENEMY_COLS; col++) {
          let bottom: Enemy | null = null;
          aliveEnemies.filter(e => Math.abs(e.x - (aliveEnemies[0].x + col * (ENEMY_W + ENEMY_GAPX))) < 50).forEach(e => {
            if (!bottom || e.y > bottom.y) bottom = e;
          });
          if (bottom) bottomEnemies.push(bottom);
        }
        if (bottomEnemies.length > 0) {
          const shooter = bottomEnemies[Math.floor(Math.random() * bottomEnemies.length)];
          const spread = (Math.random() - 0.5) * 2;
          s.bullets.push({ x: shooter.x, y: shooter.y + ENEMY_H / 2, vx: spread, vy: ENEMY_BULLET_SPEED, fromEnemy: true });
        }
      }

      // Update bullets
      s.bullets = s.bullets.filter(b => b.y > -10 && b.y < canvasH + 10 && b.x > -10 && b.x < canvasW + 10);
      s.bullets.forEach(b => { b.x += b.vx; b.y += b.vy; });

      // Bullet-enemy collisions
      s.bullets = s.bullets.filter(b => {
        if (b.fromEnemy) return true;
        for (const e of s.enemies) {
          if (!e.alive) continue;
          if (Math.abs(b.x - e.x) < ENEMY_W / 2 && Math.abs(b.y - e.y) < ENEMY_H / 2) {
            e.alive = false;
            s.score += e.points;
            if (s.score > s.hiScore) {
              s.hiScore = s.score;
              localStorage.setItem("spaceHiScore", String(s.hiScore));
              setDisplayHiScore(s.hiScore);
            }
            setDisplayScore(s.score);
            spawnParticles(e.x, e.y, ["#f472b6", "#a78bfa", "#34d399", "#fb923c"][e.type % 4], 16);
            return false;
          }
        }
        return true;
      });

      // Bullet-bunker collisions
      s.bullets = s.bullets.filter(b => {
        for (const bk of s.bunkers) {
          if (bk.hp <= 0) continue;
          if (Math.abs(b.x - bk.x) < BUNKER_W / 2 && Math.abs(b.y - bk.y) < BUNKER_H / 2) {
            bk.hp--;
            spawnParticles(b.x, b.y, "#6b7280", 6);
            return false;
          }
        }
        return true;
      });

      // Bullet-player collisions
      if (s.playerHitTimer <= 0) {
        s.bullets = s.bullets.filter(b => {
          if (!b.fromEnemy) return true;
          if (Math.abs(b.x - s.playerX) < PLAYER_W / 2 && Math.abs(b.y - s.playerY) < PLAYER_H / 2) {
            s.lives--;
            setDisplayLives(s.lives);
            spawnParticles(s.playerX, s.playerY, "#60a5fa", 20);
            s.playerHitTimer = 120;
            if (s.lives <= 0) {
              s.gameState = "gameover";
              setDisplayState("gameover");
            }
            return false;
          }
          return true;
        });
      } else {
        s.playerHitTimer--;
      }

      // Enemy reached bottom
      if (aliveEnemies.some(e => e.y + ENEMY_H / 2 >= canvasH - 80)) {
        s.gameState = "gameover";
        setDisplayState("gameover");
      }

      // Update particles
      s.particles = s.particles.filter(p => p.life > 0);
      s.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.life -= 0.03;
        p.vx *= 0.95;
      });

      // ---- DRAW ----
      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Stars
      s.stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvasH) star.y = 0;
        ctx.globalAlpha = star.opacity * (0.6 + 0.4 * Math.sin(s.t * 0.001 + star.x));
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Ground line
      ctx.strokeStyle = "#1e40af44";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvasH - 30);
      ctx.lineTo(canvasW, canvasH - 30);
      ctx.stroke();

      // Bunkers
      s.bunkers.forEach(bk => {
        if (bk.hp <= 0) return;
        const alpha = bk.hp / 10;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(bk.x - BUNKER_W / 2, bk.y - BUNKER_H / 2, BUNKER_W, BUNKER_H);
        ctx.fillStyle = "#030712";
        const nibW = 14, nibH = 14;
        ctx.fillRect(bk.x - BUNKER_W / 2 + 4, bk.y + BUNKER_H / 2 - nibH, nibW, nibH);
        ctx.fillRect(bk.x + BUNKER_W / 2 - 4 - nibW, bk.y + BUNKER_H / 2 - nibH, nibW, nibH);
        ctx.globalAlpha = 1;
      });

      // Player ship (flicker when hit)
      const playerVisible = s.playerHitTimer <= 0 || Math.floor(s.playerHitTimer / 6) % 2 === 0;
      if (playerVisible) {
        drawShip(ctx, s.playerX, s.playerY);
        // Engine glow
        const g = ctx.createRadialGradient(s.playerX, s.playerY + PLAYER_H / 2 + 8, 0, s.playerX, s.playerY + PLAYER_H / 2 + 8, 18);
        g.addColorStop(0, "#3b82f640");
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.playerX, s.playerY + PLAYER_H / 2 + 8, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      // Enemies
      s.enemies.forEach(e => {
        if (!e.alive) return;
        drawEnemy(ctx, e.x, e.y, e.type, s.t);
      });

      // Bullets
      s.bullets.forEach(b => {
        if (b.fromEnemy) {
          const bg = ctx.createLinearGradient(b.x, b.y - 8, b.x, b.y + 8);
          bg.addColorStop(0, "#ef4444");
          bg.addColorStop(1, "#fca5a5");
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, 3, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 8;
          ctx.shadowColor = "#ef4444";
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          const ug = ctx.createLinearGradient(b.x, b.y - 10, b.x, b.y + 10);
          ug.addColorStop(0, "#60a5fa");
          ug.addColorStop(1, "#93c5fd");
          ctx.fillStyle = ug;
          ctx.shadowBlur = 10;
          ctx.shadowColor = "#60a5fa";
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, 2.5, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Particles
      s.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", e => onKey(e, true));
      window.removeEventListener("keyup", e => onKey(e, false));
    };
  }, [initGame, initLevel, spawnParticles]);

  const handleStart = () => initGame();

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#030712" }}>
      {/* HUD */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 shrink-0" style={{ background: "#0a0f1e" }}>
        <div className="flex items-center gap-6">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-mono">Score</div>
            <div className="text-2xl font-bold font-mono text-blue-400">{String(displayScore).padStart(6, "0")}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-mono">Hi-Score</div>
            <div className="text-2xl font-bold font-mono text-yellow-400">{String(displayHiScore).padStart(6, "0")}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono uppercase mr-1">Lives</span>
          {Array.from({ length: 3 }).map((_, i) => (
            <svg key={i} width="20" height="16" viewBox="-22 -15 44 30" className={i < displayLives ? "opacity-100" : "opacity-20"}>
              <polygon points="0,-14 22,14 15,8 -15,8 -22,14" fill={i < displayLives ? "#60a5fa" : "#374151"} stroke="#bfdbfe" strokeWidth="1.5" />
            </svg>
          ))}
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider font-mono">Level</div>
            <div className="text-2xl font-bold font-mono text-purple-400">{displayLevel}</div>
          </div>
          <div className="text-xs text-slate-500 font-mono hidden md:block">
            <div>← → Move</div>
            <div>Space: Fire / Start</div>
            <div>P: Pause</div>
          </div>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block" style={{ imageRendering: "pixelated" }} />

        {/* Overlay screens */}
        {displayState === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: "rgba(3,7,18,0.85)" }}>
            <div className="text-center">
              <div className="text-6xl font-black tracking-widest font-mono mb-2" style={{
                background: "linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
              }}>
                SPACE ASSAULT
              </div>
              <div className="text-slate-400 font-mono mb-10 text-sm tracking-widest">DEFEND THE GALAXY</div>
              <div className="flex gap-6 justify-center mb-12 text-sm font-mono">
                {[["10", "⬜", "#fb923c"], ["20", "⬜", "#a78bfa"], ["30", "⬜", "#34d399"], ["40", "⬜", "#f472b6"]].map(([pts, icon, color]) => (
                  <div key={pts} className="flex items-center gap-2 text-slate-400">
                    <span style={{ color }}>▲</span> = {pts} pts
                  </div>
                ))}
              </div>
              <button
                onClick={handleStart}
                className="px-12 py-4 text-lg font-bold font-mono tracking-widest rounded-xl transition-all animate-pulse"
                style={{ background: "linear-gradient(135deg, #1d4ed8, #7c3aed)", color: "#fff" }}
              >
                PRESS SPACE TO START
              </button>
              {displayHiScore > 0 && (
                <div className="mt-6 text-yellow-400 font-mono text-sm">
                  HI-SCORE: {String(displayHiScore).padStart(6, "0")}
                </div>
              )}
            </div>
          </div>
        )}

        {displayState === "paused" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: "rgba(3,7,18,0.7)" }}>
            <div className="text-4xl font-black font-mono text-slate-200 tracking-widest mb-4">PAUSED</div>
            <div className="text-slate-400 font-mono text-sm">Press SPACE or P to continue</div>
          </div>
        )}

        {displayState === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: "rgba(3,7,18,0.88)" }}>
            <div className="text-center">
              <div className="text-5xl font-black font-mono mb-2" style={{ color: "#ef4444" }}>GAME OVER</div>
              <div className="text-2xl font-mono text-slate-300 mb-2">Score: <span className="text-blue-400">{String(displayScore).padStart(6, "0")}</span></div>
              {displayScore >= displayHiScore && displayScore > 0 && (
                <div className="text-yellow-400 font-mono text-sm mb-4 animate-pulse">🏆 NEW HIGH SCORE!</div>
              )}
              <button
                onClick={handleStart}
                className="mt-6 px-10 py-4 text-base font-bold font-mono tracking-widest rounded-xl transition-all"
                style={{ background: "linear-gradient(135deg, #1d4ed8, #7c3aed)", color: "#fff" }}
              >
                PRESS SPACE TO RETRY
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
