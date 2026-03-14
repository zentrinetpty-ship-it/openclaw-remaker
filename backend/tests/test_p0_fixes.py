"""
Test P0 Fixes for ExplainaPro:
1. Auth flow (login with test credentials)
2. Save project duplicate check (upsert by title+userId)
3. Render endpoint with 3+ slides and Remotion stability
4. Library endpoints (music and sfx)
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Fixtures
@pytest.fixture
def api_client():
    """Shared requests session."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def test_user_credentials():
    """Test user credentials."""
    return {
        "email": "test@test.com",
        "password": "password"
    }

@pytest.fixture
def auth_token(api_client, test_user_credentials):
    """Get authentication token - either register or login."""
    # First try to login
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=test_user_credentials)
    if response.status_code == 200:
        data = response.json()
        return data.get("token"), data.get("user", {}).get("id")
    
    # If login fails, register the user
    response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        **test_user_credentials,
        "name": "Test User"
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token"), data.get("user", {}).get("id")
    
    pytest.skip("Authentication failed - cannot proceed with authenticated tests")
    return None, None


# ======================= AUTH TESTS =======================

class TestAuth:
    """Authentication endpoint tests."""
    
    def test_login_success(self, api_client, test_user_credentials):
        """Test login with valid credentials returns token."""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=test_user_credentials)
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == test_user_credentials["email"]
        assert isinstance(data["token"], str)
        assert len(data["token"]) > 0
        print(f"✓ Login successful, token: {data['token'][:20]}...")

    def test_login_invalid_credentials(self, api_client):
        """Test login with invalid credentials returns 401."""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "wrongpassword123"
        })
        assert response.status_code == 401, f"Expected 401, got: {response.status_code}"
        print("✓ Invalid credentials correctly rejected")

    def test_auth_me_with_token(self, api_client, auth_token):
        """Test /auth/me returns current user with valid token."""
        token, user_id = auth_token
        if not token:
            pytest.skip("No token available")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = api_client.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "user" in data
        print(f"✓ Auth/me returned user: {data['user'].get('email')}")


# ======================= PROJECT SAVE/UPSERT TESTS =======================

