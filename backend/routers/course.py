from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class CourseRequest(BaseModel):
    keyword: str       # "고양이"
    latitude: float    # 현재 위치
    longitude: float
    radius_km: float = 2.0  # 코스 반경

@router.post("/generate")
async def generate_course(req: CourseRequest):
    # TODO: 1) AI로 실루엣 생성 2) 도로 fitting 3) GPX 반환
    return {"message": f"{req.keyword} 코스 생성 준비 완료"}
