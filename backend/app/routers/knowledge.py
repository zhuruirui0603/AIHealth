from fastapi import APIRouter

from app.database import SessionLocal
from app.models.knowledge import KnowledgeDocument, KnowledgeChunk

router = APIRouter()


@router.get("/api/knowledge/stats")
async def knowledge_stats():
    db = SessionLocal()
    try:
        doc_count = db.query(KnowledgeDocument).count()
        chunk_count = db.query(KnowledgeChunk).count()
        domains = db.query(KnowledgeChunk.domain).distinct().all()
        return {
            "documents": doc_count,
            "chunks": chunk_count,
            "domains": [d[0] for d in domains],
        }
    finally:
        db.close()


@router.get("/api/knowledge/documents")
async def list_documents():
    db = SessionLocal()
    try:
        docs = db.query(KnowledgeDocument).all()
        return [
            {
                "id": d.id,
                "title": d.title,
                "source": d.source,
                "domain": d.domain,
                "evidence_level": d.evidence_level,
                "chunk_count": len(d.chunks),
            }
            for d in docs
        ]
    finally:
        db.close()
