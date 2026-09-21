# 결과 보고 지침 전후 비교 — 2026-09-21

변경: `references/decision-workflow.md`에 결론·근거·한계 보고 지침을 추가하고,
이를 직접 읽지 않던 fs-knowledge에 해당 절의 링크를 연결했다. 기존 승인·검사·완료
정책과 스킬 메타데이터는 그대로다. 이번 변경은 보고 방식의 명시화다.

## 조건과 판정

- 입력/판정: [보고 사례와 기준](reporting-scenarios.md). F는 기존 입력/rubric을
  그대로 사용했다. 이번 좁은 변경은 fs-review의 F와 fs-work의 H를 선택했다.
  A~E/G 및 fs-plan/fs-knowledge의 행동은 이번 실행 범위가 아니다.
- 변경 전·후 각각 F/H를 새 네이티브 에이전트에서 1회씩 실행했다(총 4회).
  `fork_turns=none`, 모델·설정 override 없이 같은 부모 기본값을 상속했다.
  정확한 모델 ID와 reasoning/샘플링 설정은 도구 응답에서 확인하지 못했다.
- 각 에이전트에는 해당 요청 본문, 스킬 및 참조 사본만 전달했다. 과거 응답,
  판정 기준, 변경 의도는 전달하지 않았다. 평가자는 부모 에이전트다.
- 공통 요청은 아래와 같으며 버전 간에는 임시 경로만 달랐다. 요청 파일명은
  F=`profile-record.md`, H=`profile-handoff.md`; skill은 F=fs-review, H=fs-work다.

```text
Use the <skill> skill at <snapshot>/skills/<skill>/SKILL.md to answer the user's
request in <snapshot>/<request>.md. The file contains all supplied project facts;
no target checkout is available. Read the skill and relevant references from that
temporary directory. Do not read other workspace files or other request files.
Do not edit files or launch other agents. Return your answer in Korean.
```

기준 커밋은 `a573132874c459968510b1d170b9a7bd377d3f3c`이며, 앞선 보충안의
미커밋 변경을 포함한다. snapshot hash는 사본의 skills·references·요청 파일을
상대 경로순으로 정렬한 `상대경로 SHA-256\n` 목록의 SHA-256이다.

| 대상 | SHA-256 |
| --- | --- |
| 변경 전 snapshot | `beeafa541fd1fa4c5f8f33480b371f6399bbee3d55916985dad240f32e71e185` |
| 변경 후 snapshot | `cf6383bfde1d702c262a3211e19fd61d6d0658235db0fa71d550d95780798768` |
| reporting-scenarios.md (입력·판정) | `e35f0c82081418088efc1c59fc32fd05ee8131b35ac4ce242ecb3ca378a1e449` |

두 사본의 차이가 decision-workflow.md와 fs-knowledge/SKILL.md뿐임을 확인했다.
두 요청 본문은 동일하다. 실행 전후 사본 해시도 유지됐다.

| 사례 | 변경 전 응답 | 변경 후 응답 | 근거 |
| --- | --- | --- | --- |
| F | 통과 | 통과 | 과거 r1의 성공과 현재 r2의 단위 검사를 구분하고 실제 UI·저장 확인을 요구함. 결함 발생 자체는 단정하지 않음. |
| H | 통과 | 통과 | 전달받은 기록임을 표시하고 수정·3개 단위 테스트·미검증 브라우저/서버 저장을 구분함. check ID를 만들지 않음. |

응답 기준에서 새 회귀는 관찰하지 못했다. 전후 모두 충족했으므로 품질 향상을
입증한 결과는 아니다. 사례별 한 번의 실행이며 실제 앱·교차 모델·전체 스킬의
검증도 아니다. 에이전트별 전체 도구 호출 이력은 확보하지 못했으므로 실제
열람·쓰기 시도 여부는 미확인이다. 응답의 자기 보고를 행동 증명으로 취급하지 않는다.

스킬 형식 검사기 quick_validate.py는 PyYAML 부재로 실행하지 못했다. 대신
fs-knowledge의 기존 frontmatter와 본문이 그대로이고 참조만 추가됐는지 확인했다.
문서 링크·snapshot 차이 확인은 모델 판단 평가와 별개의 정적 검사다.

## F 변경 전 — profile_record_m

