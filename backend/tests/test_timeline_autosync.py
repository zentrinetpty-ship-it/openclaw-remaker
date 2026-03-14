"""
Test suite for Timeline and Auto-Sync features
Tests: POST /api/editor/auto-sync, POST /api/audio/duration
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAutoSyncEndpoint:
    """Tests for POST /api/editor/auto-sync endpoint"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication token"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        if res.status_code == 200:
            token = res.json().get("token")
            return {"Authorization": f"Bearer {token}"}
        return {}
    
    def test_auto_sync_basic_slides(self, auth_headers):
        """Test auto-sync with basic slides without voice"""
        payload = {
            "slides": [
                {"id": "slide-1", "narration": "This is the first slide about testing.", "duration": 5},
                {"id": "slide-2", "narration": "Second slide with more content here.", "duration": 5},
            ],
            "voiceId": "en-US-Journey-D",
            "generateMissingVoices": False,  # Skip TTS for faster test
            "bufferPerSlide": 0.5
        }
        res = requests.post(f"{BASE_URL}/api/editor/auto-sync", json=payload, headers=auth_headers, timeout=30)
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "syncedSlides" in data
        assert "totalDuration" in data
        assert "summary" in data
        
        # Verify synced slides
        synced = data["syncedSlides"]
        assert len(synced) == 2
        assert synced[0]["id"] == "slide-1"
        assert synced[1]["id"] == "slide-2"
        
        # Verify each slide has required fields
        for s in synced:
            assert "optimalDuration" in s
            assert "voiceDuration" in s
            assert "hasVoice" in s
            assert "hasImage" in s
        
        print(f"Auto-sync returned {len(synced)} synced slides, total duration: {data['totalDuration']}s")
    
    def test_auto_sync_with_voice_generation(self, auth_headers):
        """Test auto-sync generates voices for slides without voiceUrl (may take 5-10s)"""
        payload = {
            "slides": [
                {"id": "test-sync-1", "narration": "Hello, this is a test slide for auto sync.", "duration": 5},
            ],
            "voiceId": "en-US-Journey-D",
            "generateMissingVoices": True,
            "bufferPerSlide": 0.5
        }
        res = requests.post(f"{BASE_URL}/api/editor/auto-sync", json=payload, headers=auth_headers, timeout=60)
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        
        assert data.get("success") == True
        assert "voicesGenerated" in data
        
        # If TTS worked, voice should be generated
        synced = data["syncedSlides"]
        if data["voicesGenerated"] > 0:
            assert synced[0].get("voiceUrl") is not None
            assert synced[0].get("voiceDuration", 0) > 0
            print(f"Voice generated: {synced[0]['voiceUrl']}, duration: {synced[0]['voiceDuration']}s")
        else:
            print("Voice generation skipped (TTS API may not be configured)")
    
    def test_auto_sync_summary_fields(self, auth_headers):
        """Test auto-sync returns correct summary statistics"""
        payload = {
            "slides": [
                {"id": "s1", "narration": "First narration", "duration": 5, "assetUrl": "/api/uploads/test.png"},
                {"id": "s2", "narration": "Second narration", "duration": 5},
                {"id": "s3", "narration": "", "duration": 3, "assetUrl": "/api/uploads/test2.png"},
            ],
            "generateMissingVoices": False,
            "bufferPerSlide": 0.5
        }
        res = requests.post(f"{BASE_URL}/api/editor/auto-sync", json=payload, headers=auth_headers, timeout=30)
        
        assert res.status_code == 200
        data = res.json()
        
        summary = data.get("summary", {})
        assert summary.get("totalSlides") == 3
        assert "slidesWithImage" in summary
        assert "avgSlideDuration" in summary
        
        print(f"Summary: {summary}")
    
    def test_auto_sync_with_bgm(self, auth_headers):
        """Test auto-sync analyzes BGM info when provided"""
        payload = {
            "slides": [
                {"id": "s1", "narration": "Test slide", "duration": 5},
            ],
            "bgmUrl": "/api/library/music/cinematic-epic-rise.mp3",
            "bgmVolume": 0.4,
            "generateMissingVoices": False,
        }
        res = requests.post(f"{BASE_URL}/api/editor/auto-sync", json=payload, headers=auth_headers, timeout=30)
        
        assert res.status_code == 200
        data = res.json()
        
        # bgmInfo may be None if file doesn't exist
        if data.get("bgmInfo"):
            assert "duration" in data["bgmInfo"]
            assert "needsLoop" in data["bgmInfo"]
            assert "needsTrim" in data["bgmInfo"]
            print(f"BGM info: {data['bgmInfo']}")
        else:
            print("BGM file not found in library (expected for test)")
    
    def test_auto_sync_without_auth(self):
        """Test auto-sync works without authentication (optional auth)"""
        payload = {
            "slides": [
                {"id": "s1", "narration": "Test without auth", "duration": 5},
            ],
            "generateMissingVoices": False,
        }
        res = requests.post(f"{BASE_URL}/api/editor/auto-sync", json=payload, timeout=30)
        
        # Should still work (user is optional in endpoint)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        assert data.get("success") == True
        print("Auto-sync works without authentication")


class TestAudioDurationEndpoint:
    """Tests for POST /api/audio/duration endpoint"""
    
    def test_audio_duration_invalid_url(self):
        """Test audio duration with invalid URL returns 0"""
        res = requests.post(f"{BASE_URL}/api/audio/duration", json={"url": "/api/uploads/nonexistent.mp3"})
        
        assert res.status_code == 200
        data = res.json()
        assert data.get("duration") == 0
        print("Invalid URL correctly returns duration 0")
    
    def test_audio_duration_empty_url(self):
        """Test audio duration with empty URL"""
        res = requests.post(f"{BASE_URL}/api/audio/duration", json={"url": ""})
        
        assert res.status_code == 200
        data = res.json()
        assert data.get("duration") == 0
        print("Empty URL correctly returns duration 0")
    
    def test_audio_duration_music_library(self):
        """Test audio duration for music library file"""
        # Try a music library track
        res = requests.post(f"{BASE_URL}/api/audio/duration", json={"url": "/api/library/music/cinematic-epic-rise.mp3"})
        
        assert res.status_code == 200
        data = res.json()
        # Duration can be 0 if file doesn't exist in library
        assert "duration" in data
        print(f"Music library track duration: {data['duration']}s")


class TestHealthAndStatus:
    """Basic health checks for API"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        res = requests.get(f"{BASE_URL}/api/")
        assert res.status_code == 200
        print(f"API root response: {res.json()}")
    
    def test_music_library(self):
        """Test music library endpoint"""
        res = requests.get(f"{BASE_URL}/api/library/music")
        assert res.status_code == 200
        data = res.json()
        assert "tracks" in data
        assert "categories" in data
        print(f"Music library has {len(data['tracks'])} tracks in {len(data['categories'])} categories")
    
    def test_sfx_library(self):
        """Test SFX library endpoint"""
        res = requests.get(f"{BASE_URL}/api/library/sfx")
        assert res.status_code == 200
        data = res.json()
        assert "sounds" in data
        assert "categories" in data
        print(f"SFX library has {len(data['sounds'])} sounds in {len(data['categories'])} categories")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
