from fastapi import APIRouter

router = APIRouter()


@router.get("/api/health")
async def health():
    return {"status": "ok", "service": "NutriHealth AI", "version": "0.1.0"}
