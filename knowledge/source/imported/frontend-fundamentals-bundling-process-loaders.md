# 로더

## 출처와 범위

- 등록 URL: https://frontend-fundamentals.com/bundling/deep-dive/bundling-process/loader.html
- 확인한 URL: https://frontend-fundamentals.com/bundling/deep-dive/bundling-process/loader.html
- 수집·검토일: 2026-09-21
- 보존 방식: summary — AI가 작성한 요약, 원문 전문 복제 아님
- 확인 범위: Chrome에 표시된 main 본문 5566/5566문자. 접힌 코드 탭·삽입 미디어·실행 예제와 연결된 하위 문서는 제외.
- 버전·대상: webpack 중심의 웹 빌드 개념; 설치 버전·타깃·플러그인·배포 환경별 확인
- 원격 텍스트 스냅샷 승인 없음. 브라우저로 확인한 범위만 반영.

## 출처 내용 요약

webpack module.rules의 변환 도구, 포함·제외 조건과 일반 loader 체인을 설명한다.

## 검토·해석 및 생략

최상위 rules 예제는 그대로 사용하지 않는다. css-loader 단독이 DOM에 스타일을 적용하지 않으며 file-loader만 필수인 것도 아니다.
