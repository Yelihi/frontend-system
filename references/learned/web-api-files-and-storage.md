# 파일·쿠키·구조화 저장소

검토일: 2026-09-21 · concept · public-contract

## 참고 상황

파일 저장 기능이나 오프라인 데이터 저장소를 고르고 데이터가 사라지거나 용량 초과가 발생할 때.

## 판단에 사용할 내용

파일 handle과 origin 저장소, 구조화 트랜잭션·동기 키값 저장 및 권한·할당량·삭제 조건을 비교한다.

## 적용하지 않는 경우

사용자 파일 전체 접근이나 무한 용량·영구 보존을 보장하지 않는다.

## 개념과 근거

File은 사용자가 제공한 파일 데이터, Entries는 디렉터리 읽기 탐색, File System은 handle 기반 읽기·쓰기라는 차이를 확인한다. 이름이 유사해도 임의 장치 파일 접근 권한이 생기는 것은 아니다. 선택 파일 handle과 origin 전용 저장 영역의 지원 조건도 별도다.

IndexedDB는 키·인덱스·트랜잭션을 가진 구조화 저장소다. Web Storage의 session/local 수명과 동기 인터페이스, Cookie Store의 비동기 쿠키 관리를 구분한다. StorageManager의 용량 추정·보존 요청은 무한 용량이나 영구 보존 보장이 아니다. Storage Access는 제삼자 문맥의 제한된 접근 요청이며 브라우저 정책을 우회하는 일반 수단이 아니다. 저장 실패·사용자 삭제·파티션·시크릿 환경을 도입 시 검토한다.

## 검토한 출처

- [Cookie Store API](https://developer.mozilla.org/en-US/docs/Web/API/Cookie_Store_API)
- [File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API)
- [File and Directory Entries API](https://developer.mozilla.org/en-US/docs/Web/API/File_and_Directory_Entries_API)
- [File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API)
- [Storage Access API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_Access_API)
- [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)

적용 범위: 2026-09-21 MDN Web API 149개 등록 URL의 개요·지원 안내·표시 본문 앞부분. 모든 API 계약을 완독하거나 실제 실행한 자료가 아니다.

API별 용도·기본 경계만 반영했다. 개별 메서드·보안 요구·권한 정책·worker 노출·실행 예제·호환성 표 전체는 미검증이다. 실제 도입 시 세부 문서와 대상 환경을 확인한다.
