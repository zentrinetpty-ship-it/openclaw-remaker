#!/usr/bin/env python3
"""Generate royalty-free music and SFX library using FFmpeg audio synthesis."""
import subprocess, os, sys

MUSIC_DIR = "/app/backend/library/music"
SFX_DIR = "/app/backend/library/sfx"
os.makedirs(MUSIC_DIR, exist_ok=True)
os.makedirs(SFX_DIR, exist_ok=True)

def gen(output, lavfi_input, af="", extra_inputs=None, duration=None):
    if os.path.exists(output):
        return
    cmd = ['ffmpeg', '-y']
    if extra_inputs:
        cmd.extend(extra_inputs)
    else:
        cmd.extend(['-f', 'lavfi', '-i', lavfi_input])
    if af:
        cmd.extend(['-af', af])
    if duration:
        cmd.extend(['-t', str(duration)])
    cmd.extend(['-c:a', 'libmp3lame', '-q:a', '4', output])
    r = subprocess.run(cmd, capture_output=True, text=True)
    status = "OK" if r.returncode == 0 else "FAIL"
    print(f"  [{status}] {os.path.basename(output)}")

def gen_multi(output, inputs_list, filter_complex, duration=None):
    if os.path.exists(output):
        return
    cmd = ['ffmpeg', '-y']
    for inp in inputs_list:
        cmd.extend(['-f', 'lavfi', '-i', inp])
    cmd.extend(['-filter_complex', filter_complex])
    cmd.extend(['-map', '[out]'])
    if duration:
        cmd.extend(['-t', str(duration)])
    cmd.extend(['-c:a', 'libmp3lame', '-q:a', '4', output])
    r = subprocess.run(cmd, capture_output=True, text=True)
    status = "OK" if r.returncode == 0 else "FAIL"
    print(f"  [{status}] {os.path.basename(output)}")

print("=== GENERATING MUSIC LIBRARY ===")

# --- CINEMATIC ---
print("\n[Cinematic]")
gen(f"{MUSIC_DIR}/cinematic-epic-rise.mp3",
    "sine=frequency=110:duration=25",
    "tremolo=f=0.3:d=0.8,aecho=0.8:0.88:60:0.4,volume=0.7")

gen_multi(f"{MUSIC_DIR}/cinematic-dark-suspense.mp3",
    ["sine=frequency=65:duration=25", "sine=frequency=98:duration=25"],
    "[0:a]volume=0.6[a];[1:a]volume=0.3,vibrato=f=2:d=0.3[b];[a][b]amix=inputs=2[mix];[mix]aecho=0.8:0.9:500:0.3,lowpass=f=600[out]")

gen_multi(f"{MUSIC_DIR}/cinematic-emotional.mp3",
    ["sine=frequency=262:duration=25", "sine=frequency=330:duration=25", "sine=frequency=392:duration=25"],
    "[0:a]volume=0.4[a];[1:a]volume=0.3,vibrato=f=4:d=0.2[b];[2:a]volume=0.2[c];[a][b][c]amix=inputs=3[mix];[mix]aecho=0.8:0.88:80:0.5,tremolo=f=0.2:d=0.4[out]")

gen_multi(f"{MUSIC_DIR}/cinematic-triumph.mp3",
    ["sine=frequency=220:duration=25", "sine=frequency=330:duration=25", "sine=frequency=440:duration=25", "sine=frequency=550:duration=25"],
    "[0:a]volume=0.4[a];[1:a]volume=0.35[b];[2:a]volume=0.3[c];[3:a]volume=0.2[d];[a][b][c][d]amix=inputs=4[mix];[mix]tremolo=f=0.5:d=0.6,aecho=0.8:0.85:40:0.3[out]")

gen(f"{MUSIC_DIR}/cinematic-tension.mp3",
    "sine=frequency=55:duration=25",
    "tremolo=f=1.5:d=0.9,aecho=0.8:0.9:200:0.4,lowpass=f=400,volume=0.8")

# --- CORPORATE ---
print("\n[Corporate]")
gen_multi(f"{MUSIC_DIR}/corporate-forward.mp3",
    ["sine=frequency=330:duration=25", "sine=frequency=440:duration=25"],
    "[0:a]volume=0.4,tremolo=f=2:d=0.3[a];[1:a]volume=0.3,tremolo=f=3:d=0.2[b];[a][b]amix=inputs=2[mix];[mix]aecho=0.8:0.85:30:0.2[out]")

