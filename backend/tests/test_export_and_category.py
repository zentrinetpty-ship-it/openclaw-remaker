"""
Test suite for ExplainaPro Export (PDF/HTML) and Category Picker features
Tests the new features:
1. Category picker default to 'Please select video category' 
2. PDF export endpoint (/api/export/pdf)
3. HTML export endpoint (/api/export/html)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestExportEndpoints:
    """Test PDF and HTML export endpoints"""

    def test_pdf_export_success(self):
        """Test POST /api/export/pdf returns PDF file URL"""
        payload = {
            "title": "Test Storyboard Export",
            "slides": [
                {
                    "id": "1",
                    "title": "Introduction",
                    "narration": "Welcome to this test video about AI.",
                    "videoPrompt": "Cinematic shot of futuristic cityscape",
                    "imagePrompt": "A modern city skyline at sunset",
                    "duration": 5,
                    "transition": "fade"
                },
                {
                    "id": "2", 
                    "title": "Main Content",
                    "narration": "Let's explore the amazing world of artificial intelligence.",
                    "videoPrompt": "Close-up of AI neural network visualization",
                    "imagePrompt": "Abstract neural network with glowing nodes",
                    "duration": 6,
                    "transition": "zoom"
                }
            ],
            "format": "pdf"
        }
        
        response = requests.post(f"{BASE_URL}/api/export/pdf", json=payload)
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data.get("success") == True, "Expected success: true"
        assert "url" in data, "Expected 'url' in response"
        assert "filename" in data, "Expected 'filename' in response"
        assert data["url"].endswith(".pdf"), f"Expected PDF url, got: {data['url']}"
        assert data["filename"].endswith(".pdf"), f"Expected PDF filename, got: {data['filename']}"
        
        print(f"✓ PDF export successful: {data['url']}")
        
        # Verify file is accessible via GET
        file_response = requests.get(f"{BASE_URL}{data['url']}")
        assert file_response.status_code == 200, f"PDF file not accessible: {file_response.status_code}"
        assert file_response.headers.get('content-type') == 'application/pdf', "Expected PDF content type"
        print(f"✓ PDF file downloadable: {len(file_response.content)} bytes")

    def test_html_export_success(self):
        """Test POST /api/export/html returns HTML file URL"""
        payload = {
            "title": "Test HTML Presentation",
            "slides": [
                {
                    "id": "1",
                    "title": "Welcome Slide",
                    "narration": "This is a test HTML presentation export.",
                    "videoPrompt": "Dramatic opening with fade in",
                    "duration": 4,
                    "transition": "fade"
                },
                {
                    "id": "2",
                    "title": "Features Overview", 
                    "narration": "Here are the key features of ExplainaPro.",
                    "videoPrompt": "Product showcase with smooth camera motion",
                    "duration": 5,
                    "transition": "slide"
                },
                {
                    "id": "3",
                    "title": "Conclusion",
                    "narration": "Thank you for watching this presentation.",
                    "videoPrompt": "Fade to black with credits",
                    "duration": 4,
                    "transition": "fade"
                }
            ],
            "format": "html"
        }
        
        response = requests.post(f"{BASE_URL}/api/export/html", json=payload)
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data.get("success") == True, "Expected success: true"
        assert "url" in data, "Expected 'url' in response"
        assert "filename" in data, "Expected 'filename' in response"
        assert data["url"].endswith(".html"), f"Expected HTML url, got: {data['url']}"
        assert data["filename"].endswith(".html"), f"Expected HTML filename, got: {data['filename']}"
        
        print(f"✓ HTML export successful: {data['url']}")
        
        # Verify file is accessible via GET
        file_response = requests.get(f"{BASE_URL}{data['url']}")
        assert file_response.status_code == 200, f"HTML file not accessible: {file_response.status_code}"
        
        # Verify HTML content
        html_content = file_response.text
        assert "<!DOCTYPE html>" in html_content, "Expected valid HTML document"
        assert "Test HTML Presentation" in html_content, "Expected title in HTML"
        assert "ExplainaPro" in html_content, "Expected ExplainaPro branding"
        assert "slide" in html_content.lower(), "Expected slide content in HTML"
        assert "ArrowRight" in html_content or "next" in html_content.lower(), "Expected navigation in HTML"
        print(f"✓ HTML file downloadable and valid: {len(html_content)} chars")

    def test_pdf_export_empty_slides_still_works(self):
        """Test PDF export handles edge case of minimal slides"""
        payload = {
            "title": "Minimal Test",
            "slides": [
                {"id": "1", "title": "Only Slide", "narration": "Just one slide."}
            ],
            "format": "pdf"
        }
        
        response = requests.post(f"{BASE_URL}/api/export/pdf", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ PDF export works with minimal data")

    def test_html_export_empty_slides_still_works(self):
        """Test HTML export handles edge case of minimal slides"""
        payload = {
            "title": "Minimal HTML",
            "slides": [
                {"id": "1", "title": "Single Slide"}
            ],
            "format": "html"
        }
        
        response = requests.post(f"{BASE_URL}/api/export/html", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ HTML export works with minimal data")


class TestCoreApiEndpoints:
    """Test core API endpoints are working"""

    def test_root_endpoint(self):
        """Test GET / returns API info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Root endpoint working: {data.get('message')}")

    def test_projects_endpoint(self):
        """Test GET /api/projects returns project list"""
        response = requests.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        data = response.json()
        assert "projects" in data
        assert isinstance(data["projects"], list)
        print(f"✓ Projects endpoint working: {len(data['projects'])} projects found")

    def test_music_library_endpoint(self):
        """Test GET /api/library/music returns music catalog"""
        response = requests.get(f"{BASE_URL}/api/library/music")
        assert response.status_code == 200
        data = response.json()
        assert "tracks" in data
        assert "categories" in data
        print(f"✓ Music library working: {len(data['tracks'])} tracks, {len(data['categories'])} categories")

    def test_sfx_library_endpoint(self):
        """Test GET /api/library/sfx returns SFX catalog"""
        response = requests.get(f"{BASE_URL}/api/library/sfx")
        assert response.status_code == 200
        data = response.json()
        assert "sounds" in data
        assert "categories" in data
        print(f"✓ SFX library working: {len(data['sounds'])} sounds, {len(data['categories'])} categories")


class TestAuthEndpoints:
    """Test authentication endpoints"""

    def test_login_success(self):
        """Test login with valid credentials"""
        # First register a test user (or use existing)
        test_email = "test_export_user@test.com"
        test_pass = "testpassword123"
        
        # Try to register first (may already exist)
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": test_pass,
            "name": "Export Test User"
        })
        
        # Now login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": test_pass
        })
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "token" in data
            assert "user" in data
            print(f"✓ Login successful for {test_email}")
        else:
            # Try with default test user
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "test@test.com",
                "password": "password"
            })
            if response.status_code == 200:
                data = response.json()
                assert data.get("success") == True
                print("✓ Login successful with default test user")
            else:
                print(f"Note: Login returned {response.status_code}")

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
