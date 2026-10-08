import { createCatalog } from './catalog';
import { createOrders } from './orders';
import { createSession } from './session';
import { browserTransport } from './transport';
import { domView } from './dom';
export function mount(catalogRoot: HTMLElement, ordersRoot: HTMLElement) {
  const catalogSession = createSession('catalog-token', () => catalogRoot.setAttribute('data-login', 'required'));
  const ordersSession = catalogSession; // SESSION_SETUP
  const catalog = createCatalog(domView(catalogRoot), catalogSession, browserTransport, '/catalog-api');
  const orders = createOrders(domView(ordersRoot), ordersSession, browserTransport, '/orders-api');
  const search = () => { void catalog.search(catalogRoot.querySelector('input')!.value); };
  const refresh = () => { void orders.refresh(); };
  const submit = () => { void orders.submit('sku-1'); };
  catalogRoot.querySelector('input')!.addEventListener('input', search);
  ordersRoot.querySelector('[data-refresh]')!.addEventListener('click', refresh);
  ordersRoot.querySelector('[data-submit]')!.addEventListener('click', submit);
  return {
    replaceCatalogSession: catalogSession.replace, replaceOrdersSession: ordersSession.replace,
    dispose: () => {
      catalogRoot.querySelector('input')!.removeEventListener('input', search);
      ordersRoot.querySelector('[data-refresh]')!.removeEventListener('click', refresh);
      ordersRoot.querySelector('[data-submit]')!.removeEventListener('click', submit);
      catalog.dispose(); orders.dispose();
    },
  };
}
