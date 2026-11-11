import { getState, setState } from '../store';

// Characters speak through on-screen subtitles and, when allowed, the browser's built-in speech voice.
const VOICES = {
  Guard: { pitch: 0.85, rate: 0.95 },
  Cashier: { pitch: 1.2, rate: 1.0 },
  Announcement: { pitch: 1.0, rate: 0.92 },
};
let voice = null, subId = 0, clearTimer = 0;
function pickVoice() {
  if (voice || typeof speechSynthesis === 'undefined') return voice;
  const all = speechSynthesis.getVoices();
  voice = all.find((v) => /en-NG/i.test(v.lang)) || all.find((v) => /en-GB/i.test(v.lang)) || all.find((v) => /^en/i.test(v.lang)) || null;
  return voice;
}
if (typeof speechSynthesis !== 'undefined') speechSynthesis.onvoiceschanged = () => { voice = null; pickVoice(); };

/** Show a line of dialogue and speak it. `who` is the speaker label. */
export function say(who, text, { delay = 0 } = {}) {
  const go = () => {
    const id = ++subId;
    setState({ subtitle: { who, text, id } });
    clearTimeout(clearTimer);
    clearTimer = setTimeout(() => { if (getState().subtitle?.id === id) setState({ subtitle: null }); }, 1800 + text.length * 55);
    const s = getState();
    if (!s.settings.voices || s.muted || typeof speechSynthesis === 'undefined') return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice();
      if (v) u.voice = v;
      const cfg = VOICES[who] || VOICES.Announcement;
      u.pitch = cfg.pitch; u.rate = cfg.rate;
      u.volume = Math.min(1, s.settings.sfx + 0.2);
      speechSynthesis.speak(u);
    } catch (e) { /* speech is optional */ }
  };
  if (delay) setTimeout(go, delay * 1000); else go();
}
export function hush() { try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); } catch (e) { /* optional */ } }
