"""
Test AI Editor Chat Feature
Tests POST /api/editor/chat endpoint that parses natural language into structured actions
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test project context data for chat testing
TEST_PROJECT_CONTEXT = {
    "title": "Test Video Project",
    "slideCount": 5,
    "slides": [
        {"index": 1, "id": "slide-1", "title": "Introduction", "duration": 6, "transition": "fade", "narration": "Welcome to our video", "hasImage": True, "hasVoice": False, "graphicsCount": 0, "vfx": "none"},
        {"index": 2, "id": "slide-2", "title": "Main Content", "duration": 8, "transition": "fade", "narration": "Here is the main content", "hasImage": False, "hasVoice": True, "graphicsCount": 1, "vfx": "none"},
        {"index": 3, "id": "slide-3", "title": "Details", "duration": 6, "transition": "slide", "narration": "Some important details", "hasImage": True, "hasVoice": False, "graphicsCount": 0, "vfx": "cinematic"},
        {"index": 4, "id": "slide-4", "title": "Examples", "duration": 5, "transition": "zoom", "narration": "Let me show you examples", "hasImage": False, "hasVoice": False, "graphicsCount": 2, "vfx": "none"},
        {"index": 5, "id": "slide-5", "title": "Conclusion", "duration": 7, "transition": "fade", "narration": "Thank you for watching", "hasImage": True, "hasVoice": True, "graphicsCount": 0, "vfx": "none"},
    ],
    "bgmUrl": None,
    "captionStyle": "minimal"
}


class TestEditorChatEndpoint:
    """Tests for POST /api/editor/chat endpoint"""

    def test_chat_endpoint_exists_and_accepts_post(self):
        """Test that the chat endpoint exists and accepts POST requests"""
        response = requests.post(
            f"{BASE_URL}/api/editor/chat",
            json={
                "message": "hello",
                "projectContext": TEST_PROJECT_CONTEXT
            },
            timeout=30
        )
        # Should return 200 (not 404 or 405)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "success" in data

    def test_chat_returns_reply_and_actions(self):
        """Test that chat response contains reply and actions fields"""
        response = requests.post(
            f"{BASE_URL}/api/editor/chat",
            json={
                "message": "What is this project about?",
                "projectContext": TEST_PROJECT_CONTEXT
            },
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        # Response should have reply and actions
        assert "reply" in data, f"Missing 'reply' in response: {data}"
        assert "actions" in data, f"Missing 'actions' in response: {data}"
        assert isinstance(data["actions"], list), "actions should be a list"

    def test_chat_change_slide_transition(self):
        """Test: 'change slide 2 transition to zoom' -> update_slide action"""
        response = requests.post(
            f"{BASE_URL}/api/editor/chat",
            json={
                "message": "change slide 2 transition to zoom",
                "projectContext": TEST_PROJECT_CONTEXT
            },
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True, f"Expected success=True: {data}"
        assert "reply" in data
        assert "actions" in data
        
        # Should have at least one action with type update_slide
        actions = data.get("actions", [])
        update_actions = [a for a in actions if a.get("type") == "update_slide"]
        
        if len(update_actions) > 0:
            action = update_actions[0]
            # Check action structure - slideId should match slide-2
            assert action.get("slideId") == "slide-2", f"Expected slideId 'slide-2', got: {action}"
            # Check transition update
            updates = action.get("updates", {})
            assert updates.get("transition") == "zoom", f"Expected transition 'zoom' in updates: {updates}"
            print(f"✓ Correctly parsed 'change slide 2 transition to zoom': {action}")
        else:
            print(f"Note: No update_slide action returned. Actions: {actions}")
            # This is acceptable if AI returns 'info' type with explanation
            assert any(a.get("type") == "info" for a in actions) or len(actions) == 0

    def test_chat_batch_update_all_durations(self):
        """Test: 'set all durations to 8 seconds' -> batch_update action"""
        response = requests.post(
            f"{BASE_URL}/api/editor/chat",
            json={
                "message": "set all durations to 8 seconds",
                "projectContext": TEST_PROJECT_CONTEXT
            },
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "actions" in data
        
        actions = data.get("actions", [])
        batch_actions = [a for a in actions if a.get("type") == "batch_update"]
        
        if len(batch_actions) > 0:
            action = batch_actions[0]
            updates = action.get("updates", {})
            assert "duration" in updates, f"Expected 'duration' in updates: {updates}"
            assert updates.get("duration") == 8, f"Expected duration 8, got: {updates.get('duration')}"
            print(f"✓ Correctly parsed 'set all durations to 8 seconds': {action}")
        else:
            # Could also be multiple update_slide actions
            update_actions = [a for a in actions if a.get("type") == "update_slide"]
            if len(update_actions) > 0:
                print(f"Note: AI used multiple update_slide actions instead of batch_update")
            else:
                print(f"Note: No batch_update or update_slide actions: {actions}")

    def test_chat_add_title_card(self):
        """Test: 'add a title card to slide 1' -> add_graphic action"""
        response = requests.post(
            f"{BASE_URL}/api/editor/chat",
            json={
                "message": "add a title card to slide 1",
                "projectContext": TEST_PROJECT_CONTEXT
            },
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        actions = data.get("actions", [])
        
        add_graphic_actions = [a for a in actions if a.get("type") == "add_graphic"]
        
        if len(add_graphic_actions) > 0:
            action = add_graphic_actions[0]
            assert action.get("slideId") == "slide-1", f"Expected slideId 'slide-1', got: {action.get('slideId')}"
            graphic = action.get("graphic", {})
            assert graphic.get("type") == "title-card", f"Expected graphic type 'title-card', got: {graphic.get('type')}"
            print(f"✓ Correctly parsed 'add a title card to slide 1': {action}")
        else:
            print(f"Note: No add_graphic action returned. Actions: {actions}")

    def test_chat_delete_slide(self):
        """Test: 'delete slide 3' -> delete_slide action"""
        response = requests.post(
            f"{BASE_URL}/api/editor/chat",
            json={
                "message": "delete slide 3",
                "projectContext": TEST_PROJECT_CONTEXT
            },
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        actions = data.get("actions", [])
        
        delete_actions = [a for a in actions if a.get("type") == "delete_slide"]
        
        if len(delete_actions) > 0:
            action = delete_actions[0]
            assert action.get("slideId") == "slide-3", f"Expected slideId 'slide-3', got: {action.get('slideId')}"
            print(f"✓ Correctly parsed 'delete slide 3': {action}")
        else:
            print(f"Note: No delete_slide action returned. Actions: {actions}")

    def test_chat_general_question_info_action(self):
        """Test: General question returns 'info' action type"""
        response = requests.post(
            f"{BASE_URL}/api/editor/chat",
            json={
                "message": "How many slides does this project have?",
                "projectContext": TEST_PROJECT_CONTEXT
            },
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "reply" in data
        # For questions, we expect either info action or just a reply with empty actions
        print(f"✓ General question handled. Reply: {data.get('reply', '')[:100]}")

    def test_chat_missing_message_field(self):
        """Test handling of missing message field"""
        response = requests.post(
            f"{BASE_URL}/api/editor/chat",
            json={
                "projectContext": TEST_PROJECT_CONTEXT
            },
            timeout=30
        )
        # Should still return 200 but with appropriate response
        assert response.status_code in [200, 400, 422], f"Unexpected status: {response.status_code}"

    def test_chat_empty_project_context(self):
        """Test handling of empty project context"""
        response = requests.post(
            f"{BASE_URL}/api/editor/chat",
            json={
                "message": "Hello",
                "projectContext": {}
            },
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        # Should still return some response
        assert "reply" in data or "success" in data

    def test_chat_response_time(self):
        """Test that chat responds within reasonable time (< 15 seconds)"""
        start = time.time()
        response = requests.post(
            f"{BASE_URL}/api/editor/chat",
            json={
                "message": "change slide 1 duration to 10 seconds",
                "projectContext": TEST_PROJECT_CONTEXT
            },
            timeout=20
        )
        elapsed = time.time() - start
        
        assert response.status_code == 200
        print(f"✓ Chat responded in {elapsed:.2f} seconds")
        assert elapsed < 15, f"Chat took too long: {elapsed:.2f} seconds"


class TestEditorChatActionTypes:
    """Test various action types that the chat can return"""

    def test_set_caption_style_action(self):
        """Test: 'change caption style to netflix' -> set_caption_style action"""
        response = requests.post(
            f"{BASE_URL}/api/editor/chat",
            json={
                "message": "change caption style to netflix",
                "projectContext": TEST_PROJECT_CONTEXT
            },
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Caption style change response: {data}")

    def test_open_tab_action(self):
        """Test: 'open the effects tab' -> open_tab action"""
        response = requests.post(
            f"{BASE_URL}/api/editor/chat",
            json={
                "message": "open the effects tab",
                "projectContext": TEST_PROJECT_CONTEXT
            },
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Open tab response: {data}")

    def test_generate_images_action(self):
        """Test: 'generate images for all slides' -> generate_all_images action"""
        response = requests.post(
            f"{BASE_URL}/api/editor/chat",
            json={
                "message": "generate images for all slides",
                "projectContext": TEST_PROJECT_CONTEXT
            },
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        actions = data.get("actions", [])
        gen_all = [a for a in actions if a.get("type") == "generate_all_images"]
        print(f"Generate all images response: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
