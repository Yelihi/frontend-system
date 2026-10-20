---
state: active
---

# 복잡한 조건에 이름 붙이기 — 발행본 교체 후보

## 출처와 수집 상태

- 원문 URL: https://frontend-fundamentals.com/code-quality/code/examples/condition-name.html
- 교체 대상: `frontend-fundamentals-code-quality-readability-name-complex-conditions` (기존 발행본은 검토·sync 전까지 유지)
- 발행처: Frontend Fundamentals
- 수집일: 2026-10-20
- 보존 방식: summary — 원문과 코드 전문을 복제하지 않고 직접 확인한 내용을 재서술
- 확인 범위: 본문의 8개 제목 구간과 2개 TypeScript 코드 예시. 정적 HTML 목록과 렌더된 페이지를 대조함.
- 누락 범위: 본문 내 관련 서적 링크 및 다른 가이드 페이지는 이 글의 내용으로 수집하지 않음.
- 정적 HTML 확인: source ID `frontend-fundamentals-code-quality-readability-name-complex-conditions`, body SHA-256 `c38806f13bbd973e8c301db5aff85ad6abdd16daca67c415c8ee69a5d73cf3d3`, manifest SHA-256 `fe1a7164dc458fab95ca0b185a436893395f179ada4319db3ba40a654a8891d9`. 정적 HTML에서 별도 코드 탭은 발견되지 않음.
- 적용 대상: 언어·프레임워크와 무관한 조건식 가독성 판단. 실행 비용과 부작용은 개별 코드에서 확인해야 함.

## 원문에서 확인한 주장

- 여러 익명 콜백과 조건이 중첩되면 필터가 무엇을 고르는지 읽기 어려워진다. 조건의 의미를 이름으로 드러내면 독자가 한 번에 해석해야 할 맥락을 줄일 수 있다.
- 복잡하거나 반복 사용되거나 독립 테스트가 필요한 조건은 이름을 붙이거나 분리할 이유가 있다.
- 간단하고 한 번만 쓰이는 표현식까지 모두 이름 붙일 필요는 없다.

## 확인한 코드 예시

- `code-1` (📝 코드 예시, 개선 전): 상품 목록에서 `filter` 안에 카테고리 `some`, 다시 가격 `some`을 중첩한다. 카테고리 ID 일치와 가격 범위 판정을 하나의 논리식에 넣어 선택 기준이 즉시 드러나지 않는다.
- `code-2` (✏️ 개선해보기, 개선 후): 같은 콜백 안에서 카테고리 일치를 `isSameCategory`, 상품 가격 중 범위에 드는 값의 존재를 `isPriceInRange`로 명명한 뒤 결합한다. 원문은 이 이름들이 선택 의도를 드러낸다고 설명한다. 별도 함수나 클래스로 추출하는 예시는 아니다.

아래는 두 원문 코드의 **제어 흐름을 재구성한 축약 예시**다. 식별자와 보조 함수는 설명을 위해 바꿨으며 원문 코드나 실행 가능한 완성 코드가 아니다.

```ts
// code-1: 앞 조건이 거짓이면 뒤의 배열 검색을 건너뛴다.
groups.some(group => isTarget(group) && values.some(isInRange));

// code-2: 조건에 이름을 붙였지만, 뒤의 배열 검색을 먼저 계산한다.
groups.some(group => {
  const matchesTarget = isTarget(group);
  const hasValueInRange = values.some(isInRange);
  return matchesTarget && hasValueInRange;
});
```

핵심 비교는 이름이 읽는 사람에게 뜻을 더하는지와, 이름을 도입하면서 평가 순서·횟수를 바꾸지 않는지다. `isTarget`, `isInRange`는 원문에 있는 별도 함수가 아니라 구조 설명용 표시다.

## AI 해석과 적용 전 확인

- 이 글을 모든 조건식 추출 의무로 해석하지 않는다. 해당 조건이 실제로 복잡한지, 이름이 도메인 의미를 더하는지, 재사용·테스트 필요가 있는지 먼저 본다.
- 두 예시는 순수한 값 비교라면 선택 결과가 같지만 평가 횟수는 달라질 수 있다. `code-1`은 카테고리가 다르면 가격 배열을 검사하지 않는 반면, `code-2`는 결합식에 앞서 `isPriceInRange`를 계산한다. 이는 원문의 주장이 아니라 두 코드에서 읽히는 실행 특성이다. 비용이 큰 계산이나 부작용이 있는 조건에 적용할 때는 단락 평가와 동작 보존을 별도로 검증한다.
- 실제 프로젝트에서 이 자료가 맞닿는 지점은 중첩 조건을 가진 선택·필터 로직이다. 먼저 호출부, 조건의 의미, 평가 순서와 비용을 확인하고, 원문 예외에 해당하는 단순 조건은 그대로 둘 수 있다.

## 검토할 질문

- 해당 조건 이름이 구현 표현을 반복하는가, 아니면 도메인 의도를 설명하는가?
- 이름을 붙이는 변경이 단락 평가, 계산 비용, 부작용 또는 오류 경로를 바꾸는가?
- 프로젝트에서 이 판단을 규칙으로 강제할 근거가 있는가? 현재는 검토 후보이며 자동 수정 규칙으로 승인하지 않았다.
