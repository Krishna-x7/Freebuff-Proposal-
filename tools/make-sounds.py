#!/usr/bin/env python3
"""Builds the two sound effects that ship with the page.

    python3 tools/make-sounds.py

Writes popper.wav and cry.wav next to index.html. Both are synthesised from
noise and sine waves with the standard library only, so there is nothing to
install and the result is byte-for-byte reproducible.

Why these exist at all: a YouTube embed cannot play on the click that asks for
it — the player has to be fetched and the clip buffered, which is the delay
that made the buttons feel unresponsive. Local files start in a few
milliseconds, so these are the default and popper.mp3 / cry.mp3 override them.
"""

import math
import os
import random
import struct
import wave

SR = 22050
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# ----------------------------------------------------------------- helpers


def lowpass(x, cutoff):
    """One-pole lowpass; cheap, and enough for noise shaping."""
    a = math.exp(-2.0 * math.pi * cutoff / SR)
    out = [0.0] * len(x)
    prev = 0.0
    for i, v in enumerate(x):
        prev = (1.0 - a) * v + a * prev
        out[i] = prev
    return out


def highpass(x, cutoff):
    lp = lowpass(x, cutoff)
    return [a - b for a, b in zip(x, lp)]


def bandpass(x, low, high):
    return highpass(lowpass(x, high), low)


def mix_into(dst, src, at, gain=1.0):
    """Add src into dst starting at sample `at`, clipping the overlap."""
    start = int(at * SR)
    for i, v in enumerate(src):
        j = start + i
        if j >= len(dst):
            break
        dst[j] += v * gain


def normalise(x, peak=0.9):
    top = max(1e-9, max(abs(v) for v in x))
    return [v * peak / top for v in x]


def soften(x):
    """tanh-ish soft clip so the bursts stay round instead of crackling."""
    return [math.tanh(v) for v in x]


def write_wav(name, samples):
    path = os.path.join(ROOT, name)
    frames = b"".join(
        struct.pack("<h", int(max(-1.0, min(1.0, v)) * 32767)) for v in samples
    )
    with wave.open(path, "wb") as fh:
        fh.setnchannels(1)
        fh.setsampwidth(2)
        fh.setframerate(SR)
        fh.writeframes(frames)
    print("%-12s %5.2fs  %6.1f kB" % (name, len(samples) / SR, len(frames) / 1024))


# ------------------------------------------------------------------ popper


def popper():
    rng = random.Random(7)
    n = int(1.05 * SR)
    out = [0.0] * n

    # 1. the crack: bright noise, gone in 40 ms
    crack = highpass([rng.uniform(-1, 1) for _ in range(int(0.06 * SR))], 2600)
    crack = [v * math.exp(-i / (0.014 * SR)) for i, v in enumerate(crack)]
    mix_into(out, crack, 0.0, 0.95)

    # 2. the body: confetti burst, a resonant band of noise decaying over 0.3 s
    body = bandpass([rng.uniform(-1, 1) for _ in range(int(0.45 * SR))], 700, 2600)
    body = [v * math.exp(-i / (0.13 * SR)) for i, v in enumerate(body)]
    mix_into(out, body, 0.012, 0.7)

    # 3. the thump: low sine dropping 190 -> 70 Hz, gives it weight
    thump = [0.0] * int(0.22 * SR)
    phase = 0.0
    for i in range(len(thump)):
        t = i / SR
        freq = 190.0 * math.exp(-t / 0.05) + 70.0
        phase += 2.0 * math.pi * freq / SR
        thump[i] = math.sin(phase) * math.exp(-t / 0.07)
    mix_into(out, thump, 0.0, 0.85)

    # 4. a little paper rustle trailing off
    rustle = highpass([rng.uniform(-1, 1) for _ in range(int(0.5 * SR))], 4200)
    rustle = [v * math.exp(-i / (0.16 * SR)) for i, v in enumerate(rustle)]
    mix_into(out, rustle, 0.1, 0.18)

    # 5. rising sparkle, like the streamers flying out
    spark = [0.0] * int(0.3 * SR)
    phase = 0.0
    for i in range(len(spark)):
        t = i / SR
        freq = 900.0 + 2200.0 * (t / 0.3)
        phase += 2.0 * math.pi * freq / SR
        spark[i] = math.sin(phase) * math.exp(-t / 0.09) * min(1.0, t / 0.01)
    mix_into(out, spark, 0.03, 0.13)

    return normalise(soften(normalise(out, 1.4)), 0.9)


# --------------------------------------------------------------------- cry


def cry():
    rng = random.Random(11)
    n = int(3.2 * SR)
    out = [0.0] * n

    # 1. rain: two bands of noise under a slow swell
    bed = bandpass([rng.uniform(-1, 1) for _ in range(n)], 400, 3400)
    for i in range(n):
        t = i / SR
        env = min(1.0, t / 0.25) * (1.0 if t < 2.5 else max(0.0, 1.0 - (t - 2.5) / 0.7))
        bed[i] *= 0.16 * env
    mix_into(out, bed, 0.0)

    # 2. water drops: fast upward chirp with a small echo, first one on the
    #    very first sample so there is sound the instant it is asked for
    def drop(seed, size=1.0):
        r = random.Random(seed)
        length = int(0.16 * SR)
        s = [0.0] * length
        phase = 0.0
        for i in range(length):
            t = i / SR
            freq = 620.0 + 1500.0 * (1.0 - math.exp(-t / 0.012))
            phase += 2.0 * math.pi * freq / SR
            s[i] = (
                math.sin(phase)
                + 0.3 * math.sin(2.0 * phase)
                + 0.04 * r.uniform(-1, 1)
            ) * math.exp(-t / 0.035) * min(1.0, t / 0.002)
        echo = [0.0] * (length + int(0.09 * SR))
        for i, v in enumerate(s):
            echo[i] += v
            echo[i + int(0.09 * SR)] += v * 0.32
        return [v * size for v in echo]

    for k, at in enumerate([0.0, 0.34, 0.78, 1.24, 1.82, 2.42, 2.86]):
        mix_into(out, drop(100 + k, 1.0 - 0.07 * k), at, 0.42)

    # 3. the sob: a descending tone with vibrato, twice
    def sob(start, length, f_hi, f_lo, gain):
        s = [0.0] * int(length * SR)
        phase = 0.0
        for i in range(len(s)):
            t = i / SR
            p = t / length
            freq = f_hi + (f_lo - f_hi) * p
            freq *= 1.0 + 0.02 * math.sin(2.0 * math.pi * 5.5 * t)
            phase += 2.0 * math.pi * freq / SR
            env = min(1.0, t / 0.12) * math.exp(-t / 0.9)
            s[i] = (math.sin(phase) + 0.25 * math.sin(2.0 * phase)) * env
        mix_into(out, s, start, gain)

    sob(0.30, 1.05, 330.0, 205.0, 0.30)
    sob(1.55, 1.20, 300.0, 175.0, 0.26)

    return normalise(soften(normalise(out, 1.2)), 0.9)


if __name__ == "__main__":
    write_wav("popper.wav", popper())
    write_wav("cry.wav", cry())
