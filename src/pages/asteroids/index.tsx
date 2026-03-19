import { useEffect, useRef, useState, useCallback } from "react";

type GS = "idle" | "playing" | "paused" | "dead" | "gameover";

interface Vec2 { x: number; y: number; }
interface Asteroid { id: number; pos: Vec2; vel: Vec2; angle: number; spin: number; size: "large"|"medium"|"small"; radius: number; verts: number[]; hp: number; }
interface Bullet { id: number; pos: Vec2; vel: Vec2; life: number; homing?: boolean; target?: number; }
interface Particle { pos: Vec2; vel: Vec2; life: number; maxLife: number; color: string; size: number; }
interface PowerUp { id: number; pos: Vec2; vel: Vec2; type: "rapid"|"shield"|"homing"|"bomb"; angle: number; }

const SIZES = { large: 45, medium: 28, small: 14 };
const BULLET_SPD = 10;
const SHIP_ACCEL = 0.25;
const SHIP_ROT = 0.055;
const SHIP_DRAG = 0.988;
const FIRE_RATE = 200;
const RAPID_RATE = 80;
let _id = 0;
const uid = () => ++_id;

function randomVerts(n = 10, r: number): number[] {
  const v: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const jitter = 0.7 + Math.random() * 0.6;
    v.push(Math.cos(a) * r * jitter, Math.sin(a) * r * jitter);
  }
  return v;
}

function newAsteroid(size: "large"|"medium"|"small", pos?: Vec2, vel?: Vec2): Asteroid {
  const r = SIZES[size];
  const speed = size==="large" ? 0.6+Math.random() : size==="medium" ? 1+Math.random()*0.8 : 1.6+Math.random();
  const angle = Math.random() * Math.PI * 2;
  return {
    id: uid(), size, radius: r, hp: size==="large" ? 3 : size==="medium" ? 2 : 1,
    pos: pos ?? { x: 80, y: 80 },
    vel: vel ?? { x: Math.cos(angle)*speed, y: Math.sin(angle)*speed },
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.02,
    verts: randomVerts(10, r),
  };
}

function wrap(v: Vec2, w: number, h: number) {
  if (v.x < 0) v.x += w; if (v.x > w) v.x -= w;
  if (v.y < 0) v.y += h; if (v.y > h) v.y -= h;
}

function dist(a: Vec2, b: Vec2) { return Math.hypot(a.x-b.x, a.y-b.y); }

function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, shield: boolean, hit: number, thrusting: boolean, t: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  const alpha = hit > 0 ? (Math.floor(hit/4) % 2 === 0 ? 0.3 : 1) : 1;
  ctx.globalAlpha = alpha;
  // Body
  ctx.beginPath();
  ctx.moveTo(20, 0); ctx.lineTo(-12, -12); ctx.lineTo(-7, 0); ctx.lineTo(-12, 12); ctx.closePath();
  const g = ctx.createLinearGradient(-12, 0, 20, 0);
  g.addColorStop(0, "#3b82f6"); g.addColorStop(1, "#60a5fa");
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = "#93c5fd"; ctx.lineWidth = 1.5; ctx.stroke();
  // Cockpit
  ctx.beginPath(); ctx.arc(6, 0, 5, 0, Math.PI*2);
  ctx.fillStyle = "#1e40af"; ctx.fill(); ctx.strokeStyle="#60a5fa"; ctx.lineWidth=1; ctx.stroke();
  // Thrust flame
  if (thrusting) {
    const fl = 12 + Math.sin(t * 0.3) * 5;
    ctx.beginPath(); ctx.moveTo(-7, -5); ctx.lineTo(-7-fl, 0); ctx.lineTo(-7, 5);
    const fg = ctx.createLinearGradient(-7, 0, -7-fl, 0);
    fg.addColorStop(0, "#f97316"); fg.addColorStop(0.5, "#ef4444"); fg.addColorStop(1, "transparent");
    ctx.fillStyle = fg; ctx.fill();
  }
  // Shield
  if (shield) {
    ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI*2);
    ctx.strokeStyle = `rgba(99,102,241,${0.4+0.3*Math.sin(t*0.05)})`; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = `rgba(99,102,241,0.15)`; ctx.lineWidth = 8; ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.restore();
}

