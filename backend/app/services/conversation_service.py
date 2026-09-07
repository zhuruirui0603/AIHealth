from app.database import SessionLocal
from app.models.user import User, UserProfile
from app.models.conversation import Conversation, Message
from app.seed.seed_data import SEED_USER


class ConversationService:
    def __init__(self):
        self.db = SessionLocal()

    def get_seed_user(self) -> User:
        return self.db.query(User).filter_by(email=SEED_USER["email"]).first()

    def get_user_profile(self) -> UserProfile:
        user = self.get_seed_user()
        if user and user.profile:
            return user.profile
        return None

    def get_or_create(self, conversation_id: str | None) -> Conversation:
        if conversation_id:
            conv = self.db.query(Conversation).filter_by(id=conversation_id).first()
            if conv:
                return conv

        user = self.get_seed_user()
        conv = Conversation(user_id=user.id, title="新对话")
        self.db.add(conv)
        self.db.commit()
        self.db.refresh(conv)
        return conv

    def add_message(self, conversation_id: str, role: str, content: str) -> Message:
        msg = Message(conversation_id=conversation_id, role=role, content=content)
        self.db.add(msg)
        self.db.commit()
        self.db.refresh(msg)
        return msg

    def update_title(self, conversation_id: str, title: str):
        """Update conversation title."""
        conv = self.db.query(Conversation).filter_by(id=conversation_id).first()
        if conv:
            conv.title = title
            self.db.commit()

    def rename_conversation(self, conversation_id: str, title: str) -> bool:
        """Rename a conversation. Returns True if successful."""
        conv = self.db.query(Conversation).filter_by(id=conversation_id).first()
        if not conv:
            return False
        conv.title = title.strip() or "未命名对话"
        self.db.commit()
        return True

    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation and all its messages. Returns True if successful."""
        conv = self.db.query(Conversation).filter_by(id=conversation_id).first()
        if not conv:
            return False
        # Delete associated messages first
        self.db.query(Message).filter_by(conversation_id=conversation_id).delete()
        self.db.delete(conv)
        self.db.commit()
        return True

    def toggle_pin(self, conversation_id: str) -> bool | None:
        """Toggle the pinned status of a conversation. Returns new pinned state, or None if not found."""
        conv = self.db.query(Conversation).filter_by(id=conversation_id).first()
        if not conv:
            return None
        conv.pinned = not conv.pinned
        self.db.commit()
        return conv.pinned

    def get_history(self, conversation_id: str) -> list[dict]:
        """Return messages as LLM-format dicts: [{role, content}]."""
        msgs = (
            self.db.query(Message)
            .filter_by(conversation_id=conversation_id)
            .order_by(Message.created_at)
            .all()
        )
        return [{"role": m.role, "content": m.content} for m in msgs]

    def get_conversation_with_messages(self, conversation_id: str) -> dict | None:
        conv = self.db.query(Conversation).filter_by(id=conversation_id).first()
        if not conv:
            return None
        messages = (
            self.db.query(Message)
            .filter_by(conversation_id=conversation_id)
            .order_by(Message.created_at)
            .all()
        )
        return {
            "id": conv.id,
            "title": conv.title,
            "created_at": conv.created_at.isoformat() if conv.created_at else None,
            "messages": [
                {
                    "id": m.id,
                    "role": m.role,
                    "content": m.content,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in messages
            ],
        }

    def list_conversations(self) -> list[dict]:
        convs = (
            self.db.query(Conversation)
            .order_by(
                Conversation.pinned.desc(),
                Conversation.updated_at.desc(),
            )
            .all()
        )
        return [
            {
                "id": c.id,
                "title": c.title,
                "pinned": c.pinned or False,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            }
            for c in convs
        ]

    def close(self):
        self.db.close()
