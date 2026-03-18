import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, ChangeDetectionStrategy, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

interface Player {
  x: number;
  y: number;
  size: number;
  squadSize: number;
  fireCooldown: number;
  weaponLevel: number;
  weaponType: 'basic' | 'spread' | 'laser' | 'rapid' | 'homing';
  unlockedWeapons: string[];
  powerUps: {
    shield: number;
    rapid: number;
    spread: number;
  };
  permanentStats: {
    damageMult: number;
    fireRateMult: number;
    bulletCountBonus: number;
  };
}

interface Bullet {
  x: number;
  y: number;
  speed: number;
  damage: number;
  isEnemy?: boolean;
  vx?: number;
  vy?: number;
  type?: 'basic' | 'laser' | 'spread' | 'rapid' | 'homing';
  width?: number;
  height?: number;
  target?: Enemy;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  speed: number;
  isBoss?: boolean;
  vx?: number;
  fireCooldown?: number;
  enemyType?: 'basic' | 'zigzag' | 'shooter' | 'chaser' | 'spreadShooter' | 'fastMelee' | 'deployer' | 'shielded' | 'charger';
  startX?: number;
  time?: number;
  shield?: number;
  maxShield?: number;
  weakPoint?: { x: number, y: number, radius: number };
}

interface Gate {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'add' | 'sub' | 'mul' | 'div';
  value: number;
}