function drawAsteroid(ctx: CanvasRenderingContext2D, a: Asteroid, t: number) {
  ctx.save(); ctx.translate(a.pos.x, a.pos.y); ctx.rotate(a.angle);
  ctx.beginPath();
  for (let i = 0; i < a.verts.length; i += 2) {
    i===0 ? ctx.moveTo(a.verts[i], a.verts[i+1]) : ctx.lineTo(a.verts[i], a.verts[i+1]);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, a.radius);
  const hue = a.size==="large" ? 25 : a.size==="medium" ? 35 : 45;
  g.addColorStop(0, `hsl(${hue},30%,30%)`); g.addColorStop(1, `hsl(${hue},20%,18%)`);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = `hsl(${hue},40%,50%)`; ctx.lineWidth = 1.5; ctx.stroke();
  // crack marks for damage
  if (a.hp < (a.size==="large"?3:a.size==="medium"?2:1)) {
    ctx.strokeStyle = "rgba(255,100,50,0.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-5,-5); ctx.lineTo(8,3); ctx.stroke();
  }
  ctx.restore();
}

function drawPowerUp(ctx: CanvasRenderingContext2D, p: PowerUp, t: number) {
  const colors = { rapid:"#f59e0b", shield:"#6366f1", homing:"#ec4899", bomb:"#ef4444" };
  const icons = { rapid:"⚡", shield:"🛡", homing:"🎯", bomb:"💣" };
  ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.rotate(p.angle);
  ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2);
  const glow = ctx.createRadialGradient(0,0,0,0,0,14);
  glow.addColorStop(0, colors[p.type]+"80"); glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow; ctx.fill();
  ctx.strokeStyle = colors[p.type]; ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6 + 0.4*Math.sin(t*0.08); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.font = "14px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(icons[p.type], 0, 0);
  ctx.restore();
}

