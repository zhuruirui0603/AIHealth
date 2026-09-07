import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import chat, conversations, health, knowledge
from app.seed.seed_data import run_seed
from app.seed.seed_knowledge import run_knowledge_ingestion

app = FastAPI(title="NutriHealth AI", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables + seed data
Base.metadata.create_all(bind=engine)
run_seed()
run_knowledge_ingestion()

# Routers
app.include_router(health.router)
app.include_router(chat.router)
app.include_router(conversations.router)
app.include_router(knowledge.router)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