gen_multi(f"{MUSIC_DIR}/corporate-innovation.mp3",
    ["sine=frequency=392:duration=25", "sine=frequency=523:duration=25"],
    "[0:a]volume=0.35,flanger=delay=3:depth=3:speed=0.5[a];[1:a]volume=0.3,chorus=0.5:0.9:50:0.4:0.25:2[b];[a][b]amix=inputs=2[out]")

gen_multi(f"{MUSIC_DIR}/corporate-teamwork.mp3",
    ["sine=frequency=262:duration=25", "sine=frequency=330:duration=25", "sine=frequency=392:duration=25"],
    "[0:a]volume=0.35[a];[1:a]volume=0.3[b];[2:a]volume=0.25[c];[a][b][c]amix=inputs=3[mix];[mix]chorus=0.6:0.9:50|60:0.4|0.3:0.3|0.4:2|1.5[out]")

gen(f"{MUSIC_DIR}/corporate-presentation.mp3",
    "sine=frequency=349:duration=25",
    "tremolo=f=1:d=0.3,aecho=0.8:0.85:50:0.2,volume=0.6")

# --- AMBIENT ---
print("\n[Ambient]")
gen(f"{MUSIC_DIR}/ambient-deep-space.mp3",
    "anoisesrc=color=brown:duration=25",
    "lowpass=f=200,aecho=0.8:0.9:1000:0.5,tremolo=f=0.1:d=0.8,volume=0.5")

gen(f"{MUSIC_DIR}/ambient-ocean-breeze.mp3",
    "anoisesrc=color=pink:duration=25",
    "bandpass=f=500:width_type=o:w=2,tremolo=f=0.15:d=0.6,aecho=0.8:0.88:200:0.4,volume=0.4")

gen_multi(f"{MUSIC_DIR}/ambient-forest-dawn.mp3",
    ["anoisesrc=color=pink:duration=25", "sine=frequency=2000:duration=25"],
    "[0:a]bandpass=f=3000:width_type=o:w=3,volume=0.15[noise];[1:a]volume=0.1,tremolo=f=8:d=0.9,vibrato=f=6:d=0.5[bird];[noise][bird]amix=inputs=2[out]")

gen(f"{MUSIC_DIR}/ambient-night-sky.mp3",
    "anoisesrc=color=brown:duration=25",
    "lowpass=f=150,tremolo=f=0.05:d=0.5,aecho=0.8:0.9:800:0.6,volume=0.4")

gen(f"{MUSIC_DIR}/ambient-meditation.mp3",
    "sine=frequency=174:duration=25",
    "vibrato=f=0.5:d=0.1,aecho=0.8:0.9:300:0.5,tremolo=f=0.1:d=0.3,volume=0.5")

# --- UPBEAT ---
print("\n[Upbeat]")
gen_multi(f"{MUSIC_DIR}/upbeat-happy-days.mp3",
    ["sine=frequency=523:duration=25", "sine=frequency=659:duration=25"],
    "[0:a]volume=0.4,tremolo=f=4:d=0.5[a];[1:a]volume=0.3,tremolo=f=6:d=0.4[b];[a][b]amix=inputs=2[mix];[mix]aecho=0.8:0.85:20:0.15[out]")

gen_multi(f"{MUSIC_DIR}/upbeat-dance-energy.mp3",
    ["sine=frequency=440:duration=25", "sine=frequency=660:duration=25", "sine=frequency=880:duration=25"],
    "[0:a]volume=0.35,tremolo=f=8:d=0.7[a];[1:a]volume=0.25,tremolo=f=4:d=0.5[b];[2:a]volume=0.2,tremolo=f=6:d=0.6[c];[a][b][c]amix=inputs=3[out]")

gen(f"{MUSIC_DIR}/upbeat-sunny-walk.mp3",
    "sine=frequency=587:duration=25",
    "vibrato=f=5:d=0.3,tremolo=f=3:d=0.4,aecho=0.8:0.85:25:0.2,volume=0.6")

gen(f"{MUSIC_DIR}/upbeat-celebration.mp3",
    "sine=frequency=698:duration=25",
    "tremolo=f=5:d=0.6,chorus=0.7:0.9:30:0.4:0.3:2,volume=0.5")

# --- LO-FI ---
print("\n[Lo-Fi]")
gen_multi(f"{MUSIC_DIR}/lofi-late-night.mp3",
    ["sine=frequency=220:duration=25", "anoisesrc=color=pink:duration=25"],
    "[0:a]vibrato=f=2:d=0.15,lowpass=f=800,volume=0.5[tone];[1:a]lowpass=f=300,volume=0.08[noise];[tone][noise]amix=inputs=2[mix];[mix]aecho=0.8:0.88:100:0.4[out]")