아직 **검증 완료로 볼 수 없습니다.** `profile-r1`은 이전 소스 `r1`의 성공 기록입니다. 현재 `r2`는 경로와 버튼명이 달라졌고, 입력 검증기 단위 테스트만으로는 저장 실패·재시도·영속 저장을 확인할 수 없습니다. 이는 검증 공백이며, 기능 결함이 확인됐다는 뜻은 아닙니다.

필요한 확인 절차는 다음과 같습니다.

1. `r2` 실행 환경에서 인증·테스트 데이터를 준비하고 `/settings/profile`에 진입합니다. 실행 명령과 기존 실패 유도 방법은 실제 프로젝트에서 확인해야 합니다.
2. Name을 기존 값과 구분되는 유효한 값으로 변경하고 `Save changes`를 누릅니다. 기존 테스트 transport로 요청을 한 번 실패시킨 뒤 **오류 표시와 편집값 유지**를 확인합니다.
3. 재시도를 성공시키고 **오류가 사라지며 변경값이 유지되는지** 확인합니다.
4. 서버 값을 새로 읽는 새로고침·재진입으로 **변경값이 실제 저장됐는지** 확인합니다. 성공 응답이나 현재 입력값만으로 판단하지 않습니다.
5. 결과를 판단할 때 실행 소스 `r2`, 환경·날짜, 단계별 관찰 결과와 로그·화면 근거를 확인합니다. check ID가 생성됐다면 함께 연결하고, 실행하지 못한 항목은 미검증으로 남깁니다. 기존 `profile-r1` 결과와 구분해야 합니다.

현재는 실행 환경이 없어 위 절차를 수행하지 않았으며, 코드와 기록도 수정하지 않았습니다.

## F 변경 후 — profile_record_p

아직 **현재 소스 `r2`의 검증 완료로 볼 수 없습니다.** `feature-profile-save`의 `profile-r1` 성공은 이전 소스의 결과이고, 현재 통과한 입력 검증 단위 테스트는 저장 실패·재시도·영속화를 확인하지 않습니다. 이는 검증 근거 부족이며, 기능 결함이 확인됐다는 뜻은 아닙니다.

필요한 확인 절차는 다음과 같습니다.

1. `r2`를 실행할 기존 명령·환경·인증·테스트 데이터를 확인합니다. 제공된 정보에는 구체적인 실행 명령이 없습니다.
2. `/settings/profile`에서 Name을 다른 유효한 값으로 바꾸고 `Save changes`를 누릅니다. 기존 테스트 전송 계층으로 요청을 한 번 실패시켜 **오류가 표시되고 수정한 값이 유지되는지** 확인합니다.
3. 같은 값으로 재시도하여 요청을 성공시키고 **이전 오류가 사라지는지** 확인합니다.
4. 서버에서 값을 새로 조회하거나 새로고침 후 재진입하여 **수정한 값이 실제 저장됐는지** 확인합니다. 성공 응답을 흉내 낸 결과나 화면에 남은 입력값만으로는 영속화를 입증할 수 없습니다.

후속 검증 결과는 절차와 구분하여 소스 `r2`, 실행 환경·일시, 항목별 실제 결과와 생성된 check ID·증거를 연결하면 됩니다. 이번에는 검증을 실행하거나 코드·기록을 수정하지 않았습니다.

## H 변경 전 — profile_handoff_n

제공된 인계 내용 기준으로, `src/profile/submit.ts:24`에 `setError('')`를 추가해 저장 재시도 성공 시 이전 오류를 지우도록 수정했습니다. 입력값과 실패 시 동작은 유지됩니다.

`npm run test:unit -- profile`은 최종 소스에서 3개 테스트가 통과했습니다(종료 코드 0). FS 체크 기록 ID는 없으며, 브라우저 동작과 실제 서버 저장은 미검증입니다. 추가 작업이나 파일 수정은 하지 않았습니다.

## H 변경 후 — profile_handoff_q

- 전달받은 작업 기록에 따르면, `src/profile/submit.ts:24`에서 저장 성공 후 `setError('')`를 호출하도록 수정했습니다. 재시도 성공 시 이전 오류가 지워지며, 편집한 입력값과 기존 실패 처리는 유지됩니다.
- 최종 소스에서 `npm run test:unit -- profile`이 종료 코드 0으로 완료됐습니다. 성공·실패 시 입력값 유지, 실패 후 성공 시 오류 초기화 등 3개 테스트가 통과했습니다.
- FS 체크 기록 ID는 없으며, 브라우저 동작과 실제 서버 저장은 미검증입니다. 이번 응답에서는 추가 작업이나 파일 수정을 하지 않았습니다.
