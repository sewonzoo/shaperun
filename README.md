# ShapeRun

> Strava가 한국에서 철수하면서 생긴 공백을 채우는, 한국 러너를 위한 GPS 러닝 코스 제작 서비스

지도 위에서 직접 러닝 코스를 그리면 도로에 자동으로 붙고(스냅), GPX 파일로 내보내 Garmin 등 GPS 워치에서 바로 쓸 수 있습니다. Garmin 워치 사용자를 주 타겟으로 합니다.

## 주요 기능

- **코스 드로잉**: 지도 위를 탭해서 직접 경로를 그리는 방식(Footpath 스타일). 각 구간은 실제 도로망에 자동으로 스냅되고, 루프(순환 코스)로 닫을 수 있음
- **GPX 내보내기**: 그린 코스를 GPX 파일로 바로 다운로드해 Garmin 워치 등에서 사용
- **카카오 로그인**: Supabase Auth 기반 카카오 소셜 로그인
- **코스 저장/관리**: 내가 만든 코스와 다운로드(복사)한 코스를 구분해서 관리, 닉네임 프로필
- **커뮤니티 피드**: 다른 러너가 공개한 코스를 최신순/인기순으로 둘러보고 다운로드
- **카카오톡 공유**: 코스 경로를 그린 이미지를 동적으로 생성해 카카오톡 공유 카드에 노출. 공유받은 사람은 로그인 없이도 코스 상세 페이지(`/course/[id]`)에서 코스를 보고 GPX를 받을 수 있음
- **사용법 가이드**: 카카오맵 / Garmin(모바일·PC) / 갤럭시워치로 GPX 파일을 옮기는 방법 안내

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Next.js (App Router), TypeScript, Tailwind CSS |
| 지도 | Mapbox GL JS (코스 드로잉·도로 스냅), Kakao Maps JS SDK (장소 검색) |
| 인증/DB | Supabase (PostgreSQL, Row Level Security, 카카오 OAuth) |
| 공유 | 카카오톡 공유 SDK, Next.js Edge Runtime 기반 동적 OG 이미지 생성 |
| 백엔드 | FastAPI — 배포는 되어 있지만 현재 `/health` 체크만 응답하는 비활성 상태 (아래 참고) |
| 배포 | Vercel(frontend), Render(backend), Gabia(도메인) |

> **백엔드에 대해**: 초기에는 FastAPI가 도로망 분석/GPX 생성을 담당할 계획이었지만, 현재는 도로 스냅(Mapbox Directions API 직접 호출)과 GPX 생성(브라우저에서 직접 XML 생성) 모두 프론트엔드에서 처리합니다. `backend/routers/course.py`, `services/road_service.py`, `services/ai_service.py`는 이 변경을 반영해 빈 스텁으로 남아있고, `main.py`에는 `/health` 라우터만 등록되어 있습니다.

## 프로젝트 구조

