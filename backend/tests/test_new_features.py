"""
Backend tests for ExplainaPro new features:
1. Video Remaker - /api/analyze-video endpoint
2. Motion Graphics - slides with graphics arrays in render
3. Multiple Caption Modes - captionMode parameter in render
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestVideoRemakerEndpoint:
    """Test POST /api/analyze-video - Video Remaker feature"""
    
    def test_analyze_video_missing_file_returns_422(self):
        """Endpoint should require video file upload"""
        response = requests.post(f"{BASE_URL}/api/analyze-video")
        # Should return 422 Unprocessable Entity when file is missing
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        print("PASSED: /api/analyze-video returns 422 when no file uploaded")
    
    def test_analyze_video_accepts_video_file(self):
        """Upload video and get storyboard back"""
        video_path = "/tmp/test_video.mp4"
        if not os.path.exists(video_path):
            pytest.skip("Test video not found - skip")
        
        with open(video_path, "rb") as f:
            files = {"file": ("test_video.mp4", f, "video/mp4")}
            params = {
                "slideCount": 3,
                "duration": 15,
                "tone": "professional",
                "visualStyle": "Cinematic"
            }
            response = requests.post(
                f"{BASE_URL}/api/analyze-video",
                files=files,
                params=params,
                timeout=120  # AI analysis can take time
            )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, f"Expected success=True, got {data}"
        assert "data" in data, "Response missing 'data' field"
        
        storyboard = data["data"]
        assert "title" in storyboard, "Storyboard missing title"
        assert "slides" in storyboard, "Storyboard missing slides"
        assert len(storyboard["slides"]) > 0, "Storyboard has no slides"
        
        # Check each slide has required fields
        for slide in storyboard["slides"]:
            assert "id" in slide, "Slide missing id"
            assert "narration" in slide, "Slide missing narration"
            assert "imagePrompt" in slide, "Slide missing imagePrompt"
        
        print(f"PASSED: /api/analyze-video returned storyboard with {len(storyboard['slides'])} slides")
        print(f"  Title: {storyboard.get('title')}")
        print(f"  Frames analyzed: {data.get('framesAnalyzed')}")


class TestCaptionModes:
    """Test caption mode parameter in render endpoint"""
    
    def test_render_accepts_caption_mode_words(self):
        """Render with captionMode=words"""
        payload = {
            "projectId": "test-caption-words",
            "title": "Caption Words Test",
            "slides": [
                {
                    "id": "1",
                    "title": "Test Slide",
                    "narration": "This is a test narration for word by word captions",
                    "duration": 5,
                    "imagePrompt": "Test image",
                    "transition": "fade"
                }
            ],
            "duration": 5,
            "generateVoice": False,
            "captionMode": "words",
            "captionStyleId": "minimal"
        }
        
        response = requests.post(f"{BASE_URL}/api/render", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, f"Expected success=True: {data}"
        assert "jobId" in data, "Response missing jobId"
        
        print(f"PASSED: /api/render accepts captionMode=words, jobId={data['jobId']}")
        return data["jobId"]
    
    def test_render_accepts_caption_mode_lines(self):
        """Render with captionMode=lines"""
        payload = {
            "projectId": "test-caption-lines",
            "title": "Caption Lines Test",
            "slides": [
                {
                    "id": "1",
                    "title": "Test Slide",
                    "narration": "This is a longer narration text that should be displayed line by line. Each line appears and disappears.",
                    "duration": 6,
                    "imagePrompt": "Test image",
                    "transition": "fade"
                }
            ],
            "duration": 6,
            "generateVoice": False,
            "captionMode": "lines",
            "captionStyleId": "netflix"
        }
        
        response = requests.post(f"{BASE_URL}/api/render", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, f"Expected success=True: {data}"
        
        print(f"PASSED: /api/render accepts captionMode=lines, jobId={data['jobId']}")
        return data["jobId"]
    
    def test_render_accepts_caption_mode_sentence(self):
        """Render with captionMode=sentence"""
        payload = {
            "projectId": "test-caption-sentence",
            "title": "Caption Sentence Test",
            "slides": [
                {
                    "id": "1",
                    "title": "Test Slide",
                    "narration": "The entire sentence appears at once with fade in and fade out animation.",
                    "duration": 5,
                    "imagePrompt": "Test image",
                    "transition": "fade"
                }
            ],
            "duration": 5,
            "generateVoice": False,
            "captionMode": "sentence",
            "captionStyleId": "tiktok"
        }
        
        response = requests.post(f"{BASE_URL}/api/render", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, f"Expected success=True: {data}"
        
        print(f"PASSED: /api/render accepts captionMode=sentence, jobId={data['jobId']}")


class TestMotionGraphics:
    """Test motion graphics feature - slides with graphics arrays"""
    
    def test_restructure_script_motiongraphic_category(self):
        """POST /api/restructure-script with category=motiongraphic should return slides with graphics"""
        payload = {
            "input": "A short video about AI technology and innovation",
            "type": "idea",
            "duration": 15,
            "tone": "professional",
            "category": "motiongraphic",
            "slideCount": 3,
            "preferredVisualStyle": "Cinematic"
        }
        
        response = requests.post(f"{BASE_URL}/api/restructure-script", json=payload, timeout=120)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, f"Expected success=True: {data}"
        assert "data" in data, "Response missing 'data'"
        
        storyboard = data["data"]
        assert "slides" in storyboard, "Storyboard missing slides"
        
        # For motiongraphic category, slides should have graphics arrays
        slides_with_graphics = [s for s in storyboard["slides"] if s.get("graphics") and len(s["graphics"]) > 0]
        
        print(f"PASSED: /api/restructure-script with motiongraphic category")
        print(f"  Total slides: {len(storyboard['slides'])}")
        print(f"  Slides with graphics: {len(slides_with_graphics)}")
        
        # Check graphics structure if present
        if slides_with_graphics:
            sample_graphic = slides_with_graphics[0]["graphics"][0]
            assert "type" in sample_graphic, "Graphic missing type"
            print(f"  Sample graphic type: {sample_graphic.get('type')}")
    
    def test_render_with_graphics_data(self):
        """Render with graphics arrays in slides"""
        payload = {
            "projectId": "test-graphics-render",
            "title": "Motion Graphics Test",
            "slides": [
                {
                    "id": "1",
                    "title": "Intro Slide",
                    "narration": "Welcome to our presentation",
                    "duration": 6,
                    "imagePrompt": "Abstract gradient background",
                    "transition": "fade",
                    "graphics": [
                        {
                            "type": "title-card",
                            "startTime": 0,
                            "duration": 3,
                            "title": "Welcome",
                            "subtitle": "Motion Graphics Demo"
                        }
                    ]
                },
                {
                    "id": "2",
                    "title": "Stats Slide",
                    "narration": "Here are some impressive numbers",
                    "duration": 5,
                    "imagePrompt": "Dark tech background",
                    "transition": "slide",
                    "graphics": [
                        {
                            "type": "stat-counter",
                            "startTime": 1,
                            "duration": 3,
                            "value": "95",
                            "label": "Success Rate",
                            "suffix": "%"
                        }
                    ]
                },
                {
                    "id": "3",
                    "title": "Speaker Slide",
                    "narration": "Let me introduce our expert",
                    "duration": 5,
                    "imagePrompt": "Professional presentation",
                    "transition": "zoom",
                    "graphics": [
                        {
                            "type": "lower-third",
                            "startTime": 2,
                            "duration": 3,
                            "name": "John Expert",
                            "title": "Senior Analyst"
                        }
                    ]
                }
            ],
            "duration": 16,
            "generateVoice": False,
            "captionMode": "words"
        }
        
        response = requests.post(f"{BASE_URL}/api/render", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, f"Expected success=True: {data}"
        assert "jobId" in data, "Response missing jobId"
        
        print(f"PASSED: /api/render accepts slides with graphics arrays, jobId={data['jobId']}")
        return data["jobId"]
    
    def test_render_with_all_graphic_types(self):
        """Test all 4 graphic types: title-card, lower-third, kinetic-text, stat-counter"""
        payload = {
            "projectId": "test-all-graphic-types",
            "title": "All Graphics Types Test",
            "slides": [
                {
                    "id": "1",
                    "title": "All Graphics",
                    "narration": "Testing all four motion graphic types",
                    "duration": 12,
                    "imagePrompt": "Abstract dark background",
                    "transition": "fade",
                    "graphics": [
                        {
                            "type": "title-card",
                            "startTime": 0,
                            "duration": 3,
                            "title": "Main Title",
                            "subtitle": "Subtitle Here"
                        },
                        {
                            "type": "lower-third",
                            "startTime": 3,
                            "duration": 3,
                            "name": "Speaker Name",
                            "title": "Position"
                        },
                        {
                            "type": "kinetic-text",
                            "startTime": 6,
                            "duration": 3,
                            "text": "Key Message Here"
                        },
                        {
                            "type": "stat-counter",
                            "startTime": 9,
                            "duration": 3,
                            "value": "100",
                            "label": "Percent Complete",
                            "prefix": "",
                            "suffix": "%"
                        }
                    ]
                }
            ],
            "duration": 12,
            "generateVoice": False
        }
        
        response = requests.post(f"{BASE_URL}/api/render", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, f"Expected success=True: {data}"
        
        print(f"PASSED: /api/render accepts all 4 graphic types, jobId={data['jobId']}")


class TestRenderJobPolling:
    """Test render job completion with caption modes and graphics"""
    
    def test_render_with_caption_lines_completes(self):
        """Test that render with captionMode=lines actually completes"""
        payload = {
            "projectId": "test-render-lines-complete",
            "title": "Lines Caption Complete Test",
            "slides": [
                {
                    "id": "1",
                    "title": "Test",
                    "narration": "Testing line by line captions",
                    "duration": 4,
                    "transition": "fade"
                }
            ],
            "duration": 4,
            "generateVoice": False,
            "captionMode": "lines",
            "captionStyleId": "minimal"
        }
        
        # Start render
        start_resp = requests.post(f"{BASE_URL}/api/render", json=payload)
        assert start_resp.status_code == 200
        job_id = start_resp.json()["jobId"]
        
        # Poll for completion (max 90s)
        status = None
        for i in range(18):  # 18 x 5s = 90s
            time.sleep(5)
            poll_resp = requests.get(f"{BASE_URL}/api/render/{job_id}")
            if poll_resp.status_code == 200:
                data = poll_resp.json()
                status = data.get("status")
                print(f"  Poll {i+1}: status={status}, progress={data.get('progress')}%")
                if status == "completed":
                    break
                elif status == "failed":
                    pytest.fail(f"Render failed: {data.get('error')}")
        
        assert status == "completed", f"Render did not complete in 90s, status={status}"
        print(f"PASSED: Render with captionMode=lines completed, jobId={job_id}")
    
    def test_render_with_graphics_completes(self):
        """Test that render with graphics data actually completes"""
        payload = {
            "projectId": "test-render-graphics-complete",
            "title": "Graphics Complete Test",
            "slides": [
                {
                    "id": "1",
                    "title": "Test",
                    "narration": "Testing graphics overlay",
                    "duration": 5,
                    "transition": "fade",
                    "graphics": [
                        {
                            "type": "title-card",
                            "startTime": 0,
                            "duration": 3,
                            "title": "Test Title"
                        }
                    ]
                }
            ],
            "duration": 5,
            "generateVoice": False
        }
        
        # Start render
        start_resp = requests.post(f"{BASE_URL}/api/render", json=payload)
        assert start_resp.status_code == 200
        job_id = start_resp.json()["jobId"]
        
        # Poll for completion (max 90s)
        status = None
        for i in range(18):
            time.sleep(5)
            poll_resp = requests.get(f"{BASE_URL}/api/render/{job_id}")
            if poll_resp.status_code == 200:
                data = poll_resp.json()
                status = data.get("status")
                print(f"  Poll {i+1}: status={status}, progress={data.get('progress')}%")
                if status == "completed":
                    break
                elif status == "failed":
                    pytest.fail(f"Render failed: {data.get('error')}")
        
        assert status == "completed", f"Render did not complete in 90s, status={status}"
        print(f"PASSED: Render with graphics data completed, jobId={job_id}")


class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("PASSED: API root returns 200")
    
    def test_auth_login(self):
        """Test auth login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "token" in data
        print("PASSED: Auth login works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
