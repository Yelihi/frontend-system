# 컨트롤 이름과 이미지 대체 텍스트의 문맥

검토일: 2026-09-21 · 분류: concept · 근거: 공개 문서와 검토한 원본 요약

## 참고 상황

아이콘 버튼이 이름 없이 읽히거나 반복된 삭제 버튼의 대상·이미지 정보가 구별되지 않을 때.

## 판단에 사용할 내용

보이는 라벨, 계산된 이름, 부가 설명, 이미지의 정보·기능·장식 목적을 비교해 이름과 대체 텍스트를 결정한다.

## 적용하지 않는 경우

모든 이미지에 설명을 붙이거나 모든 요소에 aria-label을 추가하는 근거가 아니다.

## 개념과 근거

접근 가능한 이름과 부가 설명은 다른 정보다. input의 연결된 label, button의 텍스트 등 네이티브 이름 계산을 먼저 이해하면 불필요한 ARIA 덮어쓰기를 피할 수 있다. aria-label/labelledby는 요소와 역할에 따라 이름을 대체할 수 있으며 모든 요소에 이름 지정이 허용되는 것은 아니다. [APG 이름과 설명](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/).

반복 목록에서 모두 같은 “삭제”로만 노출되면 대상 파악이 어려울 수 있다. 실제 버튼 이름에 대상과 보이는 행동 텍스트가 함께 남는지 확인하는 것이 진단 기준이다. 부모 li의 이름이 자식 버튼의 이름으로 자동 상속된다고 가정하지 않는다. placeholder는 입력 후 사라지므로 지속적인 라벨과 같지 않다. [이름](https://frontend-fundamentals.com/a11y/semantic/required-label.html), [중복 이름](https://frontend-fundamentals.com/a11y/semantic/duplicate-interactive-element.html).

이미지는 문맥에 따라 정보·기능·장식 역할이 다르다. 링크 안의 이미지가 유일한 단서라면 목적지가 이름에 필요하다. 순수 장식 또는 주변의 실제 텍스트와 정보가 완전히 중복되는 이미지에는 빈 alt가 적절할 수 있다. 이미지 픽셀 안에 글자가 있다는 것과 보조 기술이 읽을 텍스트가 있다는 것은 다르다. 복잡한 그래프는 짧은 alt만으로 정보가 충분하지 않을 수 있다. [WAI 이미지 판단 안내](https://www.w3.org/WAI/tutorials/images/decision-tree/).

원문의 로고·캡션·가격 예시를 보편 규칙으로 쓰지 않는다. caption 존재만으로 이미지의 모든 정보를 대체했다는 결론도 내리지 않는다. 이미 정확한 이름과 문맥이 전달되는 요소에 ARIA를 더 붙일 이유는 없다. 검증은 실제 계산된 이름과 해당 UI의 의미를 함께 보는 작업이며, 문자열 존재 검사만으로는 충분하지 않다.

원본 catalog ID: `frontend-fundamentals-accessibility-basics-labels`, `frontend-fundamentals-accessibility-semantics-label-interactive-elements`, `frontend-fundamentals-accessibility-semantics-disambiguate-duplicate-labels`, `frontend-fundamentals-accessibility-alternative-text-images-icons`.

## 추가 검토한 원문

[WAI APG — Providing Accessible Names and Descriptions](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/)

APG 원문에서 이름·설명의 목적과 Cardinal Rules of Naming을 확인했다. 보이는 텍스트와 네이티브 이름 연결을 먼저 대조하고 계산된 이름이 의도와 같은지 확인하는 데 사용한다. 전체 역할별 표와 이름 계산 알고리즘은 이번 추가 범위에 포함하지 않았다.
