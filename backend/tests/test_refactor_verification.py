"""
Test to verify EditorPage refactoring - ensuring all components work correctly after code reorganization
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://render-suite-1.preview.emergentagent.com').rstrip('/')


class TestEditorRefactorVerification:
    """Verify APIs used by the refactored Editor components still work"""
    
    def test_health_check(self):
        """Basic API accessibility check"""
        # Check if API is accessible
        response = requests.get(f"{BASE_URL}/api/library/music")
        assert response.status_code == 200
        data = response.json()
        assert 'tracks' in data or 'categories' in data
        print(f"SUCCESS: Music library API accessible - {len(data.get('tracks', []))} tracks")
    
    def test_export_pdf_endpoint(self):
        """Test PDF export endpoint used by EditorPage"""
        payload = {
            "title": "Test Storyboard",
            "slides": [
                {
                    "id": "slide-1",
                    "title": "Introduction",
                    "narration": "Welcome to our video",
                    "imagePrompt": "Professional office scene"
                }
            ],
            "format": "pdf"
        }
        response = requests.post(f"{BASE_URL}/api/export/pdf", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get('success') == True
        assert 'url' in data
        assert data['url'].endswith('.pdf')
        print(f"SUCCESS: PDF export working - URL: {data['url']}")
    
    def test_export_html_endpoint(self):
        """Test HTML export endpoint used by EditorPage"""
        payload = {
            "title": "Test Presentation",
            "slides": [
                {
                    "id": "slide-1",
                    "title": "Slide One",
                    "narration": "This is the first slide",
                    "imagePrompt": "Beautiful landscape"
                }
            ],
            "format": "html"
        }
        response = requests.post(f"{BASE_URL}/api/export/html", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get('success') == True
        assert 'url' in data
        assert data['url'].endswith('.html')
        print(f"SUCCESS: HTML export working - URL: {data['url']}")
    
    def test_music_library_for_left_sidebar(self):
        """Test music library API used by LeftSidebar component"""
        response = requests.get(f"{BASE_URL}/api/library/music")
        assert response.status_code == 200
        data = response.json()
        assert 'tracks' in data
        assert 'categories' in data
        print(f"SUCCESS: Music library API - {len(data['tracks'])} tracks, {len(data['categories'])} categories")
    
    def test_sfx_library_for_left_sidebar(self):
        """Test SFX library API used by LeftSidebar component"""
        response = requests.get(f"{BASE_URL}/api/library/sfx")
        assert response.status_code == 200
        data = response.json()
        assert 'sounds' in data
        assert 'categories' in data
        print(f"SUCCESS: SFX library API - {len(data['sounds'])} sounds, {len(data['categories'])} categories")
    
    def test_upload_endpoint(self):
        """Test upload endpoint used by LeftSidebar for asset uploads"""
        # Create a small test file
        import io
        files = {'file': ('test.txt', io.BytesIO(b'test content'), 'text/plain')}
        response = requests.post(f"{BASE_URL}/api/upload", files=files)
        # Upload should work or return proper error
        assert response.status_code in [200, 400, 422]
        print(f"SUCCESS: Upload endpoint accessible - Status: {response.status_code}")
    
    def test_projects_endpoints(self):
        """Test projects CRUD used by EditorPage save functionality"""
        # Create a test project
        project_data = {
            "title": "TEST_Refactor_Verification_Project",
            "project": {
                "title": "Test Project",
                "slides": [
                    {"id": "1", "title": "Slide 1", "narration": "Test", "duration": 6}
                ]
            },
            "userId": "test-user-id"
        }
        
        # Test create
        response = requests.post(f"{BASE_URL}/api/projects", json=project_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get('success') == True
        project_id = data.get('projectId')
        print(f"SUCCESS: Project created - ID: {project_id}")
        
        # Test read
        if project_id:
            response = requests.get(f"{BASE_URL}/api/projects/{project_id}")
            assert response.status_code == 200
            print(f"SUCCESS: Project retrieved")
            
            # Cleanup - delete test project
            response = requests.delete(f"{BASE_URL}/api/projects/{project_id}")
            print(f"SUCCESS: Test project cleaned up")


class TestConstantsAndConfiguration:
    """Verify editorConstants.js values are compatible with backend"""
    
    def test_api_base_url_accessible(self):
        """Verify REACT_APP_BACKEND_URL/api is accessible"""
        response = requests.get(f"{BASE_URL}/api/library/music")
        assert response.status_code == 200
        print(f"SUCCESS: API base URL accessible at {BASE_URL}/api")
    
    def test_voice_generation_endpoint_exists(self):
        """Test that voice generation endpoint exists (used by LeftSidebar)"""
        # Just verify endpoint exists - don't actually generate
        response = requests.post(f"{BASE_URL}/api/generate-voice", json={"text": "", "voiceId": "test"})
        # Should return 422 (validation error) or 400, not 404
        assert response.status_code != 404
        print(f"SUCCESS: Voice generation endpoint exists - Status: {response.status_code}")
    
    def test_image_generation_endpoint_exists(self):
        """Test that image generation endpoint exists (used by LeftSidebar)"""
        response = requests.post(f"{BASE_URL}/api/generate-image", json={"description": "test"})
        # Should return some response, not 404
        assert response.status_code != 404
        print(f"SUCCESS: Image generation endpoint exists - Status: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