export default function AsteroidsPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gs, setGs] = useState<GS>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [hiScore, setHiScore] = useState(parseInt(localStorage.getItem("asteroidsHi")||"0"));
  const [powerups, setPowerups] = useState<Record<string,number>>({});
  const stateRef = useRef({
    gs: "idle" as GS, ship: { pos:{x:400,y:300}, vel:{x:0,y:0}, angle:-Math.PI/2, thrusting:false },
    asteroids: [] as Asteroid[], bullets: [] as Bullet[], particles: [] as Particle[],
    powerUpItems: [] as PowerUp[], stars: [] as {x:number;y:number;s:number;o:number}[],
    keys: {} as Record<string,boolean>, score:0, lives:3, level:1, hiScore:0,
    lastFire:0, shield:false, rapid:false, homing:false, shieldTimer:0, rapidTimer:0, homingTimer:0,
    deadTimer:0, w:800, h:600, t:0, hitTimer:0,
  });
  const rafRef = useRef(0);

  const spawnParticles = useCallback((x:number, y:number, color:string, n=12, spd=3) => {
    const s = stateRef.current;
    for (let i=0;i<n;i++) {
      const a=Math.random()*Math.PI*2, v=0.5+Math.random()*spd;
      s.particles.push({ pos:{x,y}, vel:{x:Math.cos(a)*v,y:Math.sin(a)*v}, life:1, maxLife:1, color, size:2+Math.random()*3 });
    }
  }, []);

  const spawnAsteroids = useCallback((count:number, level:number) => {
    const s = stateRef.current;
    for (let i=0;i<count;i++) {
      const edge = Math.random()<0.5;
      const x = edge ? Math.random()*s.w : (Math.random()<0.5 ? -50 : s.w+50);
      const y = edge ? (Math.random()<0.5 ? -50 : s.h+50) : Math.random()*s.h;
      const a = newAsteroid("large", {x,y});
      const spd = 1 + level * 0.15;
      a.vel.x *= spd; a.vel.y *= spd;
      s.asteroids.push(a);
    }
  }, []);

  const initGame = useCallback(() => {
    const s = stateRef.current;
    const c = canvasRef.current!;
    s.w = c.width; s.h = c.height;
    s.ship = { pos:{x:s.w/2,y:s.h/2}, vel:{x:0,y:0}, angle:-Math.PI/2, thrusting:false };
    s.asteroids=[]; s.bullets=[]; s.particles=[]; s.powerUpItems=[];
    s.score=0; s.lives=3; s.level=1; s.hitTimer=0; s.deadTimer=0;
    s.shield=false; s.rapid=false; s.homing=false;
    s.shieldTimer=0; s.rapidTimer=0; s.homingTimer=0;
    s.stars = Array.from({length:150},()=>({x:Math.random()*c.width,y:Math.random()*c.height,s:Math.random()*1.5,o:0.2+Math.random()*0.8}));
    spawnAsteroids(4, 1);
    s.gs="playing"; setGs("playing"); setScore(0); setLives(3); setLevel(1);
    stateRef.current.hiScore = parseInt(localStorage.getItem("asteroidsHi")||"0");
  }, [spawnAsteroids]);

  useEffect(() => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;

    const resize = () => {
      const r = c.parentElement!.getBoundingClientRect();
      c.width = r.width; c.height = r.height - 52;
      stateRef.current.w = c.width; stateRef.current.h = c.height;
    };
    resize(); window.addEventListener("resize", resize);

    const onKey = (e: KeyboardEvent, dn: boolean) => {
      stateRef.current.keys[e.code] = dn;
      if (dn) {
        if (e.code==="Space") {
          e.preventDefault();
          const s = stateRef.current;
          if (s.gs==="idle"||s.gs==="gameover") { initGame(); return; }
          if (s.gs==="dead") { return; }
          if (s.gs==="paused") { s.gs="playing"; setGs("playing"); return; }
          // Fire
          const now = Date.now();
          const rate = s.rapid ? RAPID_RATE : FIRE_RATE;
          if (now - s.lastFire > rate) {
            s.lastFire = now;
            const spd = BULLET_SPD;
            if (s.homing) {
              s.bullets.push({ id:uid(), pos:{...s.ship.pos}, vel:{x:Math.cos(s.ship.angle)*spd, y:Math.sin(s.ship.angle)*spd}, life:1, homing:true });
            } else {
              s.bullets.push({ id:uid(), pos:{...s.ship.pos}, vel:{x:Math.cos(s.ship.angle)*spd, y:Math.sin(s.ship.angle)*spd}, life:1 });
            }
          }
        }
        if (e.code==="KeyP" && stateRef.current.gs==="playing") { stateRef.current.gs="paused"; setGs("paused"); }
        if (e.code==="KeyB" && stateRef.current.gs==="playing") {
          // Bomb: destroy all visible small/medium asteroids
          const s = stateRef.current;
          const remaining: Asteroid[] = [];
          for (const a of s.asteroids) {
            if (a.size!=="large") spawnParticles(a.pos.x, a.pos.y, "#f97316", 8);
            else remaining.push(a);
          }
          s.asteroids = remaining;
        }
      }
    };
    window.addEventListener("keydown", e => onKey(e,true));
    window.addEventListener("keyup", e => onKey(e,false));

    let last = 0;
    const loop = (now: number) => {
      const dt = Math.min(now-last, 50); last=now;
      const s = stateRef.current;
      s.t++;

      if (s.gs !== "playing") {
        // Just draw background
        ctx.fillStyle="#010108"; ctx.fillRect(0,0,c.width,c.height);
        s.stars.forEach(st => { ctx.globalAlpha=st.o*(0.5+0.5*Math.sin(s.t*0.02+st.x)); ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(st.x,st.y,st.s,0,Math.PI*2); ctx.fill(); });
        ctx.globalAlpha=1;
        rafRef.current=requestAnimationFrame(loop); return;
      }

      // Input
      if (s.keys["ArrowLeft"]||s.keys["KeyA"]) s.ship.angle -= SHIP_ROT;
      if (s.keys["ArrowRight"]||s.keys["KeyD"]) s.ship.angle += SHIP_ROT;
      const thrusting = !!(s.keys["ArrowUp"]||s.keys["KeyW"]);
      s.ship.thrusting = thrusting;
      if (thrusting) {
        s.ship.vel.x += Math.cos(s.ship.angle)*SHIP_ACCEL;
        s.ship.vel.y += Math.sin(s.ship.angle)*SHIP_ACCEL;
        if (s.t%3===0) spawnParticles(s.ship.pos.x-Math.cos(s.ship.angle)*18, s.ship.pos.y-Math.sin(s.ship.angle)*18, "#f97316", 2, 1);
      }
      // Continuous firing when Space held
      if (s.keys["Space"]) {
        const now2 = Date.now();
        const rate2 = s.rapid ? RAPID_RATE : FIRE_RATE;
        if (now2 - s.lastFire > rate2) {
          s.lastFire = now2;
          s.bullets.push({ id:uid(), pos:{...s.ship.pos}, vel:{x:Math.cos(s.ship.angle)*BULLET_SPD, y:Math.sin(s.ship.angle)*BULLET_SPD}, life:1, homing:s.homing });
        }
      }
      // Speed cap
      const spd = Math.hypot(s.ship.vel.x, s.ship.vel.y);
      if (spd > 8) { s.ship.vel.x *= 8/spd; s.ship.vel.y *= 8/spd; }
      s.ship.vel.x *= SHIP_DRAG; s.ship.vel.y *= SHIP_DRAG;
      s.ship.pos.x += s.ship.vel.x; s.ship.pos.y += s.ship.vel.y;
      wrap(s.ship.pos, s.w, s.h);

      // Power-up timers
      if (s.shieldTimer>0) { s.shieldTimer--; s.shield=s.shieldTimer>0; }
      if (s.rapidTimer>0) { s.rapidTimer--; s.rapid=s.rapidTimer>0; }
      if (s.homingTimer>0) { s.homingTimer--; s.homing=s.homingTimer>0; }
      setPowerups({ shield:s.shieldTimer, rapid:s.rapidTimer, homing:s.homingTimer });

      // Move asteroids
      for (const a of s.asteroids) { a.pos.x+=a.vel.x; a.pos.y+=a.vel.y; a.angle+=a.spin; wrap(a.pos,s.w,s.h); }

      // Move bullets (with homing)
      s.bullets = s.bullets.filter(b => b.life > 0);
      for (const b of s.bullets) {
        if (b.homing && s.asteroids.length > 0) {
          let nearest = s.asteroids[0];
          for (const a of s.asteroids) if (dist(b.pos,a.pos)<dist(b.pos,nearest.pos)) nearest=a;
          const dx=nearest.pos.x-b.pos.x, dy=nearest.pos.y-b.pos.y, d=Math.hypot(dx,dy);
          if (d>5) { b.vel.x=b.vel.x*0.92+(dx/d)*BULLET_SPD*0.12; b.vel.y=b.vel.y*0.92+(dy/d)*BULLET_SPD*0.12; }
        }
        b.pos.x+=b.vel.x; b.pos.y+=b.vel.y;
        b.life -= 0.012;
        if (b.pos.x<-10||b.pos.x>s.w+10||b.pos.y<-10||b.pos.y>s.h+10) b.life=0;
      }

      // Bullet-asteroid collisions
      const newAsts: Asteroid[] = [];
      for (const a of s.asteroids) {
        let hit = false;
        for (const b of s.bullets) {
          if (b.life<=0) continue;
          if (dist(b.pos,a.pos) < a.radius-4) {
            b.life=0; hit=true; a.hp--;
            spawnParticles(b.pos.x, b.pos.y, "#fbbf24", 6, 2);
            break;
          }
        }
        if (hit && a.hp<=0) {
          const pts = a.size==="large"?100:a.size==="medium"?50:25;
          s.score += pts;
          if (s.score > s.hiScore) { s.hiScore=s.score; localStorage.setItem("asteroidsHi",String(s.score)); setHiScore(s.score); }
          setScore(s.score);
          spawnParticles(a.pos.x, a.pos.y, a.size==="large"?"#f97316":a.size==="medium"?"#fbbf24":"#86efac", 16, 3);
          // Split
          if (a.size==="large") { for(let i=0;i<2;i++){const child=newAsteroid("medium",{...a.pos});child.vel.x+=a.vel.x*0.5;child.vel.y+=a.vel.y*0.5;newAsts.push(child);} }
          else if (a.size==="medium") { for(let i=0;i<2;i++){const child=newAsteroid("small",{...a.pos});child.vel.x+=a.vel.x*0.5;child.vel.y+=a.vel.y*0.5;newAsts.push(child);} }
          // Chance to drop power-up
          if (Math.random()<0.12) {
            const types: PowerUp["type"][] = ["rapid","shield","homing"];
            s.powerUpItems.push({id:uid(),pos:{...a.pos},vel:{x:(Math.random()-0.5)*1.5,y:(Math.random()-0.5)*1.5},type:types[Math.floor(Math.random()*3)],angle:0});
          }
        } else {
          if (hit && a.hp>0) newAsts.push(a);
          else if (!hit) newAsts.push(a);
        }
      }
      s.asteroids = newAsts;

      // Move power-ups
      for (const p of s.powerUpItems) { p.pos.x+=p.vel.x; p.pos.y+=p.vel.y; p.angle+=0.05; wrap(p.pos,s.w,s.h); }
      s.powerUpItems = s.powerUpItems.filter(p => {
        if (dist(p.pos,s.ship.pos)<30) {
          if (p.type==="rapid") { s.rapidTimer=300; s.rapid=true; }
          if (p.type==="shield") { s.shieldTimer=360; s.shield=true; }
          if (p.type==="homing") { s.homingTimer=400; s.homing=true; }
          spawnParticles(p.pos.x,p.pos.y,"#a78bfa",10,2);
          return false;
        }
        return true;
      });

      // Ship-asteroid collision
      if (s.hitTimer<=0) {
        for (const a of s.asteroids) {
          if (dist(s.ship.pos,a.pos)<a.radius-5) {
            if (s.shield) { s.shieldTimer=0; s.shield=false; spawnParticles(s.ship.pos.x,s.ship.pos.y,"#6366f1",15,2); }
            else {
              s.lives--;
              setLives(s.lives);
              spawnParticles(s.ship.pos.x,s.ship.pos.y,"#60a5fa",20,4);
              if (s.lives<=0) {
                s.gs="gameover"; setGs("gameover");
              } else {
                s.gs="dead"; setGs("dead"); s.deadTimer=120;
                s.ship.pos={x:s.w/2,y:s.h/2}; s.ship.vel={x:0,y:0};
              }
              s.hitTimer=90;
            }
            break;
          }
        }
      } else { s.hitTimer--; if (s.hitTimer===0&&s.gs==="dead"){s.gs="playing";setGs("playing");} }

      // Level complete
      if (s.asteroids.length===0 && s.gs==="playing") {
        s.level++;
        setLevel(s.level);
        spawnAsteroids(3+s.level, s.level);
        spawnParticles(s.w/2,s.h/2,"#a78bfa",30,5);
      }

      // Update particles
      s.particles=s.particles.filter(p=>p.life>0);
      s.particles.forEach(p=>{p.pos.x+=p.vel.x;p.pos.y+=p.vel.y;p.vel.y+=0.04;p.life-=0.025;p.vel.x*=0.98;p.vel.y*=0.98;});

      // ── DRAW ──
      ctx.fillStyle="#010108"; ctx.fillRect(0,0,c.width,c.height);

      // Stars
      s.stars.forEach(st=>{ ctx.globalAlpha=st.o*(0.5+0.5*Math.sin(s.t*0.02+st.x)); ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(st.x,st.y,st.s,0,Math.PI*2); ctx.fill(); });
      ctx.globalAlpha=1;

      // Asteroids
      s.asteroids.forEach(a=>drawAsteroid(ctx,a,s.t));

      // Bullets
      s.bullets.filter(b=>b.life>0).forEach(b=>{
        const alpha=Math.min(1,b.life*3);
        ctx.globalAlpha=alpha;
        if (b.homing) {
          ctx.fillStyle="#ec4899"; ctx.shadowBlur=12; ctx.shadowColor="#ec4899";
          ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,4,0,Math.PI*2); ctx.fill();
        } else {
          ctx.fillStyle="#60a5fa"; ctx.shadowBlur=10; ctx.shadowColor="#60a5fa";
          ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,3,0,Math.PI*2); ctx.fill();
        }
        ctx.shadowBlur=0; ctx.globalAlpha=1;
      });

      // Power-ups
      s.powerUpItems.forEach(p=>drawPowerUp(ctx,p,s.t));

      // Ship
      if (s.gs==="playing"||s.gs==="dead") {
        drawShip(ctx,s.ship.pos.x,s.ship.pos.y,s.ship.angle,s.shield,s.hitTimer,s.ship.thrusting,s.t);
      }

      // Particles
      s.particles.forEach(p=>{
        ctx.globalAlpha=p.life;
        ctx.fillStyle=p.color; ctx.shadowBlur=8; ctx.shadowColor=p.color;
        ctx.beginPath(); ctx.arc(p.pos.x,p.pos.y,p.size*p.life,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=0;
      });
      ctx.globalAlpha=1;

      rafRef.current=requestAnimationFrame(loop);
    };

    rafRef.current=requestAnimationFrame(loop);
    return ()=>{ cancelAnimationFrame(rafRef.current); window.removeEventListener("resize",resize); };
  }, [initGame, spawnParticles, spawnAsteroids]);

  const pColor = { shield:"#6366f1", rapid:"#f59e0b", homing:"#ec4899" };

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{background:"#010108"}}>
      {/* HUD */}
      <div className="h-13 flex items-center justify-between px-6 py-2 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-6">
          <div><div className="text-[10px] text-slate-600 font-mono uppercase tracking-wider">Score</div><div className="text-xl font-black font-mono text-cyan-400">{String(score).padStart(6,"0")}</div></div>
          <div><div className="text-[10px] text-slate-600 font-mono uppercase tracking-wider">Hi-Score</div><div className="text-xl font-black font-mono text-yellow-400">{String(hiScore).padStart(6,"0")}</div></div>
        </div>
        <div className="flex gap-1 items-center">
          {["shield","rapid","homing"].map(k => {
            const val = powerups[k]||0;
            if (!val) return null;
            const colors: Record<string,string> = pColor;
            return <span key={k} className="text-xs px-2 py-1 rounded-lg font-mono font-bold" style={{background:`${colors[k]}20`,color:colors[k],border:`1px solid ${colors[k]}40`}}>{k.toUpperCase()} {Math.ceil(val/60)}s</span>;
          })}
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-1">{Array.from({length:3}).map((_,i)=>(
            <svg key={i} width="18" height="18" viewBox="-12 -12 24 24" className={i<lives?"opacity-100":"opacity-15"}>
              <polygon points="0,-10 14,10 9,5 -9,5 -14,10" fill={i<lives?"#60a5fa":"#334155"} stroke="#93c5fd" strokeWidth="1.5"/>
            </svg>
          ))}</div>
          <div><div className="text-[10px] text-slate-600 font-mono uppercase tracking-wider">Level</div><div className="text-xl font-black font-mono text-purple-400">{level}</div></div>
          <div className="text-[10px] text-slate-500 font-mono hidden lg:block leading-4">← → Rotate · ↑ Thrust<br/>Space Fire · P Pause</div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {gs==="idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{background:"rgba(1,1,8,0.88)"}}>
            <div className="text-center">
              <div className="text-7xl font-black tracking-widest font-mono mb-2" style={{background:"linear-gradient(135deg,#60a5fa,#a78bfa,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>ASTEROIDS</div>
              <div className="text-slate-500 font-mono text-sm tracking-widest mb-10">SURVIVE THE ASTEROID BELT</div>
              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mb-10 text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2"><span className="text-yellow-400">⚡</span> Rapid Fire</div>
                <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2"><span className="text-indigo-400">🛡</span> Shield</div>
                <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2"><span className="text-pink-400">🎯</span> Homing</div>
                <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2"><span>B</span> Bomb</div>
              </div>
              <button onClick={initGame} className="px-12 py-4 text-lg font-bold font-mono tracking-widest rounded-xl animate-pulse" style={{background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",color:"#fff"}}>PRESS SPACE</button>
              {hiScore>0&&<div className="mt-4 text-yellow-400 font-mono text-sm">BEST: {String(hiScore).padStart(6,"0")}</div>}
            </div>
          </div>
        )}
        {gs==="paused" && (
          <div className="absolute inset-0 flex items-center justify-center" style={{background:"rgba(1,1,8,0.7)"}}>
            <div className="text-center"><div className="text-4xl font-black font-mono text-white mb-2">PAUSED</div><div className="text-slate-500 font-mono text-sm">Press P or Space</div></div>
          </div>
        )}
        {gs==="gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{background:"rgba(1,1,8,0.9)"}}>
            <div className="text-center">
              <div className="text-5xl font-black font-mono mb-2" style={{color:"#ef4444"}}>GAME OVER</div>
              <div className="text-2xl font-mono text-slate-300 mb-1">Score <span className="text-cyan-400">{String(score).padStart(6,"0")}</span></div>
              {score>=hiScore&&score>0&&<div className="text-yellow-400 font-mono text-sm mb-4 animate-pulse">🏆 NEW HIGH SCORE!</div>}
              <button onClick={initGame} className="mt-6 px-10 py-4 text-base font-bold font-mono tracking-widest rounded-xl" style={{background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",color:"#fff"}}>PLAY AGAIN</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
