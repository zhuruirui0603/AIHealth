import os
import re
import yaml

from app.database import SessionLocal
from app.models.knowledge import KnowledgeDocument, KnowledgeChunk
from app.services.embedding_service import EmbeddingService


class IngestionService:
    def __init__(self):
        self.db = SessionLocal()
        self.embedder = EmbeddingService()

    def ingest_all(self, knowledge_dir: str = "data/knowledge"):
        """Walk the knowledge directory and ingest all .md files."""
        count = 0
        for root, dirs, files in os.walk(knowledge_dir):
            for fname in sorted(files):
                if fname.endswith(".md"):
                    filepath = os.path.join(root, fname)
                    self.ingest_file(filepath)
                    count += 1
        print(f"[Ingestion] Total files ingested: {count}")

    def ingest_file(self, filepath: str):
        """Parse a single markdown file into document + chunks."""
        with open(filepath, "r", encoding="utf-8") as f:
            raw = f.read()

        frontmatter, content = self._parse_frontmatter(raw)

        # Check if document already exists (by title)
        existing = self.db.query(KnowledgeDocument).filter_by(
            title=frontmatter.get("title", "")
        ).first()
        if existing:
            self.db.query(KnowledgeChunk).filter_by(document_id=existing.id).delete()
            self.db.delete(existing)
            self.db.commit()

        # Create document record
        doc = KnowledgeDocument(
            title=frontmatter.get("title", ""),
            source=frontmatter.get("source", ""),
            organization=frontmatter.get("organization", ""),
            publication_date=frontmatter.get("publication_date", ""),
            domain=frontmatter.get("domain", "general"),
            population=frontmatter.get("population", "all"),
            evidence_level=frontmatter.get("evidence_level", "C"),
            url=frontmatter.get("url", ""),
            content_raw=raw,
        )
        self.db.add(doc)
        self.db.flush()

        # Chunk by markdown headers
        chunks = self._chunk_by_headers(content)

        if not chunks:
            chunks = [{"content": content.strip(), "section": "root"}]

        # Embed all chunks in batch
        chunk_texts = [c["content"] for c in chunks]
        embeddings = self.embedder.embed_batch(chunk_texts)

        for i, (chunk_data, emb) in enumerate(zip(chunks, embeddings)):
            chunk = KnowledgeChunk(
                document_id=doc.id,
                content=chunk_data["content"],
                embedding=EmbeddingService.serialize(emb),
                domain=doc.domain,
                population=doc.population,
                section=chunk_data["section"],
                evidence_level=doc.evidence_level,
                chunk_index=i,
            )
            self.db.add(chunk)

        self.db.commit()
        print(f"[Ingestion] Ingested: {doc.title} ({len(chunks)} chunks)")

    def _parse_frontmatter(self, raw: str) -> tuple[dict, str]:
        """Split YAML frontmatter from markdown content."""
        match = re.match(r"^---\n(.*?)\n---\n(.*)", raw, re.DOTALL)
        if match:
            frontmatter = yaml.safe_load(match.group(1)) or {}
            content = match.group(2)
        else:
            frontmatter = {}
            content = raw
        return frontmatter, content

    def _chunk_by_headers(self, content: str) -> list[dict]:
        """Split content by markdown headers."""
        lines = content.split("\n")
        chunks = []
        current_section = []
        current_content = []

        for line in lines:
            if line.startswith("##"):
                if current_content:
                    chunk_text = "\n".join(current_content).strip()
                    if chunk_text:
                        chunks.append({
                            "content": chunk_text,
                            "section": " > ".join(current_section) if current_section else "root",
                        })
                current_section = [line.lstrip("# ").strip()]
                current_content = [line]
            elif line.startswith("###"):
                if current_content:
                    chunk_text = "\n".join(current_content).strip()
                    if chunk_text:
                        chunks.append({
                            "content": chunk_text,
                            "section": " > ".join(current_section) if current_section else "root",
                        })
                current_section = current_section + [line.lstrip("# ").strip()]
                current_content = [line]
            else:
                current_content.append(line)

        if current_content:
            chunk_text = "\n".join(current_content).strip()
            if chunk_text:
                chunks.append({
                    "content": chunk_text,
                    "section": " > ".join(current_section) if current_section else "root",
                })

        # Merge tiny chunks (<50 chars) into the previous chunk
        merged = []
        for chunk in chunks:
            if merged and len(chunk["content"]) < 50:
                merged[-1]["content"] += "\n" + chunk["content"]
            else:
                merged.append(chunk)

        return merged

    def close(self):
        self.db.close()
