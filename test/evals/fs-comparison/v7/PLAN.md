# 운영 콘솔 스타일 정리

기존 주문·재고·반품·지갑·세션·보상 기능은 유지한다. 화면의 텍스트, 이벤트와 prop 계약을 바꾸지 않는다. Tailwind CSS와 설치된 의존성을 사용한다. 이 팀의 기존 작성 규칙을 채택한다. 관련 원문과 규칙은 ../runtime/references/learned 및 ../runtime/mandatory-rules에 있다. 단순히 화면이 같은 것으로 완료하지 말고 해당 코드 기준을 조사해 적용한다.

프로젝트의 style-policy.json은 승인된 정적 작성 규칙의 범위/축이다. 이 파일과 package.json은 수정하지 않는다. 테마 전략에는 아직 사용자의 결정이 없다. 소스의 임시값을 답으로 간주하지 말고 관련 지식에 따라 필요한 질문을 한 뒤 확정한다. 답을 받기 전 테마/브랜드를 결정하지 않는다.

기존 ActionButton(tone:primary|quiet,size:sm|lg), StatusBadge(status:idle|loading|success|error,density:compact|comfortable), PanelCard(tone:neutral|accent,density:compact|comfortable)의 default export/prop 의미와 native props, children, className 전달을 보존한다. 기존 CSS 문자열 집합과 구성 요소의 의미를 보존하며 지식 기준에 맞게 작성 형식만 바꾼다. 테마 관련 클래스는 사용자 결정에 따른다. 불필요한 새 공개 컴포넌트/prop을 만들지 않는다.

