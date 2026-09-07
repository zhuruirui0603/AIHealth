from fastapi import APIRouter
from pydantic import BaseModel

from app.services.conversation_service import ConversationService

router = APIRouter()


class RenameRequest(BaseModel):
    title: str


@router.get("/api/conversations")
async def list_conversations():
    conv_service = ConversationService()
    try:
        return conv_service.list_conversations()
    finally:
        conv_service.close()


@router.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    conv_service = ConversationService()
    try:
        result = conv_service.get_conversation_with_messages(conversation_id)
        if result is None:
            return {"error": "Conversation not found", "code": 404}
        return result
    finally:
        conv_service.close()


@router.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    conv_service = ConversationService()
    try:
        success = conv_service.delete_conversation(conversation_id)
        if not success:
            return {"error": "Conversation not found", "code": 404}
        return {"success": True}
    finally:
        conv_service.close()


@router.put("/api/conversations/{conversation_id}/rename")
async def rename_conversation(conversation_id: str, request: RenameRequest):
    conv_service = ConversationService()
    try:
        success = conv_service.rename_conversation(conversation_id, request.title)
        if not success:
            return {"error": "Conversation not found", "code": 404}
        return {"success": True, "title": request.title}
    finally:
        conv_service.close()


@router.patch("/api/conversations/{conversation_id}/pin")
async def toggle_pin(conversation_id: str):
    conv_service = ConversationService()
    try:
        result = conv_service.toggle_pin(conversation_id)
        if result is None:
            return {"error": "Conversation not found", "code": 404}
        return {"success": True, "pinned": result}
    finally:
        conv_service.close()


@router.get("/api/user/profile")
async def get_user_profile():
    conv_service = ConversationService()
    try:
        profile = conv_service.get_user_profile()
        if profile is None:
            return {"error": "Profile not found", "code": 404}
        return {
            "age": profile.age,
            "sex": profile.sex,
            "height": profile.height,
            "weight": profile.weight,
            "goal": profile.goal,
            "activity_level": profile.activity_level,
            "work_schedule": profile.work_schedule,
            "diet_preference": profile.diet_preference,
            "food_preferences": profile.food_preferences,
            "allergies": profile.allergies,
        }
    finally:
        conv_service.close()