gen_multi(f"{MUSIC_DIR}/lofi-rainy-window.mp3",
    ["anoisesrc=color=pink:duration=25", "sine=frequency=196:duration=25"],
    "[0:a]bandpass=f=1000:width_type=o:w=1,volume=0.15[rain];[1:a]lowpass=f=500,tremolo=f=0.5:d=0.3,volume=0.3[tone];[rain][tone]amix=inputs=2[out]")

gen_multi(f"{MUSIC_DIR}/lofi-coffee-shop.mp3",
    ["sine=frequency=262:duration=25", "anoisesrc=color=brown:duration=25"],
    "[0:a]lowpass=f=600,vibrato=f=1.5:d=0.2,volume=0.4[tone];[1:a]lowpass=f=200,volume=0.1[noise];[tone][noise]amix=inputs=2[mix];[mix]aecho=0.8:0.85:80:0.3[out]")

gen(f"{MUSIC_DIR}/lofi-dreamy.mp3",
    "sine=frequency=174:duration=25",
    "lowpass=f=500,vibrato=f=1:d=0.2,aecho=0.8:0.9:150:0.5,tremolo=f=0.3:d=0.4,volume=0.5")

# --- ELECTRONIC ---
print("\n[Electronic]")
gen(f"{MUSIC_DIR}/electronic-neon-pulse.mp3",
    "sine=frequency=330:duration=25",
    "tremolo=f=8:d=0.8,flanger=delay=5:depth=5:speed=1,volume=0.5")

gen_multi(f"{MUSIC_DIR}/electronic-digital-dreams.mp3",
    ["sine=frequency=440:duration=25", "sine=frequency=554:duration=25"],
    "[0:a]volume=0.35,flanger=delay=3:depth=4:speed=0.8[a];[1:a]volume=0.3,chorus=0.7:0.9:25|35:0.4|0.3:0.3|0.4:2|3[b];[a][b]amix=inputs=2[out]")

gen(f"{MUSIC_DIR}/electronic-cyber-grid.mp3",
    "sine=frequency=392:duration=25",
    "tremolo=f=6:d=0.7,vibrato=f=4:d=0.4,aecho=0.8:0.85:15:0.2,volume=0.5")

gen(f"{MUSIC_DIR}/electronic-synthwave.mp3",
    "sine=frequency=262:duration=25",
    "chorus=0.6:0.9:50|60|70:0.4|0.35|0.3:0.3|0.4|0.35:2|2.5|3,tremolo=f=2:d=0.5,volume=0.5")

# --- INSPIRATIONAL ---
print("\n[Inspirational]")
gen_multi(f"{MUSIC_DIR}/inspirational-new-beginnings.mp3",
    ["sine=frequency=262:duration=25", "sine=frequency=392:duration=25"],
    "[0:a]volume=0.4,tremolo=f=0.3:d=0.3[a];[1:a]volume=0.3,vibrato=f=2:d=0.2[b];[a][b]amix=inputs=2[mix];[mix]aecho=0.8:0.88:60:0.4[out]")

gen_multi(f"{MUSIC_DIR}/inspirational-rise-above.mp3",
    ["sine=frequency=330:duration=25", "sine=frequency=494:duration=25", "sine=frequency=659:duration=25"],
    "[0:a]volume=0.35[a];[1:a]volume=0.3[b];[2:a]volume=0.25[c];[a][b][c]amix=inputs=3[mix];[mix]tremolo=f=0.5:d=0.4,aecho=0.8:0.85:50:0.3[out]")

gen(f"{MUSIC_DIR}/inspirational-dream-chaser.mp3",
    "sine=frequency=440:duration=25",
    "vibrato=f=3:d=0.2,chorus=0.5:0.9:50:0.4:0.25:2,aecho=0.8:0.88:40:0.3,volume=0.5")

gen(f"{MUSIC_DIR}/inspirational-hope.mp3",
    "sine=frequency=349:duration=25",
    "tremolo=f=0.4:d=0.5,aecho=0.8:0.9:100:0.4,volume=0.6")

# --- ACOUSTIC ---
print("\n[Acoustic]")
gen_multi(f"{MUSIC_DIR}/acoustic-morning-light.mp3",
    ["sine=frequency=330:duration=25", "sine=frequency=415:duration=25"],
    "[0:a]volume=0.4,vibrato=f=5:d=0.15[a];[1:a]volume=0.3,vibrato=f=6:d=0.12[b];[a][b]amix=inputs=2[mix];[mix]aecho=0.8:0.85:30:0.2[out]")

