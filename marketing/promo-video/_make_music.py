"""Upbeat promo soundtrack — 110 BPM, C-G-Am-F (anthem progression).
Kick + hat groove, bass on roots, arpeggio pluck, chord pad. ~52s.

Pure numpy + soundfile, fully deterministic."""

import numpy as np
import soundfile as sf

SR = 48000
BPM = 110.0
DURATION = 52.0
BEAT = 60.0 / BPM            # seconds per beat
BAR = BEAT * 4               # 4/4
TOTAL_BEATS = int(DURATION / BEAT)  # ~95

# ===== Chord progression: C - G - Am - F (1 bar each, looping) =====
# Each chord = (root_freq_hz, name)
CHORDS = [
    ("C",  261.63, [261.63, 329.63, 392.00]),   # C major: C E G
    ("G",  196.00, [196.00, 246.94, 392.00]),   # G major: G B D (using G3-D5 voicing)
    ("Am", 220.00, [220.00, 261.63, 329.63]),   # A minor: A C E
    ("F",  174.61, [174.61, 220.00, 261.63]),   # F major: F A C
]


def chord_at_beat(b):
    """Which chord is sounding at beat b (0-indexed). 4 beats per chord."""
    return CHORDS[(b // 4) % 4]


# ===== Helpers =====
def envelope(n, attack, decay, sustain=0.0, release=0.0, sustain_level=1.0):
    """ADSR envelope, total length n samples."""
    env = np.zeros(n)
    a = int(attack * SR)
    d = int(decay * SR)
    r = int(release * SR)
    s = n - a - d - r
    if s < 0:
        s = 0
    if a:
        env[:a] = np.linspace(0, 1, a)
    if d:
        env[a:a + d] = np.linspace(1, sustain_level, d)
    if s:
        env[a + d:a + d + s] = sustain_level
    if r:
        env[a + d + s:a + d + s + r] = np.linspace(sustain_level, 0, r)
    return env


def place(buf, sample, start_sample, gain=1.0):
    """Add sample to buf at start_sample with gain. Clip at end of buf."""
    n = len(sample)
    end = start_sample + n
    if start_sample >= len(buf):
        return
    if end > len(buf):
        sample = sample[:len(buf) - start_sample]
        n = len(sample)
    buf[start_sample:start_sample + n] += sample * gain


# ===== Synthesis =====
def make_kick():
    """Punchy kick: 60Hz → 40Hz pitch sweep + click transient."""
    dur = 0.18
    n = int(dur * SR)
    t = np.linspace(0, dur, n, endpoint=False)
    # Pitch sweep: exponential from 90 Hz to 40 Hz
    freq = 90 * np.exp(-t * 18) + 40
    phase = np.cumsum(2 * np.pi * freq / SR)
    body = np.sin(phase) * np.exp(-t * 14)
    # Click for transient
    click_n = int(0.003 * SR)
    click = np.random.RandomState(42).randn(click_n) * np.linspace(1, 0, click_n) * 0.5
    body[:click_n] += click
    return body * 0.9


def make_hat(short=True):
    """Hi-hat: high-passed noise burst, short or long decay."""
    dur = 0.04 if short else 0.12
    n = int(dur * SR)
    rng = np.random.RandomState(0)
    noise = rng.randn(n)
    # Crude high-pass: subtract a low-pass version of itself
    lp = np.zeros_like(noise)
    a = 0.85
    for i in range(1, n):
        lp[i] = a * lp[i - 1] + (1 - a) * noise[i]
    hp = noise - lp
    env = np.exp(-np.linspace(0, dur, n) * (40 if short else 14))
    return hp * env * 0.25


def make_pluck(freq, duration=0.35):
    """Pluck: detuned sine with fast attack and exponential decay + bell harmonic."""
    n = int(duration * SR)
    t = np.linspace(0, duration, n, endpoint=False)
    sig = (
        np.sin(2 * np.pi * freq * t) * 0.6
        + np.sin(2 * np.pi * freq * 2.01 * t) * 0.18  # octave shimmer
        + np.sin(2 * np.pi * freq * 3 * t) * 0.06     # 5th harmonic
    )
    env = envelope(n, attack=0.003, decay=0.06, sustain_level=0.4, release=duration - 0.07)
    decay = np.exp(-t * 4)
    return sig * env * decay * 0.4


def make_bass(freq, duration):
    """Bass: square-ish wave with subtle drive."""
    n = int(duration * SR)
    t = np.linspace(0, duration, n, endpoint=False)
    # Mix sine + filtered square
    sq = np.sign(np.sin(2 * np.pi * freq * t))
    sig = np.sin(2 * np.pi * freq * t) * 0.5 + sq * 0.18
    # One-pole low-pass for warmth
    out = np.zeros_like(sig)
    alpha = 0.20
    for i in range(1, n):
        out[i] = alpha * sig[i] + (1 - alpha) * out[i - 1]
    env = envelope(n, attack=0.005, decay=0.05, sustain_level=0.8, release=0.08)
    return out * env * 0.5


def make_pad(notes, duration):
    """Soft pad: detuned sines layered."""
    n = int(duration * SR)
    t = np.linspace(0, duration, n, endpoint=False)
    sig = np.zeros(n)
    for f in notes:
        for det, g in [(0.995, 0.35), (1.0, 1.0), (1.005, 0.35)]:
            sig += np.sin(2 * np.pi * f * det * t) * g * 0.04
    # Slow LFO
    lfo = 1.0 + 0.06 * np.sin(2 * np.pi * 0.4 * t)
    sig *= lfo
    # Fade in/out
    fn = int(0.15 * SR)
    sig[:fn] *= np.linspace(0, 1, fn) ** 2
    sig[-fn:] *= np.linspace(1, 0, fn) ** 2
    return sig


# ===== Compose =====
mix = np.zeros(int(DURATION * SR), dtype=np.float64)
sub_kick = make_kick()
sub_hat_short = make_hat(short=True)
sub_hat_long = make_hat(short=False)

# Track structure (in beats)
# 0-7:    intro — pad + half-time kick (kick on 1 & 3)
# 8-31:   build/main — full beat + bass + arpeggio
# 32-79:  peak — pad + full drums + bass + arpeggio + lead notes
# 80-91:  outro — drop drums, pad fade

for beat in range(TOTAL_BEATS):
    beat_t = beat * BEAT
    sample_pos = int(beat_t * SR)

    # Determine section
    if beat < 8:
        section = "intro"
    elif beat < 32:
        section = "main"
    elif beat < 80:
        section = "peak"
    else:
        section = "outro"

    # Kick pattern
    if section == "intro":
        if beat % 4 == 0 or beat % 4 == 2:
            place(mix, sub_kick, sample_pos, gain=0.7)
    elif section in ("main", "peak"):
        place(mix, sub_kick, sample_pos, gain=1.0)  # 4-on-the-floor
    # outro: no kick

    # Hi-hat eighth-note pattern (during main + peak)
    if section in ("main", "peak"):
        # eighth note offset
        place(mix, sub_hat_short, sample_pos, gain=0.7)
        place(mix, sub_hat_short, sample_pos + int(BEAT * 0.5 * SR), gain=0.5)
        if (beat % 4) == 3:  # accent on beat 4
            place(mix, sub_hat_long, sample_pos + int(BEAT * 0.5 * SR), gain=0.7)

# Bass on beats 1 and 3 of each bar (during main + peak)
for bar_idx in range(int(DURATION / BAR) + 1):
    bar_start_beat = bar_idx * 4
    if bar_start_beat >= 8 and bar_start_beat < 80:
        chord = chord_at_beat(bar_start_beat)
        root = chord[1] / 2  # bass = octave below root
        # Note on beat 1 and beat 3
        for offset in (0, 2):
            beat = bar_start_beat + offset
            t0 = beat * BEAT
            if t0 >= DURATION:
                break
            note_dur = BEAT * 1.8  # held for nearly 2 beats
            note = make_bass(root, note_dur)
            place(mix, note, int(t0 * SR), gain=0.55)

# Arpeggio pluck — 8 notes per bar (eighth notes), pattern: root-3rd-5th-3rd cycling
# Only during main + peak
for bar_idx in range(int(DURATION / BAR) + 1):
    bar_start_beat = bar_idx * 4
    if not (bar_start_beat >= 12 and bar_start_beat < 76):
        continue
    chord = chord_at_beat(bar_start_beat)
    notes = chord[2]
    pattern = [notes[0], notes[1], notes[2], notes[1]]  # 1-3-5-3
    for i in range(8):
        idx = i % len(pattern)
        beat_fraction = i * 0.5
        t0 = (bar_start_beat + beat_fraction) * BEAT
        if t0 >= DURATION:
            break
        pluck = make_pluck(pattern[idx] * 2, duration=BEAT * 0.45)  # up an octave
        place(mix, pluck, int(t0 * SR), gain=0.45)

# Pad layer (continuous)
for bar_idx in range(int(DURATION / BAR) + 1):
    bar_start_beat = bar_idx * 4
    if bar_start_beat >= TOTAL_BEATS:
        break
    chord = chord_at_beat(bar_start_beat)
    t0 = bar_start_beat * BEAT
    pad_dur = min(BAR, DURATION - t0)
    if pad_dur <= 0:
        break
    pad = make_pad(chord[2], pad_dur)
    place(mix, pad, int(t0 * SR), gain=0.6 if bar_start_beat < 8 or bar_start_beat >= 80 else 0.4)

# Lead melody during peak (bars 8-19, beats 32-79). Simple uplifting line per chord.
# For each bar in peak: play 3 notes (1, 3, 5 of chord) at quarter-note positions 1, 2, 3 of bar.
for bar_idx in range(int(DURATION / BAR) + 1):
    bar_start_beat = bar_idx * 4
    if not (bar_start_beat >= 40 and bar_start_beat < 76):
        continue
    chord = chord_at_beat(bar_start_beat)
    notes = chord[2]
    # melody: chord-tones up + down
    melody = [notes[0] * 2, notes[1] * 2, notes[2] * 2, notes[1] * 2]
    for i, freq in enumerate(melody):
        t0 = (bar_start_beat + i) * BEAT
        if t0 >= DURATION:
            break
        lead = make_pluck(freq, duration=BEAT * 0.9)
        place(mix, lead, int(t0 * SR), gain=0.35)

# Final global fade in/out
fade_in = int(1.5 * SR)
fade_out = int(2.5 * SR)
mix[:fade_in] *= np.linspace(0, 1, fade_in) ** 2
mix[-fade_out:] *= np.linspace(1, 0, fade_out) ** 2

# Normalize to peak ~0.9 — let loudnorm handle the final mix
peak = np.max(np.abs(mix))
if peak > 0:
    mix = mix / peak * 0.85

sf.write("music-bed.wav", mix.astype(np.float32), SR)
print(f"Wrote music-bed.wav · {DURATION}s · {SR}Hz · peak={peak:.3f} → 0.85")
