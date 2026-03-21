#!/usr/bin/env python3
"""Standalone render worker - runs independently of the backend.
Reads job config from JSON, renders using Remotion, writes status to disk."""

import sys
import os
import json
import shutil
import asyncio
import logging
import uuid
import base64
from pathlib import Path
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format='%(asctime)s - render - %(levelname)s - %(message)s')
logger = logging.getLogger('render')

ROOT_DIR = Path(__file__).parent
UPLOADS_DIR = ROOT_DIR / 'uploads'
RENDERS_DIR = ROOT_DIR / 'renders'
MUSIC_LIB_DIR = ROOT_DIR / 'library' / 'music'
SFX_LIB_DIR = ROOT_DIR / 'library' / 'sfx'

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / '.env')

def write_status(status_file, data):
    tmp = str(status_file) + '.tmp'
    with open(tmp, 'w') as f:
        json.dump(data, f)
    os.replace(tmp, str(status_file))

async def generate_voice_tts(text, voice_id, api_key):
    try:
        import httpx
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"https://texttospeech.googleapis.com/v1/text:synthesize?key={api_key}",
                json={
                    "input": {"text": text},
                    "voice": {"languageCode": voice_id[:5], "name": voice_id},
                    "audioConfig": {"audioEncoding": "MP3", "speakingRate": 1.0, "pitch": 0}
                }
            )
            if response.status_code == 200:
                audio_content = response.json().get("audioContent")
                if audio_content:
                    return base64.b64decode(audio_content)
    except Exception as e:
        logger.error(f"TTS error: {e}")
    return None

