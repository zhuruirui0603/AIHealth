from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # DeepSeek
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"

    # Database
    database_url: str = "sqlite:///./nutrihealth.db"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # Embedding
    embedding_model_name: str = "BAAI/bge-small-zh-v1.5"
    embedding_dimension: int = 512

    # RAG
    rag_top_k: int = 5
    rag_similarity_threshold: float = 0.3

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
