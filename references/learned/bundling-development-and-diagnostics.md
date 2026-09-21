# 개발 서버·HMR·소스맵의 동작 경계

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

HMR 뒤 상태가 사라지거나 로컬 프록시에서만 요청이 성공하고 압축 스택을 추적하기 어려울 때.

## 판단에 사용할 내용

HMR 경계·리로드, 개발 프록시·배포 CORS, 소스맵 생성·제공·버전 일치를 각각 확인한다.

## 적용하지 않는 경우

개발 환경의 성공을 배포 환경 검증으로 대체하거나 인증서 검증을 끄는 일반 해결책으로 사용하지 않는다.

## 개념과 근거

개발 서버는 변경을 감지하고 결과를 제공한다. 라이브 리로드는 페이지를 다시 로드하고, HMR은 accept 경계를 통해 일부 모듈을 교체한다. hot:true는 전송 기반을 켜는 설정이며 임의 모듈이나 React의 모든 상태를 보존하는 보장이 아니다. 프레임워크 통합·정리·갱신 경계에 따라 재로드가 필요할 수 있다.

개발 SPA fallback과 프록시는 로컬 요청 경로를 돕는다. 모든 404를 HTML로 바꾸면 API나 자원 오류를 숨길 수 있고, 로컬 프록시가 배포 환경의 CORS·인증을 해결하지는 않는다. 원문의 인증서 검증 비활성화 예제를 일반 해결책으로 사용하지 않는다.

소스맵은 변환 결과의 위치와 원본 위치를 연결한다. 생성·제공·오류 수집 서비스 업로드는 다른 단계이며 공개 범위와 빌드 버전 일치가 중요하다. 소스맵 유무는 오류 원인 자체를 바꾸지 않는다. 모든 배포에서 파일 업로드를 금지하는 정책이나 개발 모드의 동작을 프로덕션 성능 증거로 사용하는 해석은 제외한다.

## 검토한 출처

- [개발 서버로 생산성 높이기](https://frontend-fundamentals.com/bundling/webpack-tutorial/dev-server.html)
- [개발 서버](https://frontend-fundamentals.com/bundling/deep-dive/dev/dev-server.html)
- [HMR](https://frontend-fundamentals.com/bundling/deep-dive/dev/hmr.html)
- [소스맵](https://frontend-fundamentals.com/bundling/deep-dive/dev/source-map.html)

적용 범위: webpack 중심의 웹 빌드 개념; 설치 버전·타깃·플러그인·배포 환경별 확인

원문의 설정 예제·도구 순위·성능 수치는 실측 또는 최신 버전 계약으로 배포하지 않는다. 접힌 다른 도구 탭과 실행 실습은 제외.
