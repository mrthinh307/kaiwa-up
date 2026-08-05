from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", summary="Check application health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}

