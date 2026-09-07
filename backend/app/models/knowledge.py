from datetime import datetime

from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.user import gen_uuid


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(String, primary_key=True, default=gen_uuid)
    title = Column(String, nullable=False)
    source = Column(String)
    organization = Column(String)
    publication_date = Column(String)
    domain = Column(String, nullable=False)  # nutrition / food_safety / exercise / medical
    population = Column(String)  # adult / elderly / all
    evidence_level = Column(String)  # A / B / C / guideline
    url = Column(String)
    content_raw = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    chunks = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan")


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id = Column(String, primary_key=True, default=gen_uuid)
    document_id = Column(String, ForeignKey("knowledge_documents.id"), nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(Text)  # JSON array of floats
    domain = Column(String, nullable=False)
    population = Column(String)
    section = Column(String)
    evidence_level = Column(String)
    chunk_index = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("KnowledgeDocument", back_populates="chunks")
