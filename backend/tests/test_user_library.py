"""
Test cases for User Asset Library feature
- GET /api/user/library returns user's assets grouped by category with counts
- GET /api/user/library?category=image filters by category
- DELETE /api/user/assets/{assetId} removes asset and returns success
- DELETE /api/user/assets/{nonexistent} returns 404
- POST /api/upload saves to user library when authenticated
- GET /api/user/stats returns correct counts per type
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUserLibraryFeature:
    """Test cases for User Asset Library feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token for tests"""
        self.base_url = BASE_URL
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        data = login_response.json()
        self.token = data.get("token")
        self.user_id = data.get("user", {}).get("id")
        assert self.token, "Token not returned from login"
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_user_library_returns_assets_grouped_by_category(self):
        """GET /api/user/library returns user's assets grouped by category with counts"""
        response = requests.get(f"{BASE_URL}/api/user/library", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "assets" in data
        assert "counts" in data
        assert "total" in data
        assert isinstance(data["assets"], list)
        assert isinstance(data["counts"], dict)
        assert data["total"] >= 0
        
        # Verify counts structure (should have type keys like image, voice, video, audio)
        print(f"Library counts: {data['counts']}")
        print(f"Total assets: {data['total']}")
    
    def test_get_user_library_filter_by_category_image(self):
        """GET /api/user/library?category=image filters by category"""
        response = requests.get(f"{BASE_URL}/api/user/library?category=image", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # All returned assets should be of type 'image'
        for asset in data["assets"]:
            assert asset["type"] == "image", f"Expected image type, got {asset['type']}"
        
        print(f"Image assets found: {len(data['assets'])}")
    
    def test_get_user_library_filter_by_category_voice(self):
        """GET /api/user/library?category=voice filters correctly"""
        response = requests.get(f"{BASE_URL}/api/user/library?category=voice", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        for asset in data["assets"]:
            assert asset["type"] == "voice", f"Expected voice type, got {asset['type']}"
        
        print(f"Voice assets found: {len(data['assets'])}")
    
    def test_get_user_library_filter_by_category_video(self):
        """GET /api/user/library?category=video filters correctly"""
        response = requests.get(f"{BASE_URL}/api/user/library?category=video", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        for asset in data["assets"]:
            assert asset["type"] == "video", f"Expected video type, got {asset['type']}"
    
    def test_get_user_library_filter_by_category_audio(self):
        """GET /api/user/library?category=audio filters correctly"""
        response = requests.get(f"{BASE_URL}/api/user/library?category=audio", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        for asset in data["assets"]:
            assert asset["type"] == "audio", f"Expected audio type, got {asset['type']}"
    
    def test_delete_nonexistent_asset_returns_404(self):
        """DELETE /api/user/assets/{nonexistent} returns 404"""
        fake_id = f"nonexistent-{uuid.uuid4()}"
        response = requests.delete(f"{BASE_URL}/api/user/assets/{fake_id}", headers=self.headers)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "not found" in data.get("detail", "").lower() or "Asset not found" in str(data)
    
    def test_get_user_stats_returns_counts_per_type(self):
        """GET /api/user/stats returns correct counts per type"""
        response = requests.get(f"{BASE_URL}/api/user/stats", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "stats" in data
        
        stats = data["stats"]
        assert "images" in stats
        assert "voices" in stats
        assert "videos" in stats
        assert "projects" in stats
        assert "total" in stats
        
        # Verify all counts are non-negative integers
        for key in ["images", "voices", "videos", "projects", "total"]:
            assert isinstance(stats[key], int)
            assert stats[key] >= 0
        
        print(f"User stats: {stats}")
    
    def test_upload_with_auth_saves_to_library(self):
        """POST /api/upload saves to user library when authenticated"""
        # Create a small test file
        test_content = b"TEST_UPLOAD_LIBRARY_TEST_DATA"
        files = {"file": ("test_library_upload.txt", test_content, "text/plain")}
        
        # Get initial library count
        initial_response = requests.get(f"{BASE_URL}/api/user/library", headers=self.headers)
        initial_count = initial_response.json().get("total", 0)
        
        # Upload file
        response = requests.post(f"{BASE_URL}/api/upload", headers=self.headers, files=files)
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "assetId" in data
        assert "url" in data
        assert "type" in data
        
        uploaded_asset_id = data["assetId"]
        print(f"Uploaded asset ID: {uploaded_asset_id}")
        
        # Verify asset was added to library
        library_response = requests.get(f"{BASE_URL}/api/user/library", headers=self.headers)
        library_data = library_response.json()
        assert library_data["total"] > initial_count, "Asset not added to library"
        
        # Clean up - delete the test asset
        delete_response = requests.delete(f"{BASE_URL}/api/user/assets/{uploaded_asset_id}", headers=self.headers)
        assert delete_response.status_code == 200, f"Cleanup delete failed: {delete_response.status_code}"
    
    def test_delete_asset_removes_from_library(self):
        """DELETE /api/user/assets/{assetId} removes asset and returns success"""
        # First create an asset by uploading
        test_content = b"TEST_DELETE_ASSET_DATA"
        files = {"file": ("test_delete_asset.txt", test_content, "text/plain")}
        upload_response = requests.post(f"{BASE_URL}/api/upload", headers=self.headers, files=files)
        
        assert upload_response.status_code == 200
        asset_id = upload_response.json()["assetId"]
        
        # Now delete the asset
        delete_response = requests.delete(f"{BASE_URL}/api/user/assets/{asset_id}", headers=self.headers)
        
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        data = delete_response.json()
        assert data["success"] == True
        
        # Verify asset is gone
        verify_delete = requests.delete(f"{BASE_URL}/api/user/assets/{asset_id}", headers=self.headers)
        assert verify_delete.status_code == 404, "Asset should not exist after deletion"
    
    def test_library_requires_authentication(self):
        """GET /api/user/library requires authentication"""
        response = requests.get(f"{BASE_URL}/api/user/library")
        assert response.status_code == 401
    
    def test_delete_requires_authentication(self):
        """DELETE /api/user/assets/{id} requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/user/assets/any-id")
        assert response.status_code == 401
    
    def test_stats_requires_authentication(self):
        """GET /api/user/stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/user/stats")
        assert response.status_code == 401
    
    def test_library_assets_have_required_fields(self):
        """Library assets have all required fields"""
        response = requests.get(f"{BASE_URL}/api/user/library", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ["id", "type", "url", "userId", "createdAt"]
        
        for asset in data["assets"]:
            for field in required_fields:
                assert field in asset, f"Missing field '{field}' in asset {asset.get('id')}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
