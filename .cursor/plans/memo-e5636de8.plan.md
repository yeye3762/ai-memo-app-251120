<!-- e5636de8-3620-46fd-aec4-96012cb7533b 0699a816-e734-422b-9668-049c9bd269c8 -->
# LLM 요약 기능 구현 계획

1. 의존성 및 환경 변수 설정 (`package.json`, `.env.example`)

- Gemini JS SDK `@google/genai` 추가 후 설치.
- `.env.example`에 `GEMINI_API_KEY=` 항목을 생성해 사용자 설정을 안내합니다.

2. 서버 요약 엔드포인트 작성 (`src/app/api/memos/summary/route.ts` 예상)

- GoogleGenAI 초기화 시 문서 예제처럼 API 키를 주입합니다 [예시](https://googleapis.github.io/js-genai/release_docs/index).
- POST로 `{ content, title }`를 받아 `gemini-2.0-flash-001` 모델에 요약 프롬프트를 전달하고, 응답 텍스트를 JSON으로 반환합니다.

3. 클라이언트 연동 (`src/components/MemoViewer.tsx`)

- “요약” 버튼을 추가해 클릭 시 API를 호출하고 로딩/에러 상태를 관리합니다.
- 성공 시 요약 결과를 모달 내 별도 영역에 표기하고, 실패 시 경고 메시지를 표시합니다.

### To-dos

- [ ] Gemini SDK 설치 및 env 템플릿 추가
- [ ] 요약 API 라우트 추가
- [ ] MemoViewer에 요약 버튼/결과 표시