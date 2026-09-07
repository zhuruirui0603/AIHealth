from app.database import SessionLocal
from app.models.user import User, UserProfile

SEED_USER = {
    "email": "demo@nutrihealth.ai",
    "profile": {
        "age": 28,
        "sex": "male",
        "height": 175,
        "weight": 78,
        "goal": "减脂 + 增肌",
        "activity_level": "moderate",
        "work_schedule": "9-18, 偶尔加班到21",
        "diet_preference": "杂食",
        "food_preferences": '["喜欢吃辣", "不喜欢香菜", "偏好米饭"]',
        "allergies": '["无"]',
    },
}


def run_seed():
    """Insert seed user if database is empty."""
    db = SessionLocal()
    try:
        existing = db.query(User).filter_by(email=SEED_USER["email"]).first()
        if existing:
            return

        user = User(email=SEED_USER["email"])
        db.add(user)
        db.flush()

        profile_data = SEED_USER["profile"]
        profile = UserProfile(user_id=user.id, **profile_data)
        db.add(profile)
        db.commit()
        print(f"[Seed] Created seed user: {user.email}")
    except Exception as e:
        db.rollback()
        print(f"[Seed] Error: {e}")
    finally:
        db.close()
