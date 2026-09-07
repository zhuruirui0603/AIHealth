import numpy as np
from rank_bm25 import BM25Okapi

from app.database import SessionLocal
from app.models.knowledge import KnowledgeChunk
from app.services.embedding_service import EmbeddingService
from app.config import settings


class RetrievalResult:
    def __init__(self, chunk_id, content, score, domain, section,
                 source, title, evidence_level, document_id, url):
        self.chunk_id = chunk_id
        self.content = content
        self.score = score
        self.domain = domain
        self.section = section
        self.source = source
        self.title = title
        self.evidence_level = evidence_level
        self.document_id = document_id
        self.url = url

    def to_dict(self) -> dict:
        return {
            "chunk_id": self.chunk_id,
            "content": self.content,
            "score": round(self.score, 4),
            "domain": self.domain,
            "section": self.section,
            "source": self.source,
            "title": self.title,
            "evidence_level": self.evidence_level,
            "document_id": self.document_id,
            "url": self.url,
        }


class RetrievalService:
    def __init__(self):
        self.db = SessionLocal()
        self.embedder = EmbeddingService()
        self._chunks_cache: list[dict] | None = None
        self._embeddings_matrix: np.ndarray | None = None
        self._bm25: BM25Okapi | None = None

    def _load_index(self):
        """Load all chunks and build search indices (lazy, cached)."""
        if self._chunks_cache is not None:
            return

        chunks = self.db.query(KnowledgeChunk).all()
        if not chunks:
            self._chunks_cache = []
            self._embeddings_matrix = np.array([])
            self._bm25 = None
            return

        self._chunks_cache = []
        embeddings_list = []
        tokenized_corpus = []

        for chunk in chunks:
            doc = chunk.document
            self._chunks_cache.append({
                "chunk_id": chunk.id,
                "content": chunk.content,
                "domain": chunk.domain,
                "section": chunk.section or "",
                "source": doc.source if doc else "",
                "title": doc.title if doc else "",
                "evidence_level": chunk.evidence_level or "C",
                "document_id": chunk.document_id,
                "url": doc.url if doc else "",
            })
            embeddings_list.append(EmbeddingService.deserialize(chunk.embedding))
            tokenized_corpus.append(list(chunk.content))

        self._embeddings_matrix = np.array(embeddings_list, dtype=np.float32)
        self._bm25 = BM25Okapi(tokenized_corpus)

    def search(self, query: str, top_k: int = None, domain_filter: str = None) -> list[RetrievalResult]:
        """Hybrid search: vector similarity + BM25 keyword, fused with RRF."""
        self._load_index()

        if not self._chunks_cache:
            return []

        if top_k is None:
            top_k = settings.rag_top_k

        # Optional domain filter
        candidate_indices = list(range(len(self._chunks_cache)))
        if domain_filter:
            candidate_indices = [
                i for i in candidate_indices
                if self._chunks_cache[i]["domain"] == domain_filter
            ]

        if not candidate_indices:
            return []

        # --- Vector Search ---
        query_vec = self.embedder.embed(query)
        candidate_embeddings = self._embeddings_matrix[candidate_indices]
        vector_scores = candidate_embeddings @ np.array(query_vec, dtype=np.float32)

        vector_ranked = sorted(
            range(len(candidate_indices)),
            key=lambda i: vector_scores[i],
            reverse=True
        )
        vector_rank_map = {candidate_indices[i]: r for r, i in enumerate(vector_ranked)}

        # --- BM25 Search ---
        bm25_scores = self._bm25.get_scores(list(query))
        bm25_ranked = sorted(
            candidate_indices,
            key=lambda i: bm25_scores[i],
            reverse=True
        )
        bm25_rank_map = {idx: r for r, idx in enumerate(bm25_ranked)}

        # --- Reciprocal Rank Fusion ---
        k = 60  # RRF constant
        fused_scores = []
        for idx in candidate_indices:
            v_rank = vector_rank_map.get(idx, len(candidate_indices))
            b_rank = bm25_rank_map.get(idx, len(candidate_indices))
            rrf_score = 1.0 / (k + v_rank) + 1.0 / (k + b_rank)
            fused_scores.append((idx, rrf_score))

        fused_scores.sort(key=lambda x: x[1], reverse=True)

        results = []
        for idx, score in fused_scores[:top_k]:
            chunk_data = self._chunks_cache[idx]
            results.append(RetrievalResult(
                chunk_id=chunk_data["chunk_id"],
                content=chunk_data["content"],
                score=score,
                domain=chunk_data["domain"],
                section=chunk_data["section"],
                source=chunk_data["source"],
                title=chunk_data["title"],
                evidence_level=chunk_data["evidence_level"],
                document_id=chunk_data["document_id"],
                url=chunk_data["url"],
            ))

        return results

    def close(self):
        self.db.close()
