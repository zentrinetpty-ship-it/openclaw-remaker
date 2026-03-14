"""
Test suite for Background Music (BGM) feature in ExplainaPro.
Tests: BGM upload, render with BGM+voice, render BGM-only, bgmVolume control.
"""
import pytest
import requests
import os
import time
import subprocess

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_AUDIO_FILE = "/app/backend/uploads/voice-20260314032043-9c06a93.mp3"  # Existing test audio
TEST_IMAGE_FILE = "/app/backend/uploads/upload-20260314063117-71e13df.png"  # Existing test image

@pytest.fixture
def api_client():
    """Shared requests session."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def auth_token(api_client):
    """Get authentication token by logging in."""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test@test.com",
        "password": "password"
    })
    if response.status_code == 200:
        return response.json().get("token")
    # Try to register if login fails
    reg_response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": "test@test.com",
        "password": "password",
        "name": "Test User"
    })
    if reg_response.status_code in [200, 201]:
        return reg_response.json().get("token")
    pytest.skip("Authentication failed")

@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header."""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestBGMUpload:
    """Test uploading background music files."""
    
    def test_upload_audio_file(self, api_client):
        """Test uploading an audio file returns correct URL format."""
        with open(TEST_AUDIO_FILE, 'rb') as f:
            files = {'file': ('test_bgm.mp3', f, 'audio/mpeg')}
            response = requests.post(f"{BASE_URL}/api/upload", files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "url" in data
        assert data["url"].startswith("/api/uploads/")
        assert "size" in data
        print(f"Uploaded BGM: {data['url']}, size: {data['size']} bytes")
        return data["url"]
    
    def test_uploaded_audio_accessible(self, api_client):
        """Test that uploaded audio file is accessible."""
        # First upload
        with open(TEST_AUDIO_FILE, 'rb') as f:
            files = {'file': ('test_bgm_access.mp3', f, 'audio/mpeg')}
            upload_response = requests.post(f"{BASE_URL}/api/upload", files=files)
        
        assert upload_response.status_code == 200
        url = upload_response.json()["url"]
        
        # Access the file
        file_response = requests.get(f"{BASE_URL}{url}")
        assert file_response.status_code == 200
        assert len(file_response.content) > 0
        print(f"Audio file accessible at {url}, size: {len(file_response.content)} bytes")


class TestRenderWithBGM:
    """Test rendering videos with background music."""
    
    @pytest.fixture
    def uploaded_bgm_url(self):
        """Upload a test audio file and return its URL."""
        with open(TEST_AUDIO_FILE, 'rb') as f:
            files = {'file': ('render_test_bgm.mp3', f, 'audio/mpeg')}
            response = requests.post(f"{BASE_URL}/api/upload", files=files)
        assert response.status_code == 200
        return response.json()["url"]
    
    def test_render_request_accepts_bgm_params(self, api_client, uploaded_bgm_url):
        """Test POST /api/render accepts bgmUrl and bgmVolume parameters."""
        slides = [{
            "id": "1",
            "title": "BGM Param Test",
            "narration": "Testing BGM parameter acceptance.",
            "duration": 3,
            "assetUrl": f"/api/uploads/{os.path.basename(TEST_IMAGE_FILE)}"
        }]
        
        response = api_client.post(f"{BASE_URL}/api/render", json={
            "projectId": "test-bgm-params",
            "slides": slides,
            "title": "BGM Params Test",
            "duration": 3,
            "generateVoice": False,
            "bgmUrl": uploaded_bgm_url,
            "bgmVolume": 0.5
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "jobId" in data
        print(f"Render job started with BGM params: jobId={data['jobId']}")
        return data["jobId"]
    
    def test_render_bgm_only_no_voice(self, api_client, uploaded_bgm_url):
        """Test rendering with BGM only (no voice narration) produces video with audio."""
        slides = [{
            "id": "1",
            "title": "BGM Only Test",
            "narration": "",  # No narration
            "duration": 4,
            "assetUrl": f"/api/uploads/{os.path.basename(TEST_IMAGE_FILE)}"
        }]
        
        # Start render with BGM only
        response = api_client.post(f"{BASE_URL}/api/render", json={
            "projectId": "test-bgm-only",
            "slides": slides,
            "title": "BGM Only Test",
            "duration": 4,
            "generateVoice": False,
            "bgmUrl": uploaded_bgm_url,
            "bgmVolume": 0.6
        })
        
        assert response.status_code == 200
        job_id = response.json()["jobId"]
        
        # Poll for completion
        video_url = self._wait_for_render(api_client, job_id)
        assert video_url is not None, "Render should complete successfully"
        
        # Download and verify the video has an audio track
        self._verify_video_has_audio(video_url)
        print(f"BGM-only render completed: {video_url}")
    
    def test_render_bgm_plus_voice(self, api_client, uploaded_bgm_url):
        """Test rendering with both BGM and voice produces video with mixed audio."""
        slides = [{
            "id": "1",
            "title": "BGM Plus Voice Test",
            "narration": "This slide has both voice narration and background music mixed together.",
            "duration": 5,
            "assetUrl": f"/api/uploads/{os.path.basename(TEST_IMAGE_FILE)}",
            "voiceUrl": f"/api/uploads/{os.path.basename(TEST_AUDIO_FILE)}"  # Pre-existing voice
        }]
        
        response = api_client.post(f"{BASE_URL}/api/render", json={
            "projectId": "test-bgm-voice-mix",
            "slides": slides,
            "title": "BGM Voice Mix Test",
            "duration": 5,
            "generateVoice": False,  # Using pre-existing voice
            "bgmUrl": uploaded_bgm_url,
            "bgmVolume": 0.4
        })
        
        assert response.status_code == 200
        job_id = response.json()["jobId"]
        
        # Poll for completion
        video_url = self._wait_for_render(api_client, job_id)
        assert video_url is not None, "Render with BGM+voice should complete"
        
        # Verify video has audio
        self._verify_video_has_audio(video_url)
        print(f"BGM+voice render completed: {video_url}")
    
    def test_render_without_bgm_no_regression(self, api_client):
        """Test rendering without bgmUrl still produces video correctly (no regression)."""
        slides = [{
            "id": "1",
            "title": "No BGM Test",
            "narration": "This is a test without background music.",
            "duration": 3,
            "assetUrl": f"/api/uploads/{os.path.basename(TEST_IMAGE_FILE)}",
            "voiceUrl": f"/api/uploads/{os.path.basename(TEST_AUDIO_FILE)}"
        }]
        
        # Render WITHOUT bgmUrl
        response = api_client.post(f"{BASE_URL}/api/render", json={
            "projectId": "test-no-bgm",
            "slides": slides,
            "title": "No BGM Regression Test",
            "duration": 3,
            "generateVoice": False
            # No bgmUrl parameter
        })
        
        assert response.status_code == 200
        job_id = response.json()["jobId"]
        
        # Poll for completion
        video_url = self._wait_for_render(api_client, job_id)
        assert video_url is not None, "Render without BGM should still work"
        
        # Verify video exists
        video_response = requests.get(f"{BASE_URL}{video_url}")
        assert video_response.status_code == 200
        print(f"No-BGM render completed (no regression): {video_url}")
    
    def test_bgm_volume_control(self, api_client, uploaded_bgm_url):
        """Test bgmVolume parameter controls the volume of BGM (renders at 0.5)."""
        slides = [{
            "id": "1",
            "title": "Volume Control Test",
            "narration": "Testing volume control.",
            "duration": 3,
            "assetUrl": f"/api/uploads/{os.path.basename(TEST_IMAGE_FILE)}",
            "voiceUrl": f"/api/uploads/{os.path.basename(TEST_AUDIO_FILE)}"
        }]
        
        # Render with bgmVolume = 0.5
        response = api_client.post(f"{BASE_URL}/api/render", json={
            "projectId": "test-bgm-volume",
            "slides": slides,
            "title": "BGM Volume Test",
            "duration": 3,
            "generateVoice": False,
            "bgmUrl": uploaded_bgm_url,
            "bgmVolume": 0.5
        })
        
        assert response.status_code == 200
        job_id = response.json()["jobId"]
        
        video_url = self._wait_for_render(api_client, job_id)
        assert video_url is not None
        self._verify_video_has_audio(video_url)
        print(f"BGM volume control test completed at 0.5 volume: {video_url}")
    
    def test_render_multiple_slides_with_bgm(self, api_client, uploaded_bgm_url):
        """Test rendering multiple slides with looping BGM."""
        slides = [
            {
                "id": "1",
                "title": "Slide 1",
                "narration": "First slide with background music.",
                "duration": 3,
                "assetUrl": f"/api/uploads/{os.path.basename(TEST_IMAGE_FILE)}"
            },
            {
                "id": "2",
                "title": "Slide 2",
                "narration": "Second slide, music continues.",
                "duration": 3,
                "assetUrl": f"/api/uploads/{os.path.basename(TEST_IMAGE_FILE)}"
            },
            {
                "id": "3",
                "title": "Slide 3",
                "narration": "Third and final slide.",
                "duration": 3,
                "assetUrl": f"/api/uploads/{os.path.basename(TEST_IMAGE_FILE)}"
            }
        ]
        
        response = api_client.post(f"{BASE_URL}/api/render", json={
            "projectId": "test-multi-slide-bgm",
            "slides": slides,
            "title": "Multi Slide BGM Test",
            "duration": 9,
            "generateVoice": False,
            "bgmUrl": uploaded_bgm_url,
            "bgmVolume": 0.4
        })
        
        assert response.status_code == 200
        job_id = response.json()["jobId"]
        
        video_url = self._wait_for_render(api_client, job_id)
        assert video_url is not None
        self._verify_video_has_audio(video_url)
        print(f"Multi-slide BGM render completed: {video_url}")
    
    def _wait_for_render(self, api_client, job_id, timeout=120):
        """Poll render status until complete or timeout."""
        start_time = time.time()
        while time.time() - start_time < timeout:
            status_response = api_client.get(f"{BASE_URL}/api/render/{job_id}")
            if status_response.status_code != 200:
                time.sleep(2)
                continue
            
            status_data = status_response.json()
            print(f"  Render progress: {status_data.get('progress', 0)}% - {status_data.get('step', '')}")
            
            if status_data.get("status") == "completed":
                return status_data.get("videoUrl")
            elif status_data.get("status") == "failed":
                print(f"  Render failed: {status_data.get('error', 'Unknown error')}")
                return None
            
            time.sleep(3)
        
        print("  Render timed out")
        return None
    
    def _verify_video_has_audio(self, video_url):
        """Verify that the rendered video has an audio track using ffprobe."""
        # Download video to temp file
        video_response = requests.get(f"{BASE_URL}{video_url}")
        assert video_response.status_code == 200
        
        temp_path = f"/tmp/test_video_{int(time.time())}.mp4"
        with open(temp_path, 'wb') as f:
            f.write(video_response.content)
        
        # Use ffprobe to check for audio stream
        result = subprocess.run([
            'ffprobe', '-v', 'error', '-select_streams', 'a',
            '-show_entries', 'stream=codec_type', '-of', 'csv=p=0',
            temp_path
        ], capture_output=True, text=True)
        
        has_audio = 'audio' in result.stdout
        
        # Cleanup
        os.remove(temp_path)
        
        assert has_audio, f"Video {video_url} should have an audio track"
        print(f"  Verified: Video has audio track")


class TestRenderStatusPolling:
    """Test render job status polling."""
    
    def test_render_status_reports_progress(self, api_client):
        """Test that render status endpoint reports progress correctly."""
        # Start a simple render
        slides = [{
            "id": "1",
            "title": "Status Test",
            "narration": "Testing status.",
            "duration": 2,
            "assetUrl": f"/api/uploads/{os.path.basename(TEST_IMAGE_FILE)}"
        }]
        
        response = api_client.post(f"{BASE_URL}/api/render", json={
            "projectId": "test-status-polling",
            "slides": slides,
            "title": "Status Polling Test",
            "duration": 2,
            "generateVoice": False
        })
        
        assert response.status_code == 200
        job_id = response.json()["jobId"]
        
        # Poll status
        time.sleep(1)
        status_response = api_client.get(f"{BASE_URL}/api/render/{job_id}")
        assert status_response.status_code == 200
        
        status_data = status_response.json()
        assert "status" in status_data
        assert status_data["status"] in ["pending", "processing", "completed", "failed"]
        
        if status_data["status"] == "processing":
            assert "progress" in status_data
            assert "step" in status_data
        
        print(f"Status polling works: {status_data}")
    
    def test_invalid_job_id_returns_404(self, api_client):
        """Test that invalid job ID returns 404."""
        response = api_client.get(f"{BASE_URL}/api/render/invalid-job-id-12345")
        assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
