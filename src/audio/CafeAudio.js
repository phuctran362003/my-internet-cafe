import { GameEvents } from '../core/EventBus.js';

export function attachCafeAudio(session) {
  if (typeof Audio === 'undefined') return;
  const music = new Audio(`${import.meta.env.BASE_URL}assets/audio/music/background.mp3`);
  music.loop = true;
  music.preload = 'auto';
  music.volume = 0.42;

  let context = null;
  let wantPlay = false;
  let resumeAt = 0;

  const audioContext = () => {
    if (!context) context = new AudioContext();
    return context;
  };
  const audible = () => session.ui.music !== false;

  const tryPlay = () => {
    if (!wantPlay || !audible() || document.hidden) return;
    const play = music.play();
    if (play) play.catch(() => {});
  };

  const startMusic = () => {
    if (!audible()) {
      wantPlay = false;
      music.pause();
      return;
    }
    wantPlay = true;
    if (context?.state === 'suspended') context.resume().catch(() => {});
    tryPlay();
  };

  music.addEventListener('ended', () => {
    if (!wantPlay) return;
    music.currentTime = 0;
    tryPlay();
  });
  music.addEventListener('pause', () => {
    if (!wantPlay || document.hidden) return;
    const now = performance.now();
    if (now - resumeAt < 400) return;
    resumeAt = now;
    tryPlay();
  });
  music.addEventListener('stalled', tryPlay);
  music.addEventListener('error', () => {
    if (!wantPlay) return;
    music.load();
    tryPlay();
  });
  music.addEventListener('timeupdate', () => {
    if (!wantPlay) return;
    const duration = music.duration;
    if (!Number.isFinite(duration) || duration < 2) return;
    if (duration - music.currentTime > 0.18) return;
    music.currentTime = 0.04;
  });

  document.addEventListener('pointerdown', startMusic);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) startMusic();
  });
  window.addEventListener('focus', startMusic);
  window.addEventListener('pageshow', startMusic);

  session.bus.on(GameEvents.AUDIO_CHANGED, startMusic);
  session.bus.on(GameEvents.PAYMENT_RECEIVED, (tx) => {
    if (!audible() || !tx?.amount) return;
    blip(audioContext, [880, 1320], 0.07, 'square', 0.04);
  });
  session.bus.on(GameEvents.ROOM_UNLOCKED, () => {
    if (!audible()) return;
    blip(audioContext, [523, 659, 784], 0.11, 'square', 0.05);
  });
  session.bus.on(GameEvents.DOOR_TOGGLED, () => {
    if (!audible()) return;
    blip(audioContext, [180, 240], 0.06, 'square', 0.03);
  });
  session.bus.on(GameEvents.FURNITURE_CHANGED, (payload) => {
    if (!audible() || payload?.action === 'stash') return;
    blip(audioContext, [494], 0.06, 'sine', 0.04);
  });
}

function blip(getContext, freqs, step, type, volume) {
  let ctx;
  try {
    ctx = getContext();
  } catch {
    return;
  }
  if (!ctx || ctx.state === 'suspended') return;
  freqs.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + index * step;
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + step * 0.92);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + step);
  });
}
