import os

from app.database import SessionLocal
from app.models.knowledge import KnowledgeChunk


def run_knowledge_ingestion():
    """Ingest knowledge files on startup if database has no knowledge chunks."""
    db = SessionLocal()
    try:
        count = db.query(KnowledgeChunk).count()
        if count > 0:
            print(f"[Knowledge] Already has {count} chunks, skipping ingestion.")
            return
    finally:
        db.close()

    knowledge_dir = os.path.join(
        os.path.dirname(__file__), "..", "..", "data", "knowledge"
    )
    knowledge_dir = os.path.abspath(knowledge_dir)

    if not os.path.exists(knowledge_dir):
        print(f"[Knowledge] Directory not found: {knowledge_dir}")
        return

    from app.services.ingestion_service import IngestionService

    service = IngestionService()
    try:
        service.ingest_all(knowledge_dir)
    finally:
        service.close()
