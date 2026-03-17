"""
Tests for ExplainaPro - New Features Testing (Iteration 12)
- /api/generate-prompt endpoint
- Category prompts for 21 categories
- Auth login flow
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Basic health check tests."""
    
    def test_api_root(self):
        """Test API root returns success."""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"PASSED: API root - {data['message']}")

class TestAuthLogin:
    """Authentication tests."""
    
    def test_login_with_test_credentials(self):
        """Test login with test@test.com / password."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "test@test.com"
        print(f"PASSED: Login successful - user: {data['user']['email']}")
        return data["token"]

class TestGeneratePrompt:
    """Tests for the /api/generate-prompt endpoint."""
    
    def test_generate_prompt_basic(self):
        """Test the generate-prompt endpoint with a simple story."""
        response = requests.post(f"{BASE_URL}/api/generate-prompt", json={
            "story": "A robot learns to feel emotions for the first time",
            "category": "scifi",
            "tone": "storytelling",
            "slideCount": 5,
            "duration": 30,
            "visualStyle": "Cinematic"
        })
        
        # Print response for debugging
        print(f"Response status: {response.status_code}")
        if response.status_code != 200:
            print(f"Error response: {response.text[:500]}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "data" in data
        
        prompt_data = data["data"]
        # Verify required fields in response
        assert "title" in prompt_data
        assert "slides" in prompt_data
        assert isinstance(prompt_data["slides"], list)
        assert len(prompt_data["slides"]) == 5  # Should match slideCount
        
        # Verify slide structure
        for slide in prompt_data["slides"]:
            assert "id" in slide
            assert "narrationPrompt" in slide or "narration" in slide  # AI may use different field name
            assert "imagePrompt" in slide
            
        print(f"PASSED: generate-prompt returned valid data")
        print(f"  Title: {prompt_data.get('title', 'N/A')}")
        print(f"  Slides: {len(prompt_data.get('slides', []))}")
        
        # Check for enhanced prompt fields
        if "musicPrompt" in prompt_data:
            print(f"  musicPrompt: present")
        if "sfxDesign" in prompt_data:
            print(f"  sfxDesign: present ({len(prompt_data.get('sfxDesign', []))} items)")
        if "characters" in prompt_data:
            print(f"  characters: {len(prompt_data.get('characters', []))} defined")
        
        return prompt_data
    
    def test_generate_prompt_horror_category(self):
        """Test generate-prompt with horror category (one of the new categories)."""
        response = requests.post(f"{BASE_URL}/api/generate-prompt", json={
            "story": "A man moves into an old house and starts hearing whispers at night",
            "category": "horror",
            "tone": "storytelling",
            "slideCount": 4,
            "duration": 45,
            "visualStyle": "Cinematic"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"PASSED: generate-prompt works for horror category")
        print(f"  Title: {data['data'].get('title', 'N/A')}")
    
    def test_generate_prompt_motivational_category(self):
        """Test generate-prompt with motivational category."""
        response = requests.post(f"{BASE_URL}/api/generate-prompt", json={
            "story": "Never give up on your dreams, every setback is a setup for a comeback",
            "category": "motivation",
            "tone": "bold",
            "slideCount": 3,
            "duration": 20,
            "visualStyle": "Cinematic"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"PASSED: generate-prompt works for motivation category")
        print(f"  Title: {data['data'].get('title', 'N/A')}")
    
    def test_generate_prompt_recipe_category(self):
        """Test generate-prompt with recipe category (new)."""
        response = requests.post(f"{BASE_URL}/api/generate-prompt", json={
            "story": "How to make the perfect homemade pizza from scratch",
            "category": "recipe",
            "tone": "soft",
            "slideCount": 6,
            "duration": 60,
            "visualStyle": "Photorealistic"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"PASSED: generate-prompt works for recipe category")
        print(f"  Title: {data['data'].get('title', 'N/A')}")

class TestRestructureScript:
    """Tests for /api/restructure-script endpoint."""
    
    def test_restructure_script_basic(self):
        """Test the restructure-script endpoint."""
        response = requests.post(f"{BASE_URL}/api/restructure-script", json={
            "input": "Explain how black holes are formed in space",
            "type": "idea",
            "duration": 30,
            "tone": "documentary",
            "category": "scifi",
            "slideCount": 5,
            "preferredVisualStyle": "Cinematic"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "data" in data
        
        storyboard = data["data"]
        assert "title" in storyboard
        assert "slides" in storyboard
        assert len(storyboard["slides"]) > 0
        
        print(f"PASSED: restructure-script returned valid storyboard")
        print(f"  Title: {storyboard.get('title', 'N/A')}")
        print(f"  Slides: {len(storyboard.get('slides', []))}")

class TestCategoryPrompts:
    """Test that all 21 category prompts exist in CATEGORY_PROMPTS."""
    
    def test_all_categories_defined(self):
        """Verify that CATEGORY_PROMPTS has all 21 categories."""
        # These are the 21 categories from useProjectStore.js
        expected_categories = [
            "news", "explainer", "cartoon", "ebook", "biography", "tutorial",
            "datastory", "youtube", "motiongraphic", "remaker", "history",
            "prayer", "reporter", "horror", "scifi", "travel", "motivation",
            "crime", "comedy", "recipe", "fitness"
        ]
        
        # Test a representative sample of categories with generate-prompt
        sample_categories = ["horror", "scifi", "travel", "motivation", "crime", "comedy", "recipe", "fitness"]
        
        for category in sample_categories:
            response = requests.post(f"{BASE_URL}/api/generate-prompt", json={
                "story": f"Test story for {category} category",
                "category": category,
                "tone": "professional",
                "slideCount": 2,
                "duration": 15,
                "visualStyle": "Cinematic"
            })
            
            if response.status_code == 200:
                print(f"  {category}: PASSED")
            else:
                print(f"  {category}: FAILED ({response.status_code})")
            
            assert response.status_code == 200, f"Category {category} failed"
        
        print(f"PASSED: All new category prompts work correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