```
shaperun/
├── frontend/                    # Next.js 앱 (App Router)
│   ├── public/                  # 정적 자산 (가이드 이미지, 아이콘, OG 폴백 이미지 등)
│   └── src/
│       ├── app/
│       │   ├── page.tsx         # 로그인 페이지 (카카오 소셜 로그인)
│       │   ├── map/             # 코스 드로잉 지도 화면 (핵심 기능)
│       │   ├── feed/            # 커뮤니티 피드 (공개 코스, 최신순/인기순)
│       │   ├── my-courses/      # 내 코스 (만든 코스 / 다운로드한 코스, 닉네임)
│       │   ├── course/[id]/     # 코스 상세 공개 페이지 (비로그인도 조회·GPX 다운로드 가능)
│       │   ├── guide/           # GPX 사용법 안내 (카카오맵 / Garmin PC·모바일 / 갤럭시워치)
│       │   ├── auth/callback/   # Supabase OAuth 콜백 처리
│       │   └── api/og/          # 코스 경로 기반 OG 이미지 동적 생성 (카카오톡 공유 카드용)
│       ├── components/
│       │   ├── map/MapView.tsx  # Mapbox GL 지도: 드로잉, 도로 스냅, 루프 닫기, 내비게이션
│       │   ├── course/          # 코스 저장 모달, 경로 미리보기(SVG)
│       │   └── ui/              # 로고, 카카오 SDK 초기화 등 공통 UI
│       └── lib/
│           ├── api.ts           # Mapbox Directions API 호출 (도로 스냅)
│           ├── gpx.ts           # GPX 파일 생성/다운로드 (브라우저에서 직접 생성)
│           ├── courses.ts       # 코스 CRUD, 다운로드, 피드 조회, 닉네임 조회 (Supabase)
│           ├── kakaoShare.ts    # 카카오톡 공유 (OG 이미지 URL, 워밍업)
│           └── supabase/        # 브라우저/서버 Supabase 클라이언트
│
├── backend/                     # FastAPI 서버 (Render 배포) — 현재 비활성 상태
│   ├── main.py                  # /health 라우터만 등록
│   ├── routers/
│   │   ├── health.py            # 유일하게 동작하는 엔드포인트
│   │   └── course.py            # 빈 스텁 (도로 스냅은 프론트엔드로 이관됨)
│   ├── services/                # ai_service.py / road_service.py / gpx_service.py — 전부 빈 스텁
│   └── utils/                   # osm_helper.py / shape_fitting.py — 미사용
│
└── supabase/
    └── migrations/              # DB 스키마 / RLS 정책 / 트리거 (Supabase SQL Editor에서 직접 적용)
```

## 로컬 실행

### 프론트엔드
```bash
cd frontend
npm install
cp .env.local.example .env.local  # 아래 환경변수 참고해 값 입력
npm run dev
```

### 백엔드 (현재 /health 체크만 동작)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## 환경변수

### frontend/.env.local
```bash
# Mapbox (지도 렌더링, 코스 드로잉, 도로 스냅)
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here

# Kakao (지도 SDK 장소 검색, 로그인 후 공유 시 지역명 조회, 카카오톡 공유용 JS SDK)
NEXT_PUBLIC_KAKAO_JS_KEY=your_kakao_js_key_here
NEXT_PUBLIC_KAKAO_REST_API_KEY=your_kakao_rest_api_key_here

# Supabase (Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# 현재 프론트엔드에서 실제로 호출하지는 않지만(백엔드 비활성), 예약용으로 남아있음
NEXT_PUBLIC_API_URL=http://localhost:8000
```

카카오 로그인이 정상 동작하려면 [카카오 디벨로퍼스](https://developers.kakao.com) 콘솔의 "제품 설정 > 카카오 로그인"에 Redirect URI를, "플랫폼 > Web"에 서비스 도메인을 등록해야 합니다.

### backend/.env
현재 활성 엔드포인트(`/health`)는 별도 환경변수가 필요 없습니다. `.env.example`에 남아있는 `ANTHROPIC_API_KEY`는 AI 실루엣 생성 기능 제거와 함께 더 이상 쓰이지 않습니다.

## 완료된 주요 마일스톤

- [x] 프로젝트 구조 세팅, Supabase 연동 (Auth, PostgreSQL, RLS)
- [x] 카카오 소셜 로그인
- [x] 지도 위 코스 드로잉 + 도로 자동 스냅 + 루프 닫기 (Mapbox GL)
- [x] GPX 파일 내보내기
- [x] 코스 저장/관리 (내가 만든 코스 / 다운로드한 코스 구분, 닉네임 프로필)
- [x] 커뮤니티 피드 (공개 코스 목록, 최신순/인기순 정렬, 코스 다운로드)
- [x] 카카오톡 코스 공유 (동적 OG 이미지 생성, 코스 상세 공개 페이지, 비로그인 조회/GPX 다운로드)
- [x] 코스 중복 다운로드 방지, 다운로드한 코스 비공개 정책
- [x] 프로필 닉네임 실시간 반영 (작성자 표시)
- [x] GPX 사용법 가이드 페이지 (카카오맵 / Garmin PC·모바일 / 갤럭시워치)
- [x] 모바일 UX 다듬기 (뷰포트 높이, 입력창 확대 방지 등)

최근 작업의 배경(문제 상황/원인/해결)은 [`docs/CHANGELOG.md`](docs/CHANGELOG.md)에 정리되어 있습니다.
