# v7 A — 최초 실제 비교

양쪽 첫 시도 93/93. FS 절차 적격, MCP 오류 0. 외부 수정 재시도 0. 기능 64/64, 작성 규칙 17/17, 선택 10/10, 보호 범위 2/2를 각각 통과했다.

| Arm | 총 처리 토큰 | 비캐시 입력 | 출력 | 시간(초) | MCP |
| --- | ---: | ---: | ---: | ---: | ---: |
| 일반 AI | 565,563 | 35,761 | 7,434 | 186.473 | 0 |
| FS | 2,247,581 | 85,011 | 15,242 | 434.452 | 22 |

일반 AI도 같은 지식과 공개 lint를 읽고 원하는 코드에 도달했다. FS에만 품질 개선이 생긴 결과가 아니다. 총 처리 토큰 3.97배, 비캐시 입력+출력 2.32배, 시간 2.33배다. 캐시 입력을 포함한 처리량과 실제 과금 비용은 다르다.

FS 실제 경로는 read_project_source → get_work_context → read_learned_knowledge(tailwind-team-authorship) → 테마 질문 → 기존 답변/추가 코드 근거 → save_project_context → 새 get_work_context → save_revision → approve_revision(주어진 승인 재사용) → baseline/attempt → 구현/검사/의미 검토 → delivery → save_execution complete였다. 지식은 apply로 채택됐고 4개 필수 규칙, lint:styles/test/build에 연결됐다. 절차 완료 자체를 의미적 무결성의 증명으로 취급하지 않는다.

일반 AI의 초기 lint 실패는 의도된 위반을 발견한 것이며 구현 오류가 아니다. FS는 초기 baseline에서 test만 실행했다. lint:styles가 기본 capability 이름 규칙에 포함되지 않는 실제 누락을 확인했다. 이후 명시적으로 승인된 lint:styles는 최종 필수 검사에서 실행됐다. FS는 테스트 작성 전 lint/test/build, 테스트 추가 후 test, 최종 delivery에서 재검사했다. 초기 전체 빌드가 중복 비용이었다. Chromium 확인 1회는 격리 환경에서 실패했고 실제 브라우저 결과를 주장하지 않았다.

후속 B에서는 기본 검사 발견에 lint:/typecheck: 이름을 포함하고, 제품/테스트 편집 전 전체 빌드를 앞당기지 않도록 지침을 보완한다. 과제와 외부 오라클은 변경하지 않는다. A의 원본 summary/grade/events는 그대로 보존한다.
