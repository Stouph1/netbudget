"""Dark ambient intro for the 'despair' phase (0–6s).
Low drone + tense string pad + heartbeat kick + subtle whoosh tail leading into the drop.
"""
import numpy as np
import soundfile as sf

SR = 48000
DURATION = 6.5  # extra 0.5s for crossfade overlap

mix = np.zeros(int(DURATION * SR), dtype=np.float64)

# Low sub drone (Am — A1 = 55 Hz) — tense and grounded
t_all = np.linspace(0, DURATION, len(mix), endpoint=False)
drone = (
    np.sin(2 * np.pi * 55 * t_all) * 0.55
    + np.sin(2 * np.pi * 110 * t_all) * 0.18
    + np.sin(2 * np.pi * 27.5 * t_all) * 0.3   # sub
)
# Slow LFO modulation for "alive" feel
lfo = 1.0 + 0.08 * np.sin(2 * np.pi * 0.25 * t_all)
drone *= lfo
# Build up to drop
build_env = np.linspace(0.4, 1.0, len(mix)) ** 1.4
drone *= build_env
mix += drone * 0.35

# Tense string pad (Am triad — A C E, low register)
for f, amp in [(110.0, 1.0), (130.81, 0.8), (164.81, 0.6)]:
    for det, gain in [(0.995, 0.5), (1.0, 1.0), (1.005, 0.5)]:
        ft = f * det
        # Saw wave for string-like
        saw = 2 * (t_all * ft - np.floor(t_all * ft + 0.5))
        # Slow vibrato
        vib = 1.0 + 0.005 * np.sin(2 * np.pi * 5 * t_all)
        mix += saw * gain * vib * 0.025 * amp

# Low-pass filter for "muffled" feel
filt = np.zeros_like(mix)
a = 0.10
for i in range(1, len(mix)):
    filt[i] = a * mix[i] + (1 - a) * filt[i - 1]
mix = 0.4 * mix + 0.6 * filt  # mostly muffled, some clarity

# Heartbeat pattern — slow kick pulses at ~70 BPM (one every ~0.85s)
def make_heartbeat(t_start, gain=1.0):
    n = int(0.4 * SR)
    t = np.linspace(0, 0.4, n, endpoint=False)
    freq = 70 * np.exp(-t * 12) + 38
    phase = np.cumsum(2 * np.pi * freq / SR)
    body = np.sin(phase) * np.exp(-t * 7) * gain
    s = int(t_start * SR)
    end = min(s + n, len(mix))
    mix[s:end] += body[: end - s] * 0.5
    # double-beat (heartbeat thump-thump)
    s2 = int((t_start + 0.18) * SR)
    end2 = min(s2 + n, len(mix))
    mix[s2:end2] += body[: end2 - s2] * 0.35 * gain

for t in [0.5, 1.5, 2.5, 3.5, 4.5]:
    make_heartbeat(t, gain=1.0 + (t / 6.0) * 0.5)  # heartbeats getting stronger

# Whoosh riser at the very end (5.0–6.5s) leading into the drop
riser_start = int(5.0 * SR)
riser_n = len(mix) - riser_start
if riser_n > 0:
    rt = np.linspace(0, 1.5, riser_n)
    rng = np.random.RandomState(11)
    noise = rng.randn(riser_n)
    # filter that opens (low-pass cutoff rises)
    out = np.zeros_like(noise)
    for i in range(1, riser_n):
        alpha = 0.02 + 0.7 * (i / riser_n) ** 2
        out[i] = alpha * noise[i] + (1 - alpha) * out[i - 1]
    riser = out * (np.linspace(0, 1, riser_n) ** 1.5) * 0.4
    # add rising tone
    f_riser = 100 + 1500 * (rt / 1.5) ** 2
    phase_r = np.cumsum(2 * np.pi * f_riser / SR)
    riser_tone = np.sin(phase_r) * (np.linspace(0, 1, riser_n) ** 2) * 0.12
    mix[riser_start:] += (riser + riser_tone)

# Big BOOM at 6.0s — the drop transition
boom_start = int(5.95 * SR)
boom_n = min(int(1.0 * SR), len(mix) - boom_start)
if boom_n > 0:
    bt = np.linspace(0, boom_n / SR, boom_n, endpoint=False)
    freq = 100 * np.exp(-bt * 4) + 35
    phase = np.cumsum(2 * np.pi * freq / SR)
    boom = np.sin(phase) * np.exp(-bt * 1.8) * 0.85
    mix[boom_start : boom_start + boom_n] += boom

# Fade in at very start
fade_in = int(0.3 * SR)
mix[:fade_in] *= np.linspace(0, 1, fade_in) ** 2

# Normalize peak
peak = np.max(np.abs(mix))
if peak > 0:
    mix = mix / peak * 0.85

sf.write("_intro.wav", mix.astype(np.float32), SR)
print(f"Wrote _intro.wav · {DURATION}s · peak normalized")
