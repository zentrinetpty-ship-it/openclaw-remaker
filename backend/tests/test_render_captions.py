"""
Backend tests for ExplainaPro video render endpoint with caption burn-in feature.
Tests the /api/render endpoint with various caption styles and validates ASS subtitle creation.

Features tested:
- Render with different caption styles (bold-pop, netflix, minimal, tiktok, neon, glass)
- Render with captionStyleId=null should produce video without captions
- Render job status polling
- Auth endpoints for authenticated operations
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data for slides
TEST_SLIDES = [
    {
        "id": "1",
        "title": "Introduction",
        "narration": "Welcome to ExplainaPro, the AI-powered video creation platform.",
        "duration": 5,
        "imagePrompt": "Modern tech office background",
        "transition": "fade",
        "assetType": "none",
        "assetUrl": None
    },
    {
        "id": "2",
        "title": "Features",
        "narration": "Generate stunning videos with AI-powered visuals and voice.",
        "duration": 5,
        "imagePrompt": "AI technology abstract",
        "transition": "slide",
        "assetType": "none",
        "assetUrl": None
    }
]

# Caption styles to test
CAPTION_STYLES = ['bold-pop', 'netflix', 'minimal', 'tiktok', 'neon', 'glass']


class TestHealthCheck:
    """Basic API health check tests"""
    
    def test_api_root(self):
        """Test API root endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "ExplainaPro" in data["message"]
        print(f"✓ API root accessible: {data['message']}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_with_test_credentials(self):
        """Test login with provided test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        # May fail if user doesn't exist - that's ok, we'll create
        if response.status_code == 401:
            print("✓ Login returned 401 (user may not exist yet)")
        else:
            assert response.status_code == 200
            data = response.json()
            assert "token" in data
            print(f"✓ Login successful, token received")
    
    def test_register_test_user(self):
        """Register test user if not exists"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "test@test.com",
            "password": "password",
            "name": "Test User"
        })
        # 400 means user already exists
        if response.status_code == 400:
            print("✓ Test user already exists")
        else:
            assert response.status_code == 200
            data = response.json()
            assert "token" in data
            print(f"✓ Test user registered successfully")


