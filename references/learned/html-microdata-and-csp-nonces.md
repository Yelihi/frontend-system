# HTML 메타데이터와 CSP nonce

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

구조화 데이터의 id 연결이 혼동되거나 CSP nonce가 있는데도 스크립트 허용이 맞지 않을 때.

## 판단에 사용할 내용

microdata 어휘의 식별자와 DOM id를 구분하고, 별개 주제인 nonce의 응답별 생성·헤더 일치를 확인한다.

## 적용하지 않는 경우

구조화 데이터가 검색 노출을 보장하거나 정적 nonce 재사용이 적절한 보호라고 판단하지 않는다.

## 개념과 근거

itemscope는 항목 범위, itemtype는 어휘 타입, itemprop는 속성, itemref는 문서의 추가 속성 위치, itemid는 어휘가 해석하는 항목 식별자다. 문서 id와 itemid를 혼동하지 않는다. 구조화 데이터 노출이 검색 결과 표시를 보장하지 않는다.

CSP nonce는 이 메타데이터와 별개인 보안 계약이다. 서버에서 암호학적 난수로 페이지 응답마다 새 값을 만들고 허용 대상과 CSP 헤더에 일치시킨다. 정적 재사용 토큰이나 클라이언트에서 덧붙인 값이 같은 보호를 제공한다고 가정하지 않는다.

## 검토한 출처

- [itemid HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/itemid)
- [itemprop HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/itemprop)
- [itemref HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/itemref)
- [itemscope HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/itemscope)
- [itemtype HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/itemtype)
- [nonce HTML global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/nonce)

적용 범위: 2026-09-21 MDN HTML 개요 및 전역 속성. 현재 대상 브라우저의 세부 호환성과 실행 동작은 도입 시 재확인한다.

MDN 표시 본문의 개요·값·사용 주의 범위를 요약했다. 실행 예제·호환성 표의 모든 버전·연결 문서는 미검증이다. Limited availability·Experimental·Non-standard 표시는 도입 허가가 아니라 추가 확인 조건이다.
