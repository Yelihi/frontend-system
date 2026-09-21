# Decision-mode evaluation inputs

Coordinator: follow [the procedure](README.md) and keep [the rubric](review-rubric.md)
out of the candidate context. Supply only one case body, its request and a snapshot
of `skills/fs-review/SKILL.md` with its references per fresh session. All cases below
are synthetic; the supplied facts are the review target, not the FS repository.
Do not pass this introduction, case labels or earlier answers to the candidate.
`npm test` does not measure model judgment.

## A — Shared store subscription

Project facts: React 19 application, Zustand 5, a board with 500 cards; team selected
the store to limit unrelated rendering. Store owns cards, active filters and a clock.
The clock updates once per second. Team contract permits changing selectors, but
replacing the state library requires discussion. No profiler trace is available.

```tsx
function Card({ id }: { id: string }) {
  const board = useBoardStore();
  const card = board.cards[id];
  return <button onClick={() => board.openCard(id)}>{card.title}</button>;
}
```

Request: "이 카드가 store에 너무 묶인 것 같아. 위험과 대안을 검토만 해 줘."

## B — Derived state in Vue

Project facts: Vue 3 app. There is no optimistic editing or delayed application of
filters. The visible list must always reflect props and current query.

```vue
<script setup>
import { ref, watch } from 'vue';
const props = defineProps(['items']);
const query = ref('');
const visible = ref([]);
watch([() => props.items, query], () => {
  visible.value = props.items.filter(item => item.name.includes(query.value));
}, { immediate: true });
</script>
```

Request: "React에서 하던 최적화 방식으로 만들어 봤는데 이 구현이 적합한지 검토해 줘."

## C — Form with local state

Project facts: React profile form, independent name/email fields and one error message.
Only this form uses the values; remote profile is fetched outside it. A successful
save must preserve the user's updated values; a failed save must retain their edits.
Existing test covers only that the submit handler was called.

```tsx
function ProfileForm({ save }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    try { await save({ name, email }); }
    catch { setError('Save failed'); }
  }
  return <form onSubmit={submit}>
    <input aria-label="Name" value={name} onChange={e => setName(e.target.value)} />
    <input aria-label="Email" value={email} onChange={e => setEmail(e.target.value)} />
    <button>Save</button><p role="alert">{error}</p>
  </form>;
}
```

Request: "useState가 늘어나는데 구조와 놓친 오류 상황을 검토해 줘."

## D — Global mocks and domain rules

Project facts: Browser checkout module. Contract: quantity must be a positive integer;
an unauthorized user must not submit an order. Existing tests mock fetch, storage,
time, logger and the exported function itself; they assert only the function was called.
No permission has been given to change the API or install dependencies.

```js
const token = localStorage.getItem('token');
export async function order(quantity) {
  const response = await fetch('/orders', {
    method: 'POST', headers: { Authorization: token },
    body: JSON.stringify({ quantity, at: Date.now() })
  });
  console.log('ordered');
  return response.json();
}
```

Request: "테스트가 잘 검증하는지, 리팩토링이 필요하다면 이유와 필요한 케이스를 설명해 줘."

## E — Existing suitable boundary

Project facts: Price-formatting function is used in two screens. Currency is KRW;
team intentionally uses a simple pure helper. Existing tests cover zero and positive
values; caller validation rejects non-finite numbers. No other currency is planned.

```js
export function formatPrice(value) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency', currency: 'KRW'
  }).format(value);
}
```

Request: "이 구조가 위험한지 검토해 줘. 확장성을 위해 지금 바꿔야 할까?"

## F — Saved profile verification

Project facts: React profile screen. The agreed contract is to retain edited values
after a failed save, clear the error after a successful retry, and persist the new
values. No source files or runnable app are provided beyond these facts.

Existing evidence `feature-profile-save` describes opening `/profile`, changing
the Name field, pressing `Save`, triggering one failed request through the existing
test transport, then retrying. It records a successful browser run on source `r1`
with check ID `profile-r1`. Current source `r2` moved the entry to `/settings/profile`
and renamed the button to `Save changes`. The only current passing result is a unit
test of the input validator. No browser session, current UI result or persisted-value
check is available in this task. The existing evidence has not been updated.

Request: "이 기록이면 지금 프로필 저장을 검증 완료로 봐도 될까요? 부족하면 필요한 확인 절차만 정리해주세요. 코드나 기록은 수정하지 마세요."

## G — Duplicate requests

Project facts: React development build. After one click on Save, a captured network
log contains two POST requests with the same body. An earlier AI reply attributed
this to StrictMode, but supplied no component code, call stack, request initiator,
retry configuration or comparison with a production build. None of those artifacts
are available in this task. The agreed contract is that one save action must not
create duplicate records. No change to application configuration is authorized.

Request: "이전 AI는 StrictMode 때문이라고 했습니다. 이 결론을 믿어도 되는지, 원인을 확인하려면 무엇을 봐야 하는지 검토만 해주세요."