gen_multi(f"{MUSIC_DIR}/acoustic-gentle-stream.mp3",
    ["sine=frequency=262:duration=25", "anoisesrc=color=pink:duration=25"],
    "[0:a]volume=0.35,vibrato=f=4:d=0.1[tone];[1:a]highpass=f=2000,lowpass=f=6000,volume=0.08[water];[tone][water]amix=inputs=2[mix];[mix]aecho=0.8:0.88:50:0.3[out]")

gen(f"{MUSIC_DIR}/acoustic-campfire.mp3",
    "sine=frequency=196:duration=25",
    "vibrato=f=3:d=0.12,tremolo=f=0.3:d=0.3,aecho=0.8:0.85:60:0.3,volume=0.5")

gen(f"{MUSIC_DIR}/acoustic-sunset.mp3",
    "sine=frequency=294:duration=25",
    "vibrato=f=4:d=0.1,aecho=0.8:0.88:40:0.25,volume=0.5")

print("\n=== GENERATING SFX LIBRARY ===")

# --- TRANSITIONS ---
print("\n[Transitions]")
gen(f"{SFX_DIR}/transition-swoosh.mp3",
    "anoisesrc=color=white:duration=0.8",
    "bandpass=f=3000:width_type=o:w=2,afade=t=in:st=0:d=0.2,afade=t=out:st=0.4:d=0.4,volume=0.7")

gen(f"{SFX_DIR}/transition-whoosh-low.mp3",
    "anoisesrc=color=brown:duration=1",
    "bandpass=f=500:width_type=o:w=2,afade=t=in:st=0:d=0.3,afade=t=out:st=0.5:d=0.5,volume=0.8")

gen(f"{SFX_DIR}/transition-slide-in.mp3",
    "sine=frequency=200:duration=0.6",
    "vibrato=f=15:d=1,afade=t=in:st=0:d=0.1,afade=t=out:st=0.3:d=0.3,volume=0.6")

gen(f"{SFX_DIR}/transition-reverse.mp3",
    "anoisesrc=color=white:duration=0.8",
    "bandpass=f=2000:width_type=o:w=2,afade=t=out:st=0:d=0.4,afade=t=in:st=0.4:d=0.4,volume=0.7")

gen(f"{SFX_DIR}/transition-zoom.mp3",
    "sine=frequency=100:duration=0.5",
    "vibrato=f=30:d=1,afade=t=in:st=0:d=0.1,afade=t=out:st=0.2:d=0.3,volume=0.7")

gen(f"{SFX_DIR}/transition-fast-cut.mp3",
    "anoisesrc=color=white:duration=0.3",
    "highpass=f=2000,afade=t=in:st=0:d=0.05,afade=t=out:st=0.1:d=0.2,volume=0.8")

gen(f"{SFX_DIR}/transition-heavy-whoosh.mp3",
    "anoisesrc=color=brown:duration=1.2",
    "lowpass=f=800,afade=t=in:st=0:d=0.4,afade=t=out:st=0.6:d=0.6,volume=0.8")

gen(f"{SFX_DIR}/transition-glide.mp3",
    "sine=frequency=500:duration=0.8",
    "vibrato=f=10:d=0.8,afade=t=in:st=0:d=0.2,afade=t=out:st=0.4:d=0.4,lowpass=f=2000,volume=0.5")

# --- UI SOUNDS ---
print("\n[UI]")
gen(f"{SFX_DIR}/ui-click.mp3",
    "sine=frequency=1200:duration=0.08",
    "afade=t=out:st=0:d=0.08,volume=0.6")

gen(f"{SFX_DIR}/ui-pop.mp3",
    "sine=frequency=600:duration=0.15",
    "afade=t=out:st=0.02:d=0.13,volume=0.7")

gen(f"{SFX_DIR}/ui-ding.mp3",
    "sine=frequency=880:duration=1.2",
    "afade=t=out:st=0.05:d=1.15,volume=0.5")

gen_multi(f"{SFX_DIR}/ui-success.mp3",
    ["sine=frequency=523:duration=0.8", "sine=frequency=659:duration=0.8"],
    "[0:a]volume=0.4,afade=t=out:st=0.1:d=0.7[a];[1:a]volume=0.4,adelay=200|200,afade=t=out:st=0.3:d=0.5[b];[a][b]amix=inputs=2[out]")