async def run_render(job_file):
    with open(job_file, 'r') as f:
        job = json.load(f)
    
    job_id = job['job_id']
    status_file = Path(job['status_file'])
    slides = job['slides']
    title = job['title']
    generate_voice = job.get('generate_voice', True)
    voice_id = job.get('voice_id', 'en-US-Journey-D')
    caption_style_id = job.get('caption_style_id')
    caption_mode = job.get('caption_mode', 'words')
    caption_font = job.get('caption_font')
    caption_color = job.get('caption_color')
    caption_bg_color = job.get('caption_bg_color')
    caption_position = job.get('caption_position', 'bottom')
    caption_size = job.get('caption_size', 44)
    bgm_url = job.get('bgm_url')
    bgm_volume = job.get('bgm_volume', 0.4)
    music_tracks = job.get('music_tracks', [])
    
    tts_api_key = os.getenv("GOOGLE_TTS_API_KEY")
    base_url = "http://localhost:8001"
    
    try:
        write_status(status_file, {"status": "processing", "progress": 5, "step": "Preparing assets..."})
        
        remotion_slides = []
        total_slides = len(slides)
        
        for idx, slide in enumerate(slides):
            pct = 5 + int((idx / max(total_slides, 1)) * 35)
            write_status(status_file, {"status": "processing", "progress": pct, "step": f"Processing slide {idx+1}/{total_slides}"})
            
            asset_url = slide.get('assetUrl')
            duration = round(slide.get('duration', 6))
            narration = slide.get('narration', '')
            voice_url = slide.get('voiceUrl')
            transition = slide.get('transition', 'fade')
            
            # Resolve image/video asset
            asset_type = slide.get('assetType', 'image')
            image_url = None
            video_url = None
            if asset_url:
                resolved_url = None
                if '/api/uploads/' in asset_url:
                    fn = asset_url.split('/')[-1]
                    if (UPLOADS_DIR / fn).exists():
                        resolved_url = f"{base_url}/api/uploads/{fn}"
                elif asset_url.startswith('http'):
                    resolved_url = asset_url
                
                if asset_type == 'video':
                    video_url = resolved_url
                else:
                    image_url = resolved_url
            
            # Resolve or generate voice
            voice_http_url = None
            if voice_url and voice_url.startswith('/api/uploads/'):
                src = UPLOADS_DIR / voice_url.split('/')[-1]
                if src.exists():
                    voice_http_url = f"{base_url}{voice_url}"
            
            if not voice_http_url and generate_voice and narration and tts_api_key:
                write_status(status_file, {"status": "processing", "progress": pct, "step": f"Generating voice {idx+1}/{total_slides}"})
                audio_bytes = await generate_voice_tts(narration, voice_id, tts_api_key)
                if audio_bytes:
                    audio_fn = f"voice_{job_id}_{idx}.mp3"
                    with open(UPLOADS_DIR / audio_fn, 'wb') as f:
                        f.write(audio_bytes)
                    voice_http_url = f"{base_url}/api/uploads/{audio_fn}"
            
            # Resolve SFX URL
            sfx_url = slide.get('sfxUrl')
            sfx_http_url = None
            if sfx_url:
                if '/api/library/' in sfx_url:
                    fn = sfx_url.split('/')[-1]
                    d = SFX_LIB_DIR if '/sfx/' in sfx_url else MUSIC_LIB_DIR
                    if (d / fn).exists():
                        sfx_http_url = f"{base_url}{sfx_url}"
                elif '/api/uploads/' in sfx_url:
                    fn = sfx_url.split('/')[-1]
                    if (UPLOADS_DIR / fn).exists():
                        sfx_http_url = f"{base_url}/api/uploads/{fn}"
                elif sfx_url.startswith('http'):
                    sfx_http_url = sfx_url
            
            remotion_slides.append({
                "imageUrl": image_url,
                "videoUrl": video_url,
                "narration": narration,
                "duration": duration,
                "transition": transition,
                "voiceUrl": voice_http_url,
                "sfxUrl": sfx_http_url,
                "graphics": slide.get('graphics', []),
                "title": slide.get('title', ''),
                "titlePosition": slide.get('titlePosition', 'top-left'),
            })
        
        if not remotion_slides:
            write_status(status_file, {"status": "failed", "error": "No slides to render"})
            return
        
        # Resolve BGM
        bgm_http_url = None
        if bgm_url:
            if '/api/library/' in bgm_url:
                fn = bgm_url.split('/')[-1]
                d = MUSIC_LIB_DIR if '/music/' in bgm_url else SFX_LIB_DIR
                if (d / fn).exists():
                    bgm_http_url = f"{base_url}{bgm_url}"
            elif '/api/uploads/' in bgm_url:
                fn = bgm_url.split('/')[-1]
                if (UPLOADS_DIR / fn).exists():
                    bgm_http_url = f"{base_url}/api/uploads/{fn}"
            elif bgm_url.startswith('http'):
                bgm_http_url = bgm_url
        
        # Resolve additional music track URLs
        resolved_music_tracks = []
        for track in music_tracks:
            track_url = track.get('url')
            if track_url:
                resolved = None
                if '/api/library/music/' in track_url:
                    fn = track_url.split('/')[-1]
                    if (MUSIC_LIB_DIR / fn).exists():
                        resolved = f"{base_url}{track_url}"
                elif '/api/uploads/' in track_url:
                    fn = track_url.split('/')[-1]
                    if (UPLOADS_DIR / fn).exists():
                        resolved = f"{base_url}/api/uploads/{fn}"
                elif track_url.startswith('http'):
                    resolved = track_url
                if resolved:
                    resolved_music_tracks.append({"url": resolved, "volume": track.get('volume', 0.3)})
        
        # Write Remotion data
        remotion_data = {
            "slides": remotion_slides,
            "captionStyleId": caption_style_id,
            "captionMode": caption_mode,
            "captionFont": caption_font,
            "captionColor": caption_color,
            "captionBgColor": caption_bg_color,
            "captionPosition": caption_position,
            "captionSize": caption_size,
            "bgmUrl": bgm_http_url,
            "bgmVolume": bgm_volume,
            "musicTracks": resolved_music_tracks,
        }
        
        temp_dir = RENDERS_DIR / f"temp_{job_id}"
        temp_dir.mkdir(exist_ok=True)
        data_file = temp_dir / "render_data.json"
        with open(data_file, 'w') as f:
            json.dump(remotion_data, f)
        
        safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).strip()[:50]
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        output_filename = f"{safe_title}-{timestamp}.mp4"
        output_path = RENDERS_DIR / output_filename
        
        write_status(status_file, {"status": "processing", "progress": 42, "step": "Launching Remotion renderer..."})
        logger.info(f"Starting render: {len(remotion_slides)} slides -> {output_path}")
        
        # Run Remotion
        remotion_dir = ROOT_DIR.parent / "remotion"
        
        # Find node - check common paths directly, including nvm
        node_path = None
        search_paths = [
            '/usr/bin/node',
            '/usr/local/bin/node',
            os.path.expanduser('~/.nvm/versions/node/*/bin/node'),  # nvm
            '/root/.nvm/versions/node/*/bin/node',
        ]
        # Expand glob patterns
        import glob as glob_mod
        expanded_paths = []
        for p in search_paths:
            if '*' in p:
                expanded_paths.extend(sorted(glob_mod.glob(p), reverse=True))  # latest version first
            else:
                expanded_paths.append(p)
        for p in expanded_paths:
            if os.path.isfile(p) and os.access(p, os.X_OK):
                node_path = p
                break
        if not node_path:
            node_path = shutil.which('node')
        if not node_path:
            # Try installing node
            logger.warning("node not found anywhere, attempting install...")
            import subprocess as sp
            sp.run(['apt-get', 'update', '-qq'], capture_output=True, timeout=60)
            sp.run(['apt-get', 'install', '-y', '-qq', 'nodejs', 'npm'], capture_output=True, timeout=120)
            for p in ['/usr/bin/node', '/usr/local/bin/node']:
                if os.path.isfile(p) and os.access(p, os.X_OK):
                    node_path = p
                    break
            if not node_path:
                node_path = shutil.which('node')
        if not node_path:
            write_status(status_file, {"status": "failed", "error": "Node.js could not be found or installed. Please contact support."})
            return
        
        logger.info(f"Using node at: {node_path} (version check follows)")
        # Verify node actually works
        try:
            import subprocess as sp
            ver_result = sp.run([node_path, '--version'], capture_output=True, timeout=10, text=True)
            logger.info(f"Node version: {ver_result.stdout.strip()}")
        except Exception as ve:
            logger.error(f"Node version check failed: {ve}")
        
        # Ensure remotion node_modules exist
        # Build PATH with node's parent dir included
        node_bin_dir = os.path.dirname(node_path)
        env = {**os.environ, "PATH": f"{node_bin_dir}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:{os.environ.get('PATH', '')}"}
        if not (remotion_dir / 'node_modules').exists():
            logger.info("Installing remotion dependencies...")
            import subprocess as sp
            yarn_path = shutil.which('yarn') or '/usr/bin/yarn'
            if not os.path.isfile(yarn_path):
                sp.run([node_path, '/usr/bin/npm', 'install', '-g', 'yarn'], capture_output=True, timeout=60, env=env)
                yarn_path = shutil.which('yarn') or '/usr/bin/yarn'
            sp.run([yarn_path, 'install', '--frozen-lockfile'], cwd=str(remotion_dir), capture_output=True, timeout=120, env=env)
        
        proc = await asyncio.create_subprocess_exec(
            node_path, '--max-old-space-size=4096',
            str(remotion_dir / 'render.mjs'),
            str(data_file), str(output_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(remotion_dir),
            env=env,
        )
        
        # Read BOTH stdout and stderr concurrently to avoid deadlock
        stdout_lines = []
        stderr_lines = []
        
        async def read_stderr():
            while True:
                line = await proc.stderr.readline()
                if not line:
                    break
                msg = line.decode().strip()
                if msg:
                    stderr_lines.append(msg)
                    logger.info(f"Remotion: {msg}")
                    if "Progress:" in msg:
                        try:
                            pct = int(msg.split("Progress:")[1].strip().replace("%", ""))
                            # Map Remotion 0-100% to our 42-95%
                            mapped = 42 + int(pct * 0.53)
                            write_status(status_file, {
                                "status": "processing",
                                "progress": mapped,
                                "step": f"Rendering... {pct}%"
                            })
                        except (ValueError, IndexError):
                            pass
                    elif "Bundling" in msg:
                        write_status(status_file, {"status": "processing", "progress": 44, "step": "Bundling composition..."})
                    elif "Composition:" in msg:
                        write_status(status_file, {"status": "processing", "progress": 48, "step": "Preparing frames..."})
                    elif "Error" in msg:
                        write_status(status_file, {"status": "processing", "progress": 42, "step": f"Error: {msg[:100]}"})
        
        async def read_stdout():
            while True:
                line = await proc.stdout.readline()
                if not line:
                    break
                stdout_lines.append(line.decode().strip())
        
        # Run both readers concurrently
        await asyncio.gather(read_stderr(), read_stdout())
        await proc.wait()
        
        logger.info(f"Remotion exit code: {proc.returncode}")
        
        if proc.returncode == 0 and output_path.exists():
            video_url = f"/api/renders/{output_filename}"
            write_status(status_file, {
                "status": "completed",
                "progress": 100,
                "videoUrl": video_url,
                "hasAudio": any(s.get('voiceUrl') for s in remotion_slides) or bgm_http_url is not None
            })
            logger.info(f"Render completed: {output_path} ({output_path.stat().st_size} bytes)")
        else:
            # Collect error info from both streams
            err = "\n".join(stderr_lines[-5:]) if stderr_lines else ""
            out = "\n".join(stdout_lines[-3:]) if stdout_lines else ""
            error_msg = err or out or "Unknown error"
            logger.error(f"Render failed (exit={proc.returncode}): {error_msg}")
            write_status(status_file, {"status": "failed", "error": f"Render failed: {error_msg[:500]}"})
        
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    except Exception as e:
        logger.error(f"Render worker error: {e}", exc_info=True)
        write_status(status_file, {"status": "failed", "error": str(e)[:500]})

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: render_worker.py <job_file>")
        sys.exit(1)
    asyncio.run(run_render(sys.argv[1]))
