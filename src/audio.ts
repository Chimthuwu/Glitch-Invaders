export const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

let musicAudio: HTMLAudioElement | null = null;
let isSoundMuted = false;
let isMusicMuted = false;
let currentTrack: string | null = null;

const MUSIC_FILES = [
  '/audio/In this safe - serge rybak.mp3',
  '/audio/Lil lamplight.mp3',
  '/audio/Melancholics Anonymous - S3rge Rybak.mp3',
  '/audio/Memowave.mp3'
];

export const initAudio = () => {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

export const toggleSoundMute = () => {
  isSoundMuted = !isSoundMuted;
  return isSoundMuted;
};

export const toggleMusicMute = () => {
  isMusicMuted = !isMusicMuted;
  return isMusicMuted;
};

export const getIsSoundMuted = () => isSoundMuted;
export const getIsMusicMuted = () => isMusicMuted;

export const playBackgroundMusic = (isGameplay: boolean) => {
  // music playing is handled by soundcloud embed in App.tsx now
};

export const stopBackgroundMusic = () => {
  // music stopping is handled by soundcloud embed in App.tsx now
};

const playTone = (freq1: number, freq2: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
  if (audioCtx.state === 'suspended' || isSoundMuted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq1, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freq2, audioCtx.currentTime + duration);
  
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
};

export const playShoot = () => {
  playTone(880, 110, 'square', 0.15, 0.05);
};

export const playAlienHit = () => {
  playTone(220, 55, 'sawtooth', 0.1, 0.05);
};

export const playAlienMove = (step: number) => {
  const freqs = [110, 104, 98, 92];
  playTone(freqs[step % 4], freqs[step % 4] - 10, 'square', 0.05, 0.03);
};

export const playPlayerDeath = () => {
  if (audioCtx.state === 'suspended') return;
  // Noise explosion
  const bufferSize = audioCtx.sampleRate * 0.5; // 0.5 seconds
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, audioCtx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.5);
  
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  
  noise.start();
};

export const playStart = () => {
  if (audioCtx.state === 'suspended') return;
  const now = audioCtx.currentTime;
  const notes = [220, 277.18, 329.63, 440, 554.37, 659.25, 880];
  
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(0, now + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.1, now + i * 0.1 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.2);
  });
};
