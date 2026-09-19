# FS 0.2.0 검증

- Final check: 55e74a51-b48b-4ca4-960b-c12bd28010eb
- Source hash: 219aadc6936d6afd0a9bc322339a67967238b7567f7574fc341c8c1160d7dffc
- Revision hash: d6d6ddfc37b7b7105f46dc4b7f3c05060329759d854eca34d17bcf5dd81bf681
- Stable: true; full: true
- 13 capabilities passed; no failed or not-run results.

## 확인한 동작

- 핵심 Node 테스트 25개: 규칙 후보 승인·출처 변경, 정책 누락·스크립트/보호 파일 변경, 오래된 근거 차단, 단계 의존성·시도 한도, Vue 규칙 분리, 기존 저장 형식 호환.
- 실제 React/Next 정상 코드 lint/types/build 통과. Hooks·대체 텍스트·기능 경계(import/re-export/dynamic)·서버 전용 직접/배럴 의존 위반이 해당 진단으로 실패. 도메인 중복 제출 변형도 단위 검사에서 실패.
- Chromium E2E: 주문 대기 중 중복 제출 제한, HTTP 실패 표시, 재시도 성공.
- npm 배포 파일: 공개 스킬 4개, 원본 지식 미포함, 저장소 의존성이 없는 독립 MCP 번들 실행.
- 등록 소스 검사: Next 공식 문서 20,410자를 실제 수집해 해시와 변경 메타데이터만 반환하는 것을 임시 디렉터리에서 확인. 해당 자료를 공통 규칙으로 승인·배포하지 않음.
- 스킬 독립 정성 평가: test/evals/consolidated-results.md. YAML/참조 경로는 설치된 js-yaml로 검사. Python quick_validate는 PyYAML 미설치로 실행하지 못함.

## 한계

실제 고객 프로젝트나 정량 토큰 절감 벤치마크는 포함하지 않는다. CI 파일을 작성하고 같은 명령을 로컬에서 검증했으며 GitHub 원격 실행·필수 브랜치 검사 설정·배포는 하지 않았다. 모델 검토는 결정적 증명이 아니고 로컬 해시는 악의적인 파일 작성자를 막는 보안 경계가 아니다.
