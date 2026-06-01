# ShapeRun 🐾

> 키워드를 입력하면 AI가 그 모양으로 러닝 코스를 자동 생성해주는 서비스

고양이를 입력하면 고양이 모양으로, 고래를 입력하면 고래 모양으로 — 내 주변 도로 위에 실제로 뛸 수 있는 코스를 만들어줍니다.

## 주요 기능

- 키워드 입력 → AI가 실루엣 생성
- 현재 위치 주변 도로망에 자동 fitting
- GPX 파일 다운로드 (Strava / Garmin import 가능)
- 코스 링크 공유

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Next.js, Tailwind CSS, Mapbox GL JS |
| 백엔드 | FastAPI (Python) |
| AI | Claude API |
| 지도/도로 | osmnx, OpenStreetMap |
| GPX | gpxpy |
| 배포 | Vercel (frontend), Render (backend) |

## 프로젝트 구조

```
shaperun/
├── frontend/          # Next.js 앱
│   └── src/
│       ├── app/       # 페이지
│       ├── components/
│       │   ├── map/       # 지도 컴포넌트
│       │   ├── course/    # 코스 생성/미리보기
│       │   └── ui/        # 공통 UI
│       └── lib/       # API 클라이언트, Mapbox 설정
└── backend/           # FastAPI 서버
    ├── routers/       # API 엔드포인트
    ├── services/      # 핵심 비즈니스 로직
    │   ├── ai_service.py     # Claude API 연동
    │   ├── road_service.py   # osmnx 도로망 분석
    │   └── gpx_service.py    # GPX 파일 생성
    └── utils/
        ├── shape_fitting.py  # 실루엣 → 도로 fitting 알고리즘
        └── osm_helper.py     # OpenStreetMap 유틸
```

## 로컬 실행

### 백엔드
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # API 키 입력
uvicorn main:app --reload
```

### 프론트엔드
```bash
cd frontend
npm install
cp .env.local.example .env.local  # API 키 입력
npm run dev
```

## 환경변수

### backend/.env
```
ANTHROPIC_API_KEY=your_key_here
```

### frontend/.env.local
```
NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 개발 로드맵

- [x] 프로젝트 구조 세팅
- [ ] 1단계: 환경 세팅 & Hello World
- [ ] 2단계: 지도 띄우기 + 현재 위치
- [ ] 3단계: AI 실루엣 좌표 생성
- [ ] 4단계: 도로 shape fitting
- [ ] 5단계: GPX 다운로드 & 공유
