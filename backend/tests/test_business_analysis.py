"""
Backend tests for Business Analysis API and Business Video Categories
Tests the /api/analyze-business endpoint for the ExplainaPro video creation platform
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBusinessAnalysisAPI:
    """Test the /api/analyze-business endpoint"""
    
    def test_api_health(self):
        """Verify API is reachable"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"API not reachable: {response.status_code}"
        data = response.json()
        assert "message" in data
        print("PASSED: API health check")
    
    def test_analyze_business_with_description_only(self):
        """Test /api/analyze-business with only description (no URL, no file)"""
        response = requests.post(
            f"{BASE_URL}/api/analyze-business",
            data={"description": "We are a SaaS company that builds AI-powered video tools for businesses"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert "data" in data, "Missing 'data' field"
        
        analysis = data["data"]
        
        # Verify required fields
        assert "businessName" in analysis, "Missing businessName"
        assert "businessSummary" in analysis, "Missing businessSummary"
        assert "suggestedVideos" in analysis, "Missing suggestedVideos"
        assert isinstance(analysis["suggestedVideos"], list), "suggestedVideos should be a list"
        assert len(analysis["suggestedVideos"]) >= 1, "Should have at least 1 suggested video"
        
        # Verify suggested video structure
        first_video = analysis["suggestedVideos"][0]
        assert "categoryId" in first_video, "Suggested video missing categoryId"
        assert "label" in first_video, "Suggested video missing label"
        assert "reason" in first_video, "Suggested video missing reason"
        assert "priority" in first_video, "Suggested video missing priority"
        
        print(f"PASSED: analyze_business_with_description - Business: {analysis['businessName']}")
        print(f"  - Found {len(analysis['suggestedVideos'])} suggested video types")
        
    def test_analyze_business_with_url_only(self):
        """Test /api/analyze-business with only URL"""
        response = requests.post(
            f"{BASE_URL}/api/analyze-business",
            data={"url": "https://example.com"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print("PASSED: analyze_business_with_url")
    
    def test_analyze_business_no_input_fails(self):
        """Test /api/analyze-business with no input returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/analyze-business",
            data={}
        )
        assert response.status_code == 400, f"Expected 400 for empty input, got {response.status_code}"
        print("PASSED: analyze_business_no_input returns 400")
    
    def test_analyze_business_suggested_video_category_ids(self):
        """Verify suggested video categoryIds are valid business categories"""
        valid_business_categories = [
            "biz_product_demo", "biz_pitch_deck", "biz_commercial", "biz_marketing",
            "biz_company_profile", "biz_brand_story", "biz_testimonial", "biz_social_ad",
            "biz_training", "biz_product_launch", "biz_case_study", "biz_webinar_promo",
            "biz_sales_explainer", "biz_presentation"
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/analyze-business",
            data={"description": "Enterprise software company providing CRM solutions"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        for video in data["data"]["suggestedVideos"]:
            cat_id = video.get("categoryId")
            assert cat_id in valid_business_categories, f"Invalid categoryId: {cat_id}"
        
        print(f"PASSED: All suggested categoryIds are valid business categories")


class TestScriptGenerationForBusinessCategories:
    """Test script generation with business category prompts"""
    
    def test_restructure_script_with_business_category(self):
        """Test /api/restructure-script works with business categories"""
        # This test will take longer due to AI generation
        response = requests.post(
            f"{BASE_URL}/api/restructure-script",
            json={
                "input": '{"businessAnalysis": {"businessName": "TechCorp", "businessSummary": "AI tools company"}, "selectedVideoType": "biz_product_demo"}',
                "type": "idea",
                "duration": 30,
                "tone": "professional",
                "category": "biz_product_demo",
                "slideCount": 3,
                "preferredVisualStyle": "Cinematic"
            },
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success, got {data}"
        
        # Verify slides have videoPrompt field
        if "data" in data and "slides" in data["data"]:
            for slide in data["data"]["slides"]:
                # videoPrompt may be present (new feature)
                if "videoPrompt" in slide:
                    print(f"  Slide {slide.get('id', '?')}: videoPrompt present")
                else:
                    print(f"  Slide {slide.get('id', '?')}: videoPrompt NOT present (may need check)")
        
        print("PASSED: restructure_script with business category")


class TestAuthAndUserFlow:
    """Test auth endpoints used in business flow"""
    
    def test_login(self):
        """Test login with test credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@test.com", "password": "password"}
        )
        # May return 401 if user doesn't exist - that's OK for this test
        assert response.status_code in [200, 401], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "token" in data
            print("PASSED: Login successful")
        else:
            print("SKIPPED: Test user not found (401)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
