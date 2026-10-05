import { playShoot, playAlienHit, playAlienMove, playPlayerDeath } from './audio';

export type GameState = 'START' | 'PLAYER_SELECT' | 'MODE_SELECT' | 'HIGH_SCORES' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';

interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  text?: string;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  color: string;
}

interface Nebula {
  x: number;
  y: number;
  radius: number;
  color: string;
  pulse: number;
}

interface Trail {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Ring {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

interface PowerUp extends Entity {
  vy: number;
  type: string;
  text?: string;
  label?: string;
}

interface Alien extends Entity {
  type: 'classic' | 'retrowo' | 'uwu' | 'owo' | 'kitty' | 'neko' | 'cluster' | 'ghost' | 'boss_uwu' | 'boss_owo' | 'boss_kitty' | 'boss_neko' | 'boss_cluster' | 'boss_ghost' | 'mini_sniper' | 'mini_tank' | 'mini_kami';
  eliteType?: 'GOLDEN' | 'CORRUPTED' | 'PHANTOM' | 'OVERCLOCKED' | null;
  hp: number;
  maxHp: number;
  state: 'idle' | 'invisible' | 'intro' | 'death' | string;
  timer: number;
  startX: number;
  startY: number;
  vx: number;
  vy: number;
  face: string;
  phase?: number;
}

interface Hazard {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'energy_storm' | 'corruption_field' | 'moving_hazard';
  timer: number;
  active: boolean;
}

type SpecialEvent = 'ST00J_STORM' | 'POWER_SURGE' | 'INFESTATION' | 'CORRUPTION_EVENT' | null;

class SwarmDirector {
  sector: number = 1;
  recentTemplates: string[] = [];
  eventActive: SpecialEvent = null;
  bossIntroTimer: number = 0;
  bossDeathTimer: number = 0;
}

export class CyberInvaders {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  
  width: number = 800;
  height: number = 600;
  
  state: GameState = 'START';
  score: number = 0;
  lives: number = 3;
  level: number = 1;
  wave: number = 1;
  bossActive: boolean = false;
  director: SwarmDirector = new SwarmDirector();
  hazards: Hazard[] = [];
  bossEventState: 'NONE' | 'INTRO' | 'DEATH' = 'NONE';
  gameMode: 'CLASSIC' | 'RETROWO' | 'SURVIVAL' | 'KAWAII' = 'KAWAII';
  
  player: Entity & { invulnTimer: number } = { invulnTimer: 0,  x: 400, y: 550, width: 60, height: 24, color: '#00ffff' };
  playerFaceNormal: string = '(*´ω｀)';
  playerFaceShoot: string = '(>ω<)';
  aliens: Alien[] = [];
  bullets: (Entity & { vy: number; vx?: number; isPlayer: boolean; text: string; pierce?: boolean })[] = [];
  powerups: PowerUp[] = [];
  activePowerups: { type: string; timer: number }[] = [];
  
  particles: Particle[] = [];
  stars: Star[] = [];
  nebulae: Nebula[] = [];
  trails: Trail[] = [];
  rings: Ring[] = [];
  time: number = 0;
  
  keys: { [key: string]: boolean } = {};
  
  lastTime: number = 0;
  alienMoveTimer: number = 0;
  alienMoveInterval: number = 800;
  alienDirection: number = 1;
  alienStep: number = 0;
  
  shootCooldown: number = 0;
  
  screenShake: number = 0;
  
  onStateChange?: (state: GameState) => void;
  onScoreChange?: (score: number) => void;
  onLivesChange?: (lives: number) => void;
  onLevelChange?: (level: number) => void;
  onWaveChange?: (wave: number) => void;
  onLevelComplete?: (level: number) => void;

  animationFrameId: number = 0;

  setPlayerFaces(normal: string, shoot: string) {
    this.playerFaceNormal = normal;
    this.playerFaceShoot = shoot;
  }

  initBackground() {
    this.stars = [];
    this.nebulae = [];
    
    const starCount = 100 + (this.level * 10);
    const starColors = this.getStarColors();
    
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.1,
        color: starColors[Math.floor(Math.random() * starColors.length)]
      });
    }