class TestProjectSaveUpsert:
    """Test project save with duplicate detection (upsert by title+userId)."""
    
    def test_create_new_project(self, api_client, auth_token):
        """Test creating a new project."""
        token, user_id = auth_token
        unique_title = f"TEST_P0_Project_{uuid.uuid4().hex[:8]}"
        
        project_data = {
            "title": unique_title,
            "project": {
                "title": unique_title,
                "duration": 30,
                "slides": [
                    {"id": "1", "title": "Intro", "narration": "Welcome to our video", "duration": 6},
                    {"id": "2", "title": "Main", "narration": "This is the main content", "duration": 6},
                ]
            },
            "userId": user_id
        }
        
        response = api_client.post(f"{BASE_URL}/api/projects", json=project_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert data["isNew"] == True  # First save should be new
        assert data["project"]["title"] == unique_title
        print(f"✓ New project created: {unique_title}")
        
        return unique_title, user_id, data["project"]["id"]

    def test_save_same_title_updates_not_duplicates(self, api_client, auth_token):
        """Test that saving project with same title+userId updates instead of creating duplicate."""
        token, user_id = auth_token
        unique_title = f"TEST_Upsert_Check_{uuid.uuid4().hex[:8]}"
        
        project_data = {
            "title": unique_title,
            "project": {
                "title": unique_title,
                "duration": 30,
                "slides": [
                    {"id": "1", "title": "Original", "narration": "Original narration", "duration": 6}
                ]
            },
            "userId": user_id
        }
        
        # First save - should create new project
        response1 = api_client.post(f"{BASE_URL}/api/projects", json=project_data)
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1["isNew"] == True, "First save should create new project"
        project_id = data1["project"]["id"]
        print(f"✓ First save created project ID: {project_id}")
        
        # Count projects before second save
        projects_before = api_client.get(f"{BASE_URL}/api/projects", params={"userId": user_id}).json()
        count_before = len([p for p in projects_before.get("projects", []) if p["title"] == unique_title])
        print(f"  Projects with title '{unique_title}' before update: {count_before}")
        
        # Second save with same title+userId - should UPDATE, not create duplicate
        project_data["project"]["slides"][0]["narration"] = "UPDATED narration"
        response2 = api_client.post(f"{BASE_URL}/api/projects", json=project_data)
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["isNew"] == False, "Second save should update existing project"
        assert data2["project"]["id"] == project_id, "Project ID should remain the same"
        print(f"✓ Second save updated same project ID: {data2['project']['id']}")
        
        # Verify project count did NOT increase
        projects_after = api_client.get(f"{BASE_URL}/api/projects", params={"userId": user_id}).json()
        count_after = len([p for p in projects_after.get("projects", []) if p["title"] == unique_title])
        print(f"  Projects with title '{unique_title}' after update: {count_after}")
        
        assert count_after == count_before, f"Project count should not increase! Before: {count_before}, After: {count_after}"
        print("✓ VERIFIED: No duplicate project created - upsert working correctly")

    def test_different_title_creates_new(self, api_client, auth_token):
        """Test that different title creates a new project."""
        token, user_id = auth_token
        
        # Create first project
        title1 = f"TEST_First_{uuid.uuid4().hex[:8]}"
        response1 = api_client.post(f"{BASE_URL}/api/projects", json={
            "title": title1,
            "project": {"title": title1, "slides": []},
            "userId": user_id
        })
        assert response1.json()["isNew"] == True
        
        # Create second project with different title
        title2 = f"TEST_Second_{uuid.uuid4().hex[:8]}"
        response2 = api_client.post(f"{BASE_URL}/api/projects", json={
            "title": title2,
            "project": {"title": title2, "slides": []},
            "userId": user_id
        })
        assert response2.json()["isNew"] == True
        assert response2.json()["project"]["id"] != response1.json()["project"]["id"]
        print(f"✓ Different titles create different projects")


# ======================= LIBRARY TESTS =======================

class TestLibraryEndpoints:
    """Test library endpoints for music and SFX."""
    
    def test_music_library_returns_catalog(self, api_client):
        """Test GET /api/library/music returns music catalog."""
        response = api_client.get(f"{BASE_URL}/api/library/music")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "tracks" in data
        assert "categories" in data
        assert "total" in data
        assert len(data["tracks"]) > 0
        assert len(data["categories"]) > 0
        
        # Verify track structure
        track = data["tracks"][0]
        assert "id" in track
        assert "name" in track
        assert "category" in track
        assert "url" in track
        print(f"✓ Music library returned {data['total']} tracks in {len(data['categories'])} categories")

    def test_music_library_filter_by_category(self, api_client):
        """Test music library filtering by category."""
        response = api_client.get(f"{BASE_URL}/api/library/music", params={"category": "cinematic"})
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        for track in data["tracks"]:
            assert track["category"] == "cinematic"
        print(f"✓ Music filter by category working - {len(data['tracks'])} cinematic tracks")

    def test_sfx_library_returns_catalog(self, api_client):
        """Test GET /api/library/sfx returns SFX catalog."""
        response = api_client.get(f"{BASE_URL}/api/library/sfx")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "sounds" in data
        assert "categories" in data
        assert "total" in data
        assert len(data["sounds"]) > 0
        
        # Verify SFX structure
        sfx = data["sounds"][0]
        assert "id" in sfx
        assert "name" in sfx
        assert "category" in sfx
        assert "url" in sfx
        print(f"✓ SFX library returned {data['total']} sounds in {len(data['categories'])} categories")

    def test_sfx_library_filter_by_category(self, api_client):
        """Test SFX library filtering by category."""
        response = api_client.get(f"{BASE_URL}/api/library/sfx", params={"category": "transitions"})
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        for sfx in data["sounds"]:
            assert sfx["category"] == "transitions"
        print(f"✓ SFX filter by category working - {len(data['sounds'])} transition sounds")


# ======================= RENDER TESTS =======================

class TestRenderEndpoint:
    """Test render endpoint with multi-slide videos."""
    
    def test_render_start_with_3_slides(self, api_client, auth_token):
        """Test POST /api/render with 3+ slides starts successfully and returns jobId."""
        token, user_id = auth_token
        
        # 3-slide video payload
        render_payload = {
            "projectId": f"test-{uuid.uuid4().hex[:8]}",
            "slides": [
                {"id": "1", "title": "Slide 1", "narration": "Welcome to our video", "duration": 4, "transition": "fade"},
                {"id": "2", "title": "Slide 2", "narration": "This is the main content", "duration": 4, "transition": "slide"},
                {"id": "3", "title": "Slide 3", "narration": "Thank you for watching", "duration": 4, "transition": "zoom"},
            ],
            "title": f"TEST_3Slide_{uuid.uuid4().hex[:8]}",
            "duration": 12,
            "generateVoice": False,  # Skip voice to speed up test
            "voiceId": "en-US-Journey-D"
        }
        
        response = api_client.post(f"{BASE_URL}/api/render", json=render_payload)
        assert response.status_code == 200, f"Render start failed: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "jobId" in data
        assert data["status"] == "started"
        
        job_id = data["jobId"]
        print(f"✓ Render started with jobId: {job_id}")
        return job_id

    def test_render_status_polling(self, api_client, auth_token):
        """Test render status polling with GET /api/render/{jobId}."""
        token, user_id = auth_token
        
        # Start a simple render
        render_payload = {
            "projectId": f"poll-test-{uuid.uuid4().hex[:8]}",
            "slides": [
                {"id": "1", "title": "Test", "narration": "Quick test", "duration": 3, "transition": "fade"},
                {"id": "2", "title": "Test2", "narration": "Second slide", "duration": 3, "transition": "fade"},
                {"id": "3", "title": "Test3", "narration": "Third slide", "duration": 3, "transition": "fade"},
            ],
            "title": f"TEST_Poll_{uuid.uuid4().hex[:8]}",
            "duration": 9,
            "generateVoice": False
        }
        
        # Start render
        start_response = api_client.post(f"{BASE_URL}/api/render", json=render_payload)
        assert start_response.status_code == 200
        job_id = start_response.json()["jobId"]
        print(f"  Render started: {job_id}")
        
        # Poll for status with 10s intervals, max 180s timeout
        max_wait = 180
        poll_interval = 10
        elapsed = 0
        final_status = None
        
        while elapsed < max_wait:
            status_response = api_client.get(f"{BASE_URL}/api/render/{job_id}")
            assert status_response.status_code == 200
            
            status_data = status_response.json()
            status = status_data.get("status")
            progress = status_data.get("progress", 0)
            step = status_data.get("step", "")
            
            print(f"  [{elapsed}s] Status: {status}, Progress: {progress}%, Step: {step}")
            
            if status == "completed":
                final_status = status_data
                print(f"✓ Render completed! videoUrl: {status_data.get('videoUrl')}")
                break
            elif status == "failed":
                print(f"✗ Render failed: {status_data.get('error')}")
                final_status = status_data
                break
            
            time.sleep(poll_interval)
            elapsed += poll_interval
        
        assert final_status is not None, f"Render did not complete within {max_wait}s"
        assert final_status.get("status") == "completed", f"Render status: {final_status.get('status')}, error: {final_status.get('error')}"
        assert "videoUrl" in final_status
        
        return final_status.get("videoUrl")

    def test_render_invalid_job_returns_404(self, api_client):
        """Test GET /api/render/{invalid_job_id} returns 404."""
        response = api_client.get(f"{BASE_URL}/api/render/nonexistent-job-id-12345")
        assert response.status_code == 404
        print("✓ Invalid job ID correctly returns 404")

    def test_rendered_video_downloadable(self, api_client, auth_token):
        """Test rendered video is downloadable from /api/renders/{filename}."""
        # First complete a render
        token, user_id = auth_token
        
        render_payload = {
            "projectId": f"download-test-{uuid.uuid4().hex[:8]}",
            "slides": [
                {"id": "1", "title": "Test", "narration": "Download test", "duration": 3, "transition": "fade"},
                {"id": "2", "title": "Test2", "narration": "Second", "duration": 3, "transition": "fade"},
                {"id": "3", "title": "Test3", "narration": "Third", "duration": 3, "transition": "fade"},
            ],
            "title": f"TEST_Download_{uuid.uuid4().hex[:8]}",
            "duration": 9,
            "generateVoice": False
        }
        
        # Start render
        start_response = api_client.post(f"{BASE_URL}/api/render", json=render_payload)
        job_id = start_response.json()["jobId"]
        print(f"  Render started for download test: {job_id}")
        
        # Wait for completion
        max_wait = 180
        elapsed = 0
        video_url = None
        
        while elapsed < max_wait:
            status_response = api_client.get(f"{BASE_URL}/api/render/{job_id}")
            status_data = status_response.json()
            
            if status_data.get("status") == "completed":
                video_url = status_data.get("videoUrl")
                break
            elif status_data.get("status") == "failed":
                pytest.fail(f"Render failed: {status_data.get('error')}")
            
            time.sleep(10)
            elapsed += 10
        
        assert video_url is not None, "Render did not complete in time"
        print(f"  Video URL: {video_url}")
        
        # Download the video
        download_response = api_client.get(f"{BASE_URL}{video_url}", stream=True)
        assert download_response.status_code == 200, f"Download failed: {download_response.status_code}"
        
        content_type = download_response.headers.get("content-type", "")
        assert "video" in content_type or "mp4" in content_type or download_response.headers.get("content-disposition", ""), \
            f"Expected video content, got: {content_type}"
        
        # Check file size is reasonable (> 10KB)
        content_length = int(download_response.headers.get("content-length", 0))
        assert content_length > 10000, f"Video file too small: {content_length} bytes"
        
        print(f"✓ Video downloadable: {content_length} bytes, type: {content_type}")


# ======================= CLEANUP =======================

@pytest.fixture(scope="session", autouse=True)
def cleanup_test_projects(request):
    """Cleanup TEST_ prefixed projects after all tests complete."""
    yield
    # Cleanup is optional - test data will be cleaned up in next test run
    print("\n[Cleanup] Test session complete - TEST_ prefixed projects may be cleaned up manually")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