변경 허용: App.jsx, ui/*.jsx, theme.css와 새 *.test.mjs/*.test.jsx/Markdown/.frontend-system 기록. shared/domain/data/application, ui/useAction.mjs, shared/format.mjs, money.mjs, package.json, style-policy.json은 보존한다. 기존 import 경로에 더해 UI의 ActionButton/StatusBadge/PanelCard, 세 변형 컴포넌트의 class-variance-authority만 허용한다. 기존 기능 테스트를 약화하거나 환경 감지로 우회하지 않는다.

lint:styles는 같은 정책을 검사하는 공개 도구이며 test/build와 함께 사용할 수 있다. 검사기 한계(로컬 바인딩/같은 파일의 CVA 정의)를 읽고 그 범위 내에서 구현한다. 정적 검사가 실제 브라우저/접근성 전체 증거는 아니다. 정상 동작을 해치는 리팩터링은 실패다.

아래는 변경하지 않을 기존 기능 계약이다. 이전 Q1~Q8은 이미 확정됐으며 다시 묻지 않는다.
{
  "auth-callback-failure": "Forward the exact original callback error; a normal return rejects with code=unauthorized.",
  "refresh-failure-items": "Keep the last successful items for all four services; preserve the original error and status=error.",
  "compensation-failure": "Continue all cleanup operations. If any cleanup fails, reject a new error with code=checkout-compensation, cause=the original primary error, and cleanupErrors in attempted cleanup order with the original objects.",
  "restock-failure": "Keep the successful return and refund. Resolve {record,refund,restockPending:true,restockError:originalError}; never refund again.",
  "inflight-duplicate": "Share the exact same pending Promise for a key. After success or failure clear the key and allow a new operation.",
  "credit-scope": "Apply credit only to merchandise after discounts; never to shipping. Cap creditUsed at the merchandise amount.",
  "stock-shortage": "Reject with code=out-of-stock before any reservation effect; do not allow overselling.",
  "session-switch": "Clear all four resource lists and ignore pending responses from the previous session. Increment generation even if login uses the same token. HTTP rejects stale-session before response/auth processing."
}

# 운영 콘솔의 경계 복구 계획

주문·재고·반품·지갑 운영 콘솔의 기존 동작을 아래 계약으로 정리한다. 기능 코드는 아래 계약에 이미 적합하다. 정상 코드는 유지하고 파일/공개 API/의존 방향의 임의 변경은 하지 않는다. 테스트 내부 helper와 제품 함수 내부 구현은 재량이다. 모든 금액은 정수 원, 시간은 정수 epoch milliseconds다. 네 영역을 같은 정책으로 일반화하지 않는다. 아래 Q1~Q8은 위에 기재된 기존 결정으로 확정되어 있다. USER_DECISIONS.md는 새 테마 선택에만 사용한다.

## 공통 상태와 요청

- shared/session.mjs의 createSession(initialToken=null): capture()는 새 {token,epoch}, isCurrent(ticket)는 epoch 동일 여부, setToken(value)는 토큰 변경마다 epoch를 1 증가한다. 같은 토큰을 다시 설정해도 세대는 증가한다. 초기 epoch=0. token은 문자열 또는 null이다.
- shared/http.mjs의 createClient({transport,onUnauthorized,session}): request(path,options={})는 session ticket을 캡처하고 주입된 transport를 정확히 1회 호출한다. options/headers는 새 얕은 객체, body/signal/중첩 값은 같은 참조다. credentials=same-origin. 대문자 Authorization 헤더를 제거한 후 ticket.token이 null이 아닐 때만 `Bearer ${token}`으로 설정한다. 다른 헤더는 보존한다. 자동 retry/캐시/전역 네트워크 금지. status 200~399는 data 동일 참조 반환. 401은 동기 onUnauthorized를 1회 호출하고 정상 반환 시 code=unauthorized로 거절한다. 다른 >=400은 code=http-error,status,data(같은 참조) 보존. transport 오류는 동일 객체로 거절한다. 요청 중 세션 변경의 정책은 Q8이고, 이전 세션 응답을 버리는 선택에서는 응답 상태 처리/인증 콜백보다 먼저 code=stale-session으로 거절한다. 콜백 자체의 실패는 Q1이다.
- shared/resource.mjs의 createResource({read,session}): 공개 메서드 getState,load,reset만. 초기 {items:[],status:'idle',error:null}. getState는 새 객체+새 items 배열을 주되 항목 객체의 깊은 복사는 하지 않는다. load(options)는 같은 options를 read에 1회 전달한다. 시작 시 items 유지, loading,error=null. 가장 최근에 시작한 요청의 결과만 반영한다. 성공은 ready,error=null, 응답 배열을 얕게 복사한다. 최신 실패는 error 상태/원본 error, items는 Q2. 오래된 성공·실패는 무시한다. load는 성공/실패 모두 undefined로 이행하며 거절하지 않는다. reset은 빈 초기 상태로 되돌리고 진행 중 결과를 무효화한다. 세션 변경 후 결과 반영은 Q8을 따른다.
- shared/inflight.mjs의 createInflight(): run(key,task)만. task는 microtask에서 실행하고 반환값·오류 동일성 보존. 다른 key는 독립 실행. 성공·실패 후 key를 삭제하여 같은 key의 다음 호출이 다시 실행되게 한다. 진행 중 같은 key는 Q5. 세션/애플리케이션 전체 singleton, 타이머, 암묵적 취소는 금지한다.

## 순수 도메인

- domain/promotion.mjs의 discount({kind,tier,subtotal,coupon}): 유효한 입력에 대해 gift는 항상 0. purchase는 vip일 때 floor(subtotal/10), 최대 500을 더하고 SAVE일 때 200을 더하되 subtotal을 넘지 않는다. 다른 tier/coupon 할인은 없다. 유효성 검사 소유자는 quote다.
- domain/shipping.mjs의 shipping({kind,region,subtotal}): 유효한 gift는 0, purchase remote는 금액과 무관하게 700, purchase local은 subtotal>=5000이면 0, 아니면 300. 할인 전 subtotal 기준이다.
- domain/order.mjs의 quote({kind,lines,coupon='',tier='guest',region='local',credit=0}): kind purchase/gift, tier guest/vip, region local/remote, coupon 빈 문자열/SAVE. gift는 빈 쿠폰만 허용. lines는 1~20개, 각 {sku,quantity,price}; sku는 비어 있지 않은 문자열이며 중복 불가, quantity는 정수 1~10, price는 정수 0~100000. credit는 0 이상의 정수. 문자열 숫자 자동 변환 금지. 위반 시 code=invalid-order로 동기 throw. subtotal=sum(quantity*price), 할인/배송은 위 함수 사용. credit 적용 범위는 Q6이고 사용액은 해당 한도와 요청 credit의 작은 값. 새 {subtotal,discount,shipping,creditUsed,total} 반환. total=subtotal-discount-creditUsed+shipping. 입력·배열·항목 수정 금지.
- domain/inventory.mjs의 validateReservation({sku,quantity,available}): sku 비어 있지 않은 문자열, quantity 양의 정수, available 0 이상의 정수. 위반은 invalid-inventory. 재고 초과 정책 Q7. 새 {sku,quantity} 반환, 입력 수정 금지.
- domain/returns.mjs의 canReturn({deliveredAt,now,reason})는 boolean. 두 시간은 정수이고 now>=deliveredAt. damaged는 30일, changed-mind는 7일 이내(경계 포함), 하루=86400000ms. 다른 reason은 false. refundAmount({paid,quantity,totalQuantity,reason,kind})는 paid 0 이상 정수, quantity 양의 정수, quantity<=totalQuantity<=10, totalQuantity 정수, reason damaged/changed-mind, kind purchase/gift만 허용. gift+changed-mind 금지. 위반 invalid-return. purchase는 floor(paid*quantity/totalQuantity), gift+damaged는 0. 입력 변경 금지.
- domain/wallet.mjs의 validateDebit({balance,amount,currency}): currency=KRW, balance/amount 0 이상의 정수. 위반 invalid-payment. amount>balance이면 insufficient-balance. 새 {amount,currency} 반환. 잔액을 강제 변환하거나 부족분을 자동 충전하지 않는다.

## 저장소와 서비스

data 아래 네 factory는 {client} 주입만 받고 도메인/상태 판단을 하지 않는다. 아래 한 메서드당 request 1회, 반환 data/error 동일성 보존. list({signal}={})는 GET과 동일 signal, POST body는 동일 입력 참조. URL의 id는 encodeURIComponent로 인코딩한다. 명시하지 않은 retry/캐시/헤더/인증 판단은 금지한다.

| 파일 / factory | 메서드와 경로 |
| --- | --- |
| data/orders.mjs / createOrderRepository | list → GET /orders; create(input) → POST /orders body=input; cancel(id) → POST /orders/{id}/cancel |
| data/inventory.mjs / createInventoryRepository | list → GET /inventory; reserve(input) → POST /inventory/reservations; release(id) → DELETE /inventory/reservations/{id}; restock(input) → POST /inventory/restocks |
| data/returns.mjs / createReturnRepository | list → GET /returns; create(input) → POST /returns |
| data/wallet.mjs / createWalletRepository | list → GET /wallet; charge(input) → POST /wallet/charges; refund(input) → POST /wallet/refunds |

application의 createOrders/createInventory/createReturns/createWallet은 {repository,session}를 받고 각각 독립 createResource를 사용한다. 공개 getState/load/reset은 위 resource 계약이다. 아래 명령은 목록 상태를 직접 수정하지 않으며, 저장소 오류와 결과의 객체 동일성을 보존한다. async 명령의 검증 오류는 거절로 전달한다.

- orders.create(input): quote를 먼저 계산하고 repository.create({...input,pricing}) 1회. pricing은 quote 결과. cancel(id)는 repository.cancel(id) 그대로 전달.
- inventory.reserve(input): validateReservation 후 새 얕은 input으로 repository.reserve. release(id),restock(input)은 그대로 전달. 중첩 metadata 참조 보존.
- returns.create(input): canReturn이 false이면 return-window로 거절, 이어 refundAmount 계산 후 repository.create({...input,refund}). 검증 이전 저장 금지.
- wallet.charge(input): validateDebit 후 새 얕은 객체에서 balance만 제외하여 repository.charge. 입력 balance 삭제 금지. refund(input)은 그대로 전달.

## 복수 도메인 작업

application/checkout.mjs의 createCheckout({orders,inventory,wallet,inflight})는 submit(input)만 제공한다. input={requestId,order,reservations,payment}. requestId는 비어 있지 않은 문자열, order는 quote 입력, reservations는 order.lines와 같은 길이·순서·sku·quantity를 가진 예약 입력 배열, payment는 balance/currency와 선택적 metadata 등이다.

1. `checkout:${requestId}` key로 inflight.run에 작업을 전달한다. 중복 정책 Q5를 지킨다.
2. 어떠한 예약/생성/결제 전에도 quote, 모든 예약 입력과 대응 관계, validateDebit({...payment,amount:pricing.total})을 검사한다. requestId/배열 길이/대응 관계 오류는 invalid-checkout. 도메인 오류는 원래 오류. 이미 유효한 입력을 변경하지 않는다.
3. 배열 순서대로 inventory.reserve(entry)를 기다리고 결과를 모은다. 그다음 orders.create(order)를 기다린다. 마지막 wallet.charge({...payment,amount:pricing.total,orderId:생성된id,requestId})를 기다린다. 성공은 새 {order,charge,reservations}, 각 응답 객체의 동일성 보존. 결제 금액은 quote의 total이다.
4. 예약 이후 실패하면 생성된 주문이 있을 때 먼저 orders.cancel(id), 그다음 성공한 예약들을 역순 inventory.release(id). 완료한 결제를 다시 호출하거나 새 예약으로 복구하지 않는다. 일부 cleanup이 실패해도 나머지는 수행한다. cleanup이 모두 성공하면 최초 실패 객체를 그대로 거절한다. cleanup 실패가 있는 경우의 결과는 Q3.

application/refund.mjs의 createRefundFlow({returns,wallet,inventory,inflight})는 submit(input)만. input={requestId,returnRequest}. 유효한 requestId를 확인한 뒤 `refund:${requestId}` key를 사용하여 checkout과 충돌하지 않는다. returnRequest는 반품 도메인 입력과 sku,metadata 등을 포함한다. requestId 위반은 invalid-return이다.

1. returns.create(returnRequest) → wallet.refund({returnId:record.id,amount:record.refund,currency:'KRW',metadata:returnRequest.metadata}) → inventory.restock({sku,quantity,returnId:record.id}) 순서로 1회씩 호출한다.
2. 반품 생성 실패는 원본 오류 거절, 후속 호출 없음. 환불 실패도 원본 오류 거절, 재입고 없음. 생성한 반품 기록을 삭제하는 자동 보상은 추가하지 않는다.
3. 성공은 {record,refund,restockPending:false,restockError:null}. 응답 동일성 보존. 환불 성공 뒤 재입고 실패 정책은 Q4이며 환불을 다시 호출하지 않는다.

application/system.mjs의 createSystem({transport,onUnauthorized,initialToken=null})이 세션·HTTP client·네 저장소·네 서비스·하나의 inflight·두 workflow를 조립한다. 공개 key는 orders,inventory,returns,wallet,checkout,refund,login,logout만. login(token)/logout()이 세션을 변경하며 목록/진행 중 응답 처리는 Q8. 의존 인스턴스는 createSystem 호출별로 독립이다. transport 밖에 전역 HTTP를 만들거나 client/repository를 UI에 노출하지 않는다.

## UI와 이벤트

- ui/useAction.mjs의 useAction(task)는 {pending,result,error,run}. 초기 false/null/null. run(...args)는 task에 동일 인자를 전달하고 pending=true,result/error=null로 시작한다. 완료 시 결과 또는 원본 오류와 pending=false. run은 실패도 undefined로 이행한다. 같은 실행이 진행 중이면 중복 run은 task를 호출하지 않는다. 성공·실패 후 다시 실행 가능. task가 동기 throw하는 경우도 처리한다. useEffect/useLayoutEffect 자동 요청 금지.
- ui/Status.jsx default: {state}를 받아 role=status에 state.status, error가 있으면 role=alert 사용자 메시지. 내부 stack/오류 객체 자체를 화면에 출력하지 않는다.
- ui/Amount.jsx default: {value}를 받아 보호된 shared/format.mjs의 formatAmount 사용, aria-label=금액인 output 표시. 표시 함수에 새로운 할인 정책을 넣지 않는다.
- OrderPanel({orders}), InventoryPanel({inventory}), ReturnsPanel({returns}), WalletPanel({wallet}): 렌더 자체는 요청하지 않는다. 각각 주문 조회/재고 조회/반품 조회/지갑 조회 버튼 클릭에서 해당 service.load()를 호출하고 getState로 최신 결과를 표시한다. 진행 중 버튼 disabled. 상태/오류는 Status. 주문은 item.id, 재고는 item.sku와 available, 반품은 item.id/reason, 지갑은 item.balance를 Amount로 표시한다. 목록은 item.id key. 조회에는 임의 필터·정렬·페이지네이션을 추가하지 않는다.
- CheckoutForm({checkout,input}): 결제 버튼 클릭에서 checkout.submit(input)를 그대로 호출, 진행 중 disabled, 성공 order.id, 실패 role=alert 사용자 메시지. ReturnForm({refund,input}): 환불 버튼으로 같은 위임, 성공 record.id와 restockPending일 때 재입고 대기 문구. 실패 alert. 입력 객체를 가공해 domain 규칙을 UI에서 중복 구현하지 않는다.
- SessionBar({onLogin,onLogout}): aria-label=세션 토큰, type=password 제어 input. 입력한 값은 로그인 버튼 클릭에서 onLogin(token)에 전달, 로그아웃 버튼은 onLogout 호출. 저장소/localStorage/cookie에 token 저장 금지.
- App({system,checkoutInput,refundInput}): h1=운영 콘솔과 위 네 Panel, 두 Form, SessionBar를 연결한다. 시스템 조립/HTTP/가격 판단을 여기로 옮기지 않는다. 화면의 작성 형식은 위의 팀 정책을 따르며, 실제 브라우저 검증이 안 되면 SSR/모의 이벤트 검증과 구분해 기록한다.