    const nebulaCount = 3 + Math.floor(this.level / 2);
    const nebulaColors = this.getNebulaColors();
    for (let i = 0; i < nebulaCount; i++) {
      this.nebulae.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 100 + Math.random() * 200,
        color: nebulaColors[Math.floor(Math.random() * nebulaColors.length)],
        pulse: Math.random() * Math.PI * 2
      });
    }
  }

  getStarColors() {
    switch(this.gameMode) {
      case 'RETROWO': return ['#39ff14', '#ccff00', '#ffffff'];
      case 'SURVIVAL': return ['#ff0000', '#ff4400', '#ffffff'];
      case 'CLASSIC': return ['#7be8ff', '#ffffff', '#fff6e9'];
      default: return ['#ffb3f0', '#c59cff', '#7be8ff', '#ffffff'];
    }
  }

  getNebulaColors() {
    const levelHue = (this.level * 40) % 360;
    switch(this.gameMode) {
      case 'RETROWO': return [`hsla(100, 100%, 50%, 0.05)`, `hsla(80, 100%, 50%, 0.05)`];
      case 'SURVIVAL': return [`hsla(0, 100%, 50%, 0.05)`, `hsla(20, 100%, 50%, 0.05)`];
      default: return [`hsla(${levelHue}, 70%, 50%, 0.05)`, `hsla(${(levelHue + 60) % 360}, 70%, 50%, 0.05)`];
    }
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    
    // Fixed internal resolution for retro feel
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    
    // Init stars
    this.initBackground();
    
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    cancelAnimationFrame(this.animationFrameId);
  }

  handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
    if (e.code === 'Space' && this.state === 'START') {
      this.startGame();
    } else if (e.code === 'Space' && (this.state === 'GAMEOVER' || this.state === 'VICTORY')) {
      this.state = 'START';
      this.onStateChange?.(this.state);
    } else if (e.code === 'Escape') {
      this.togglePause();
    }
  };

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.onStateChange?.(this.state);
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.onStateChange?.(this.state);
    }
  }

  handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  startGame() {
    this.state = 'PLAYING';
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.wave = 1;
    this.activePowerups = [];
    this.powerups = [];
    this.bullets = [];
    this.hazards = [];
    this.director.eventActive = null;
    this.player.invulnTimer = 0;
    this.player.x = this.width / 2 - this.player.width / 2;
    this.onStateChange?.(this.state);
    this.onScoreChange?.(this.score);
    this.onLivesChange?.(this.lives);
    this.onLevelChange?.(this.level);
    this.onWaveChange?.(this.wave);
    this.initLevel();
  }

  goToMenu() {
    this.state = 'START';
    this.onStateChange?.(this.state);
  }

  setLevel(level: number) {
    this.level = level;
    this.onLevelChange?.(this.level);
    this.initBackground();
    this.initLevel();
  }

  setGameMode(mode: 'CLASSIC' | 'RETROWO' | 'SURVIVAL' | 'KAWAII') {
    this.gameMode = mode;
    this.initBackground();
  }

  initLevel() {
    this.wave = 1;
    this.onWaveChange?.(this.wave);
    this.bossActive = false;
    this.spawnWave();
  }

    spawnWave() {
    this.aliens = [];
    this.bullets = [];
    this.hazards = [];
    if (this.wave === 1) {
      this.player.x = this.width / 2 - this.player.width / 2;
    }
    this.state = 'PLAYING';
    this.bossEventState = 'NONE';
    this.onStateChange?.(this.state);
    this.time = 0;

    if (this.gameMode === 'CLASSIC' || this.gameMode === 'RETROWO') {
      const type = this.gameMode.toLowerCase() as 'classic' | 'retrowo';
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 11; col++) {
          this.aliens.push({
            x: 80 + col * 50, y: 50 + row * 40, width: 30, height: 20,
            color: type === 'classic' ? '#33ff33' : '#ff00ff', type, hp: 1, maxHp: 1, state: 'idle', timer: 0,
            startX: 80 + col * 50, startY: 50 + row * 40, face: type === 'classic' ? '[-o-]' : '[-w-]', vx: 0, vy: 0
          } as any);
        }
      }
    } else {
       this.generateDirectorWave();
    }
  }

  generateDirectorWave() {
    this.director.sector = Math.floor((this.wave - 1) / 5) + 1;
    const isBossWave = (this.wave % 5 === 0);
    const waveMultiplier = 1 + (this.level - 1) * 0.5 + (this.wave - 1) * 0.2;

    this.director.eventActive = null;
    if (!isBossWave && Math.random() < 0.05) {
      const events: any[] = ['ST00J_STORM', 'POWER_SURGE', 'INFESTATION', 'CORRUPTION_EVENT'];
      this.director.eventActive = events[Math.floor(Math.random() * events.length)];
      this.powerups.push({ x: this.width/2 - 50, y: -50, width: 100, height: 20, color: '#ffb3f0', type: 'spread', label: `EVENT: ${this.director.eventActive}`, vy: 50 });
    }

    if (isBossWave) {
      this.bossActive = true;
      this.bossEventState = 'INTRO';
      this.director.bossIntroTimer = 4000; // 4 seconds intro
      let bossFace = '✨(◕‿◕✿)✨';
      let bossColor = '#ff8fd8';
      let bossHp = 50 + this.level * 30 + this.wave * 15;
      let bossType = 'boss_uwu';
      
      const bossTypes = ['boss_uwu', 'boss_owo', 'boss_kitty', 'boss_neko', 'boss_cluster', 'boss_ghost'];
      bossType = bossTypes[(this.director.sector - 1) % bossTypes.length];
      
      if (bossType === 'boss_uwu') { bossFace = 'U w U (MAX)'; bossColor = '#ffb3f0'; }
      else if (bossType === 'boss_owo') { bossFace = 'O w O (MAX)'; bossColor = '#c59cff'; }
      else if (bossType === 'boss_kitty') { bossFace = '=w= (MEGA)'; bossColor = '#7be8ff'; }
      else if (bossType === 'boss_neko') { bossFace = '^._.^ (ULTRA)'; bossColor = '#ffb3f0'; }
      else if (bossType === 'boss_cluster') { bossFace = '[[ Cluster ]]'; bossColor = '#c59cff'; }
      else if (bossType === 'boss_ghost') { bossFace = '👻 DOOM 👻'; bossColor = '#7be8ff'; }
      
      this.aliens.push({
        x: this.width/2 - 100, y: -200, width: 200, height: 100,
        color: bossColor, type: bossType as any, hp: bossHp, maxHp: bossHp, state: 'intro', timer: 0,
        startX: this.width/2 - 100, startY: 50, face: bossFace, vx: 0, vy: 0
      } as any);
      return;
    }

    if (this.wave % 5 === 3 || this.wave % 5 === 4) {
      if (Math.random() < 0.4) {
         this.aliens.push({
           x: this.width/2 - 40, y: 50, width: 80, height: 50,
           color: '#ff5555', type: 'mini_sniper', hp: 20 * waveMultiplier, maxHp: 20 * waveMultiplier, state: 'idle', timer: 0,
           startX: this.width/2 - 40, startY: 50, face: '>-O-<', vx: 0, vy: 0
         } as any);
      }
    }

    const availableTypes = ['uwu', 'owo', 'kitty', 'neko', 'cluster', 'ghost'];
    let t1 = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    let t2 = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    if (this.director.eventActive === 'INFESTATION') { t1 = 'neko'; t2 = 'cluster'; }

    let swarmId = t1+t2;
    if (this.director.recentTemplates.includes(swarmId)) {
       t1 = availableTypes[0]; t2 = availableTypes[1]; 
    }
    this.director.recentTemplates.push(swarmId);
    if (this.director.recentTemplates.length > 5) this.director.recentTemplates.shift();
    
    const rows = Math.min(8, 2 + Math.floor(this.wave / 2));
    const cols = Math.min(12, 5 + Math.floor(this.wave / 2));

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
         if (Math.random() > (this.director.eventActive === 'ST00J_STORM' ? 0.05 : 0.2)) {
            let rowType = Math.random() > 0.5 ? t1 : t2;
            let w = 50, h = 30, color = '#ffb3f0', face = 'uwu', hp = waveMultiplier;
            if (rowType === 'uwu') { color = '#ffb3f0'; face = 'GOOCH'; }
            else if (rowType === 'owo') { color = '#c59cff'; face = 'OwO'; hp *= 1.2; }
            else if (rowType === 'kitty') { color = '#7be8ff'; face = '=w='; w = 40; }
            else if (rowType === 'neko') { color = '#ffb3f0'; face = '^._.^'; w = 40; hp *= 1.5; }
            else if (rowType === 'cluster') { color = '#c59cff'; face = '(づ｡◕‿‿◕｡)づ'; w = 80; h = 50; hp *= 2.5; }
            else if (rowType === 'ghost') { color = '#7be8ff'; face = '👻'; hp *= 1.2;}
            
            let elite: any = null;
            if (this.director.eventActive === 'CORRUPTION_EVENT' ? Math.random() < 0.2 : Math.random() < 0.05) {
               const elites = ['GOLDEN', 'CORRUPTED', 'PHANTOM', 'OVERCLOCKED'];
               elite = elites[Math.floor(Math.random() * elites.length)];
               if (elite === 'GOLDEN') { color = '#ffd700'; hp *= 3; face = '⭐⭐'; }
               else if (elite === 'CORRUPTED') { color = '#ff0000'; hp *= 1.5; face = 'XX'; }
               else if (elite === 'OVERCLOCKED') { color = '#00ff00'; hp *= 1; face = '>>>'; }
            }
            
            const startX = 50 + col * (w + 10);
            if (startX > this.width - w - 20) continue; 
            const startY = 60 + row * (h + 10);
            
            this.aliens.push({
              x: startX, y: startY, width: w, height: h,
              color, type: rowType as any, eliteType: elite, hp: Math.ceil(hp), maxHp: Math.ceil(hp), state: 'idle', timer: row * 100 + col * 50,
              startX, startY, face, vx: 0, vy: 0
            } as any);
         }
      }
    }
  }

  fireAlienBullet(a: Alien, speed: number) {
    this.bullets.push({
      x: a.x + a.width / 2 - 10,
      y: a.y + a.height,
      width: 20,
      height: 20,
      color: '#9cd9ff',
      vy: speed,
      isPlayer: false,
      text: ['SToO0ogeE~!', 'Stooj', 'Stewg', '5tooge', 'st00J', 'stooge', 'Stohj', 'Stooge', 'StewJ', 'St00J'][Math.floor(Math.random() * 10)]
    });
  }

  spawnParticles(x: number, y: number, color: string, count: number = 15) {
    const glyphs = ['★', '♥', '✧', '✦', 'o', 'w'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: Math.random() * 500 + 300,
        color,
        size: Math.random() * 6 + 2,
        text: Math.random() > 0.5 ? glyphs[Math.floor(Math.random() * glyphs.length)] : undefined
      });
    }
  }

  update(dt: number) {
    this.time += dt;

    // Hazard Logic
    if (this.director.sector >= 2 && Math.random() < 0.005) {
       // spawn hazard
       this.hazards.push({
          x: Math.random() * this.width,
          y: Math.random() * (this.height - 200),
          width: 50 + Math.random()*200,
          height: 50 + Math.random()*100,
          type: this.director.sector === 2 ? 'energy_storm' : this.director.sector === 3 ? 'corruption_field' : 'moving_hazard',
          timer: 5000 + Math.random()*5000,
          active: true
       });
    }
    
    for (let i = this.hazards.length - 1; i >= 0; i--) {
       const h = this.hazards[i];
       h.timer -= dt;
       
       if (h.type === 'moving_hazard') {
          h.x += Math.sin(this.time * 0.001 + h.y) * 100 * (dt/1000);
          
          if (this.player.invulnTimer <= 0) {
             const dx = this.player.x + this.player.width/2 - h.x;
             const dy = this.player.y + this.player.height/2 - h.y;
             if (dx*dx+dy*dy < (h.width/2)*(h.width/2)) {
                this.player.invulnTimer = 2000;
                this.lives--;
                this.onLivesChange?.(this.lives);
                this.screenShake = 15;
                if (this.lives <= 0) {
                  this.state = 'GAMEOVER';
                  this.onStateChange?.(this.state);
                }
             }
          }
       }
       
       if (h.timer <= 0) {
          this.hazards.splice(i, 1);
       }
    }
    
    if (this.player.invulnTimer > 0) this.player.invulnTimer -= dt;


    // Update stars
    for (const star of this.stars) {
      star.y += star.speed * (dt / 16);
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
    }

    // Update nebulae
    for (const nebula of this.nebulae) {
      nebula.y += 0.05 * (dt / 16);
      if (nebula.y - nebula.radius > this.height) {
        nebula.y = -nebula.radius;
        nebula.x = Math.random() * this.width;
      }
    }

    // Update trails
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      t.life += dt;
      if (t.life >= t.maxLife) {
        this.trails.splice(i, 1);
      }
    }

    // Update rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life += dt;
      r.radius += (r.maxRadius - r.radius) * 0.1;
      if (r.life >= r.maxLife) {
        this.rings.splice(i, 1);
      }
    }

    if (this.state !== 'PLAYING') return;

    // Screen shake decay
    if (this.screenShake > 0) this.screenShake *= 0.9;
    if (this.screenShake < 0.1) this.screenShake = 0;

    // Player movement
    const speed = 300 * (dt / 1000);
    let moved = false;
    if ((this.keys['ArrowLeft'] || this.keys['KeyA']) && this.player.x > 0) {
      this.player.x -= speed;
      moved = true;
    }
    if ((this.keys['ArrowRight'] || this.keys['KeyD']) && this.player.x < this.width - this.player.width) {
      this.player.x += speed;
      moved = true;
    }
    
    if (moved && Math.random() < 0.3) {
      this.trails.push({
        x: this.player.x + this.player.width / 2 + (Math.random() - 0.5) * 20,
        y: this.player.y + this.player.height,
        life: 0,
        maxLife: 400,
        color: '#00ffff',
        size: Math.random() * 3 + 1
      });
    }

    // Player shooting
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    
    // decrement powerups
    for (let i = this.activePowerups.length - 1; i >= 0; i--) {
        this.activePowerups[i].timer -= dt;
        if(this.activePowerups[i].timer <= 0) {
            this.activePowerups.splice(i, 1);
        }
    }

    if ((this.keys['Space'] || this.keys['ArrowUp'] || this.keys['KeyW']) && this.shootCooldown <= 0) {
        const pText = ['SToO0ogeE~!', 'Stooj', 'Stewg', '5tooge', 'st00J', 'stooge', 'Stohj', 'Stooge', 'StewJ', 'St00J'];
        const text = pText[Math.floor(Math.random() * pText.length)];
        
        const spreadCount = this.activePowerups.filter(p => p.type === 'spread').length;
        const rapidCount = this.activePowerups.filter(p => p.type === 'rapid').length;
        const pierceCount = this.activePowerups.filter(p => p.type === 'pierce').length;

        const baseCooldown = 250;
        this.shootCooldown = baseCooldown / (1 + rapidCount); 

        const bulletCount = 1 + spreadCount * 2;
        const half = Math.floor(bulletCount / 2);
        
        for (let i = -half; i <= half; i++) {
           let bulletWidth = 20;
           let bulletHeight = 20;
           let bulletPierce = false;
           let bulletColor = '#00ffff';
           let bulletVy = -500;

           if (pierceCount > 0) {
              bulletPierce = true;
              bulletColor = '#ff00ff';
              bulletWidth += pierceCount * 10;
              bulletHeight += pierceCount * 10;
              bulletVy = -800 - (pierceCount * 100);
           }

           this.bullets.push({
             x: this.player.x + this.player.width / 2 - (bulletWidth/2) + i * Math.max(15, 30 - bulletCount*2),
             y: this.player.y - 10,
             width: bulletWidth,
             height: bulletHeight,
             color: bulletColor,
             vy: bulletVy,
             vx: i * 50, // slight spread angle depending on offset
             isPlayer: true,
             text,
             pierce: bulletPierce
           });
        }
        playShoot();
    }

    
    // Powerups update
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.y += p.vy * (dt / 1000);
      
      // Collision with player
      if (p.x < this.player.x + this.player.width && p.x + p.width > this.player.x &&
          p.y < this.player.y + this.player.height && p.y + p.height > this.player.y) {
        this.activePowerups.push({ type: p.type, timer: 10000 });
        this.spawnParticles(this.player.x + this.player.width/2, this.player.y, '#ffff00', 20);
        this.powerups.splice(i, 1);
        continue;
      }
      
      if (p.y > this.height) {
        this.powerups.splice(i, 1);
      }
    }

    
    // Bullet update
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.y += b.vy * (dt / 1000);
      if (b.vx) b.x += b.vx * (dt / 1000);

      
      if (b.isPlayer) {
        this.trails.push({
          x: b.x + b.width / 2,
          y: b.y + b.height / 2,
          life: 0,
          maxLife: 200,
          color: '#00ffff',
          size: 3
        });
      }

      // Remove off-screen bullets
      if (b.y < -20 || b.y > this.height + 20) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Collision with aliens
      if (b.isPlayer) {
        let hit = false;
        for (let j = this.aliens.length - 1; j >= 0; j--) {
          const a = this.aliens[j];
          if (a.state === 'invisible') continue;
          if (a.eliteType === 'PHANTOM' && Math.sin(this.time * 0.005) < 0) continue;
          if (b.x < a.x + a.width && b.x + b.width > a.x &&
              b.y < a.y + a.height && b.y + b.height > a.y) {
            
            // Collision with aliens
            
            a.hp -= b.pierce ? 2 : 1;
            if (a.hp <= 0) {
              if (a.type.startsWith('boss')) {
                  this.bossEventState = 'DEATH';
                  this.director.bossDeathTimer = 3000;
                  a.state = 'death';
                  b.vy = 0; b.x = -100; // remove bullet
                  this.score += 5000;
                  continue;
              }
              
              if (a.eliteType === 'GOLDEN') this.score += 1500;
              else if (a.eliteType === 'CORRUPTED') {
                  // Explode!
                  this.spawnParticles(a.x + a.width/2, a.y + a.height/2, '#ff0000', 50);
                  // Hurt nearby aliens?
              }

              this.spawnParticles(a.x + a.width/2, a.y + a.height/2, a.color, 25);
              this.rings.push({
                x: a.x + a.width/2,
                y: a.y + a.height/2,
                radius: 10,
                maxRadius: 60,
                life: 0,
                maxLife: 500,
                color: a.color
              });

              
              // Cluster split logic
              if (a.type === 'cluster') {
                for(let k=0; k<3; k++) {
                  this.aliens.push({
                    x: a.x + (k-1)*30, y: a.y, width: 30, height: 20,
                    color: '#ffb3f0', type: 'uwu', hp: 1, maxHp: 1, state: 'idle', timer: 0,
                    startX: a.x + (k-1)*30, startY: a.y, vx: 0, vy: 0, face: 'GUUCH'
                  });
                }
              }

              this.aliens.splice(j, 1);
              this.score += 10 * this.level;
              if (Math.random() < 0.02) {
                const types = ['spread', 'rapid', 'pierce'];
                const pType = types[Math.floor(Math.random() * types.length)];
                this.powerups.push({
                  x: a.x + a.width/2 - 15,
                  y: a.y + a.height/2,
                  width: 30,
                  height: 30,
                  vy: 100,
                  type: pType,
                  text: pType === 'spread' ? '[SPREAD]' : pType === 'rapid' ? '[RAPID]' : '[PIERCE]',
                  color: '#ffff00'
                });
              }
              this.onScoreChange?.(this.score);
              playAlienHit();
              this.screenShake = 2;
            } else {
              this.spawnParticles(a.x + a.width/2, a.y + a.height/2, '#ffffff', 10);
              playAlienHit();
            }
            
            if (!b.pierce) {
              this.bullets.splice(i, 1);
            }
            hit = true;
            if (!b.pierce) break;

          }
        }
        if (hit) continue;
      } else {
        // Alien bullet hits player
        if (b.x < this.player.x + this.player.width && b.x + b.width > this.player.x &&
            b.y < this.player.y + this.player.height && b.y + b.height > this.player.y) {
          
          this.spawnParticles(this.player.x + this.player.width/2, this.player.y + this.player.height/2, this.player.color, 30);
          this.bullets.splice(i, 1);
                    this.player.invulnTimer = 2000;
          this.lives--;
          this.onLivesChange?.(this.lives);
          playPlayerDeath();
          this.screenShake = 15;
          
          if (this.lives <= 0) {
            this.state = 'GAMEOVER';
            this.onStateChange?.(this.state);
          }
        }
      }
    }

    // Classic Alien Movement
    this.alienMoveTimer += dt;
    
    // Speed up classic/retrowo aliens as they are destroyed
    if (this.gameMode === 'CLASSIC' || this.gameMode === 'RETROWO') {
      const classicCount = this.aliens.filter(a => a.type === 'classic' || a.type === 'retrowo').length;
      const totalAliens = Math.min(12, 6 + Math.floor(this.level / 2)) * Math.min(6, 3 + Math.floor(this.level / 3));
      const remainingRatio = Math.max(0.05, classicCount / totalAliens);
      this.alienMoveInterval = Math.max(50, 800 * remainingRatio);
    }

    if (this.alienMoveTimer > this.alienMoveInterval) {
      this.alienMoveTimer = 0;
      this.alienStep++;
      playAlienMove(this.alienStep);
      
      let hitEdge = false;
      for (const a of this.aliens) {
        if (a.type === 'classic' || a.type === 'retrowo') {
          if ((this.alienDirection === 1 && a.x + a.width > this.width - 20) ||
              (this.alienDirection === -1 && a.x < 20)) {
            hitEdge = true;
            break;
          }
        }
      }
      
      if (hitEdge) {
        this.alienDirection *= -1;
        for (const a of this.aliens) {
          if (a.type === 'classic' || a.type === 'retrowo') {
            a.y += 20;
            if (a.y + a.height > this.player.y) {
              this.state = 'GAMEOVER';
              this.onStateChange?.(this.state);
              playPlayerDeath();
            }
          }
        }
      } else {
        for (const a of this.aliens) {
          if (a.type === 'classic' || a.type === 'retrowo') {
            a.x += 15 * this.alienDirection;
          }
        }
      }
      
      // Classic Alien shooting
      const classicAliens = this.aliens.filter(a => a.type === 'classic' || a.type === 'retrowo');
      const difficultyScale = this.gameMode === 'SURVIVAL' ? this.wave : this.level;
      if (classicAliens.length > 0 && Math.random() < 0.4 + (difficultyScale * 0.1)) {
        const randomAlien = classicAliens[Math.floor(Math.random() * classicAliens.length)];
        this.fireAlienBullet(randomAlien, 350 + (difficultyScale * 30));
      }
    }

    const waveMultiplier = 1 + (this.wave - 1) * 0.5;

    // Alien movement & shooting
    for (let i = this.aliens.length - 1; i >= 0; i--) {
      const a = this.aliens[i];
      a.timer += dt;
      
      if (a.type === 'classic') {
        a.face = this.alienStep % 2 === 0 ? (a.phase === 0 ? 'GOOCH' : 'GOOJ') : (a.phase === 0 ? 'GEWCH' : 'GUUCH');
      } else if (a.type === 'retrowo') {
        a.face = this.alienStep % 2 === a.phase ? 'go0cH' : 'g00ch';
      } else if (a.type === 'uwu') {
        a.x = a.startX + Math.sin(this.time * 0.002 * waveMultiplier + a.startY) * 50;
        a.y = a.startY + Math.sin(this.time * 0.003 * waveMultiplier + a.startX) * 10;
        a.face = this.time % 1000 < 500 ? 'GUUhJ' : 'GUUH';
        if (Math.random() < 0.003 * waveMultiplier) this.fireAlienBullet(a, 250 * waveMultiplier);
      } else if (a.type === 'owo') {
        if (a.state === 'idle') {
          a.x = a.startX + Math.sin(this.time * 0.005 * waveMultiplier + a.startY) * 100;
          if (Math.random() < 0.005 * waveMultiplier) {
            a.state = 'dash';
            a.vx = (this.player.x - a.x) * 0.003 * waveMultiplier;
            a.vy = 400 * waveMultiplier;
          }
          a.face = 'Stohj';
        } else if (a.state === 'dash') {
          a.x += a.vx * dt;
          a.y += a.vy * (dt / 1000);
          if (Math.random() < 0.3) {
            this.trails.push({ x: a.x + a.width/2, y: a.y, life: 0, maxLife: 200, color: a.color, size: 2 });
          }
          if (a.y > this.height - 100) {
            a.state = 'retreat';
            a.vy = -200 * waveMultiplier;
          }
          a.face = 'Stooge';
        } else if (a.state === 'retreat') {
          a.y += a.vy * (dt / 1000);
          if (a.y <= a.startY) {
            a.y = a.startY;
            a.state = 'idle';
          }
          a.face = 'StewJ';
        }
        if (Math.random() < 0.005 * waveMultiplier) this.fireAlienBullet(a, 350 * waveMultiplier);
      } else if (a.type === 'kitty') {
        const speed = 0.001 * waveMultiplier;
        const xOffset = Math.sin(this.time * 0.0005 + a.timer) * 30;
        const yOffset = Math.cos(this.time * 0.0006 + a.timer) * 20;
        a.x = a.startX + xOffset + Math.cos(this.time * speed + a.timer) * 60;
        a.y = a.startY + yOffset + Math.sin(this.time * speed + a.timer) * 60;
        a.face = Math.random() < 0.02 ? 'St00J~' : 'GOOCH';
        if (Math.random() < 0.006 * waveMultiplier) this.fireAlienBullet(a, 280 * waveMultiplier);
      } else if (a.type === 'neko') {
        if (a.state === 'idle') {
          a.x = a.startX + Math.sin(this.time * 0.003 * waveMultiplier + a.timer) * 30;
          if (Math.random() < 0.005 * waveMultiplier) {
            a.state = 'dive';
            a.timer = 0;
          }
          a.face = 'GOOJ';
        } else if (a.state === 'dive') {
          a.x += Math.sin(a.timer * 0.005) * 5;
          a.y += 350 * waveMultiplier * (dt / 1000);
          if (a.y > this.height) {
            a.y = -50;
            a.state = 'idle';
          }
          a.face = 'GEWCH';
        }
        if (Math.random() < 0.008 * waveMultiplier) this.fireAlienBullet(a, 400 * waveMultiplier);
      } else if (a.type === 'cluster') {
        a.x = a.startX + Math.sin(this.time * 0.001 * waveMultiplier + a.timer) * 150;
        a.face = 'GUUCH';
        if (Math.random() < 0.01 * waveMultiplier) this.fireAlienBullet(a, 300 * waveMultiplier);
      } else if (a.type === 'ghost') {
        a.x = a.startX + Math.sin(this.time * 0.002 * waveMultiplier + a.startY) * 100;
        a.y = a.startY + Math.cos(this.time * 0.003 * waveMultiplier + a.startX) * 50;
        if (Math.random() < 0.08) {
          this.trails.push({ x: a.x + a.width/2, y: a.y + a.height/2, life: 0, maxLife: 500, color: 'rgba(123, 232, 255, 0.3)', size: 15 });
          a.startX += (Math.random() - 0.5) * 100;
          a.startX = Math.max(50, Math.min(this.width - 50, a.startX));
        }
        a.face = 'GUUhJ';
        if (Math.random() < 0.008 * waveMultiplier) this.fireAlienBullet(a, 250 * waveMultiplier);
            } else if (a.type.startsWith('boss')) {
        if (!a.timer) a.timer = 0;
        a.timer += dt;

        if (a.type === 'boss_uwu') {
           a.x = this.width / 2 - a.width / 2 + Math.sin(this.time * 0.001) * 200;
           a.y = 100 + Math.sin(this.time * 0.002) * 20;
           if (Math.random() < 0.05) {
             this.fireAlienBullet(a, 300 + Math.random() * 200);
           }
        } 
        else if (a.type === 'boss_owo') {
           // Fast horizontal sweep
           const speed = 400;
           a.x = this.width / 2 - a.width / 2 + Math.sin(this.time * 0.002) * 300;
           a.y = 80;
           if (Math.random() < 0.08) {
             this.fireAlienBullet(a, 400); // fast dropping bombs
           }
        }
        else if (a.type === 'boss_kitty') {
           // Zig-zag fast
           a.x = a.startX + Math.sin(this.time * 0.003) * 350;
           a.y = 100 + Math.cos(this.time * 0.005) * 80;
           if (Math.random() < 0.1) {
             // Spread fire
             [-1, 0, 1].forEach(offset => {
               this.bullets.push({
                 x: a.x + a.width / 2 - 10 + offset * 15,
                 y: a.y + a.height,
                 width: 20, height: 20, color: a.color, vy: 350, isPlayer: false, text: '•'
               });
             });
           }
        }
        else if (a.type === 'boss_neko') {
           // Teleport every 2 seconds
           if (a.timer > 2000) {
              a.timer = 0;
              a.x = 100 + Math.random() * (this.width - 200 - a.width);
              a.y = 50 + Math.random() * 100;
              // Circle fire
              for(let idx = 0; idx < 8; idx++) {
                 const angle = (idx / 8) * Math.PI * 2;
                 this.bullets.push({
                    x: a.x + a.width/2 - 10,
                    y: a.y + a.height/2,
                    width: 20, height: 20, color: a.color, vy: 250 * Math.sin(angle), vx: 250 * Math.cos(angle), isPlayer: false, text: '♦'
                 });
              }
           }
        }
        else if (a.type === 'boss_cluster') {
           a.x = this.width/2 - a.width/2 + Math.sin(this.time * 0.0005) * 150;
           a.y = 80 + Math.sin(this.time * 0.001) * 30;
           if (Math.random() < 0.02) {
              // Spawn a mini cluster
              this.aliens.push({
                x: a.x + a.width / 2, y: a.y + a.height, width: 40, height: 25,
                color: '#c59cff', type: 'cluster', hp: 5, maxHp: 5, state: 'idle', timer: 0,
                startX: a.x + a.width / 2, startY: a.y + a.height, vx: (Math.random() - 0.5) * 200, vy: 100, face: '(*^*)'
              });
           }
        }
        else if (a.type === 'boss_ghost') {
           a.x = this.width/2 - a.width/2 + Math.sin(this.time * 0.0015) * 250;
           a.y = 120 + Math.sin(this.time * 0.002) * 50;
           // Ghost shoots tracking or random aimed bullets
           if (Math.random() < 0.04) {
               const dx = this.player.x + this.player.width/2 - (a.x + a.width/2);
               const dy = this.player.y - a.y - a.height;
               const len = Math.sqrt(dx*dx + dy*dy);
               this.bullets.push({
                  x: a.x + a.width/2 - 10,
                  y: a.y + a.height,
                  width: 20, height: 20, color: a.color, vy: (dy/len) * 300, vx: (dx/len) * 300, isPlayer: false, text: '~'
               });
           }
           // Invulnerable when invisible
           const ghostAlpha = (Math.sin(this.time * 0.003) + 1) / 2; 
           a.state = ghostAlpha < 0.3 ? 'invisible' : 'idle';
        }

    }
    }

    
    // Level complete
    if (this.aliens.length === 0 && this.state === 'PLAYING' && this.bossEventState === 'NONE') {
      if (this.gameMode === 'CLASSIC' || this.gameMode === 'RETROWO') {
        this.level++;
        this.onLevelChange?.(this.level);
        this.spawnWave();
      } else if (this.gameMode === 'SURVIVAL') {
        this.wave++;
        this.onWaveChange?.(this.wave);
        this.spawnWave();
      } else {
        // KAWAII mode
        if (this.wave % 5 !== 0) {
          this.wave++;
          this.onWaveChange?.(this.wave);
          this.spawnWave();
        }
      }
    }


    
    // Draw hazards
    this.ctx.globalCompositeOperation = 'screen';
    for (const h of this.hazards) {
       if (h.type === 'energy_storm') {
          this.ctx.fillStyle = `rgba(0, 255, 255, ${0.1 + Math.sin(this.time * 0.01) * 0.05})`;
          this.ctx.fillRect(h.x, h.y, h.width, h.height);
          if (Math.random() < 0.1) {
              this.ctx.fillStyle = '#ffffff';
              this.ctx.fillRect(h.x + Math.random()*h.width, h.y + Math.random()*h.height, 2, 20);
          }
       } else if (h.type === 'corruption_field') {
          this.ctx.fillStyle = `rgba(255, 0, 0, ${0.1 + Math.sin(this.time * 0.005) * 0.1})`;
          this.ctx.fillRect(h.x, h.y, h.width, h.height);
       } else if (h.type === 'moving_hazard') {
          this.ctx.fillStyle = `rgba(255, 255, 0, 0.2)`;
          this.ctx.beginPath();
          this.ctx.arc(h.x, h.y, h.width/2, 0, Math.PI * 2);
          this.ctx.fill();
       }
    }
    this.ctx.globalCompositeOperation = 'source-over';

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  drawGrid() {
    this.ctx.save();
    this.ctx.lineWidth = 2;
    this.ctx.shadowBlur = 5;
    this.ctx.shadowColor = '#7be8ff';

    const horizonY = this.height * 0.4;
    const numLines = 15;
    
    // Horizontal lines
    // We want the lines to move downwards (towards the player).
    // By adding time to the index and taking modulo 1, we get a smooth 0->1 transition.
    // We negate the time so the lines move downwards.
    const timeOffset = (1 - ((this.time * 0.001) % 1)) % 1;
    
    for (let i = 0; i < numLines; i++) {
      // progress goes from 0 to 1 non-linearly
      const p = (i + timeOffset) / numLines;
      const y = horizonY + Math.pow(p, 2) * (this.height - horizonY);
      
      // Fade out lines as they get closer to the horizon to avoid sharp pop-in
      const alpha = Math.min(1, p * 5); // 0 at horizon, 1 shortly after
      this.ctx.strokeStyle = `rgba(123, 232, 255, ${0.15 * alpha})`;
      
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }

    // Vertical lines (perspective)
    this.ctx.strokeStyle = 'rgba(123, 232, 255, 0.15)';
    const centerX = this.width / 2;
    for (let i = -15; i <= 15; i++) {
      const xOffset = i * 60;
      this.ctx.beginPath();
      this.ctx.moveTo(centerX + xOffset * 0.1, horizonY);
      this.ctx.lineTo(centerX + xOffset * 3.0, this.height);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  draw() {
    // Clear with slight trail effect (Deep Space Plum)
    this.ctx.fillStyle = 'rgba(20, 10, 31, 0.4)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();

    // Draw Nebulae
    for (const nebula of this.nebulae) {
      const pulseScale = 0.8 + Math.sin(this.time * 0.001 + nebula.pulse) * 0.2;
      const gradient = this.ctx.createRadialGradient(
        nebula.x, nebula.y, 0,
        nebula.x, nebula.y, nebula.radius * pulseScale
      );
      gradient.addColorStop(0, nebula.color);
      gradient.addColorStop(1, 'transparent');
      
      this.ctx.fillStyle = gradient;
      this.ctx.globalAlpha = 1;
      this.ctx.beginPath();
      this.ctx.arc(nebula.x, nebula.y, nebula.radius * pulseScale, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw Stars
    for (const star of this.stars) {
      this.ctx.fillStyle = star.color;
      this.ctx.globalAlpha = 0.5 + Math.sin(this.time * 0.005 + star.x) * 0.5;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;

    if (this.gameMode !== 'RETROWO') {
      this.drawGrid();
    }

    // Screen shake
    if (this.screenShake > 0) {
      const dx = (Math.random() - 0.5) * this.screenShake;
      const dy = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(dx, dy);
    }

    this.ctx.font = '28px "VT323", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    




    // Draw Player
    if (this.state === 'PLAYING' || this.state === 'VICTORY') {
      let currentColor = this.player.color;
      
      // Strobe effect while shooting cooldown is active
      if (this.shootCooldown > 0) {
        currentColor = Math.floor(this.shootCooldown / 40) % 2 === 0 ? '#ffffff' : this.player.color;
      }

      this.ctx.fillStyle = currentColor;
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = currentColor;
      
      const bobY = Math.sin(this.time * 0.005) * 5;
      this.ctx.fillText(this.playerFaceNormal, this.player.x + this.player.width / 2, this.player.y + this.player.height / 2 + bobY);
      
      // Draw active powerup indicators
      const powerupCounts: {[key: string]: number} = {};
      for (const p of this.activePowerups) {
         powerupCounts[p.type] = (powerupCounts[p.type] || 0) + 1;
      }
      
      let indicatorY = this.player.y - 20;
      this.ctx.font = 'bold 16px "JetBrains Mono", monospace';
      
      for (const [type, count] of Object.entries(powerupCounts)) {
        let text = "";
        let color = "#fff";
        if (type === 'spread') { text = `[SPREAD x${count}]`; color = "#00ffff"; }
        if (type === 'rapid') { text = `[RAPID x${count}]`; color = "#ffff00"; }
        if (type === 'pierce') { text = `[PIERCE x${count}]`; color = "#ff00ff"; }
        
        this.ctx.fillStyle = color;
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 10;
        this.ctx.fillText(text, this.player.x + this.player.width / 2, indicatorY);
        indicatorY -= 15;
      }
    }

    
    if (this.director.eventActive) {
      this.ctx.font = 'bold 32px "VT323", monospace';
      this.ctx.fillStyle = '#ffb3f0';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = '#ffb3f0';
      this.ctx.fillText(`WARNING: ${this.director.eventActive}`, this.width / 2, this.height / 2);
      this.ctx.shadowBlur = 0;
    }
    
    // Draw Aliens

    this.ctx.font = '28px "VT323", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    for (const a of this.aliens) {
      this.ctx.fillStyle = a.color;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = a.color;
      
      const bounceY = a.type === 'retrowo' ? 0 : Math.sin(this.time * 0.008 + a.x) * 4;
      
            if (a.type.startsWith('boss')) {
        this.ctx.font = 'bold 48px "VT323", monospace';
      } else if (a.type === 'cluster') {
        this.ctx.font = '48px "VT323", monospace';
      } else {
        this.ctx.font = '28px "VT323", monospace';
      }
      
      
      
      // Elite or Boss effects
      if (a.state === 'invisible') {
         this.ctx.globalAlpha = 0.2;
      }
      
      if (a.eliteType === 'GOLDEN') {
         this.ctx.shadowBlur = 20;
         this.ctx.shadowColor = '#ffd700';
      } else if (a.eliteType === 'CORRUPTED') {
         this.ctx.shadowBlur = Number((Math.sin(this.time * 0.01) * 10).toFixed(0)) + 10;
         this.ctx.shadowColor = '#ff0000';
      } else if (a.eliteType === 'PHANTOM') {
         this.ctx.globalAlpha = 0.5 + Math.sin(this.time * 0.005) * 0.4;
      }

      const drawFace = a.state === 'death' ? 'X_X' : a.face;
      const textX = a.x + a.width / 2;
      let textY = a.y + a.height / 2 + bounceY;
      
      // Boss Intro shake effect overrides text position
      if (a.state === 'intro' && this.bossEventState === 'INTRO') {
         textY += (Math.random() - 0.5) * 5;
         this.ctx.fillStyle = Math.random() < 0.2 ? '#ffffff' : a.color;
      }
      
      this.ctx.fillText(drawFace, textX, textY);
      
      this.ctx.shadowBlur = 0;
      this.ctx.globalAlpha = 1;


    }

    
    // Draw Powerups
    this.ctx.font = 'bold 20px "VT323", monospace';
    for (const p of this.powerups) {
      this.ctx.fillStyle = Math.floor(this.time / 100) % 2 === 0 ? p.color : '#ffffff';
      this.ctx.fillText(p.text, p.x + p.width/2, p.y + p.height/2);
    }

    // Draw Bullets
    this.ctx.font = 'bold 24px "VT323", monospace';
    for (const b of this.bullets) {
      this.ctx.fillStyle = b.color;
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = b.color;
      
      this.ctx.shadowBlur = 0;
      this.ctx.lineWidth = 3;
      this.ctx.strokeStyle = '#000000';
      this.ctx.strokeText(b.text, b.x + b.width/2, b.y + b.height/2);
      this.ctx.shadowBlur = 15;
      this.ctx.fillText(b.text, b.x + b.width/2, b.y + b.height/2);

    }

    // Draw Trails
    for (const t of this.trails) {
      const alpha = 1 - (t.life / t.maxLife);
      this.ctx.fillStyle = t.color;
      this.ctx.globalAlpha = alpha;
      this.ctx.beginPath();
      this.ctx.arc(t.x, t.y, t.size * alpha, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;

    // Draw Rings
    for (const r of this.rings) {
      const alpha = 1 - (r.life / r.maxLife);
      this.ctx.strokeStyle = r.color;
      this.ctx.lineWidth = 3 * alpha;
      this.ctx.globalAlpha = alpha;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = r.color;
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;

    // Draw Particles
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = p.color;
      const alpha = 1 - (p.life / p.maxLife);
      this.ctx.globalAlpha = alpha;
      
      if (p.text) {
        this.ctx.font = `${p.size * 3}px "VT323", monospace`;
        this.ctx.fillText(p.text, p.x, p.y);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    this.ctx.globalAlpha = 1;

    this.ctx.restore();
  }

  loop = (timestamp: number) => {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  startLoop() {
    this.animationFrameId = requestAnimationFrame(this.loop);
  }
}
