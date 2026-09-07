import json
import numpy as np
from sentence_transformers import SentenceTransformer

from app.config import settings


class EmbeddingService:
    _model: SentenceTransformer | None = None

    @classmethod
    def get_model(cls) -> SentenceTransformer:
        if cls._model is None:
            cls._model = SentenceTransformer(settings.embedding_model_name)
        return cls._model

    @classmethod
    def embed(cls, text: str) -> list[float]:
        model = cls.get_model()
        vec = model.encode(text, normalize_embeddings=True)
        return vec.tolist()

    @classmethod
    def embed_batch(cls, texts: list[str]) -> list[list[float]]:
        model = cls.get_model()
        vecs = model.encode(texts, normalize_embeddings=True, batch_size=32)
        return [v.tolist() for v in vecs]

    @staticmethod
    def cosine_similarity(query_vec: list[float], doc_vecs: np.ndarray) -> np.ndarray:
        q = np.array(query_vec, dtype=np.float32)
        return doc_vecs @ q

    @staticmethod
    def serialize(vec: list[float]) -> str:
        return json.dumps(vec)

    @staticmethod
    def deserialize(s: str) -> list[float]:
        return json.loads(s)
