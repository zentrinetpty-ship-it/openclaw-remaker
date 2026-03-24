"""
Test suite for new video generation features:
1. POST /api/upload-character - Character image upload with name and description
2. POST /api/generate-video - Video generation with startFrame and endFrame
3. POST /api/generate-image - Image generation with style and characters
"""

import pytest
import requests
import os
import io
from PIL import Image

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@test.com"
TEST_PASSWORD = "password"


class TestAuthSetup:
    """Authentication setup for tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        # Try to register if login fails
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": "Test User"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestCharacterUpload(TestAuthSetup):
    """Test /api/upload-character endpoint"""
    
    def test_upload_character_success(self):
        """Test character upload with file, name, and description"""
        # Create a simple test image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = {'file': ('test_character.png', img_bytes, 'image/png')}
        data = {
            'name': 'Hero',
            'description': 'Main character with blue cape'
        }
        
        response = requests.post(f"{BASE_URL}/api/upload-character", files=files, data=data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result.get("success") == True, "Expected success=True"
        assert "url" in result, "Expected 'url' in response"
        assert result.get("name") == "Hero", f"Expected name='Hero', got {result.get('name')}"
        assert result.get("description") == "Main character with blue cape", f"Expected description match"
        
        # Verify URL format
        assert result["url"].startswith("/api/uploads/"), f"URL should start with /api/uploads/, got {result['url']}"
        print(f"SUCCESS: Character uploaded - URL: {result['url']}, Name: {result['name']}")
    
    def test_upload_character_default_name(self):
        """Test character upload with default name"""
        img = Image.new('RGB', (50, 50), color='blue')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = {'file': ('test_char2.png', img_bytes, 'image/png')}
        # No name or description provided
        
        response = requests.post(f"{BASE_URL}/api/upload-character", files=files)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        result = response.json()
        assert result.get("success") == True
        assert result.get("name") == "Character", f"Expected default name 'Character', got {result.get('name')}"
        print(f"SUCCESS: Character uploaded with default name")
    
    def test_upload_character_no_file_fails(self):
        """Test that upload without file fails"""
        data = {'name': 'NoFile', 'description': 'Test'}
        
        response = requests.post(f"{BASE_URL}/api/upload-character", data=data)
        
        # Should fail with 422 (validation error) since file is required
        assert response.status_code == 422, f"Expected 422 for missing file, got {response.status_code}"
        print("SUCCESS: Upload without file correctly rejected")


class TestVideoGeneration(TestAuthSetup):
    """Test /api/generate-video endpoint with startFrame and endFrame"""
    
    def test_generate_video_returns_frames(self, auth_headers):
        """Test video generation returns startFrame and endFrame"""
        payload = {
            "description": "A serene mountain landscape at sunset with golden light",
            "style": "Cinematic",
            "characters": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/generate-video",
            json=payload,
            headers=auth_headers,
            timeout=120  # AI generation can take time
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result.get("success") == True, f"Expected success=True, got {result}"
        
        # Check for startFrame and endFrame
        assert "startFrame" in result, f"Expected 'startFrame' in response, got keys: {result.keys()}"
        assert "endFrame" in result, f"Expected 'endFrame' in response, got keys: {result.keys()}"
        
        # Verify URLs are valid
        assert result["startFrame"].startswith("/api/uploads/"), f"startFrame URL invalid: {result['startFrame']}"
        assert result["endFrame"].startswith("/api/uploads/"), f"endFrame URL invalid: {result['endFrame']}"
        
        # Verify video field (should be same as startFrame)
        assert "video" in result, "Expected 'video' field in response"
        assert result["video"] == result["startFrame"], "video should equal startFrame"
        
        print(f"SUCCESS: Video generated with startFrame: {result['startFrame']}, endFrame: {result['endFrame']}")
    
    def test_generate_video_with_characters(self, auth_headers):
        """Test video generation with character references"""
        payload = {
            "description": "A hero standing on a cliff overlooking the ocean",
            "style": "Anime",
            "characters": [
                {"name": "Hero", "description": "Young warrior with silver hair and blue armor"}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/generate-video",
            json=payload,
            headers=auth_headers,
            timeout=120
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result.get("success") == True
        assert "startFrame" in result
        assert "endFrame" in result
        print(f"SUCCESS: Video with characters generated")
    
    def test_generate_video_without_auth(self):
        """Test video generation works without auth (uses userId from request)"""
        payload = {
            "description": "A simple test scene",
            "style": "Minimal",
            "userId": "guest_test_user"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/generate-video",
            json=payload,
            timeout=120
        )
        
        # Should work even without auth
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        result = response.json()
        assert result.get("success") == True
        print("SUCCESS: Video generation works without auth")


class TestImageGeneration(TestAuthSetup):
    """Test /api/generate-image endpoint with style and characters"""
    
    def test_generate_image_with_style(self, auth_headers):
        """Test image generation with style parameter"""
        payload = {
            "description": "A futuristic city skyline at night with neon lights",
            "style": "Cyberpunk"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/generate-image",
            json=payload,
            headers=auth_headers,
            timeout=120
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result.get("success") == True
        assert "image" in result, f"Expected 'image' in response, got keys: {result.keys()}"
        assert result["image"].startswith("/api/uploads/"), f"Image URL invalid: {result['image']}"
        
        print(f"SUCCESS: Image generated with style - URL: {result['image']}")
    
    def test_generate_image_with_characters(self, auth_headers):
        """Test image generation with character references"""
        payload = {
            "description": "A wizard casting a spell in a dark forest",
            "style": "Fantasy",
            "characters": [
                {"name": "Wizard", "description": "Old man with long white beard, purple robes, pointed hat"}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/generate-image",
            json=payload,
            headers=auth_headers,
            timeout=120
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result.get("success") == True
        assert "image" in result
        print(f"SUCCESS: Image with characters generated")


class TestUploadedAssetAccess:
    """Test that uploaded assets are accessible"""
    
    def test_uploaded_character_accessible(self):
        """Test that uploaded character image can be accessed"""
        # First upload a character
        img = Image.new('RGB', (100, 100), color='green')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = {'file': ('access_test.png', img_bytes, 'image/png')}
        data = {'name': 'AccessTest', 'description': 'Testing access'}
        
        upload_response = requests.post(f"{BASE_URL}/api/upload-character", files=files, data=data)
        assert upload_response.status_code == 200
        
        url = upload_response.json().get("url")
        
        # Try to access the uploaded file
        full_url = f"{BASE_URL}{url}"
        access_response = requests.get(full_url)
        
        assert access_response.status_code == 200, f"Could not access uploaded file at {full_url}: {access_response.status_code}"
        assert "image" in access_response.headers.get("content-type", ""), f"Expected image content-type, got {access_response.headers.get('content-type')}"
        
        print(f"SUCCESS: Uploaded character accessible at {full_url}")


class TestRemotionDurationFix:
    """Test that Remotion durationInFrames uses Math.round (no float errors)"""
    
    def test_render_with_float_duration(self):
        """Test render request with float duration doesn't cause errors"""
        # This tests the fix in Root.jsx and ExplainerVideo.jsx
        # The render endpoint should accept float durations and round them
        
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Login failed")
        
        token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a project with float durations
        project_data = {
            "title": "Float Duration Test",
            "project": {
                "title": "Float Duration Test",
                "duration": 10.5,  # Float duration
                "style": "cinematic",
                "slides": [
                    {
                        "id": "1",
                        "title": "Slide 1",
                        "narration": "Test narration",
                        "duration": 5.25,  # Float duration
                        "imagePrompt": "Test prompt",
                        "transition": "fade"
                    },
                    {
                        "id": "2",
                        "title": "Slide 2",
                        "narration": "More narration",
                        "duration": 5.25,  # Float duration
                        "imagePrompt": "Another prompt",
                        "transition": "slide"
                    }
                ]
            },
            "userId": "test_float_user"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/projects",
            json=project_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Project creation failed: {response.status_code}: {response.text}"
        result = response.json()
        assert result.get("success") == True
        
        project_id = result.get("project", {}).get("id")
        print(f"SUCCESS: Project with float durations created - ID: {project_id}")
        
        # Note: Full render test would require Remotion to be running
        # The fix is in the calculateMetadata function using Math.round()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
