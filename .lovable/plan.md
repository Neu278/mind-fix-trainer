# 또속 (Ttosok) MVP 구현 계획

"왜 그렇게 생각해서 틀렸는가"를 진단하는 AI 메타인지 학습 트레이너. 10대 학생 친화의 밝고 친근한 파스텔 UI로 구성.

## 스코프
- 이메일 로그인 (Lovable Cloud)
- 텍스트 + 사진(OCR) + 객관식 선택지 문제 입력
- 실제 AI 분석 (Lovable AI Gateway, Gemini)
- 4대 핵심 기능: 진단 · 분류 · 시각화 · Dual-Track 처방

## 페이지 구조 (라우트)

```text
/                           랜딩 (로그인 CTA)
/auth                       이메일 회원가입/로그인
/_authenticated/dashboard   홈: 최근 오답 + 요약 통계
/_authenticated/new         문제 등록 (텍스트/사진/객관식 + 확신도 + 타이머)
/_authenticated/problems    오답 목록 (필터: 패턴별)
/_authenticated/problems/$id  오답 상세 + Dual-Track 피드백 (토글)
/_authenticated/insights    시각화 리포트 (4분면 · 레이더 · 히트맵)
```

## 4대 기능 매핑

**① 진단 — 메타인지 갭**
- 문제 등록 UI: 확신도 ★1~5 원클릭, 자동 타이머 (start/stop)
- 저장 시 `confidence`, `time_spent_sec`, `is_correct` 기록
- 파생 태그: 과신형 오답(★4-5 + 오답), 불안형 정답(★1-2 + 정답)

**② 분류 — AI 6대 오답 패턴**
- 등록 후 서버 함수(`createServerFn`)에서 Lovable AI (google/gemini-3-flash-preview) 호출
- 입력: 문제/보기/내 풀이/정답/해설/확신도/소요시간
- 출력(structured): `{ pattern: 6가지 중 하나, reason, shortCard, longReport }`
  - 과신/착각형, 조건 오독형, 시간 압박형, 풀이 길 잃음형, 연산/실수형, 지식 부재형

**③ 시각화 — Insights 페이지 (Recharts)**
- 메타인지 4분면 매트릭스 (Scatter: X=확신도, Y=정답 여부/정답률)
- 6대 패턴 레이더 차트 (RadarChart)
- 시간 vs 정답률 히트맵 (그리드 bin)

**④ 처방 — Dual-Track 토글**
- 상세 페이지 상단 토글: ⚡ 숏폼 카드 ↔ 🔍 장문 정밀 분석
- 숏폼: 1줄 루틴 + #행동태그 + 체크박스 챌린지
- 장문: 사고 궤적 + 착각 상세 + 재발 방지 가이드

## 데이터 모델 (Lovable Cloud / Supabase)

```text
problems
  id, user_id, created_at
  subject (text, nullable), question_text, choices (jsonb, nullable),
  correct_answer, my_answer, my_solution (text), explanation (text, nullable),
  image_url (nullable), confidence (1-5), time_spent_sec (int),
  is_correct (bool)

analyses
  id, problem_id, user_id, created_at
  pattern (enum: overconfidence|misreading|time_pressure|lost_path|calc_mistake|no_knowledge)
  reason (text)
  short_card (jsonb: { routine, tags[], challenges[] })
  long_report (jsonb: { trace, illusion, prevention })
```
RLS: `user_id = auth.uid()`로 스코프. 모든 테이블에 GRANT 명시.

## 기술 스택

- **프론트**: TanStack Start + React + Tailwind + shadcn/ui + Recharts
- **AI**: Lovable AI Gateway, `google/gemini-3-flash-preview`
  - 텍스트 분석: structured output (Output.object + Zod)
  - 이미지 OCR: multimodal input (image_url block)로 문제 이미지에서 텍스트 추출 → 분석 파이프라인
- **백엔드**: `createServerFn` + `requireSupabaseAuth`
  - `analyzeProblem({ problemId })`: AI 분석 실행 후 `analyses`에 저장
  - `ocrProblemImage({ imageUrl })`: 이미지에서 문제 텍스트 추출
- **인증**: 이메일/비밀번호 (Lovable Cloud 기본)
- **스토리지**: Supabase Storage 버킷 `problem-images` (사용자별 폴더, RLS)

## 사용자 흐름

1. 회원가입/로그인 → `/dashboard`
2. "새 오답 등록" 클릭 → 입력 모드 선택 (텍스트/사진/객관식)
   - 타이머 자동 시작, 확신도 슬라이더 선택
3. 저장 시 서버 함수가 AI 분석 트리거 → 패턴 분류 + 숏폼/장문 동시 생성
4. 상세 페이지에서 결과 확인, 토글로 숏폼 ↔ 장문 전환
5. Insights에서 누적 데이터 시각화

## 디자인 방향

- 파스텔 팔레트: 라벤더/민트/피치 (primary=부드러운 라벤더, accent=민트)
- 둥근 모서리(radius-lg 이상), 넉넉한 여백, 이모지 아이콘 적극 활용
- 한글 폰트: Pretendard (link 태그로 `__root.tsx`에 로드)
- Insights 차트도 파스텔 톤 매칭

## 구현 순서

1. Lovable Cloud 활성화 + DB 스키마 마이그레이션 + 스토리지 버킷
2. 인증 (이메일 로그인/회원가입) + `_authenticated` 레이아웃 활용
3. 디자인 토큰(파스텔) 반영 `styles.css` + 랜딩(`/`) 및 대시보드 셸
4. 문제 등록 페이지 (텍스트/객관식) + 타이머/확신도 UI + 저장
5. 사진 업로드 + OCR 서버 함수
6. AI 분석 서버 함수 (6대 패턴 + Dual-Track 결과 생성)
7. 오답 목록 + 상세 페이지 + Dual-Track 토글
8. Insights 페이지 (Recharts 3종)
9. SEO/OG 메타 각 라우트에 지정

## 범위 밖 (후속)
- 소셜 로그인, 협업/공유, 알림, 결제, 실제 시험 스케줄러
