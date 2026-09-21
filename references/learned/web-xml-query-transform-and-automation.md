# XML 질의·변환·검색 기술과 브라우저 자동화

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

XML 노드 선택·출력 변환 도구를 고르거나 OpenSearch·WebDriver 용어를 구분해야 할 때.

## 판단에 사용할 내용

XPath·XSLT·EXSLT의 역할, 검색 설명 형식과 자동화 프로토콜의 범위를 구별한다.

## 적용하지 않는 경우

동명의 검색 서버 제품과 혼동하거나 브라우저의 XSLT 유지 계획을 이 개요로 확정하지 않는다.

## 개념과 근거

XML 문법 적합성과 특정 어휘·스키마 유효성은 별개다. XPath는 노드 선택, XSLT는 입력에서 새 출력으로 변환, EXSLT는 변환 확장 함수라는 역할을 갖는다. OpenSearch description은 웹사이트 검색을 클라이언트에 설명하며 이름이 같은 별도 검색 서버 제품과 혼동하지 않는다. WebDriver는 브라우저 외부의 자동화 프로토콜이며 classic과 BiDi가 다르다. XSLT·확장 기능의 최신 브라우저 유지 계획과 지원 버전은 이 허브 개요로 확정하지 않는다.

## 검토한 출처

- [WebDriver](https://developer.mozilla.org/en-US/docs/Web/WebDriver)
- [EXSLT](https://developer.mozilla.org/en-US/docs/Web/XML/EXSLT)
- [OpenSearch description format](https://developer.mozilla.org/en-US/docs/Web/XML/Guides/OpenSearch)
- [XML introduction](https://developer.mozilla.org/en-US/docs/Web/XML/Guides/XML_introduction)
- [XML: Extensible Markup Language](https://developer.mozilla.org/en-US/docs/Web/XML)
- [XPath](https://developer.mozilla.org/en-US/docs/Web/XML/XPath)
- [XSLT: Extensible Stylesheet Language Transformations](https://developer.mozilla.org/en-US/docs/Web/XML/XSLT)

적용 범위: 2026-09-21 MDN 웹 기술 허브 18개와 WebAssembly 허브 1개의 개요. 연결된 전체 표준·API·보안 가이드는 미검토이다.

탐색과 개념 구분에 한정했다. 보안 완결성·성능 보장·모든 브라우저 지원·PWA 설치 자격은 이 자료만으로 판단하지 않는다.
