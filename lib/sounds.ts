/**
 * Tiny dependency-free UI sound player built on the native HTML5 Audio API.
 *
 * Three things this has to get right, none of them obvious:
 *
 * 1. HYDRATION SAFETY. `new Audio()` is a browser-only constructor, and
 *    touching it while the server renders (or during the first client render,
 *    before hydration settles) is a classic mismatch source. Nothing here
 *    constructs anything at module scope or during render — the elements are
 *    created lazily inside `play()`, which is only ever reached from a real
 *    user interaction. That also satisfies browser autoplay policy for free,
 *    since the first playback is always inside a gesture.
 *
 * 2. PAYLOAD. The decoded WAVs are ~31KB of base64. They live in a separate
 *    module that is `import()`ed on first play, so a route that merely
 *    imports this player doesn't carry the audio in its bundle.
 *
 * 3. THROTTLING. The role command menu highlights a row on `mouseenter`, so
 *    sweeping the cursor down the list fires one tick per row — without a
 *    floor on the interval that is a machine-gun burst, not a premium touch.
 */

export type SoundName = "tick" | "click" | "chime";

/** Per-sound output gain. The WAVs are already quiet; this keeps them subtle. */
const VOLUME: Record<SoundName, number> = {
  tick: 0.18,
  click: 0.3,
  chime: 0.45,
};

/**
 * Minimum gap between two plays of the SAME sound. Sized per sound: ticks
 * fire from pointer movement and need a real floor, while a chime is a
 * deliberate one-off.
 */
const MIN_INTERVAL_MS: Record<SoundName, number> = {
  tick: 60,
  click: 80,
  chime: 400,
};

const STORAGE_KEY = "forsa_sound_enabled";

let elements: Partial<Record<SoundName, HTMLAudioElement>> = {};
let loading: Promise<void> | null = null;
const lastPlayedAt: Partial<Record<SoundName, number>> = {};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof Audio !== "undefined";
}

/** Sound is on by default; the preference persists across visits. */
export function isSoundEnabled(): boolean {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Private browsing / quota — the setting just won't persist.
  }
}

async function ensureLoaded(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    const data = await import("./sound-data");
    const sources: Record<SoundName, string> = {
      tick: data.TICK_WAV_BASE64,
      click: data.CLICK_WAV_BASE64,
      chime: data.CHIME_WAV_BASE64,
    };
    elements = (Object.keys(sources) as SoundName[]).reduce<Partial<Record<SoundName, HTMLAudioElement>>>(
      (acc, name) => {
        const audio = new Audio(`data:audio/wav;base64,${sources[name]}`);
        audio.preload = "auto";
        audio.volume = VOLUME[name];
        acc[name] = audio;
        return acc;
      },
      {}
    );
  })();
  return loading;
}

/**
 * Fire-and-forget. Never throws and never rejects: a blocked autoplay, a
 * decode failure or a missing codec must not take down the interaction that
 * triggered the sound.
 */
export function playSound(name: SoundName): void {
  if (!isBrowser() || !isSoundEnabled()) return;

  const now = Date.now();
  const last = lastPlayedAt[name] ?? 0;
  if (now - last < MIN_INTERVAL_MS[name]) return;
  lastPlayedAt[name] = now;

  void ensureLoaded()
    .then(() => {
      const audio = elements[name];
      if (!audio) return;
      // Rewind rather than constructing a new element per play: repeated
      // ticks would otherwise allocate an element each time.
      audio.currentTime = 0;
      return audio.play();
    })
    .catch(() => {
      // Autoplay policy or an unsupported codec — silence is the correct
      // degradation for a decorative sound.
    });
}
