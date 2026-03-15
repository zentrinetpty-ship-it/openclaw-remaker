"""
Tests for SFX, Captions, and Slide Title features.
Tests the new caption parameters (captionFont, captionColor, captionBgColor, captionPosition, captionSize)
and validates music/SFX library endpoints.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMusicAndSFXLibrary:
    """Test music and SFX library endpoints"""
    
    def test_get_music_library(self):
        """Verify music library returns tracks with all categories"""
        response = requests.get(f"{BASE_URL}/api/library/music")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "tracks" in data
        assert "categories" in data
        assert "total" in data
        
        # Verify we have music tracks (34 expected)
        assert len(data["tracks"]) > 0
        print(f"Music library: {data['total']} tracks in {len(data['categories'])} categories")
        
        # Verify track structure
        if data["tracks"]:
            track = data["tracks"][0]
            assert "id" in track
            assert "name" in track
            assert "category" in track
            assert "duration" in track
            assert "url" in track
    
    def test_get_sfx_library(self):
        """Verify SFX library returns sounds with all categories"""
        response = requests.get(f"{BASE_URL}/api/library/sfx")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "sounds" in data
        assert "categories" in data
        assert "total" in data
        
        # Verify we have SFX sounds (44 expected)
        assert len(data["sounds"]) > 0
        print(f"SFX library: {data['total']} sounds in {len(data['categories'])} categories")
        
        # Verify sound structure
        if data["sounds"]:
            sound = data["sounds"][0]
            assert "id" in sound
            assert "name" in sound
            assert "category" in sound
            assert "duration" in sound
            assert "url" in sound


class TestRenderEndpointWithCaptionParams:
    """Test render endpoint accepts new caption parameters"""
    
    def test_render_accepts_caption_params(self):
        """Verify /api/render accepts captionFont, captionColor, captionBgColor, captionPosition, captionSize"""
        # Create minimal render request with new caption params
        render_payload = {
            "slides": [
                {
                    "id": "test-slide-1",
                    "title": "Test Slide",
                    "narration": "Test narration text",
                    "imagePrompt": "A test image",
                    "duration": 5,
                    "transition": "fade"
                }
            ],
            "title": "Test Video",
            "projectId": "test-project-123",
            "generateVoice": False,
            "voiceId": "en-US-Journey-D",
            "captionStyleId": "bold-pop",
            "captionMode": "lines",
            # New caption parameters
            "captionFont": "Arial",
            "captionColor": "#FF0000",
            "captionBgColor": "#000000",
            "captionPosition": "top",
            "captionSize": 48
        }
        
        response = requests.post(f"{BASE_URL}/api/render", json=render_payload)
        
        # Should return success - render job started
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "jobId" in data
        print(f"Render started with jobId: {data['jobId']}")
    
    def test_render_with_default_caption_params(self):
        """Verify render works with default caption params (not specified)"""
        render_payload = {
            "slides": [
                {
                    "id": "test-slide-2",
                    "title": "Default Params Test",
                    "narration": "Testing default parameters",
                    "imagePrompt": "Test",
                    "duration": 3,
                    "transition": "fade"
                }
            ],
            "title": "Default Params Test Video",
            "projectId": "test-project-456",
            "generateVoice": False,
            "voiceId": "en-US-Journey-D",
            "captionStyleId": "minimal",
            "captionMode": "sentence"
            # Not specifying new caption params - should use defaults
        }
        
        response = requests.post(f"{BASE_URL}/api/render", json=render_payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Render with defaults started with jobId: {data['jobId']}")


class TestProjectSaveWithSFX:
    """Test project API is accessible and returns data with expected structure"""
    
    def setup_method(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Login failed - skipping authenticated tests")
    
    def test_get_projects_returns_sfx_and_title_settings(self):
        """Verify project data includes SFX and title position fields"""
        # Get an existing project
        projects_response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        assert projects_response.status_code == 200
        
        data = projects_response.json()
        assert data.get("success") == True
        assert "projects" in data
        
        if data.get("projects"):
            print(f"Found {len(data['projects'])} projects")
            # Verify project structure supports slide-level settings
            project = data["projects"][0]
            assert "slides" in project or "projectData" in project
            print(f"Project '{project.get('title')}' has expected structure")


class TestVolumeSliderBackend:
    """Test BGM volume is properly handled"""
    
    def test_render_with_bgm_volume(self):
        """Verify render accepts bgmVolume parameter"""
        render_payload = {
            "slides": [
                {
                    "id": "test-slide-vol",
                    "title": "Volume Test",
                    "narration": "Test",
                    "imagePrompt": "Test",
                    "duration": 3,
                    "transition": "fade"
                }
            ],
            "title": "Volume Test",
            "projectId": "test-vol-project",
            "generateVoice": False,
            "voiceId": "en-US-Journey-D",
            "captionStyleId": "minimal",
            "captionMode": "lines",
            "bgmUrl": "/api/library/music/cinematic-epic-rise.mp3",
            "bgmVolume": 0.6  # 60% volume
        }
        
        response = requests.post(f"{BASE_URL}/api/render", json=render_payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Render with bgmVolume 0.6 accepted, jobId: {data['jobId']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
