# Codex 작업 요청

frontend-system의 시각화 리팩터링을 구현해주세요. 함께 전달한 `PLAN.md`와 `reference/`가 구현 명세입니다. 먼저 두 자료와 현재 checkout의 AGENTS.md를 읽고 실제 호출 경로를 확인한 뒤 작업하세요.

이번 범위는 FS 시각화입니다. Echo 저장 응답 유실·재시도는 첫 fixture입니다. FS 전체 재작성, source/learned 기능의 전면 삭제, PR 리뷰 삭제, Echo 제품 코드 변경, 실제 Echo 하네스 구축, 배포는 이번에 하지 않습니다.

화면은 사용자가 이미 확정했습니다. `reference/approved-echo.html`을 직접 열어 확인하고 `approved-echo.fragment.html`의 최종 CSS·구조·상호작용을 이식하세요. 다시 디자인하거나 요약 화면으로 바꾸지 마세요. 변경을 허용한 부분은 PLAN.md 5절의 화살표 경로 개선과 최소한의 통로 여백입니다. 그 외 차이는 버그 수정상 불가피한 경우를 제외하고 만들지 마세요.

반드시 유지할 항목:

- `흐름 / 도메인·계약 / 의존성 / 테스트 계획` 4탭과 현재 배치.
- 실제 화면에 가까운 와이어프레임 → 훅/store/API 연결 → 단계별 호출과 상태 전이.
- 함수명 강조, interface syntax highlight, 본문과 제목 크기 및 여백.
- 기존/수정 제안/신규 제안 구분. Echo 기준 신규 함수는 0개.
- 함수 호버·포커스·터치에서 설명과 해당 계약 팝업. Escape 닫기.
- state를 평문으로 두지 않고 STATE/REF/DB/RESULT와 이름·값으로 표시.
- 소유자 이름과 아래 상태 필드의 왼쪽 정렬. saving/saveFailed는 STATE.
- 도메인 규칙, interface, 의존성 graph와 상세 테스트의 모든 검증 조건.
- D1/D2 편집 시 화면·계약·p-ui 조건 동시 반영, 영향 테스트 확인 무효화.
- 테스트 계획 확인과 실제 테스트 실행 성공을 구분.

기존 `render_project_flow / flow-render → renderProjectFlow → prepareFlowExplorer/projectFlowView → prepareExplorer`를 통해 새 화면이 생성되어야 합니다. 별도 demo HTML만 추가해서 완료하지 마세요. 기존 hash/freshness·observed/proposed·capture 검증을 우회하지 마세요.

첨부 JSON은 프로토타입 데이터입니다. 기존 flow의 5단계와 reviewExtension의 9단계를 운영 코드에서 이중 관리하지 말고, 단일 정규 9단계 흐름과 파생 view model로 통합하세요. 기존 schema/validation을 확장하고 Echo 문자열 조건문을 일반 renderer에 남기지 마세요. domain rules, contracts, state owner, scenarios, test cases는 같은 ID 체계를 공유해야 합니다.

작업 순서:

1. 기준 파일 hash, checkout 차이, 기존 경로·검사 명령 확인. 확정 HTML에서 화면 baseline 생성.
2. 정규 모델 및 Echo fixture와 참조 검증.
3. 확정 화면 이식. 화살표 외의 레이아웃을 유지.
4. 팝업·편집·테스트 확인·초안 복원 연결.
5. 화살표 포트/회피/방향/유실/resize 개선.
6. 실제 FS 입구 연결, 구형 기록·다중 페이지·Mermaid·캡처 경로 회귀 확인.
7. reference 대비 browser screenshot 및 상호작용 검사 후 공식 check/build/package 검증.

각 단계에서 관련 검사를 통과한 뒤 다음 단계로 가세요. 기존 FS는 node:test를 사용합니다. 테스트 러너나 프레임워크를 임의로 교체하지 마세요. 브라우저 검사 환경이 차단되면 우회하지 말고 구체적인 미검증 항목을 보고하세요. 새 구현의 screenshot으로 baseline을 덮어서 통과시키지 마세요.

완료 시 수정 파일, 실제 렌더링 명령·결과 경로, 기준 대비 screenshot, 실행한 검사와 미실행 항목, 화살표 변경 내역을 보고하세요. 사용자에게 이미 확정된 화면 선택을 다시 요청하지 마세요. 코드 변경과 로컬 검증까지 진행하되 원격 PR 작성/게시/배포는 별도 요청을 기다리세요.