interface PowerUp {
  id: number;
  x: number;
  y: number;
  radius: number;
  type: 'shield' | 'rapid' | 'spread' | 'weapon_spread' | 'weapon_laser' | 'weapon_rapid';
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
  type?: 'spark' | 'smoke' | 'shockwave' | 'debris' | 'flash' | 'line';
  rotation?: number;
  rotationSpeed?: number;
  friction?: number;
  gravity?: number;
  glow?: boolean;
  length?: number;
  width?: number;
}

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = false;

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.enabled = true;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playShoot() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playExplosion() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playPowerup() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playPowerdown() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playHit() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playUIClick() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playUIStart() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playUIGameOver() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  playEnemySpawn() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playMilestone() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.setValueAtTime(554.37, this.ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.2);
    osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }

  playBossSpawn() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 2.0);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2.0);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 2.0);
  }

  playBossDefeat() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 1.5);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.5);
  }
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MatIconModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="game-container relative w-full h-screen bg-slate-900 overflow-hidden flex justify-center items-center touch-none select-none">
      <div class="relative w-full max-w-md h-full shadow-2xl bg-slate-200 overflow-hidden" id="gameContainer">
        <canvas #gameCanvas class="block w-full h-full touch-none"
          (mousedown)="onPointerDown($event)"
          (mousemove)="onPointerMove($event)"
          (mouseup)="onPointerUp()"
          (mouseleave)="onPointerUp()"
          (touchstart)="onPointerDown($event)"
          (touchmove)="onPointerMove($event)"
          (touchend)="onPointerUp()"
          (touchcancel)="onPointerUp()">
        </canvas>
        
        @if (gameState() === 'start') {
          <div class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md z-20">
            <div class="relative mb-8">
              <h1 class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-blue-600 tracking-tighter text-center" style="filter: drop-shadow(0 0 15px rgba(34,211,238,0.5));">SPACE<br>RUNNER</h1>
              <div class="absolute -inset-4 border border-cyan-500/30 rounded-lg transform skew-x-12 pointer-events-none"></div>
            </div>
            <p class="text-cyan-100/80 mb-10 text-center px-8 text-sm font-mono tracking-widest uppercase">Swipe to navigate.<br>Build your fleet.<br>Destroy the core.</p>
            <button (click)="startGame()" class="px-12 py-4 bg-cyan-900/50 hover:bg-cyan-800/80 text-cyan-300 rounded border border-cyan-400 font-black text-xl shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer tracking-widest" style="clip-path: polygon(10% 0, 100% 0, 90% 100%, 0% 100%);">INITIALIZE</button>
          </div>
        }

        @if (gameState() === 'gameover') {
          <div class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md z-20">
            <div class="relative mb-6">
              <h1 class="text-5xl font-black text-red-500 tracking-tighter text-center" style="filter: drop-shadow(0 0 20px rgba(239,68,68,0.8));">SYSTEM<br>FAILURE</h1>
              <div class="absolute -inset-4 border border-red-500/50 rounded-lg transform -skew-x-12 pointer-events-none"></div>
            </div>
            <p class="text-red-200/80 mb-10 text-xl font-mono tracking-widest">SCORE: <span class="text-white font-black">{{score()}}</span></p>
            <button (click)="startGame()" class="px-12 py-4 bg-red-900/50 hover:bg-red-800/80 text-red-300 rounded border border-red-500 font-black text-xl shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer tracking-widest" style="clip-path: polygon(10% 0, 100% 0, 90% 100%, 0% 100%);">REBOOT</button>
          </div>
        }

        @if (gameState() === 'playing') {
          <!-- Top Bar -->
          <div class="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
            <!-- Settings Button -->
            <button class="w-10 h-10 bg-slate-900/80 backdrop-blur border border-cyan-500/30 rounded flex items-center justify-center pointer-events-auto shadow-[0_0_10px_rgba(6,182,212,0.2)] cursor-pointer hover:bg-slate-800 hover:border-cyan-400 transition-all group">
              <mat-icon class="text-cyan-400 group-hover:text-cyan-300">settings</mat-icon>
            </button>
            
            <!-- Level Progress -->
            <div class="flex-1 mx-4 bg-slate-900/80 backdrop-blur border border-cyan-500/30 h-8 flex items-center px-1 relative shadow-[0_0_15px_rgba(6,182,212,0.2)] overflow-hidden" style="transform: skewX(-10deg);">
              <div class="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-400 shadow-[0_0_15px_rgba(34,211,238,0.6)] transition-all duration-300" 
                   [style.width.%]="weaponProgress()">
                <div class="absolute inset-0 bg-white/20" style="background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px);"></div>
                <!-- Animated glow at the tip -->
                <div class="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_#fff]"></div>
              </div>
              <div class="relative w-full flex justify-between items-center px-4 text-[10px] font-black text-white z-10" style="transform: skewX(10deg);">
                <span class="text-cyan-200 tracking-widest uppercase">LVL {{playerWeaponLevel()}}</span>
                <span class="text-white text-sm tracking-widest drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">{{score()}}</span>
                <span class="text-cyan-500 tracking-widest uppercase">LVL {{playerWeaponLevel() + 1}}</span>
              </div>
            </div>

            <!-- Pause Button -->
            <button class="w-10 h-10 bg-slate-900/80 backdrop-blur border border-cyan-500/30 rounded flex items-center justify-center pointer-events-auto shadow-[0_0_10px_rgba(6,182,212,0.2)] cursor-pointer hover:bg-slate-800 hover:border-cyan-400 transition-all group">
              <mat-icon class="text-cyan-400 group-hover:text-cyan-300">pause</mat-icon>
            </button>
          </div>

          <!-- Stats & Powerups UI -->
          <div class="absolute top-16 left-4 flex flex-col gap-2 pointer-events-none z-10 w-48">
            <div class="bg-slate-900/80 border border-cyan-500/30 text-cyan-200 px-3 py-1.5 text-xs font-black rounded flex items-center gap-2 shadow-[0_0_10px_rgba(6,182,212,0.2)] w-fit backdrop-blur-sm">
              <mat-icon class="text-[14px] w-[14px] h-[14px]">rocket</mat-icon> 
              <span class="tracking-widest">FLEET: {{playerSquadSize()}}</span>
            </div>
            
            @if (playerPowerUps().shield > 0) {
              <div class="flex flex-col gap-1">
                <div class="bg-blue-900/80 border border-blue-400 text-blue-200 px-3 py-1.5 text-[10px] font-black rounded flex items-center justify-between shadow-[0_0_10px_rgba(59,130,246,0.5)] backdrop-blur-sm">
                  <div class="flex items-center gap-2">
                    <mat-icon class="text-[14px] w-[14px] h-[14px]">security</mat-icon> 
                    <span class="tracking-widest">SHIELD</span>
                  </div>
                  <span class="font-mono">{{playerPowerUps().shield | number:'1.1-1'}}s</span>
                </div>
                <div class="h-1 w-full bg-slate-900/50 rounded-full overflow-hidden border border-blue-500/20">
                  <div class="h-full bg-blue-400 shadow-[0_0_5px_#60a5fa]" [style.width.%]="(playerPowerUps().shield / 5) * 100"></div>
                </div>
              </div>
            }
            
            @if (playerPowerUps().rapid > 0) {
              <div class="flex flex-col gap-1">
                <div class="bg-red-900/80 border border-red-400 text-red-200 px-3 py-1.5 text-[10px] font-black rounded flex items-center justify-between shadow-[0_0_10px_rgba(239,68,68,0.5)] backdrop-blur-sm">
                  <div class="flex items-center gap-2">
                    <mat-icon class="text-[14px] w-[14px] h-[14px]">bolt</mat-icon> 
                    <span class="tracking-widest">RAPID FIRE</span>
                  </div>
                  <span class="font-mono">{{playerPowerUps().rapid | number:'1.1-1'}}s</span>
                </div>
                <div class="h-1 w-full bg-slate-900/50 rounded-full overflow-hidden border border-red-500/20">
                  <div class="h-full bg-red-400 shadow-[0_0_5px_#f87171]" [style.width.%]="(playerPowerUps().rapid / 5) * 100"></div>
                </div>
              </div>
            }
            
            @if (playerPowerUps().spread > 0) {
              <div class="flex flex-col gap-1">
                <div class="bg-purple-900/80 border border-purple-400 text-purple-200 px-3 py-1.5 text-[10px] font-black rounded flex items-center justify-between shadow-[0_0_10px_rgba(168,85,247,0.5)] backdrop-blur-sm">
                  <div class="flex items-center gap-2">
                    <mat-icon class="text-[14px] w-[14px] h-[14px]">call_split</mat-icon> 
                    <span class="tracking-widest">SPREAD SHOT</span>
                  </div>
                  <span class="font-mono">{{playerPowerUps().spread | number:'1.1-1'}}s</span>
                </div>
                <div class="h-1 w-full bg-slate-900/50 rounded-full overflow-hidden border border-purple-500/20">
                  <div class="h-full bg-purple-400 shadow-[0_0_5px_#c084fc]" [style.width.%]="(playerPowerUps().spread / 5) * 100"></div>
                </div>
              </div>
            }
          </div>

          <!-- Weapon Selector -->
          <div class="absolute top-16 right-4 flex flex-col gap-2 pointer-events-none z-10">
            @for (weapon of unlockedWeapons(); track weapon) {
              <button (click)="selectWeapon(weapon)" 
                      class="w-12 h-12 bg-slate-900/80 backdrop-blur border rounded flex items-center justify-center pointer-events-auto transition-all transform hover:scale-110 active:scale-95 shadow-lg cursor-pointer"
                      [class.border-cyan-400]="playerWeaponType() === weapon"
                      [class.border-slate-700]="playerWeaponType() !== weapon"
                      [class.shadow-[0_0_15px_rgba(34,211,238,0.4)]]="playerWeaponType() === weapon">
                <mat-icon [class.text-cyan-400]="playerWeaponType() === weapon" 
                          [class.text-slate-500]="playerWeaponType() !== weapon">
                  {{ getWeaponIcon(weapon) }}
                </mat-icon>
              </button>
            }
          </div>

          <!-- Confirm Weapon Popup -->
          @if (weaponToConfirm() !== null) {
            <div class="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-30 pointer-events-auto">
              <div class="bg-slate-800 border-2 border-cyan-500 p-6 rounded-lg shadow-[0_0_30px_rgba(34,211,238,0.4)] flex flex-col items-center max-w-xs mx-4">
                <h2 class="text-cyan-300 font-black text-xl mb-4 tracking-widest text-center" style="text-shadow: 0 0 10px rgba(34,211,238,0.5);">CHANGE WEAPON</h2>
                <div class="flex items-center gap-3 mb-8 bg-slate-900/50 px-6 py-3 rounded-full border border-cyan-500/30">
                  <mat-icon class="text-cyan-400 transform scale-125">{{ getWeaponIcon(weaponToConfirm()!) }}</mat-icon>
                  <span class="font-mono text-white text-lg font-bold tracking-widest uppercase">{{ weaponToConfirm() }}</span>
                </div>
                <div class="flex gap-4 w-full">
                  <button (click)="cancelWeaponChange()" class="flex-1 py-3 bg-slate-700 text-slate-300 rounded font-black tracking-widest hover:bg-slate-600 transition-colors border border-slate-500">NO</button>
                  <button (click)="confirmWeaponChange()" class="flex-1 py-3 bg-cyan-600 text-white rounded font-black tracking-widest hover:bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)] transition-colors border border-cyan-400">YES</button>
                </div>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [
    `
    :host { display: block; }
    canvas { touch-action: none; }
    `
  ]
})
export class App implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private ctx!: CanvasRenderingContext2D;
  private animationFrameId = 0;
  
  gameState = signal<'start' | 'playing' | 'gameover'>('start');
  score = signal<number>(0);
  playerWeaponLevel = signal<number>(1);
  playerWeaponType = signal<string>('basic');
  unlockedWeapons = signal<string[]>(['basic']);
  weaponProgress = computed(() => {
    const score = this.score();
    return (score % 500) / 500 * 100;
  });
  playerSquadSize = signal<number>(5);
  playerPowerUps = signal<{shield: number, rapid: number, spread: number}>({shield: 0, rapid: 0, spread: 0});
  weaponToConfirm = signal<string | null>(null);
  
  selectWeapon(type: string) {
    if (this.player && this.player.unlockedWeapons.includes(type) && this.player.weaponType !== type) {
      this.weaponToConfirm.set(type);
      this.soundManager.playUIClick();
    }
  }

  confirmWeaponChange() {
    const type = this.weaponToConfirm();
    if (type && this.player) {
      this.player.weaponType = type as 'basic' | 'spread' | 'laser' | 'rapid' | 'homing';
      this.playerWeaponType.set(type);
      this.soundManager.playPowerup();
      this.weaponToConfirm.set(null);
    }
  }

  cancelWeaponChange() {
    this.soundManager.playUIClick();
    this.weaponToConfirm.set(null);
  }

  getWeaponIcon(type: string): string {
    switch (type) {
      case 'basic': return 'adjust';
      case 'spread': return 'call_split';
      case 'laser': return 'reorder';
      case 'homing': return 'gps_fixed';
      default: return 'help';
    }
  }
  
  private player!: Player;
  private bullets: Bullet[] = [];
  private enemyBullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private gates: Gate[] = [];
  private powerUps: PowerUp[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private stars: {x: number, y: number, size: number, speed: number}[] = [];
  
  private gameSpeed = 150;
  private lastTime = 0;
  private spawnTimer = 0;
  private gateSpawnTimer = 0;
  private enemyIdCounter = 0;
  private gateIdCounter = 0;
  
  private lastMilestone = 0;
  private nextBossScore = 500;
  private isBossActive = false;
  
  private isDragging = false;
  private canvasWidth = 400;
  private canvasHeight = 700;
  
  private soundManager = new SoundManager();
  private screenShakeTime = 0;
  private screenShakeMagnitude = 0;
  
  private screenFlashTime = 0;
  private screenFlashColor = '#ffffff';
  
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  ngAfterViewInit() {
    if (!this.isBrowser) return;
    
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;
    
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    this.drawStartScreen();
  }

  ngOnDestroy() {
    if (!this.isBrowser) return;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement;
    if (!container) return;
    
    const containerRatio = container.clientWidth / container.clientHeight;
    const canvasRatio = this.canvasWidth / this.canvasHeight;
    
    if (containerRatio < canvasRatio) {
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
    } else {
      canvas.style.width = 'auto';
      canvas.style.height = '100%';
    }
  }

  drawStartScreen() {
    this.ctx.fillStyle = '#1f2937';
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  startGame() {
    if (this.isBrowser) {
      this.soundManager.init();
      this.soundManager.playUIStart();
    }
    this.gameState.set('playing');
    this.score.set(0);
    this.screenShakeTime = 0;
    this.player = {
      x: this.canvasWidth / 2,
      y: this.canvasHeight - 120,
      size: 15,
      squadSize: 5,
      fireCooldown: 0,
      weaponLevel: 1,
      weaponType: 'basic',
      unlockedWeapons: ['basic'],
      powerUps: {
        shield: 0,
        rapid: 0,
        spread: 0
      },
      permanentStats: {
        damageMult: 1,
        fireRateMult: 1,
        bulletCountBonus: 0
      }
    };
    this.playerWeaponType.set('basic');
    this.unlockedWeapons.set(['basic']);
    this.weaponToConfirm.set(null);
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.gates = [];
    this.powerUps = [];
    this.particles = [];
    this.floatingTexts = [];
    this.stars = Array.from({length: 100}, () => ({
      x: Math.random() * this.canvasWidth,
      y: Math.random() * this.canvasHeight,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 50 + 20
    }));
    this.gameSpeed = 180;
    this.spawnTimer = 2.0;
    this.gateSpawnTimer = 1.0;
    this.lastMilestone = 0;
    this.nextBossScore = 500;
    this.isBossActive = false;
    this.lastTime = performance.now();
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  gameLoop(currentTime: number) {
    if (this.gameState() !== 'playing') return;
    
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;
    
    this.update(deltaTime);
    this.draw();
    
    this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(dt: number) {
    if (this.screenShakeTime > 0) {
      this.screenShakeTime -= dt;
    }
    if (this.screenFlashTime > 0) {
      this.screenFlashTime -= dt;
    }

    // Update stars
    for (const star of this.stars) {
      star.y += (star.speed + this.gameSpeed * 0.2) * dt;
      if (star.y > this.canvasHeight) {
        star.y = -10;
        star.x = Math.random() * this.canvasWidth;
      }
    }
    
    // Update powerup timers
    if (this.player.powerUps.shield > 0) this.player.powerUps.shield -= dt;
    if (this.player.powerUps.rapid > 0) this.player.powerUps.rapid -= dt;
    if (this.player.powerUps.spread > 0) this.player.powerUps.spread -= dt;

    this.playerWeaponLevel.set(this.player.weaponLevel);
    this.playerWeaponType.set(this.player.weaponType);
    this.unlockedWeapons.set([...this.player.unlockedWeapons]);
    this.playerSquadSize.set(this.player.squadSize);
    this.playerPowerUps.set({
      shield: Math.max(0, this.player.powerUps.shield),
      rapid: Math.max(0, this.player.powerUps.rapid),
      spread: Math.max(0, this.player.powerUps.spread)
    });

    this.gameSpeed += dt * 3;
    
    const currentMilestone = Math.floor(this.score() / 500);
    if (currentMilestone > this.lastMilestone && this.score() > 0) {
      this.lastMilestone = currentMilestone;
      this.player.weaponLevel++;
      
      // Apply permanent upgrades based on level
      if (this.player.weaponLevel === 2) {
        this.player.permanentStats.bulletCountBonus += 1;
      } else if (this.player.weaponLevel === 3) {
        this.player.permanentStats.damageMult *= 1.5;
        this.player.weaponType = 'spread';
        if (!this.player.unlockedWeapons.includes('spread')) {
          this.player.unlockedWeapons.push('spread');
        }
      } else if (this.player.weaponLevel === 4) {
        this.player.permanentStats.fireRateMult *= 1.25;
      } else if (this.player.weaponLevel === 5) {
        this.player.weaponType = 'laser';
        this.player.permanentStats.damageMult *= 1.2;
        if (!this.player.unlockedWeapons.includes('laser')) {
          this.player.unlockedWeapons.push('laser');
        }
      } else if (this.player.weaponLevel === 6) {
        this.player.weaponType = 'homing';
        this.player.permanentStats.bulletCountBonus += 1;
        if (!this.player.unlockedWeapons.includes('homing')) {
          this.player.unlockedWeapons.push('homing');
        }
      } else {
        // Higher levels give general boosts
        this.player.permanentStats.damageMult *= 1.1;
        this.player.permanentStats.fireRateMult *= 1.05;
      }

      this.soundManager.playMilestone();
      this.floatingTexts.push({
        x: this.canvasWidth / 2,
        y: this.canvasHeight / 2,
        text: `UPGRADE: LVL ${this.player.weaponLevel}!`,
        color: '#fbbf24',
        life: 2.0,
        maxLife: 2.0
      });
      this.createRingEffect(this.canvasWidth / 2, this.canvasHeight / 2, '#fbbf24', 2.5);
      this.createExplosion(this.canvasWidth / 2, this.canvasHeight / 2, '#fbbf24', 60, 2);
      this.addScreenShake(15, 0.5);
      this.addScreenFlash('rgba(251, 191, 36, 0.3)', 0.5); // amber-400 with opacity
    }
    
    if (Math.random() > 0.1) {
      this.particles.push({
        x: this.player.x + (Math.random() - 0.5) * this.player.size,
        y: this.player.y + this.player.size,
        vx: (Math.random() - 0.5) * 20,
        vy: 50 + Math.random() * 50,
        life: 0.2 + Math.random() * 0.3,
        maxLife: 0.5,
        color: '#60a5fa',
        size: 2 + Math.random() * 4
      });
      // Add a secondary white trail for speed effect
      if (Math.random() > 0.5) {
        this.particles.push({
          x: this.player.x + (Math.random() - 0.5) * this.player.size * 0.5,
          y: this.player.y + this.player.size,
          vx: (Math.random() - 0.5) * 10,
          vy: 80 + Math.random() * 40,
          life: 0.1 + Math.random() * 0.2,
          maxLife: 0.3,
          color: '#ffffff',
          size: 1 + Math.random() * 2
        });
      }
    }
    
    this.player.fireCooldown -= dt;
    if (this.player.fireCooldown <= 0) {
      this.shoot();
      let fireRate = Math.max(0.08, 0.3 - (this.player.squadSize * 0.002));
      if (this.player.weaponLevel >= 3) fireRate *= 0.8;
      if (this.player.weaponLevel >= 5) fireRate *= 0.8;
      if (this.player.powerUps.rapid > 0) fireRate *= 0.5;
      this.player.fireCooldown = fireRate;
    }
    
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      
      if (b.type === 'homing') {
        if (!b.target || !this.enemies.includes(b.target) || b.target.health <= 0) {
          b.target = this.findNearestEnemy(b.x, b.y);
        }
        
        if (b.target) {
          const dx = b.target.x + b.target.width / 2 - b.x;
          const dy = b.target.y + b.target.height / 2 - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          const targetVx = (dx / dist) * b.speed;
          const targetVy = (dy / dist) * b.speed;
          
          b.vx = (b.vx || 0) * 0.92 + targetVx * 0.08;
          b.vy = (b.vy || -b.speed) * 0.92 + targetVy * 0.08;
          
          b.x += b.vx * dt;
          b.y += b.vy * dt;
        } else {
          b.y -= b.speed * dt;
          if (b.vx) b.x += b.vx * dt;
          if (b.vy) b.y += b.vy * dt;
        }
      } else {
        b.y -= b.speed * dt;
        if (b.vx) b.x += b.vx * dt;
      }
      
      let mainColor = '#60a5fa'; // basic blue
      let secColor = '#ffffff';
      let partCount = 1;
      let partSize = 1;
      
      if (b.type === 'laser') {
        mainColor = '#ef4444';
        secColor = '#fca5a5';
        partCount = 3;
        partSize = 2;
      } else if (b.type === 'spread') {
        mainColor = '#a855f7';
        secColor = '#d8b4fe';
        partCount = 2;
        partSize = 1.5;
      } else if (b.type === 'rapid') {
        mainColor = '#10b981';
        secColor = '#6ee7b7';
      } else if (b.type === 'homing') {
        mainColor = '#fbbf24';
        secColor = '#ffffff';
        partCount = 2;
        partSize = 2;
      }

      if (Math.random() > 0.2) {
        for (let p = 0; p < partCount; p++) {
          this.particles.push({
            x: b.x + (Math.random() - 0.5) * (b.width || 4),
            y: b.y + (b.height || 20) / 2,
            vx: (Math.random() - 0.5) * 15,
            vy: 10 + Math.random() * 30,
            life: 0.1 + Math.random() * 0.1,
            maxLife: 0.2,
            color: mainColor,
            size: partSize + Math.random() * 3
          });
        }
        // Add a secondary trail for bullet speed
        if (Math.random() > 0.5) {
          this.particles.push({
            x: b.x,
            y: b.y + 2,
            vx: 0,
            vy: 20 + Math.random() * 20,
            life: 0.1,
            maxLife: 0.1,
            color: secColor,
            size: partSize + Math.random() * 2
          });
        }
      }

      if (b.y < -50 || b.x < -50 || b.x > this.canvasWidth + 50) {
        this.bullets.splice(i, 1);
      }
    }
    
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.y += b.speed * dt;
      if (b.vx) b.x += b.vx * dt;
      
      // Distinct visual trails
      if (b.speed > 350) {
        // Energetic bright trail
        this.particles.push({
          x: b.x + (Math.random() - 0.5) * 4,
          y: b.y - 4,
          vx: (Math.random() - 0.5) * 5,
          vy: -b.speed * 0.1,
          life: 0.1,
          maxLife: 0.15,
          color: '#2dd4bf', // teal-400
          size: 1.5 + Math.random() * 2,
          glow: true
        });
        if (Math.random() > 0.5) {
          this.particles.push({
            x: b.x,
            y: b.y,
            vx: 0,
            vy: -b.speed * 0.2,
            life: 0.1,
            maxLife: 0.1,
            color: '#ffffff',
            size: 1 + Math.random(),
            type: 'line',
            length: 10
          });
        }
      } else {
        // Smoky red trail
        if (Math.random() > 0.3) {
          this.particles.push({
            x: b.x + (Math.random() - 0.5) * 3,
            y: b.y - 2,
            vx: (Math.random() - 0.5) * 10,
            vy: -Math.random() * 20,
            life: 0.2,
            maxLife: 0.3,
            color: Math.random() > 0.5 ? '#ef4444' : '#7f1d1d', // red-500 or red-900
            size: 2 + Math.random() * 3,
            type: Math.random() > 0.5 ? 'smoke' : 'spark'
          });
        }
      }
      
      if (this.checkCollision(b.x - 4, b.y - 4, 8, 8, 
                              this.player.x - this.player.size, this.player.y - this.player.size, 
                              this.player.size * 2, this.player.size * 2)) {
        
        if (this.player.powerUps.shield > 0) {
          this.createExplosion(this.player.x, this.player.y, '#3b82f6', 10, 1);
          this.soundManager.playHit();
          this.enemyBullets.splice(i, 1);
          continue;
        }

        this.player.squadSize -= b.damage;
        this.createExplosion(this.player.x, this.player.y, '#ef4444', 10, 1);
        this.soundManager.playHit();
        this.addScreenShake(5, 0.2);
        this.addScreenFlash('rgba(239, 68, 68, 0.2)', 0.2);
        this.enemyBullets.splice(i, 1);
        
        this.floatingTexts.push({
          x: this.player.x,
          y: this.player.y - 40,
          text: `-${b.damage}`,
          color: '#ef4444',
          life: 1.0,
          maxLife: 1.0
        });
        
        if (this.player.squadSize <= 0) {
          this.gameOver();
          return;
        }
        continue;
      }
      
      if (b.y > this.canvasHeight + 50) {
        this.enemyBullets.splice(i, 1);
      }
    }
    
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      
      if (e.isBoss) {
        if (e.y < 100) {
          e.y += this.gameSpeed * 0.5 * dt;
        } else {
          e.x += (e.vx || 100) * dt;
          if (e.x <= 0 || e.x + e.width >= this.canvasWidth) {
            e.vx = -(e.vx || 100);
          }
          
          e.fireCooldown = (e.fireCooldown || 0) - dt;
          if (e.fireCooldown <= 0) {
            this.enemyBullets.push({
              x: e.x + e.width / 2,
              y: e.y + e.height,
              speed: 400,
              damage: Math.floor(5 + this.score() / 100),
              isEnemy: true
            });
            this.soundManager.playShoot();
            e.fireCooldown = 0.8;
          }
        }
      } else {
        if (e.enemyType === 'zigzag') {
          e.time = (e.time || 0) + dt;
          e.y += this.gameSpeed * 0.8 * dt;
          e.x = (e.startX || 0) + Math.sin(e.time * 3) * 80;
          e.x = Math.max(0, Math.min(this.canvasWidth - e.width, e.x));
        } else if (e.enemyType === 'shooter') {
          e.y += this.gameSpeed * 0.5 * dt;
          e.fireCooldown = (e.fireCooldown || 0) - dt;
          if (e.fireCooldown <= 0) {
            this.enemyBullets.push({
              x: e.x + e.width / 2,
              y: e.y + e.height,
              speed: 300,
              damage: Math.max(1, Math.floor(this.score() / 200)),
              isEnemy: true
            });
            this.soundManager.playShoot();
            e.fireCooldown = 1.5;
          }
        } else if (e.enemyType === 'chaser') {
          e.y += this.gameSpeed * 1.3 * dt;
          const centerX = e.x + e.width / 2;
          if (centerX < this.player.x) e.x += 80 * dt;
          else if (centerX > this.player.x) e.x -= 80 * dt;
        } else if (e.enemyType === 'spreadShooter') {
          e.y += this.gameSpeed * 0.4 * dt;
          e.fireCooldown = (e.fireCooldown || 0) - dt;
          if (e.fireCooldown <= 0) {
            const damage = Math.max(1, Math.floor(this.score() / 250));
            for (let i = -1; i <= 1; i++) {
              this.enemyBullets.push({
                x: e.x + e.width / 2,
                y: e.y + e.height,
                speed: 300,
                damage: damage,
                isEnemy: true,
                vx: i * 100
              });
            }
            this.soundManager.playShoot();
            e.fireCooldown = 2.0;
          }
        } else if (e.enemyType === 'fastMelee') {
          e.y += this.gameSpeed * 2.0 * dt;
          const centerX = e.x + e.width / 2;
          if (centerX < this.player.x) e.x += 120 * dt;
          else if (centerX > this.player.x) e.x -= 120 * dt;
        } else if (e.enemyType === 'deployer') {
          if (e.y < 100) {
            e.y += this.gameSpeed * 0.3 * dt;
          } else {
            e.x += Math.sin(performance.now() / 500) * 30 * dt;
            e.fireCooldown = (e.fireCooldown || 0) - dt;
            if (e.fireCooldown <= 0) {
              // Deploy small chaser unit
              const w = 20;
              this.enemies.push({
                id: this.enemyIdCounter++,
                x: e.x + e.width / 2 - w / 2,
                y: e.y + e.height,
                width: w,
                height: w,
                health: Math.max(1, Math.floor(this.score() / 100)),
                maxHealth: Math.max(1, Math.floor(this.score() / 100)),
                speed: 0,
                enemyType: 'chaser'
              });
              this.soundManager.playShoot();
              e.fireCooldown = 2.5;
            }
          }
        } else if (e.enemyType === 'shielded') {
          e.y += this.gameSpeed * 0.4 * dt;
          // shield recharge logic
          if (e.shield !== undefined && e.maxShield !== undefined && e.shield > 0 && e.shield < e.maxShield) {
            e.shield += e.maxShield * 0.05 * dt; // slow recharge
          }
        } else if (e.enemyType === 'charger') {
          if (!e.time) {
            // idle mode
            e.y += this.gameSpeed * 0.3 * dt;
            const dist = Math.sqrt(Math.pow((e.x + e.width/2) - this.player.x, 2) + Math.pow((e.y + e.height/2) - this.player.y, 2));
            if (e.y > 0 && dist < 250) {
              e.time = 1; // trigger charge
              const dx = this.player.x - (e.x + e.width/2);
              const dy = this.player.y - (e.y + e.height/2);
              const mag = Math.sqrt(dx*dx + dy*dy);
              e.vx = (dx / mag) * 400;
              e.speed = (dy / mag) * 400; // repurpose simple speed for vertical velocity
            }
          } else {
            // charge mode
            e.y += (e.speed || this.gameSpeed * 3.5) * dt;
            e.x += (e.vx || 0) * dt;
          }
        } else {
          e.y += this.gameSpeed * dt;
        }
      }
      
      if (this.checkCollision(this.player.x - this.player.size, this.player.y - this.player.size, this.player.size * 2, this.player.size * 2,
                              e.x, e.y, e.width, e.height)) {
        
        if (this.player.powerUps.shield > 0) {
          this.createExplosion(e.x + e.width/2, e.y + e.height/2, '#3b82f6', 30, 1.5);
          this.soundManager.playExplosion();
          this.enemies.splice(i, 1);
          continue;
        }

        const damageToPlayer = e.health;
        this.player.squadSize -= damageToPlayer;
        this.createExplosion(e.x + e.width/2, e.y + e.height/2, '#ef4444', 30, 1.5);
        this.soundManager.playExplosion();
        this.addScreenShake(10, 0.3);
        this.addScreenFlash('rgba(239, 68, 68, 0.3)', 0.3);
        this.enemies.splice(i, 1);
        
        this.floatingTexts.push({
          x: this.player.x,
          y: this.player.y - 40,
          text: `-${damageToPlayer}`,
          color: '#ef4444',
          life: 1.0,
          maxLife: 1.0
        });
        
        if (this.player.squadSize <= 0) {
          this.gameOver();
          return;
        }
        continue;
      }
      
      if (e.y > this.canvasHeight + 50) {
        this.enemies.splice(i, 1);
      }
    }
    
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      p.y += this.gameSpeed * dt;
      
      const dx = this.player.x - p.x;
      const dy = this.player.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < this.player.size + p.radius) {
        this.applyPowerUp(p);
        this.powerUps.splice(i, 1);
        continue;
      }
      
      if (p.y > this.canvasHeight + 50) {
        this.powerUps.splice(i, 1);
      }
    }

    for (let i = this.gates.length - 1; i >= 0; i--) {
      const g = this.gates[i];
      g.y += this.gameSpeed * dt;
      
      if (this.checkCollision(this.player.x - this.player.size, this.player.y - this.player.size, this.player.size * 2, this.player.size * 2,
                              g.x, g.y, g.width, g.height)) {
        this.applyGate(g);
        const hitY = g.y;
        for (let j = this.gates.length - 1; j >= 0; j--) {
          if (Math.abs(this.gates[j].y - hitY) <= 10) {
            this.gates.splice(j, 1);
            if (j < i) i--;
          }
        }
        continue;
      }
      
      if (g.y > this.canvasHeight + 50) {
        this.gates.splice(i, 1);
      }
    }
    
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      let hit = false;
      
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        
        // Bullet collision box
        const bw = b.width || 4;
        const bh = b.height || 20;
        const bx = b.x - bw / 2;
        const by = b.y - bh / 2;

        if (this.checkCollision(bx, by, bw, bh, e.x, e.y, e.width, e.height)) {
          let damageDealt = b.damage;
          let isCritical = false;
          
          // Hit sparks for every impact
          this.createHitSparks(b.x, b.y, b.type === 'laser' ? '#ef4444' : (b.type === 'spread' ? '#a855f7' : '#60a5fa'));

          // Check weak point
          if (e.weakPoint) {
            const wx = e.x + e.weakPoint.x;
            const wy = e.y + e.weakPoint.y;
            const dist = Math.sqrt(Math.pow(b.x - wx, 2) + Math.pow(b.y - wy, 2));
            if (dist < e.weakPoint.radius + Math.max(bw, bh) / 2) {
              damageDealt *= 3; // Critical hit!
              isCritical = true;
              this.createExplosion(wx, wy, '#f59e0b', 30, 2.0); // amber-500 explosion
              this.createRingEffect(wx, wy, '#f59e0b', 1.5); // extra ring effect
              this.floatingTexts.push({
                x: wx,
                y: wy - 20,
                text: 'CRIT!',
                color: '#fbbf24',
                life: 1.0,
                maxLife: 1.0
              });
              this.addScreenShake(Math.min(damageDealt * 0.5, 15), 0.3);
              this.addScreenFlash('rgba(251, 191, 36, 0.2)', 0.2);
            }
          }

          if (e.shield && e.shield > 0) {
            e.shield -= damageDealt;
            this.createHitSparks(b.x, b.y, '#60a5fa'); // Blue sparks for shield
            this.soundManager.playHit();
            if (e.shield <= 0) {
              // Shield broken
              this.createExplosion(e.x + e.width/2, e.y + e.height/2, '#60a5fa', 30, 2);
              this.floatingTexts.push({
                x: e.x + e.width/2,
                y: e.y - 20,
                text: 'SHIELD BROKEN!',
                color: '#60a5fa',
                life: 1.5,
                maxLife: 1.5
              });
            }
          } else {
            e.health -= damageDealt;
            if (!isCritical) {
               this.createHitSparks(b.x, b.y, '#fcd34d');
               this.soundManager.playHit();
            }
          }

          hit = true;
          
          if (e.health <= 0) {
            if (e.isBoss) {
              this.createExplosion(e.x + e.width/2, e.y + e.height/2, '#a855f7', 100, 3);
              this.soundManager.playBossDefeat();
              this.addScreenShake(30, 1.0);
              this.addScreenFlash('rgba(168, 85, 247, 0.4)', 0.8);
              this.isBossActive = false;
              this.nextBossScore = this.score() + 1000;
              this.floatingTexts.push({
                x: e.x + e.width/2,
                y: e.y,
                text: 'BOSS DEFEATED!',
                color: '#a855f7',
                life: 2.0,
                maxLife: 2.0
              });
              // Boss always drops a powerup
              this.spawnPowerUp(e.x + e.width/2, e.y + e.height/2);
            } else {
              this.createExplosion(e.x + e.width/2, e.y + e.height/2, '#ef4444', 20, 1);
              this.soundManager.playExplosion();
              this.addScreenShake(5, 0.15);
              // 10% chance to drop powerup
              if (Math.random() < 0.1) {
                this.spawnPowerUp(e.x + e.width/2, e.y + e.height/2);
              }
            }
            this.enemies.splice(j, 1);
            this.score.update(s => s + e.maxHealth);
          }
          
          // Laser pierces through enemies
          if (b.type !== 'laser') {
            break;
          }
        }
      }
      
      if (hit && b.type !== 'laser') {
        this.bullets.splice(i, 1);
      }
    }
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // Apply physics
      if (p.friction) {
        p.vx *= p.friction;
        p.vy *= p.friction;
      }
      if (p.gravity) {
        p.vy += p.gravity * dt;
      }
      if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
        p.rotation += p.rotationSpeed * dt;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 60 * dt;
      ft.life -= dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
    
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      if (this.score() >= this.nextBossScore && !this.isBossActive) {
        this.spawnBoss();
      } else if (!this.isBossActive) {
        this.spawnEnemies();
      }
      this.spawnTimer = Math.max(1.2, 3.0 - (this.gameSpeed / 200));
    }
    
    this.gateSpawnTimer -= dt;
    if (this.gateSpawnTimer <= 0) {
      this.spawnGates();
      this.gateSpawnTimer = Math.max(3.5, 7.0 - (this.gameSpeed / 100));
    }
  }

  shoot() {
    let damage = Math.max(1, Math.floor(this.player.squadSize / 5)) * this.player.permanentStats.damageMult;
    if (this.player.weaponLevel >= 3) damage = Math.floor(damage * 1.5);
    if (this.player.weaponLevel >= 5) damage = Math.floor(damage * 1.5);

    if (this.player.weaponType === 'laser') {
      this.bullets.push({
        x: this.player.x,
        y: this.player.y - this.player.size - 20,
        speed: 1500,
        damage: damage * 0.5, // Laser hits multiple times, so lower base damage
        type: 'laser',
        width: 8 + this.player.weaponLevel * 2,
        height: 60 + this.player.weaponLevel * 10
      });
      this.soundManager.playShoot();
    } else if (this.player.weaponType === 'homing') {
      const numBullets = 2 + this.player.permanentStats.bulletCountBonus;
      for (let i = 0; i < numBullets; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
        this.bullets.push({
          x: this.player.x,
          y: this.player.y - this.player.size,
          speed: 600,
          damage: damage * 1.2,
          vx: Math.cos(angle) * 200,
          vy: Math.sin(angle) * 200,
          type: 'homing'
        });
      }
      this.soundManager.playShoot();
    } else if (this.player.weaponType === 'spread' || this.player.powerUps.spread > 0) {
      let numBullets = 3 + Math.floor(this.player.weaponLevel / 2) + this.player.permanentStats.bulletCountBonus;
      if (this.player.powerUps.spread > 0) numBullets += 2;
      
      const spreadAngle = 0.5 + (this.player.weaponLevel * 0.05);
      for (let i = 0; i < numBullets; i++) {
        const angle = -Math.PI / 2 - spreadAngle / 2 + (spreadAngle / (numBullets - 1)) * i;
        const speed = 800;
        this.bullets.push({
          x: this.player.x,
          y: this.player.y - this.player.size - 10,
          speed: Math.abs(Math.sin(angle) * speed),
          damage: damage,
          vx: Math.cos(angle) * speed,
          type: 'spread'
        });
      }
      this.soundManager.playShoot();
    } else {
      // Basic / Rapid
      let numBullets = Math.min(10, 1 + Math.floor(this.player.squadSize / 15) + this.player.permanentStats.bulletCountBonus);
      if (this.player.weaponLevel >= 2) numBullets += 1;
      if (this.player.weaponLevel >= 4) numBullets += 1;

      const spread = 12;
      const startX = this.player.x - ((numBullets - 1) * spread) / 2;
      
      for (let i = 0; i < numBullets; i++) {
        this.bullets.push({
          x: startX + i * spread,
          y: this.player.y - this.player.size - 10,
          speed: 800,
          damage: damage,
          vx: 0,
          type: this.player.weaponType === 'rapid' || this.player.powerUps.rapid > 0 ? 'rapid' : 'basic'
        });
      }
      this.soundManager.playShoot();
    }
    
    const muzzleColor = this.player.weaponType === 'laser' ? '#ef4444' : (this.player.weaponType === 'spread' ? '#a855f7' : '#60a5fa');
    this.createMuzzleFlash(this.player.x, this.player.y - this.player.size - 10, muzzleColor);
  }

  findNearestEnemy(x: number, y: number): Enemy | undefined {
    let nearest: Enemy | undefined;
    let minDist = Infinity;
    
    for (const e of this.enemies) {
      if (e.health <= 0) continue;
      const dx = e.x + e.width / 2 - x;
      const dy = e.y + e.height / 2 - y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearest = e;
      }
    }
    return nearest;
  }

  spawnBoss() {
    this.isBossActive = true;
    this.soundManager.playBossSpawn();
    this.addScreenShake(20, 1.0);
    
    const w = 180;
    const hp = 500 + this.score() * 2;
    
    this.enemies.push({
      id: this.enemyIdCounter++,
      x: (this.canvasWidth - w) / 2,
      y: -w,
      width: w,
      height: w,
      health: hp,
      maxHealth: hp,
      speed: 0,
      isBoss: true,
      vx: 150,
      fireCooldown: 1.0,
      shield: hp * 0.5,
      maxShield: hp * 0.5,
      weakPoint: { x: w / 2, y: w * 0.8, radius: 20 }
    });
    
    this.floatingTexts.push({
      x: this.canvasWidth / 2,
      y: this.canvasHeight / 2,
      text: 'WARNING: BOSS APPROACHING!',
      color: '#ef4444',
      life: 3.0,
      maxLife: 3.0
    });
  }

  spawnEnemies() {
    this.soundManager.playEnemySpawn();
    const rand = Math.random();
    const baseHealth = Math.floor(5 + this.score() / 15 + this.gameSpeed / 25);
    
    if (rand < 0.25) {
      const num = 4;
      const w = this.canvasWidth / num;
      const weakIndex = Math.floor(Math.random() * num);
      
      for (let i = 0; i < num; i++) {
        const isWeak = i === weakIndex;
        const hp = isWeak ? Math.max(1, Math.floor(baseHealth / 2)) : baseHealth * 3;
        
        this.enemies.push({
          id: this.enemyIdCounter++,
          x: i * w + 4,
          y: -80,
          width: w - 8,
          height: w - 8,
          health: hp,
          maxHealth: hp,
          speed: 0,
          enemyType: 'basic',
          shield: isWeak ? 0 : baseHealth,
          maxShield: isWeak ? 0 : baseHealth
        });
      }
    } else if (rand < 0.35) {
      const w = 120;
      this.enemies.push({
        id: this.enemyIdCounter++,
        x: Math.random() * (this.canvasWidth - w),
        y: -120,
        width: w,
        height: w,
        health: baseHealth * 8,
        maxHealth: baseHealth * 8,
        speed: 0,
        enemyType: 'basic',
        weakPoint: { x: w / 2, y: w / 2, radius: 15 }
      });
    } else if (rand < 0.45) {
      const w = 50;
      const startX = 50 + Math.random() * (this.canvasWidth - 100 - w);
      this.enemies.push({
        id: this.enemyIdCounter++,
        x: startX,
        y: -60,
        width: w,
        height: w,
        health: baseHealth * 2,
        maxHealth: baseHealth * 2,
        speed: 0,
        enemyType: 'zigzag',
        startX: startX,
        time: 0
      });
    } else if (rand < 0.55) {
      const w = 60;
      this.enemies.push({
        id: this.enemyIdCounter++,
        x: Math.random() * (this.canvasWidth - w),
        y: -60,
        width: w,
        height: w,
        health: baseHealth * 3,
        maxHealth: baseHealth * 3,
        speed: 0,
        enemyType: 'shooter',
        fireCooldown: 1.0
      });
    } else if (rand < 0.65) {
      const w = 40;
      this.enemies.push({
        id: this.enemyIdCounter++,
        x: Math.random() * (this.canvasWidth - w),
        y: -50,
        width: w,
        height: w,
        health: baseHealth,
        maxHealth: baseHealth,
        speed: 0,
        enemyType: 'chaser'
      });
    } else if (rand < 0.75) {
      const w = 70;
      this.enemies.push({
        id: this.enemyIdCounter++,
        x: Math.random() * (this.canvasWidth - w),
        y: -70,
        width: w,
        height: w,
        health: baseHealth * 4,
        maxHealth: baseHealth * 4,
        speed: 0,
        enemyType: 'spreadShooter',
        fireCooldown: 1.5
      });
    } else if (rand < 0.80) {
      const w = 30;
      this.enemies.push({
        id: this.enemyIdCounter++,
        x: Math.random() * (this.canvasWidth - w),
        y: -40,
        width: w,
        height: w,
        health: Math.max(1, Math.floor(baseHealth / 2)),
        maxHealth: Math.max(1, Math.floor(baseHealth / 2)),
        speed: 0,
        enemyType: 'fastMelee'
      });
    } else if (rand < 0.85) {
      const w = 80;
      this.enemies.push({
        id: this.enemyIdCounter++,
        x: Math.random() * (this.canvasWidth - w),
        y: -80,
        width: w,
        height: w,
        health: baseHealth * 5,
        maxHealth: baseHealth * 5,
        speed: 0,
        enemyType: 'deployer',
        fireCooldown: 2.0
      });
    } else if (rand < 0.93) {
      const w = 60;
      this.enemies.push({
        id: this.enemyIdCounter++,
        x: Math.random() * (this.canvasWidth - w),
        y: -60,
        width: w,
        height: w,
        health: baseHealth * 2,
        maxHealth: baseHealth * 2,
        speed: 0,
        enemyType: 'shielded',
        shield: baseHealth * 6,
        maxShield: baseHealth * 6
      });
    } else {
      const w = 50;
      this.enemies.push({
        id: this.enemyIdCounter++,
        x: Math.random() * (this.canvasWidth - w),
        y: -50,
        width: w,
        height: w,
        health: baseHealth * 3,
        maxHealth: baseHealth * 3,
        speed: 0,
        enemyType: 'charger',
        time: 0 // use time to track state (0 = moving down, 1 = charging)
      });
    }
  }

  spawnGates() {
    const w = this.canvasWidth / 2;
    const h = 80;
    
    const types: ('add' | 'sub' | 'mul' | 'div')[] = ['add', 'sub', 'mul', 'div'];
    
    const type1 = types[Math.floor(Math.random() * 2)];
    let val1 = 0;
    if (type1 === 'add') val1 = 10 + Math.floor(Math.random() * 40);
    if (type1 === 'sub') val1 = 5 + Math.floor(Math.random() * 20);
    
    const type2 = types[Math.floor(Math.random() * 4)];
    let val2 = 0;
    if (type2 === 'add') val2 = 10 + Math.floor(Math.random() * 40);
    if (type2 === 'sub') val2 = 5 + Math.floor(Math.random() * 20);
    if (type2 === 'mul') val2 = 2 + Math.floor(Math.random() * 2);
    if (type2 === 'div') val2 = 2;
    
    if (type1 === 'sub' && (type2 === 'sub' || type2 === 'div')) {
        this.gates.push({
          id: this.gateIdCounter++,
          x: 0,
          y: -h,
          width: w,
          height: h,
          type: 'add',
          value: 20 + Math.floor(Math.random() * 30)
        });
    } else {
        this.gates.push({
          id: this.gateIdCounter++,
          x: 0,
          y: -h,
          width: w,
          height: h,
          type: type1,
          value: val1
        });
    }
    
    this.gates.push({
      id: this.gateIdCounter++,
      x: w,
      y: -h,
      width: w,
      height: h,
      type: type2,
      value: val2
    });
  }

  spawnPowerUp(x: number, y: number) {
    const types: ('shield' | 'rapid' | 'spread' | 'weapon_spread' | 'weapon_laser' | 'weapon_rapid')[] = [
      'shield', 'rapid', 'spread', 'weapon_spread', 'weapon_laser', 'weapon_rapid'
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    this.powerUps.push({
      id: this.gateIdCounter++, // Reuse id counter
      x,
      y,
      radius: 15,
      type
    });
  }

  applyPowerUp(p: PowerUp) {
    this.soundManager.playPowerup();
    let text = '';
    let color = '#ffffff';
    
    let flashColor = 'rgba(255, 255, 255, 0.3)';
    
    if (p.type === 'shield') {
      this.player.powerUps.shield = 5.0; // 5 seconds
      text = 'SHIELD ACTIVE';
      color = '#3b82f6';
      flashColor = 'rgba(59, 130, 246, 0.3)';
    } else if (p.type === 'rapid') {
      this.player.powerUps.rapid = 5.0;
      text = 'RAPID FIRE';
      color = '#ef4444';
      flashColor = 'rgba(239, 68, 68, 0.3)';
    } else if (p.type === 'spread') {
      this.player.powerUps.spread = 5.0;
      text = 'SPREAD SHOT';
      color = '#a855f7';
      flashColor = 'rgba(168, 85, 247, 0.3)';
    } else if (p.type === 'weapon_spread') {
      this.player.weaponType = 'spread';
      text = 'WEAPON: SPREAD';
      color = '#f59e0b';
      flashColor = 'rgba(245, 158, 11, 0.3)';
    } else if (p.type === 'weapon_laser') {
      this.player.weaponType = 'laser';
      text = 'WEAPON: LASER';
      color = '#ef4444';
      flashColor = 'rgba(239, 68, 68, 0.3)';
    } else if (p.type === 'weapon_rapid') {
      this.player.weaponType = 'rapid';
      text = 'WEAPON: RAPID';
      color = '#10b981';
      flashColor = 'rgba(16, 185, 129, 0.3)';
    }
    
    this.createPowerUpCollectionEffect(this.player.x, this.player.y, color);
    this.addScreenFlash(flashColor, 0.3);
    
    this.floatingTexts.push({
      x: this.player.x,
      y: this.player.y - 40,
      text: text,
      color: color,
      life: 1.5,
      maxLife: 1.5
    });
  }

  applyGate(g: Gate) {
    const oldSize = this.player.squadSize;
    
    if (g.type === 'add') this.player.squadSize += g.value;
    if (g.type === 'sub') this.player.squadSize -= g.value;
    if (g.type === 'mul') this.player.squadSize *= g.value;
    if (g.type === 'div') this.player.squadSize = Math.floor(this.player.squadSize / g.value);
    
    const diff = this.player.squadSize - oldSize;
    const color = diff > 0 ? '#4ade80' : '#f87171';
    const sign = diff > 0 ? '+' : '';
    
    if (diff > 0) {
      this.soundManager.playPowerup();
      this.createExplosion(this.player.x, this.player.y, '#4ade80', 40, 1.5);
      this.createRingEffect(this.player.x, this.player.y, '#4ade80');
      this.addScreenShake(15, 0.4);
      this.addScreenFlash('rgba(74, 222, 128, 0.3)', 0.3);
    } else if (diff < 0) {
      this.soundManager.playPowerdown();
      this.createExplosion(this.player.x, this.player.y, '#f87171', 40, 1.5);
      this.createRingEffect(this.player.x, this.player.y, '#f87171');
      this.addScreenShake(20, 0.5);
      this.addScreenFlash('rgba(248, 113, 113, 0.4)', 0.4);
    }
    
    this.floatingTexts.push({
      x: this.player.x,
      y: this.player.y - 40,
      text: `${sign}${diff}`,
      color: color,
      life: 1.2,
      maxLife: 1.2
    });
    
    if (this.player.squadSize <= 0) {
      this.gameOver();
    }
  }

  addScreenShake(magnitude: number, time: number) {
    this.screenShakeMagnitude = magnitude;
    this.screenShakeTime = time;
  }

  addScreenFlash(color: string, time: number) {
    this.screenFlashColor = color;
    this.screenFlashTime = time;
  }

  createExplosion(x: number, y: number, color: string, count = 20, speedMult = 1) {
    // Shockwave
    this.particles.push({
      x, y, vx: 0, vy: 0,
      life: 0.5, maxLife: 0.5,
      color, size: 15,
      type: 'shockwave'
    });

    // Secondary Shockwave (delayed feel)
    setTimeout(() => {
      this.particles.push({
        x, y, vx: 0, vy: 0,
        life: 0.4, maxLife: 0.4,
        color: '#ffffff', size: 5,
        type: 'shockwave'
      });
    }, 50);

    // Big Flash
    this.particles.push({
      x, y, vx: 0, vy: 0,
      life: 0.15, maxLife: 0.15,
      color: '#ffffff', size: 40 * speedMult,
      type: 'flash',
      glow: true
    });

    // Sparks
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (150 + Math.random() * 400) * speedMult;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.6,
        maxLife: 1.0,
        color,
        size: 2 + Math.random() * 5,
        type: 'spark',
        friction: 0.95,
        glow: true
      });
    }

    // Lines (streaks)
    for (let i = 0; i < count / 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (300 + Math.random() * 500) * speedMult;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.2 + Math.random() * 0.3,
        maxLife: 0.5,
        color: '#ffffff',
        size: 2,
        type: 'line',
        length: 20 + Math.random() * 40,
        friction: 0.9
      });
    }

    // Debris
    for (let i = 0; i < count / 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (80 + Math.random() * 200) * speedMult;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0 + Math.random() * 1.5,
        maxLife: 2.5,
        color: '#475569', // Slate debris
        size: 5 + Math.random() * 8,
        type: 'debris',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 15,
        friction: 0.97,
        gravity: 300
      });
    }

    // Smoke
    for (let i = 0; i < count / 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (30 + Math.random() * 100) * speedMult;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 1.2,
        maxLife: 2.0,
        color: i % 2 === 0 ? '#334155' : '#1e293b', 
        size: 15 + Math.random() * 25,
        type: 'smoke',
        friction: 0.94
      });
    }
  }

  createRingEffect(x: number, y: number, color: string, speedMult = 1) {
    const count = 36;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 250 * speedMult;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6,
        maxLife: 0.6,
        color,
        size: 4 * speedMult,
        type: 'spark',
        glow: true,
        friction: 0.98
      });
    }
    
    // Add a shockwave ring
    this.particles.push({
      x, y, vx: 0, vy: 0,
      life: 0.5, maxLife: 0.5,
      color, size: 20,
      type: 'shockwave'
    });
  }

  createMuzzleFlash(x: number, y: number, color: string) {
    this.particles.push({
      x, y, vx: 0, vy: 0,
      life: 0.05, maxLife: 0.05,
      color: '#ffffff', size: 15,
      type: 'flash',
      glow: true
    });

    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      const speed = 200 + Math.random() * 300;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.1 + Math.random() * 0.1,
        maxLife: 0.2,
        color,
        size: 1 + Math.random() * 2,
        type: 'spark',
        glow: true
      });
    }
  }

  createHitSparks(x: number, y: number, color: string) {
    // Directional sparks (upwards mostly)
    for (let i = 0; i < 15; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const speed = 150 + Math.random() * 350;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.15 + Math.random() * 0.25,
        maxLife: 0.4,
        color,
        size: 1.5 + Math.random() * 3.5,
        type: 'spark',
        friction: 0.88,
        glow: true
      });
    }

    // Small flash at impact
    this.particles.push({
      x, y, vx: 0, vy: 0,
      life: 0.1, maxLife: 0.1,
      color: '#ffffff', size: 10,
      type: 'flash',
      glow: true
    });
  }

  createPowerUpCollectionEffect(x: number, y: number, color: string) {
    // Imploding ring
    const count = 24;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 60;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      
      this.particles.push({
        x: px, y: py,
        vx: -Math.cos(angle) * 300,
        vy: -Math.sin(angle) * 300,
        life: 0.4,
        maxLife: 0.4,
        color,
        size: 4,
        type: 'spark',
        glow: true,
        friction: 0.95
      });
    }

    // Rising sparks
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 100,
        vy: -200 - Math.random() * 200,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.3,
        color,
        size: 2 + Math.random() * 4,
        type: 'spark',
        friction: 0.98,
        glow: true
      });
    }

    // Expanding shockwave
    this.particles.push({
      x, y, vx: 0, vy: 0,
      life: 0.6, maxLife: 0.6,
      color, size: 20,
      type: 'shockwave'
    });
  }

  draw() {
    this.ctx.fillStyle = '#020617'; // slate-950 (deeper space)
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    this.ctx.save();
    if (this.screenShakeTime > 0) {
      const dx = (Math.random() - 0.5) * this.screenShakeMagnitude;
      const dy = (Math.random() - 0.5) * this.screenShakeMagnitude;
      this.ctx.translate(dx, dy);
    }
    
    // Draw Stars
    this.ctx.fillStyle = '#ffffff';
    for (const star of this.stars) {
      const opacity = 0.3 + Math.random() * 0.7;
      this.ctx.globalAlpha = opacity;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;
    
    // Draw PowerUps
    for (const p of this.powerUps) {
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      
      let color = '#ffffff';
      let icon = '';
      if (p.type === 'shield') {
        color = '#3b82f6';
        icon = 'S';
      } else if (p.type === 'rapid') {
        color = '#ef4444';
        icon = 'R';
      } else if (p.type === 'spread') {
        color = '#a855f7';
        icon = 'M';
      } else if (p.type === 'weapon_spread') {
        color = '#f59e0b';
        icon = 'W:S';
      } else if (p.type === 'weapon_laser') {
        color = '#ef4444';
        icon = 'W:L';
      } else if (p.type === 'weapon_rapid') {
        color = '#10b981';
        icon = 'W:R';
      }

      // Pulsing glow
      const pulse = 1 + Math.sin(performance.now() / 200) * 0.2;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 15 * pulse;
      
      // Outer aura
      this.ctx.globalAlpha = 0.3;
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, p.radius * 1.5 * pulse, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;
      
      this.ctx.beginPath();
      this.ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#0f172a';
      this.ctx.fill();
      
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
      
      this.ctx.fillStyle = color;
      this.ctx.font = 'bold 12px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(icon, 0, 0);
      
      this.ctx.restore();
    }

    // Draw Gates
    for (const g of this.gates) {
      const isPositive = g.type === 'add' || g.type === 'mul';
      const baseColor = isPositive ? '59, 130, 246' : '239, 68, 68'; // blue-500 or red-500
      
      // Gradient background
      const grad = this.ctx.createLinearGradient(g.x, g.y, g.x, g.y + g.height);
      grad.addColorStop(0, `rgba(${baseColor}, 0.1)`);
      grad.addColorStop(0.5, `rgba(${baseColor}, 0.4)`);
      grad.addColorStop(1, `rgba(${baseColor}, 0.1)`);
      
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(g.x, g.y, g.width, g.height);
      
      // Glowing animated borders (top and bottom)
      const scanlineY = g.y + ((performance.now() / 15) % g.height);
      this.ctx.fillStyle = `rgba(${baseColor}, 0.8)`;
      this.ctx.fillRect(g.x, scanlineY, g.width, 3);
      
      this.ctx.shadowColor = `rgba(${baseColor}, 0.8)`;
      this.ctx.shadowBlur = 15;
      
      this.ctx.strokeStyle = `rgba(${baseColor}, 0.8)`;
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.moveTo(g.x, g.y);
      this.ctx.lineTo(g.x + g.width, g.y);
      this.ctx.moveTo(g.x, g.y + g.height);
      this.ctx.lineTo(g.x + g.width, g.y + g.height);
      this.ctx.stroke();
      
      this.ctx.shadowBlur = 0;
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '900 36px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.shadowColor = `rgba(${baseColor}, 0.8)`;
      this.ctx.shadowBlur = 10;
      
      let text = '';
      if (g.type === 'add') text = `+${g.value}`;
      if (g.type === 'sub') text = `-${g.value}`;
      if (g.type === 'mul') text = `x${g.value}`;
      if (g.type === 'div') text = `÷${g.value}`;
      
      this.ctx.fillText(text, g.x + g.width / 2, g.y + g.height / 2);
      this.ctx.shadowBlur = 0;
    }
    
    // Draw Bullets
    for (const b of this.bullets) {
      this.ctx.save();
      if (b.type === 'laser') {
        this.ctx.shadowColor = '#ef4444';
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = '#fca5a5';
        this.ctx.fillRect(b.x - (b.width || 4) / 2, b.y - (b.height || 20) / 2, b.width || 4, b.height || 20);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(b.x - (b.width || 4) / 4, b.y - (b.height || 20) / 2, (b.width || 4) / 2, b.height || 20);
      } else if (b.type === 'spread') {
        this.ctx.shadowColor = '#a855f7';
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = '#d8b4fe';
        this.ctx.beginPath();
        this.ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (b.type === 'rapid') {
        this.ctx.shadowColor = '#10b981';
        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = '#6ee7b7';
        this.ctx.beginPath();
        this.ctx.roundRect(b.x - 2, b.y - 10, 4, 20, 2);
        this.ctx.fill();
      } else if (b.type === 'homing') {
        this.ctx.shadowColor = '#fbbf24';
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.moveTo(b.x, b.y - 8);
        this.ctx.lineTo(b.x + 4, b.y + 4);
        this.ctx.lineTo(b.x - 4, b.y + 4);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.beginPath();
        this.ctx.arc(b.x, b.y + 6, 3, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.shadowColor = '#60a5fa'; // blue-400
        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = '#bfdbfe'; // blue-200
        this.ctx.beginPath();
        this.ctx.roundRect(b.x - 2, b.y - 10, 4, 20, 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }
    this.ctx.shadowBlur = 0;
    
    this.ctx.shadowColor = '#ef4444';
    this.ctx.shadowBlur = 15;
    for (const b of this.enemyBullets) {
      const pulse = 1 + Math.sin(performance.now() / 100) * 0.2;
      
      this.ctx.fillStyle = '#fca5a5'; // red-300
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, 6 * pulse, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.fillStyle = '#ef4444'; // red-500
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, 3 * pulse, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.shadowBlur = 0;
    
    // Draw Enemies
    for (const e of this.enemies) {
      let fillColor = '#ef4444'; // red-500
      let darkColor = '#991b1b'; // red-800
      let isAsteroid = false;

      if (e.isBoss) {
        fillColor = '#9333ea'; // purple-600
        darkColor = '#581c87'; // purple-900
      } else if (e.enemyType === 'zigzag') {
        fillColor = '#f97316'; // orange-500
        darkColor = '#9a3412'; // orange-800
      } else if (e.enemyType === 'shooter') {
        fillColor = '#ec4899'; // pink-500
        darkColor = '#831843'; // pink-900
      } else if (e.enemyType === 'chaser') {
        fillColor = '#06b6d4'; // cyan-500
        darkColor = '#164e63'; // cyan-900
      } else if (e.enemyType === 'spreadShooter') {
        fillColor = '#8b5cf6'; // violet-500
        darkColor = '#4c1d95'; // violet-900
      } else if (e.enemyType === 'fastMelee') {
        fillColor = '#eab308'; // yellow-500
        darkColor = '#713f12'; // yellow-900
      } else if (e.enemyType === 'deployer') {
        fillColor = '#10b981'; // emerald-500
        darkColor = '#064e3b'; // emerald-900
      } else if (e.enemyType === 'shielded') {
        fillColor = '#3b82f6'; // blue-500
        darkColor = '#1e3a8a'; // blue-900
      } else if (e.enemyType === 'charger') {
        fillColor = '#f43f5e'; // rose-500
        darkColor = '#881337'; // rose-900
      } else if (e.enemyType === 'basic') {
        isAsteroid = true;
        fillColor = '#475569'; // slate-600
        darkColor = '#1e293b'; // slate-800
      }

      // Enemy Body
      this.ctx.save();
      this.ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
      
      if (e.isBoss) {
        const healthRatio = e.health / e.maxHealth;
        if (healthRatio < 0.3) {
          // Shrink and shiver effect when low health
          const scale = 0.6 + healthRatio * 1.33; // Shrinks to 0.6
          const shiver = (Math.random() - 0.5) * 5;
          this.ctx.scale(scale, scale);
          this.ctx.translate(shiver, shiver);
          
          // Red tint effect
          this.ctx.shadowColor = '#ef4444';
          this.ctx.shadowBlur = 30;
        }
      }
      
      this.ctx.fillStyle = fillColor;
      this.ctx.strokeStyle = darkColor;
      this.ctx.lineWidth = 3;
      
      const w = e.width / 2;
      const h = e.height / 2;
      
      this.ctx.beginPath();
      if (e.isBoss) {
        // Space Station / Mothership
        this.ctx.arc(0, 0, w, 0, Math.PI * 2);
        this.ctx.moveTo(-w * 1.5, -h * 0.2);
        this.ctx.lineTo(w * 1.5, -h * 0.2);
        this.ctx.lineTo(w * 1.5, h * 0.2);
        this.ctx.lineTo(-w * 1.5, h * 0.2);
        this.ctx.closePath();
      } else if (isAsteroid) {
        // Jagged Asteroid
        const points = 8;
        for (let i = 0; i < points; i++) {
          const angle = (i * Math.PI * 2) / points;
          const r = w * (0.8 + Math.sin(i * 1.5 + e.id) * 0.2);
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
      } else if (e.enemyType === 'zigzag') {
        // Alien Scout
        this.ctx.moveTo(0, -h);
        this.ctx.lineTo(w, h * 0.5);
        this.ctx.lineTo(0, h);
        this.ctx.lineTo(-w, h * 0.5);
        this.ctx.closePath();
      } else if (e.enemyType === 'shooter') {
        // Turret / Drone
        this.ctx.rect(-w, -h, w * 2, h * 0.5);
        this.ctx.rect(-w * 0.5, -h, w, h * 2);
      } else if (e.enemyType === 'chaser') {
        // Small Fighter
        this.ctx.moveTo(0, -h);
        this.ctx.lineTo(w, h);
        this.ctx.lineTo(0, h * 0.6);
        this.ctx.lineTo(-w, h);
        this.ctx.closePath();
      } else if (e.enemyType === 'spreadShooter') {
        // Heavy Bomber
        this.ctx.moveTo(-w, -h);
        this.ctx.lineTo(w, -h);
        this.ctx.lineTo(w * 0.5, h);
        this.ctx.lineTo(-w * 0.5, h);
        this.ctx.closePath();
      } else if (e.enemyType === 'fastMelee') {
        // Blade Ship
        this.ctx.moveTo(0, -h);
        this.ctx.lineTo(w, h);
        this.ctx.lineTo(-w, h);
        this.ctx.closePath();
      } else if (e.enemyType === 'deployer') {
        // Carrier
        this.ctx.moveTo(-w, -h * 0.5);
        this.ctx.lineTo(w, -h * 0.5);
        this.ctx.lineTo(w * 0.8, h);
        this.ctx.lineTo(0, h * 0.5); // bay opening
        this.ctx.lineTo(-w * 0.8, h);
        this.ctx.closePath();
      } else if (e.enemyType === 'shielded') {
        // Turtle Ship
        this.ctx.arc(0, 0, w, Math.PI, 0);
        this.ctx.lineTo(w * 0.5, h);
        this.ctx.lineTo(-w * 0.5, h);
        this.ctx.closePath();
      } else if (e.enemyType === 'charger') {
        // Spike Ship
        this.ctx.moveTo(0, h);
        this.ctx.lineTo(w * 0.5, -h);
        this.ctx.lineTo(-w * 0.5, -h);
        this.ctx.closePath();
      }
      
      this.ctx.shadowColor = fillColor;
      this.ctx.shadowBlur = e.isBoss ? 20 : 10;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
      this.ctx.stroke();
      
      // Glowing Core
      this.ctx.fillStyle = '#ffffff';
      this.ctx.globalAlpha = 0.7 + Math.sin(performance.now() / 150) * 0.3;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, e.isBoss ? w * 0.4 : w * 0.3, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;

      // Draw Weak Point
      if (e.weakPoint) {
        const distToPlayer = Math.sqrt(Math.pow((e.x + e.weakPoint.x) - this.player.x, 2) + Math.pow((e.y + e.weakPoint.y) - this.player.y, 2));
        const isVulnerable = distToPlayer < 300; // Player is close enough
        
        this.ctx.fillStyle = isVulnerable ? '#ef4444' : '#fbbf24'; // red-500 if vulnerable, else amber-400
        this.ctx.shadowColor = isVulnerable ? '#ef4444' : '#fbbf24';
        this.ctx.shadowBlur = isVulnerable ? 20 + Math.sin(performance.now() / 50) * 10 : 10;
        
        this.ctx.beginPath();
        this.ctx.arc(e.weakPoint.x - w, e.weakPoint.y - h, e.weakPoint.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        
        // Pulsing inner core for weak point
        this.ctx.fillStyle = '#ffffff';
        this.ctx.globalAlpha = 0.5 + Math.sin(performance.now() / (isVulnerable ? 50 : 100)) * 0.5;
        this.ctx.beginPath();
        this.ctx.arc(e.weakPoint.x - w, e.weakPoint.y - h, e.weakPoint.radius * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1.0;
        
        // Target icon if vulnerable
        if (isVulnerable) {
          this.ctx.strokeStyle = '#ef4444';
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.moveTo(e.weakPoint.x - w - e.weakPoint.radius - 5, e.weakPoint.y - h);
          this.ctx.lineTo(e.weakPoint.x - w - e.weakPoint.radius - 15, e.weakPoint.y - h);
          this.ctx.moveTo(e.weakPoint.x - w + e.weakPoint.radius + 5, e.weakPoint.y - h);
          this.ctx.lineTo(e.weakPoint.x - w + e.weakPoint.radius + 15, e.weakPoint.y - h);
          this.ctx.moveTo(e.weakPoint.x - w, e.weakPoint.y - h - e.weakPoint.radius - 5);
          this.ctx.lineTo(e.weakPoint.x - w, e.weakPoint.y - h - e.weakPoint.radius - 15);
          this.ctx.moveTo(e.weakPoint.x - w, e.weakPoint.y - h + e.weakPoint.radius + 5);
          this.ctx.lineTo(e.weakPoint.x - w, e.weakPoint.y - h + e.weakPoint.radius + 15);
          this.ctx.stroke();
        }
      }

      // Draw Shield
      if (e.shield && e.shield > 0 && e.maxShield) {
        const shieldRatio = e.shield / e.maxShield;
        this.ctx.strokeStyle = '#60a5fa'; // blue-400
        this.ctx.lineWidth = 2 + shieldRatio * 3;
        this.ctx.shadowColor = '#60a5fa';
        this.ctx.shadowBlur = 10 + shieldRatio * 10;
        this.ctx.globalAlpha = 0.3 + shieldRatio * 0.5;
        
        // Shimmering effect
        const shimmer = Math.sin(performance.now() / 100 + e.id) * 0.1;
        const shieldRadius = Math.max(w, h) + 10 + shimmer * 10;
        
        this.ctx.beginPath();
        this.ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Inner fill for energy barrier look
        this.ctx.fillStyle = '#60a5fa';
        this.ctx.globalAlpha = 0.1 + shieldRatio * 0.2;
        this.ctx.fill();
        
        this.ctx.globalAlpha = 1.0;
        this.ctx.shadowBlur = 0;
      }
      
      this.ctx.restore();
      
      // Health Bar
      const barWidth = e.width + 10;
      const barHeight = 10;
      const barX = e.x - 5;
      const barY = e.y - 20;

      // Border
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
      
      // Background (Missing health)
      this.ctx.fillStyle = '#991b1b'; // red-800
      this.ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // Foreground (Current health)
      this.ctx.fillStyle = e.isBoss ? '#c084fc' : '#4ade80';
      this.ctx.fillRect(barX, barY, barWidth * Math.max(0, e.health / e.maxHealth), barHeight);
      
      // Health Text
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 18px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(Math.ceil(e.health).toString(), e.x + e.width / 2, e.y + e.height / 2);
    }
    
    // Draw Player Squad
    const drawSpaceship = (x: number, y: number, radius: number, isMain = false) => {
      this.ctx.save();
      this.ctx.translate(x, y);
      
      const wl = this.player.weaponLevel;
      const bodyColor = wl >= 5 ? '#831843' : (wl >= 3 ? '#4c1d95' : '#334155');
      const wingColor = wl >= 5 ? '#be185d' : (wl >= 3 ? '#6d28d9' : '#475569');
      const engineColor = wl >= 5 ? '#ec4899' : (wl >= 3 ? '#a855f7' : '#3b82f6');
      const cockpitColor = '#0ea5e9'; // sky-500

      if (isMain) {
        this.ctx.shadowColor = engineColor;
        this.ctx.shadowBlur = 10 + wl * 2;
      }

      // Rapid Fire After-image (Main Player)
      if (isMain && this.player.powerUps.rapid > 0) {
        this.ctx.save();
        this.ctx.globalAlpha = 0.2;
        const offset = Math.sin(performance.now() / 20) * 5;
        this.ctx.translate(0, 12 + offset);
        this.ctx.fillStyle = engineColor;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -radius * 1.5);
        this.ctx.lineTo(radius, radius);
        this.ctx.lineTo(-radius, radius);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
      }

      // Engine Glow
      const enginePulse = 1 + Math.sin(performance.now() / 50) * 0.2;
      this.ctx.fillStyle = engineColor;
      this.ctx.shadowColor = engineColor;
      this.ctx.shadowBlur = 10 * enginePulse;
      this.ctx.beginPath();
      this.ctx.ellipse(0, radius * 0.8, radius * 0.4 * enginePulse, radius * 0.7 * enginePulse, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      // Wings
      this.ctx.fillStyle = wingColor;
      this.ctx.beginPath();
      this.ctx.moveTo(-radius * 1.5, radius * 0.5);
      this.ctx.lineTo(0, -radius * 0.5);
      this.ctx.lineTo(radius * 1.5, radius * 0.5);
      this.ctx.lineTo(0, radius * 0.2);
      this.ctx.closePath();
      this.ctx.fill();

      // Secondary Wings (Level 4+)
      if (wl >= 4) {
        this.ctx.beginPath();
        this.ctx.moveTo(-radius * 2.2, radius * 0.8);
        this.ctx.lineTo(-radius * 1.2, radius * 0.2);
        this.ctx.lineTo(-radius * 0.8, radius * 0.8);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.moveTo(radius * 2.2, radius * 0.8);
        this.ctx.lineTo(radius * 1.2, radius * 0.2);
        this.ctx.lineTo(radius * 0.8, radius * 0.8);
        this.ctx.closePath();
        this.ctx.fill();
      }

      // Active PowerUps Auras
      if (this.player.powerUps.shield > 0) {
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.5 + Math.sin(performance.now() / 100) * 0.3;
        this.ctx.shadowColor = '#3b82f6';
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius * 2.5, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;
        this.ctx.shadowBlur = 0;
      }
      if (this.player.powerUps.rapid > 0) {
        this.ctx.fillStyle = '#ef4444';
        this.ctx.globalAlpha = 0.3 + Math.sin(performance.now() / 50) * 0.2;
        this.ctx.beginPath();
        this.ctx.ellipse(0, radius, radius * 1.5, radius * 0.5, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1.0;
      }
      if (this.player.powerUps.spread > 0) {
        this.ctx.strokeStyle = '#a855f7';
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.5;
        this.ctx.beginPath();
        this.ctx.arc(-radius * 2, 0, radius * 0.5, 0, Math.PI * 2);
        this.ctx.arc(radius * 2, 0, radius * 0.5, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;
      }

      // Main Body
      this.ctx.fillStyle = bodyColor;
      this.ctx.beginPath();
      this.ctx.moveTo(0, -radius * 1.8);
      this.ctx.lineTo(radius * 0.6, radius * 0.8);
      this.ctx.lineTo(-radius * 0.6, radius * 0.8);
      this.ctx.closePath();
      this.ctx.fill();

      // Cockpit
      this.ctx.fillStyle = cockpitColor;
      this.ctx.beginPath();
      this.ctx.ellipse(0, -radius * 0.4, radius * 0.3, radius * 0.5, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Visual indicator of weapon level
      if (wl >= 2) {
        this.ctx.fillStyle = engineColor;
        this.ctx.beginPath();
        this.ctx.arc(-radius * 0.8, radius * 0.2, radius * 0.2, 0, Math.PI * 2);
        this.ctx.arc(radius * 0.8, radius * 0.2, radius * 0.2, 0, Math.PI * 2);
        this.ctx.fill();
      }
      if (wl >= 4) {
        this.ctx.strokeStyle = engineColor;
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.4 + Math.sin(performance.now() / 200) * 0.2;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius * 1.4, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;
      }
      if (wl >= 6) {
        const corePulse = 0.8 + Math.sin(performance.now() / 100) * 0.2;
        const grad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.5);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(1, engineColor);
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius * 0.4 * corePulse, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Weapons
      this.ctx.fillStyle = '#94a3b8';
      if (this.player.weaponType === 'laser') {
        this.ctx.fillStyle = '#ef4444';
        this.ctx.fillRect(-radius * 0.1, -radius * 2.2, radius * 0.2, radius * 0.6);
      } else if (this.player.weaponType === 'homing') {
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.fillRect(-radius * 0.4, -radius * 1.8, radius * 0.3, radius * 0.8);
        this.ctx.fillRect(radius * 0.1, -radius * 1.8, radius * 0.3, radius * 0.8);
      } else if (this.player.weaponType === 'spread') {
        this.ctx.fillRect(-radius * 1.2, -radius * 0.2, radius * 0.2, radius * 0.6);
        this.ctx.fillRect(radius * 1.0, -radius * 0.2, radius * 0.2, radius * 0.6);
      } else {
        this.ctx.fillRect(-radius * 0.4, -radius * 1.2, radius * 0.2, radius * 0.6);
        this.ctx.fillRect(radius * 0.2, -radius * 1.2, radius * 0.2, radius * 0.6);
      }
      
      // Active Powerup Effects (Main Player Only)
      if (isMain) {
        if (this.player.powerUps.shield > 0) {
          this.ctx.strokeStyle = '#60a5fa'; // blue-400
          this.ctx.lineWidth = 3;
          this.ctx.shadowColor = '#60a5fa';
          this.ctx.shadowBlur = 15;
          this.ctx.globalAlpha = 0.6 + Math.sin(performance.now() / 100) * 0.3;
          
          // Hexagonal Shield
          this.ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + (performance.now() / 1000);
            const r = radius * 2.5;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
          }
          this.ctx.closePath();
          this.ctx.stroke();
          
          this.ctx.fillStyle = '#60a5fa';
          this.ctx.globalAlpha = 0.1;
          this.ctx.fill();
          this.ctx.globalAlpha = 1.0;
          this.ctx.shadowBlur = 0;
        }
        if (this.player.powerUps.rapid > 0) {
          this.ctx.shadowColor = '#ef4444'; // red-500
          this.ctx.shadowBlur = 20;
          this.ctx.strokeStyle = '#ef4444';
          this.ctx.lineWidth = 2;
          this.ctx.globalAlpha = 0.5 + Math.sin(performance.now() / 50) * 0.5;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, radius * 1.8, 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.globalAlpha = 1.0;
          this.ctx.shadowBlur = 0;
        }
        if (this.player.powerUps.spread > 0) {
          this.ctx.shadowColor = '#a855f7'; // purple-500
          this.ctx.shadowBlur = 20;
          this.ctx.strokeStyle = '#a855f7';
          this.ctx.lineWidth = 2;
          this.ctx.globalAlpha = 0.5 + Math.sin(performance.now() / 50) * 0.5;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, radius * 1.8, 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.globalAlpha = 1.0;
          this.ctx.shadowBlur = 0;
        }
      }
      
      this.ctx.restore();
    };

    // Main Player
    drawSpaceship(this.player.x, this.player.y, this.player.size, true);
    
    // Squad members
    const squadCount = Math.min(30, this.player.squadSize - 1);
    for (let i = 0; i < squadCount; i++) {
      const angle = (i / squadCount) * Math.PI * 2 + (performance.now() / 1000);
      const dist = this.player.size + 14 + (i % 4) * 8;
      const px = this.player.x + Math.cos(angle) * dist;
      const py = this.player.y + Math.sin(angle) * dist;
      
      drawSpaceship(px, py, 6);
    }
    
    // Draw Particles
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = p.life / p.maxLife;
      
      if (p.type === 'shockwave') {
        const ratio = 1 - (p.life / p.maxLife);
        const radius = p.size + ratio * 250;
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 6 * (1 - ratio);
        this.ctx.shadowColor = p.color;
        this.ctx.shadowBlur = 15 * (1 - ratio);
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Inner ring
        this.ctx.lineWidth = 2 * (1 - ratio);
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, radius * 0.8, 0, Math.PI * 2);
        this.ctx.stroke();
      } else if (p.type === 'smoke') {
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size * (1 + (1 - p.life / p.maxLife)), 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.type === 'debris') {
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rotation || 0);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else if (p.type === 'flash') {
        const ratio = p.life / p.maxLife;
        const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, p.color);
        grad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = grad;
        this.ctx.globalAlpha = ratio;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.type === 'line') {
        const angle = Math.atan2(p.vy, p.vx);
        const len = p.length || 10;
        const ratio = p.life / p.maxLife;
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = (p.size || 1) * ratio;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, p.y);
        this.ctx.lineTo(p.x - Math.cos(angle) * len * ratio, p.y - Math.sin(angle) * len * ratio);
        this.ctx.stroke();
      } else {
        // Spark or basic
        const ratio = p.life / p.maxLife;
        this.ctx.fillStyle = p.color;
        if (p.glow) {
          this.ctx.shadowColor = p.color;
          this.ctx.shadowBlur = p.size * 3 * ratio;
          
          // Extra bloom for glowing particles
          this.ctx.globalAlpha = ratio * 0.5;
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          this.ctx.fill();
        }
        this.ctx.globalAlpha = ratio;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size * ratio, 0, Math.PI * 2);
        this.ctx.fill();
      }
      
      this.ctx.restore();
    }
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1.0;
    
    // Draw Floating Texts
    for (const ft of this.floatingTexts) {
      this.ctx.globalAlpha = ft.life / ft.maxLife;
      this.ctx.fillStyle = ft.color;
      this.ctx.font = '900 28px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = ft.color;
      this.ctx.shadowBlur = 10;
      this.ctx.fillText(ft.text, ft.x, ft.y);
      
      this.ctx.shadowColor = 'rgba(0,0,0,0.8)';
      this.ctx.shadowBlur = 4;
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.shadowBlur = 0;
    }
    this.ctx.globalAlpha = 1.0;
    
    if (this.screenFlashTime > 0) {
      this.ctx.fillStyle = this.screenFlashColor;
      this.ctx.globalAlpha = Math.min(1, this.screenFlashTime * 2);
      this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      this.ctx.globalAlpha = 1.0;
    }
    
    this.ctx.restore();
  }

  onPointerDown(event: MouseEvent | TouchEvent) {
    if (this.gameState() !== 'playing') return;
    this.isDragging = true;
    this.updatePlayerPosition(event);
  }
  
  onPointerMove(event: MouseEvent | TouchEvent) {
    if (!this.isDragging || this.gameState() !== 'playing') return;
    this.updatePlayerPosition(event);
  }
  
  onPointerUp() {
    this.isDragging = false;
  }
  
  updatePlayerPosition(event: MouseEvent | TouchEvent) {
    event.preventDefault();
    
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    
    let clientX;
    if (event instanceof MouseEvent) {
      clientX = event.clientX;
    } else {
      clientX = event.touches[0].clientX;
    }
    
    const scaleX = canvas.width / rect.width;
    let x = (clientX - rect.left) * scaleX;
    
    x = Math.max(this.player.size + 20, Math.min(this.canvasWidth - this.player.size - 20, x));
    this.player.x = x;
  }

  checkCollision(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number) {
    return x1 < x2 + w2 &&
           x1 + w1 > x2 &&
           y1 < y2 + h2 &&
           y1 + h1 > y2;
  }

  gameOver() {
    this.gameState.set('gameover');
    this.soundManager.playUIGameOver();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