gen_multi(f"{SFX_DIR}/ui-error.mp3",
    ["sine=frequency=400:duration=0.6", "sine=frequency=300:duration=0.6"],
    "[0:a]volume=0.4,afade=t=out:st=0.05:d=0.25[a];[1:a]volume=0.4,adelay=250|250,afade=t=out:st=0.3:d=0.3[b];[a][b]amix=inputs=2[out]")

gen(f"{SFX_DIR}/ui-toggle.mp3",
    "sine=frequency=1000:duration=0.1",
    "afade=t=out:st=0:d=0.1,volume=0.5")

gen(f"{SFX_DIR}/ui-notification.mp3",
    "sine=frequency=784:duration=0.8",
    "vibrato=f=6:d=0.2,afade=t=out:st=0.1:d=0.7,volume=0.5")

gen(f"{SFX_DIR}/ui-hover.mp3",
    "sine=frequency=1500:duration=0.06",
    "afade=t=out:st=0:d=0.06,volume=0.3")

# --- IMPACT ---
print("\n[Impact]")
gen(f"{SFX_DIR}/impact-boom.mp3",
    "sine=frequency=40:duration=1.5",
    "afade=t=out:st=0.05:d=1.45,tremolo=f=2:d=0.8,volume=0.9")

gen(f"{SFX_DIR}/impact-hit.mp3",
    "anoisesrc=color=white:duration=0.3",
    "lowpass=f=1000,afade=t=out:st=0.02:d=0.28,volume=0.8")

gen(f"{SFX_DIR}/impact-thud.mp3",
    "sine=frequency=60:duration=0.8",
    "afade=t=out:st=0.03:d=0.77,lowpass=f=200,volume=0.9")

gen_multi(f"{SFX_DIR}/impact-crash.mp3",
    ["anoisesrc=color=white:duration=1", "sine=frequency=100:duration=1"],
    "[0:a]highpass=f=3000,volume=0.4,afade=t=out:st=0.05:d=0.95[noise];[1:a]volume=0.3,afade=t=out:st=0.02:d=0.98[bass];[noise][bass]amix=inputs=2[out]")

gen(f"{SFX_DIR}/impact-slam.mp3",
    "sine=frequency=80:duration=0.6",
    "afade=t=out:st=0.01:d=0.59,aecho=0.8:0.88:20:0.3,volume=0.8")

gen(f"{SFX_DIR}/impact-punch.mp3",
    "anoisesrc=color=brown:duration=0.25",
    "lowpass=f=500,afade=t=out:st=0.02:d=0.23,volume=0.9")

# --- TECH ---
print("\n[Tech]")
gen(f"{SFX_DIR}/tech-glitch.mp3",
    "anoisesrc=color=white:duration=0.4",
    "bandpass=f=4000:width_type=o:w=3,tremolo=f=30:d=0.9,volume=0.5")

gen(f"{SFX_DIR}/tech-beep.mp3",
    "sine=frequency=1000:duration=0.3",
    "afade=t=out:st=0.2:d=0.1,volume=0.5")

gen(f"{SFX_DIR}/tech-data.mp3",
    "sine=frequency=2000:duration=0.8",
    "tremolo=f=20:d=0.9,afade=t=out:st=0.4:d=0.4,volume=0.4")

gen(f"{SFX_DIR}/tech-power-up.mp3",
    "sine=frequency=200:duration=1",
    "vibrato=f=8:d=1,afade=t=in:st=0:d=0.5,afade=t=out:st=0.7:d=0.3,volume=0.6")

gen(f"{SFX_DIR}/tech-power-down.mp3",
    "sine=frequency=800:duration=1",
    "vibrato=f=5:d=1,afade=t=in:st=0:d=0.1,afade=t=out:st=0.3:d=0.7,volume=0.6")

gen(f"{SFX_DIR}/tech-scan.mp3",
    "sine=frequency=3000:duration=0.6",
    "vibrato=f=12:d=0.8,afade=t=in:st=0:d=0.1,afade=t=out:st=0.3:d=0.3,volume=0.4")

gen(f"{SFX_DIR}/tech-digital-blip.mp3",
    "sine=frequency=1500:duration=0.15",
    "vibrato=f=20:d=0.5,afade=t=out:st=0.05:d=0.1,volume=0.5")

gen(f"{SFX_DIR}/tech-robot.mp3",
    "sine=frequency=300:duration=0.5",
    "vibrato=f=25:d=0.7,flanger=delay=2:depth=2:speed=5,volume=0.5")

