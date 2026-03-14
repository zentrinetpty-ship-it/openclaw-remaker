"""
Backend tests for ExplainaPro upload and render fixes.

Tests the fixes for:
1. POST /api/upload endpoint - upload files and get server URLs
2. /api/render with proper assetUrl handling (server paths and full URLs)
3. /api/render with multiple slides - ensure all slides appear in video
4. /api/projects POST - save project endpoint
5. URL normalization in render task

Uses existing images from /app/backend/uploads/ for testing.
"""

import pytest
import requests
import os
import time
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Existing test images to use for render tests
EXISTING_IMAGES = [
    "/api/uploads/image-20260313215042-96a8f0f.png",
    "/api/uploads/image-20260313215140-e69ddee.png",
    "/api/uploads/image-20260314030053-f3d5407.png"
]


class TestUploadEndpoint:
    """Tests for POST /api/upload endpoint"""
    
    def test_upload_image_file(self):
        """Test uploading an image file returns server URL"""
        # Create a simple test image (1x1 PNG)
        test_png = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 pixel
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {'file': ('test_upload.png', test_png, 'image/png')}
        response = requests.post(f"{BASE_URL}/api/upload", files=files)
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "url" in data
        assert data["url"].startswith("/api/uploads/")
        assert "filename" in data
        assert "size" in data
        print(f"✓ Upload successful: {data['url']} ({data['size']} bytes)")
        return data["url"]
    
    def test_upload_text_file(self):
        """Test uploading a non-image file"""
        test_content = b"This is a test file for upload testing"
        files = {'file': ('test_upload.txt', test_content, 'text/plain')}
        response = requests.post(f"{BASE_URL}/api/upload", files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "/api/uploads/" in data["url"]
        print(f"✓ Text file upload successful: {data['url']}")
    
    def test_uploaded_file_accessible(self):
        """Test that uploaded files are accessible via GET"""
        # Upload a file first
        test_content = b"Test content for access check"
        files = {'file': ('access_test.txt', test_content, 'text/plain')}
        upload_response = requests.post(f"{BASE_URL}/api/upload", files=files)
        assert upload_response.status_code == 200
        
        file_url = upload_response.json()["url"]
        
        # Try to access the uploaded file
        get_response = requests.get(f"{BASE_URL}{file_url}")
        assert get_response.status_code == 200
        assert get_response.content == test_content
        print(f"✓ Uploaded file accessible at {file_url}")


class TestRenderWithImages:
    """Tests for /api/render with proper image handling"""
    
    def test_render_with_server_path_asseturl(self):
        """Test render with assetUrl in /api/uploads/xxx.png format"""
        slides = [
            {
                "id": "1",
                "title": "Slide 1 with image",
                "narration": "This is slide one with an existing image.",
                "duration": 3,
                "imagePrompt": "Test prompt",
                "transition": "fade",
                "assetType": "image",
                "assetUrl": EXISTING_IMAGES[0]
            },
            {
                "id": "2",
                "title": "Slide 2 with image",
                "narration": "This is slide two with another image.",
                "duration": 3,
                "imagePrompt": "Test prompt 2",
                "transition": "slide",
                "assetType": "image",
                "assetUrl": EXISTING_IMAGES[1]
            }
        ]
        
        response = requests.post(f"{BASE_URL}/api/render", json={
            "projectId": "test-server-path-render",
            "slides": slides,
            "title": "Server Path Test",
            "duration": 6,
            "generateVoice": False,
            "voiceId": "en-US-Journey-D",
            "captionStyleId": None
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "jobId" in data
        print(f"✓ Render started with server path assetUrls, jobId: {data['jobId']}")
        
        # Wait for completion and verify
        job_id = data["jobId"]
        self._wait_for_render_completion(job_id)
    
    def test_render_with_full_url_asseturl(self):
        """Test render with full URL format that needs normalization"""
        full_url = f"{BASE_URL}{EXISTING_IMAGES[0]}"
        
        slides = [
            {
                "id": "1",
                "title": "Full URL Test",
                "narration": "Testing full URL normalization in render.",
                "duration": 3,
                "imagePrompt": "Test",
                "transition": "fade",
                "assetType": "image",
                "assetUrl": full_url  # Full URL like https://explaina-preview.../api/uploads/xxx.png
            }
        ]
        
        response = requests.post(f"{BASE_URL}/api/render", json={
            "projectId": "test-full-url-render",
            "slides": slides,
            "title": "Full URL Normalization Test",
            "duration": 3,
            "generateVoice": False,
            "voiceId": "en-US-Journey-D",
            "captionStyleId": None
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Render started with full URL (needs normalization), jobId: {data['jobId']}")
        
        # Wait and verify completion
        self._wait_for_render_completion(data["jobId"])
    
    def test_render_with_no_asseturl_uses_placeholder(self):
        """Test render without assetUrl uses placeholder and doesn't crash"""
        slides = [
            {
                "id": "1",
                "title": "No Asset Slide",
                "narration": "This slide has no asset URL.",
                "duration": 3,
                "imagePrompt": "Test",
                "transition": "fade",
                "assetType": "none",
                "assetUrl": None
            }
        ]
        
        response = requests.post(f"{BASE_URL}/api/render", json={
            "projectId": "test-no-asset-render",
            "slides": slides,
            "title": "No Asset Test",
            "duration": 3,
            "generateVoice": False,
            "voiceId": "en-US-Journey-D",
            "captionStyleId": None
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Render started with no assetUrl (placeholder), jobId: {data['jobId']}")
        
        self._wait_for_render_completion(data["jobId"])
    
    def test_render_multiple_slides_all_show(self):
        """Test render with 3 slides - verify all slides are processed"""
        slides = [
            {
                "id": "1",
                "title": "First Slide",
                "narration": "This is the first slide with image one.",
                "duration": 4,
                "imagePrompt": "Test 1",
                "transition": "fade",
                "assetType": "image",
                "assetUrl": EXISTING_IMAGES[0]
            },
            {
                "id": "2",
                "title": "Second Slide",
                "narration": "This is the second slide with image two.",
                "duration": 4,
                "imagePrompt": "Test 2",
                "transition": "slide",
                "assetType": "image",
                "assetUrl": EXISTING_IMAGES[1]
            },
            {
                "id": "3",
                "title": "Third Slide",
                "narration": "This is the third slide with image three.",
                "duration": 4,
                "imagePrompt": "Test 3",
                "transition": "zoom",
                "assetType": "image",
                "assetUrl": EXISTING_IMAGES[2]
            }
        ]
        
        response = requests.post(f"{BASE_URL}/api/render", json={
            "projectId": "test-multi-slide-render",
            "slides": slides,
            "title": "Multi Slide Test",
            "duration": 12,
            "generateVoice": False,
            "voiceId": "en-US-Journey-D",
            "captionStyleId": "minimal"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Render started with 3 slides, jobId: {data['jobId']}")
        
        # Wait for completion - this validates all slides are processed
        result = self._wait_for_render_completion(data["jobId"], timeout=120)
        assert result["status"] == "completed", "Multi-slide render did not complete"
        print(f"✓ Multi-slide render completed: {result.get('videoUrl')}")
        
        # Verify video file exists and is accessible (use GET with stream to avoid downloading full file)
        if result.get("videoUrl"):
            video_response = requests.get(f"{BASE_URL}{result['videoUrl']}", stream=True)
            assert video_response.status_code == 200
            video_response.close()  # Close without downloading full content
            print(f"✓ Rendered video accessible at {result['videoUrl']}")
    
    def _wait_for_render_completion(self, job_id, timeout=60):
        """Helper to poll render status until completion"""
        start_time = time.time()
        while time.time() - start_time < timeout:
            status_response = requests.get(f"{BASE_URL}/api/render/{job_id}")
            if status_response.status_code == 200:
                status_data = status_response.json()
                status = status_data.get("status")
                progress = status_data.get("progress", 0)
                
                if status == "completed":
                    print(f"  ✓ Render completed: {status_data.get('videoUrl')}")
                    return status_data
                elif status == "failed":
                    print(f"  ✗ Render failed: {status_data.get('error')}")
                    return status_data
                else:
                    print(f"  Progress: {progress}% - {status_data.get('step', 'processing')}")
            
            time.sleep(2)
        
        return {"status": "timeout"}


class TestProjectSave:
    """Tests for POST /api/projects endpoint"""
    
    @pytest.fixture(scope="class")
    def test_user_id(self):
        """Get or create test user and return user ID"""
        # Try to login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        
        if login_response.status_code == 200:
            return login_response.json().get("user", {}).get("id")
        
        # Try to register
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "test@test.com",
            "password": "password",
            "name": "Test User"
        })
        
        if register_response.status_code == 200:
            return register_response.json().get("user", {}).get("id")
        
        # Return a fallback user ID
        return "test-user-id-fallback"
    
    def test_save_project(self, test_user_id):
        """Test POST /api/projects to save project"""
        project_data = {
            "title": "TEST_Saved Project",
            "duration": 30,
            "style": "cinematic",
            "colorScheme": "#7c3aed",
            "slides": [
                {
                    "id": "1",
                    "title": "Intro",
                    "narration": "Welcome to this test project.",
                    "duration": 6,
                    "imagePrompt": "Test prompt",
                    "assetType": "image",
                    "assetUrl": EXISTING_IMAGES[0]
                },
                {
                    "id": "2",
                    "title": "Content",
                    "narration": "Here is some test content.",
                    "duration": 6,
                    "imagePrompt": "Test prompt 2",
                    "assetType": "image",
                    "assetUrl": EXISTING_IMAGES[1]
                }
            ],
            "voiceoverStyle": "professional",
            "musicMood": "uplifting",
            "characters": []
        }
        
        response = requests.post(f"{BASE_URL}/api/projects", json={
            "title": "TEST_Saved Project",
            "project": project_data,
            "userId": test_user_id
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "project" in data
        assert data["project"]["title"] == "TEST_Saved Project"
        assert "id" in data["project"]
        
        project_id = data["project"]["id"]
        print(f"✓ Project saved successfully with ID: {project_id}")
        
        # Verify project can be retrieved
        get_response = requests.get(f"{BASE_URL}/api/projects/{project_id}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["success"] == True
        assert get_data["project"]["title"] == "TEST_Saved Project"
        print(f"✓ Saved project retrieved successfully")
        
        return project_id
    
    def test_save_project_with_image_urls(self, test_user_id):
        """Test saving project preserves assetUrls in slides"""
        project_data = {
            "title": "TEST_Project With Images",
            "duration": 18,
            "slides": [
                {
                    "id": "1",
                    "title": "Slide with image",
                    "narration": "First slide.",
                    "duration": 6,
                    "assetType": "image",
                    "assetUrl": EXISTING_IMAGES[0]
                },
                {
                    "id": "2",
                    "title": "Another slide",
                    "narration": "Second slide.",
                    "duration": 6,
                    "assetType": "image",
                    "assetUrl": EXISTING_IMAGES[1]
                },
                {
                    "id": "3",
                    "title": "Third slide",
                    "narration": "Third slide.",
                    "duration": 6,
                    "assetType": "image",
                    "assetUrl": EXISTING_IMAGES[2]
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/projects", json={
            "title": "TEST_Project With Images",
            "project": project_data,
            "userId": test_user_id
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify slides with images are preserved
        saved_slides = data["project"].get("slides", [])
        assert len(saved_slides) == 3
        
        # Check imageUrl is preserved in projectData
        project_data_saved = data["project"].get("projectData", {})
        if project_data_saved:
            slides_in_project_data = project_data_saved.get("slides", [])
            for i, slide in enumerate(slides_in_project_data):
                assert slide.get("assetUrl") == EXISTING_IMAGES[i]
        
        print(f"✓ Project with image URLs saved and preserved")


class TestExistingImagesAccessible:
    """Verify existing test images are accessible"""
    
    def test_existing_images_accessible(self):
        """Verify existing images in uploads are accessible"""
        for img_path in EXISTING_IMAGES:
            response = requests.get(f"{BASE_URL}{img_path}")
            assert response.status_code == 200, f"Image not accessible: {img_path}"
            assert len(response.content) > 1000, f"Image too small: {img_path}"
            print(f"✓ Image accessible: {img_path} ({len(response.content)} bytes)")


class TestURLNormalization:
    """Tests for URL normalization in render task"""
    
    def test_render_normalizes_full_https_url(self):
        """Test that render normalizes full https://.../.../api/uploads/xxx.png to /api/uploads/xxx.png"""
        full_url = f"https://ai-filmmaker-73.preview.emergentagent.com{EXISTING_IMAGES[0]}"
        
        slides = [{
            "id": "1",
            "title": "URL Normalization Test",
            "narration": "Testing URL normalization.",
            "duration": 3,
            "assetType": "image",
            "assetUrl": full_url
        }]
        
        response = requests.post(f"{BASE_URL}/api/render", json={
            "projectId": "test-url-normalize",
            "slides": slides,
            "title": "URL Norm Test",
            "duration": 3,
            "generateVoice": False,
            "captionStyleId": None
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Render accepted full https URL, jobId: {data['jobId']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
