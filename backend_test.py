#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class ExplainaProAPITester:
    def __init__(self, base_url="https://explaina-preview.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.auth_token = None
        self.test_user = {
            "email": "test@example.com",
            "password": "password123",
            "name": "Test User"
        }

    def log_test(self, name, success, details="", status_code=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "status_code": status_code,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if status_code:
            print(f"     Status: {status_code}")
        if details:
            print(f"     Details: {details}")
        print()

    def test_api_root(self):
        """Test API root endpoint"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            success = response.status_code == 200
            details = response.json().get('message', '') if success else f"HTTP {response.status_code}"
            self.log_test("API Root Endpoint", success, details, response.status_code)
            return success
        except Exception as e:
            self.log_test("API Root Endpoint", False, str(e))
            return False

    def test_status_endpoints(self):
        """Test status check endpoints"""
        try:
            # Test POST status
            test_data = {"client_name": f"test_client_{int(time.time())}"}
            response = requests.post(f"{self.base_url}/status", json=test_data, timeout=10)
            post_success = response.status_code == 200
            self.log_test("POST Status Check", post_success, 
                         response.json().get('client_name', '') if post_success else f"HTTP {response.status_code}",
                         response.status_code)
            
            # Test GET status
            response = requests.get(f"{self.base_url}/status", timeout=10)
            get_success = response.status_code == 200
            count = len(response.json()) if get_success else 0
            self.log_test("GET Status Checks", get_success, 
                         f"Retrieved {count} status checks" if get_success else f"HTTP {response.status_code}",
                         response.status_code)
            
            return post_success and get_success
        except Exception as e:
            self.log_test("Status Endpoints", False, str(e))
            return False

    def test_script_generation(self):
        """Test AI script generation"""
        try:
            script_data = {
                "input": "How to make chocolate chip cookies",
                "type": "idea",
                "duration": 30,
                "tone": "professional",
                "category": "tutorial",
                "slideCount": 5,
                "preferredVisualStyle": "Cinematic"
            }
            
            print("🔄 Testing script generation (this may take 10-15 seconds)...")
            response = requests.post(f"{self.base_url}/restructure-script", 
                                   json=script_data, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'data' in data:
                    project_data = data['data']
                    slides_count = len(project_data.get('slides', []))
                    has_title = bool(project_data.get('title'))
                    success = slides_count > 0 and has_title
                    details = f"Generated {slides_count} slides, title: '{project_data.get('title', 'N/A')}'"
                else:
                    success = False
                    details = "Response missing required fields"
            else:
                success = False
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            
            self.log_test("AI Script Generation", success, details, response.status_code)
            return success, response.json() if response.status_code == 200 else None
            
        except Exception as e:
            self.log_test("AI Script Generation", False, str(e))
            return False, None

    def test_image_generation(self):
        """Test AI image generation"""
        try:
            image_data = {
                "description": "A professional chef making chocolate chip cookies in a modern kitchen",
                "style": "Cinematic"
            }
            
            print("🔄 Testing image generation (this may take 10-15 seconds)...")
            response = requests.post(f"{self.base_url}/generate-image", 
                                   json=image_data, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                success = data.get('success') and 'image' in data
                image_url = data.get('image', '')
                details = f"Generated image: {image_url}"
            else:
                success = False
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            
            self.log_test("AI Image Generation", success, details, response.status_code)
            return success
            
        except Exception as e:
            self.log_test("AI Image Generation", False, str(e))
            return False

    def test_video_generation(self):
        """Test AI video generation"""
        try:
            video_data = {
                "description": "A cinematic view of a modern kitchen with warm lighting"
            }
            
            print("🔄 Testing video generation (this may take 10-15 seconds)...")
            response = requests.post(f"{self.base_url}/generate-video", 
                                   json=video_data, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                success = data.get('success') and 'video' in data
                video_url = data.get('video', '')
                details = f"Generated video: {video_url}"
            else:
                success = False
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            
            self.log_test("AI Video Generation", success, details, response.status_code)
            return success
            
        except Exception as e:
            self.log_test("AI Video Generation", False, str(e))
            return False

    def test_mocked_endpoints(self):
        """Test mocked API endpoints"""
        endpoints_to_test = [
            ("generate-voice", {"text": "Hello world", "voiceId": "en-US-Journey-D"}),
            ("generate-music", {"text": "uplifting background music", "duration": 30}),
            ("generate-sfx", {"text": "kitchen sounds", "duration": 5}),
        ]
        
        all_success = True
        for endpoint, data in endpoints_to_test:
            try:
                response = requests.post(f"{self.base_url}/{endpoint}", json=data, timeout=10)
                success = response.status_code == 200 and response.json().get('success')
                details = response.json().get('message', '') if success else f"HTTP {response.status_code}"
                self.log_test(f"Mocked {endpoint.replace('-', ' ').title()}", success, details, response.status_code)
                if not success:
                    all_success = False
            except Exception as e:
                self.log_test(f"Mocked {endpoint.replace('-', ' ').title()}", False, str(e))
                all_success = False
        
        return all_success

    def test_search_endpoints(self):
        """Test search API endpoints"""
        try:
            # Test asset search
            response = requests.get(f"{self.base_url}/search/assets?q=business", timeout=10)
            assets_success = response.status_code == 200 and 'results' in response.json()
            asset_count = len(response.json().get('results', [])) if assets_success else 0
            self.log_test("Search Assets", assets_success, 
                         f"Found {asset_count} assets" if assets_success else f"HTTP {response.status_code}",
                         response.status_code)
            
            # Test audio search  
            response = requests.get(f"{self.base_url}/search/audio?q=ambient", timeout=10)
            audio_success = response.status_code == 200 and 'results' in response.json()
            audio_count = len(response.json().get('results', [])) if audio_success else 0
            self.log_test("Search Audio", audio_success,
                         f"Found {audio_count} tracks" if audio_success else f"HTTP {response.status_code}",
                         response.status_code)
            
            return assets_success and audio_success
        except Exception as e:
            self.log_test("Search Endpoints", False, str(e))
            return False

    def test_auth_endpoints(self):
        """Test JWT authentication system"""
        try:
            # Test user registration
            timestamp = int(time.time())
            register_data = {
                "email": f"testuser{timestamp}@example.com",
                "password": "testpassword123",
                "name": "Test User"
            }
            
            response = requests.post(f"{self.base_url}/auth/register", json=register_data, timeout=10)
            register_success = response.status_code == 200
            
            if register_success:
                result = response.json()
                if result.get('success') and 'token' in result and 'user' in result:
                    self.auth_token = result['token']
                    user_id = result['user'].get('id')
                    details = f"Registered user: {result['user'].get('email')} (ID: {user_id})"
                else:
                    register_success = False
                    details = "Response missing token or user data"
            else:
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            
            self.log_test("User Registration", register_success, details, response.status_code)
            
            # Test user login with same credentials
            login_data = {
                "email": register_data["email"],
                "password": register_data["password"]
            }
            
            response = requests.post(f"{self.base_url}/auth/login", json=login_data, timeout=10)
            login_success = response.status_code == 200
            
            if login_success:
                result = response.json()
                if result.get('success') and 'token' in result:
                    login_token = result['token']
                    details = f"Login successful, token received"
                else:
                    login_success = False
                    details = "Response missing token"
            else:
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            
            self.log_test("User Login", login_success, details, response.status_code)
            
            # Test protected /auth/me endpoint
            if self.auth_token:
                headers = {"Authorization": f"Bearer {self.auth_token}"}
                response = requests.get(f"{self.base_url}/auth/me", headers=headers, timeout=10)
                me_success = response.status_code == 200
                
                if me_success:
                    result = response.json()
                    if result.get('success') and 'user' in result:
                        user_email = result['user'].get('email')
                        details = f"Retrieved user data: {user_email}"
                    else:
                        me_success = False
                        details = "Response missing user data"
                else:
                    details = f"HTTP {response.status_code}: {response.text[:200]}"
            else:
                me_success = False
                details = "No auth token available from registration"
            
            self.log_test("Get Current User", me_success, details, response.status_code if 'response' in locals() else None)
            
            # Test invalid login
            invalid_login_data = {
                "email": "nonexistent@example.com", 
                "password": "wrongpassword"
            }
            response = requests.post(f"{self.base_url}/auth/login", json=invalid_login_data, timeout=10)
            invalid_login_expected = response.status_code == 401
            details = f"Correctly rejected invalid credentials" if invalid_login_expected else f"Unexpected status: {response.status_code}"
            self.log_test("Invalid Login Rejection", invalid_login_expected, details, response.status_code)
            
            return register_success and login_success and me_success and invalid_login_expected
            
        except Exception as e:
            self.log_test("Auth Endpoints", False, str(e))
            return False

    def test_render_endpoints(self):
        """Test video rendering functionality"""
        try:
            # Test render initiation
            render_data = {
                "projectId": f"test_project_{int(time.time())}",
                "title": "Test Render Video",
                "duration": 15,
                "slides": [
                    {
                        "id": "1",
                        "duration": 5,
                        "assetUrl": "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800",
                        "title": "Test Slide 1"
                    },
                    {
                        "id": "2", 
                        "duration": 10,
                        "assetUrl": "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800",
                        "title": "Test Slide 2"
                    }
                ]
            }
            
            print("🔄 Testing render initiation...")
            response = requests.post(f"{self.base_url}/render", json=render_data, timeout=15)
            render_start_success = response.status_code == 200
            
            job_id = None
            if render_start_success:
                result = response.json()
                if result.get('success') and 'jobId' in result:
                    job_id = result['jobId']
                    details = f"Render started with job ID: {job_id}"
                else:
                    render_start_success = False
                    details = "Response missing job ID"
            else:
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            
            self.log_test("Render Start", render_start_success, details, response.status_code)
            
            # Test render status check
            status_success = False
            if job_id:
                time.sleep(2)  # Wait a bit for processing to start
                response = requests.get(f"{self.base_url}/render/{job_id}", timeout=10)
                status_success = response.status_code == 200
                
                if status_success:
                    result = response.json()
                    if result.get('success'):
                        status = result.get('status', 'unknown')
                        progress = result.get('progress', 0)
                        details = f"Render status: {status}, progress: {progress}%"
                    else:
                        status_success = False
                        details = "Invalid status response format"
                else:
                    details = f"HTTP {response.status_code}: {response.text[:200]}"
            else:
                details = "No job ID available from render start"
            
            self.log_test("Render Status Check", status_success, details, response.status_code if 'response' in locals() else None)
            
            # Test invalid job ID
            response = requests.get(f"{self.base_url}/render/invalid-job-id", timeout=10)
            invalid_job_expected = response.status_code == 404
            details = f"Correctly rejected invalid job ID" if invalid_job_expected else f"Unexpected status: {response.status_code}"
            self.log_test("Invalid Job ID Rejection", invalid_job_expected, details, response.status_code)
            
            return render_start_success and status_success and invalid_job_expected
            
        except Exception as e:
            self.log_test("Render Endpoints", False, str(e))
            return False

    def test_project_management(self):
        try:
            # Create a test project
            project_data = {
                "title": f"Test Project {int(time.time())}",
                "userId": f"test_user_{int(time.time())}",
                "project": {
                    "title": "Cookie Tutorial Video",
                    "duration": 30,
                    "slides": [
                        {
                            "id": "1",
                            "title": "Introduction",
                            "narration": "Welcome to our cookie tutorial!",
                            "duration": 5,
                            "imagePrompt": "A baker in a kitchen",
                            "assetType": "image",
                            "assetUrl": "/api/uploads/test-image.jpg"
                        },
                        {
                            "id": "2", 
                            "title": "Ingredients",
                            "narration": "Let's gather our ingredients.",
                            "duration": 10,
                            "imagePrompt": "Cookie ingredients on counter",
                            "assetType": "image"
                        }
                    ],
                    "category": "tutorial"
                }
            }
            
            # Test project creation
            response = requests.post(f"{self.base_url}/projects", json=project_data, timeout=10)
            create_success = response.status_code == 200
            
            project_id = None
            if create_success:
                result = response.json()
                if result.get('success') and 'project' in result:
                    project_id = result['project'].get('id')
                    details = f"Created project with ID: {project_id}"
                else:
                    create_success = False
                    details = "Response missing project ID"
            else:
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            
            self.log_test("Create Project", create_success, details, response.status_code)
            
            # Test get all projects
            response = requests.get(f"{self.base_url}/projects", timeout=10)
            get_all_success = response.status_code == 200
            if get_all_success:
                projects = response.json().get('projects', [])
                details = f"Retrieved {len(projects)} projects"
            else:
                details = f"HTTP {response.status_code}"
            
            self.log_test("Get All Projects", get_all_success, details, response.status_code)
            
            # Test get specific project (if we have an ID)
            get_specific_success = True
            if project_id:
                response = requests.get(f"{self.base_url}/projects/{project_id}", timeout=10)
                get_specific_success = response.status_code == 200
                if get_specific_success:
                    project = response.json().get('project', {})
                    details = f"Retrieved project: {project.get('title', 'Untitled')}"
                else:
                    details = f"HTTP {response.status_code}"
                
                self.log_test("Get Specific Project", get_specific_success, details, response.status_code)
            
            return create_success and get_all_success and get_specific_success
            
        except Exception as e:
            self.log_test("Project Management", False, str(e))
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print(f"🚀 Starting ExplainaPro API Tests")
        print(f"🌐 Testing against: {self.base_url}")
        print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        
        # Test basic connectivity
        if not self.test_api_root():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        # Run all test suites
        self.test_status_endpoints()
        self.test_auth_endpoints()  # New authentication tests
        self.test_script_generation()
        self.test_image_generation() 
        self.test_video_generation()
        self.test_mocked_endpoints()
        self.test_search_endpoints()
        self.test_project_management()
        self.test_render_endpoints()  # New render tests
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Summary:")
        print(f"✅ Passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Failed: {self.tests_run - self.tests_passed}/{self.tests_run}")
        print(f"📈 Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = ExplainaProAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            "summary": {
                "total_tests": tester.tests_run,
                "passed_tests": tester.tests_passed,
                "failed_tests": tester.tests_run - tester.tests_passed,
                "success_rate": (tester.tests_passed/tester.tests_run)*100 if tester.tests_run > 0 else 0
            },
            "test_results": tester.test_results,
            "timestamp": datetime.now().isoformat()
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())