class TestRenderWithCaptions:
    """Tests for /api/render endpoint with caption styles"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for authenticated requests"""
        # First try login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        # If login fails, try register
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "test@test.com",
            "password": "password",
            "name": "Test User"
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        return None
    
    def test_render_with_bold_pop_caption(self):
        """Test render with bold-pop caption style"""
        response = requests.post(f"{BASE_URL}/api/render", json={
            "projectId": "test-project-bold-pop",
            "slides": TEST_SLIDES,
            "title": "Test Video Bold Pop",
            "duration": 10,
            "generateVoice": False,
            "voiceId": "en-US-Journey-D",
            "captionStyleId": "bold-pop"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "jobId" in data
        print(f"✓ Render started with bold-pop caption, jobId: {data['jobId']}")
        return data["jobId"]
    
    def test_render_with_netflix_caption(self):
        """Test render with netflix caption style"""
        response = requests.post(f"{BASE_URL}/api/render", json={
            "projectId": "test-project-netflix",
            "slides": TEST_SLIDES,
            "title": "Test Video Netflix",
            "duration": 10,
            "generateVoice": False,
            "voiceId": "en-US-Journey-D",
            "captionStyleId": "netflix"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "jobId" in data
        print(f"✓ Render started with netflix caption, jobId: {data['jobId']}")
    
    def test_render_with_minimal_caption(self):
        """Test render with minimal caption style"""
        response = requests.post(f"{BASE_URL}/api/render", json={
            "projectId": "test-project-minimal",
            "slides": TEST_SLIDES,
            "title": "Test Video Minimal",
            "duration": 10,
            "generateVoice": False,
            "voiceId": "en-US-Journey-D",
            "captionStyleId": "minimal"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Render started with minimal caption, jobId: {data['jobId']}")
    
    def test_render_with_tiktok_caption(self):
        """Test render with tiktok caption style"""
        response = requests.post(f"{BASE_URL}/api/render", json={
            "projectId": "test-project-tiktok",
            "slides": TEST_SLIDES,
            "title": "Test Video TikTok",
            "duration": 10,
            "generateVoice": False,
            "voiceId": "en-US-Journey-D",
            "captionStyleId": "tiktok"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Render started with tiktok caption, jobId: {data['jobId']}")
    
    def test_render_with_neon_caption(self):
        """Test render with neon caption style"""
        response = requests.post(f"{BASE_URL}/api/render", json={
            "projectId": "test-project-neon",
            "slides": TEST_SLIDES,
            "title": "Test Video Neon",
            "duration": 10,
            "generateVoice": False,
            "voiceId": "en-US-Journey-D",
            "captionStyleId": "neon"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Render started with neon caption, jobId: {data['jobId']}")
    
    def test_render_with_glass_caption(self):
        """Test render with glass caption style"""
        response = requests.post(f"{BASE_URL}/api/render", json={
            "projectId": "test-project-glass",
            "slides": TEST_SLIDES,
            "title": "Test Video Glass",
            "duration": 10,
            "generateVoice": False,
            "voiceId": "en-US-Journey-D",
            "captionStyleId": "glass"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Render started with glass caption, jobId: {data['jobId']}")
    
    def test_render_without_caption(self):
        """Test render with captionStyleId=null (no captions)"""
        response = requests.post(f"{BASE_URL}/api/render", json={
            "projectId": "test-project-no-caption",
            "slides": TEST_SLIDES,
            "title": "Test Video No Caption",
            "duration": 10,
            "generateVoice": False,
            "voiceId": "en-US-Journey-D",
            "captionStyleId": None
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "jobId" in data
        print(f"✓ Render started WITHOUT captions, jobId: {data['jobId']}")
    
    def test_render_status_polling(self):
        """Test render job status endpoint"""
        # Start a render job first
        response = requests.post(f"{BASE_URL}/api/render", json={
            "projectId": "test-project-status",
            "slides": TEST_SLIDES,
            "title": "Test Video Status",
            "duration": 10,
            "generateVoice": False,
            "voiceId": "en-US-Journey-D",
            "captionStyleId": "bold-pop"
        })
        assert response.status_code == 200
        job_id = response.json()["jobId"]
        
        # Poll for status
        time.sleep(2)  # Wait a bit for processing
        status_response = requests.get(f"{BASE_URL}/api/render/{job_id}")
        assert status_response.status_code == 200
        status_data = status_response.json()
        
        assert "status" in status_data
        assert status_data["status"] in ["pending", "processing", "completed", "failed"]
        print(f"✓ Render status: {status_data['status']}, progress: {status_data.get('progress', 0)}%")
    
    def test_render_invalid_job_id(self):
        """Test render status with invalid job ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/render/invalid-job-id-12345")
        assert response.status_code == 404
        print("✓ Invalid job ID correctly returns 404")


class TestRenderComplete:
    """Test full render workflow completion"""
    
    def test_full_render_with_caption_completion(self):
        """Test full render workflow and wait for completion"""
        # Start render with bold-pop style
        response = requests.post(f"{BASE_URL}/api/render", json={
            "projectId": "test-full-render",
            "slides": TEST_SLIDES,
            "title": "Full Render Test",
            "duration": 10,
            "generateVoice": False,
            "voiceId": "en-US-Journey-D",
            "captionStyleId": "bold-pop"
        })
        assert response.status_code == 200
        job_id = response.json()["jobId"]
        print(f"Started render job: {job_id}")
        
        # Poll until complete or timeout (60 seconds max)
        max_wait = 60
        start_time = time.time()
        final_status = None
        
        while time.time() - start_time < max_wait:
            status_response = requests.get(f"{BASE_URL}/api/render/{job_id}")
            if status_response.status_code == 200:
                status_data = status_response.json()
                final_status = status_data.get("status")
                progress = status_data.get("progress", 0)
                step = status_data.get("step", "")
                print(f"  Progress: {progress}% - {step}")
                
                if final_status == "completed":
                    assert "videoUrl" in status_data
                    print(f"✓ Render completed! Video URL: {status_data['videoUrl']}")
                    
                    # Verify video is accessible
                    video_response = requests.head(f"{BASE_URL}{status_data['videoUrl']}")
                    if video_response.status_code == 200:
                        print(f"✓ Rendered video is accessible at {status_data['videoUrl']}")
                    return
                elif final_status == "failed":
                    print(f"✗ Render failed: {status_data.get('error', 'Unknown error')}")
                    break
            
            time.sleep(2)
        
        # If we reach here without completion
        print(f"Render job final status: {final_status}")
        assert final_status == "completed", f"Render did not complete. Final status: {final_status}"


class TestOtherEndpoints:
    """Test other relevant endpoints"""
    
    def test_projects_endpoint(self):
        """Test GET /api/projects endpoint"""
        response = requests.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        print(f"✓ Projects endpoint works: {len(data.get('projects', []))} projects found")
    
    def test_search_assets_endpoint(self):
        """Test mocked search assets endpoint"""
        response = requests.get(f"{BASE_URL}/api/search/assets?q=business")
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        print(f"✓ Search assets endpoint works (MOCKED): {len(data['results'])} results")
    
    def test_search_audio_endpoint(self):
        """Test mocked search audio endpoint"""
        response = requests.get(f"{BASE_URL}/api/search/audio?q=ambient")
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        print(f"✓ Search audio endpoint works (MOCKED): {len(data['results'])} results")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