# --- NATURE ---
print("\n[Nature]")
gen(f"{SFX_DIR}/nature-thunder.mp3",
    "anoisesrc=color=brown:duration=3",
    "lowpass=f=300,tremolo=f=0.5:d=0.9,afade=t=in:st=0:d=0.5,afade=t=out:st=1.5:d=1.5,volume=0.8")

gen(f"{SFX_DIR}/nature-rain.mp3",
    "anoisesrc=color=pink:duration=5",
    "bandpass=f=3000:width_type=o:w=2,tremolo=f=0.5:d=0.2,volume=0.3")

gen(f"{SFX_DIR}/nature-wind.mp3",
    "anoisesrc=color=brown:duration=4",
    "bandpass=f=400:width_type=o:w=1.5,tremolo=f=0.2:d=0.7,volume=0.4")

gen(f"{SFX_DIR}/nature-birds.mp3",
    "sine=frequency=3000:duration=3",
    "vibrato=f=12:d=0.8,tremolo=f=4:d=0.7,volume=0.3")

gen(f"{SFX_DIR}/nature-water-drop.mp3",
    "sine=frequency=2500:duration=0.5",
    "afade=t=out:st=0.02:d=0.48,aecho=0.8:0.88:40:0.4,volume=0.5")

gen(f"{SFX_DIR}/nature-ocean-wave.mp3",
    "anoisesrc=color=pink:duration=4",
    "lowpass=f=600,tremolo=f=0.15:d=0.8,volume=0.4")

gen(f"{SFX_DIR}/nature-crickets.mp3",
    "sine=frequency=4000:duration=3",
    "tremolo=f=15:d=0.9,volume=0.15")

# --- COMIC ---
print("\n[Comic]")
gen(f"{SFX_DIR}/comic-boing.mp3",
    "sine=frequency=300:duration=0.8",
    "vibrato=f=15:d=1,afade=t=out:st=0.1:d=0.7,volume=0.6")

gen_multi(f"{SFX_DIR}/comic-fail.mp3",
    ["sine=frequency=400:duration=1.2", "sine=frequency=300:duration=1.2", "sine=frequency=200:duration=1.2"],
    "[0:a]volume=0.3,afade=t=out:st=0:d=0.4[a];[1:a]volume=0.3,adelay=400|400,afade=t=out:st=0.4:d=0.4[b];[2:a]volume=0.35,adelay=800|800,afade=t=out:st=0.8:d=0.4[c];[a][b][c]amix=inputs=3[out]")

gen_multi(f"{SFX_DIR}/comic-win.mp3",
    ["sine=frequency=523:duration=1", "sine=frequency=659:duration=1", "sine=frequency=784:duration=1"],
    "[0:a]volume=0.3,afade=t=out:st=0:d=0.35[a];[1:a]volume=0.35,adelay=300|300,afade=t=out:st=0.3:d=0.35[b];[2:a]volume=0.4,adelay=600|600,afade=t=out:st=0.6:d=0.4[c];[a][b][c]amix=inputs=3[out]")

gen(f"{SFX_DIR}/comic-magic.mp3",
    "sine=frequency=1500:duration=1",
    "vibrato=f=10:d=0.5,tremolo=f=8:d=0.5,aecho=0.8:0.85:15:0.3,volume=0.4")

gen(f"{SFX_DIR}/comic-cartoon.mp3",
    "sine=frequency=500:duration=0.6",
    "vibrato=f=20:d=1,afade=t=out:st=0.1:d=0.5,volume=0.6")

gen(f"{SFX_DIR}/comic-spring.mp3",
    "sine=frequency=400:duration=0.5",
    "vibrato=f=12:d=0.8,afade=t=out:st=0.05:d=0.45,volume=0.5")

gen(f"{SFX_DIR}/comic-whistle.mp3",
    "sine=frequency=1200:duration=0.8",
    "vibrato=f=6:d=0.4,afade=t=in:st=0:d=0.1,afade=t=out:st=0.4:d=0.4,volume=0.4")

print("\n=== GENERATION COMPLETE ===")
music_count = len([f for f in os.listdir(MUSIC_DIR) if f.endswith('.mp3')])
sfx_count = len([f for f in os.listdir(SFX_DIR) if f.endswith('.mp3')])
print(f"Music tracks: {music_count}")
print(f"SFX samples: {sfx_count}")
print(f"Total: {music_count + sfx_count}")
