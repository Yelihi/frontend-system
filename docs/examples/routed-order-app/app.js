const storageKey = 'fs-routed-order-example-v1';

function readOrders() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveOrder(item, quantity) {
  const orders = readOrders();
  const order = {id: `ORD-${String(orders.length + 1).padStart(3, '0')}`, item, quantity};
  localStorage.setItem(storageKey, JSON.stringify([...orders, order]));
  return order;
}

function renderActivity() {
  const orders = readOrders();
  const list = document.querySelector('#activity-list');
  document.querySelector('#order-count').textContent = `${orders.length} ${orders.length === 1 ? 'entry' : 'entries'}`;
  if (!orders.length) {
    list.textContent = 'No orders yet. Create an order to see it here.';
    return;
  }
  list.replaceChildren(...orders.map(order => {
    const row = document.createElement('div');
    row.className = 'activity-row';
    const name = document.createElement('strong');
    name.textContent = order.item;
    const detail = document.createElement('span');
    detail.textContent = `${order.id} · Qty ${order.quantity}`;
    row.append(name, detail);
    return row;
  }));
}

if (document.body.dataset.page === 'orders') {
  document.querySelector('#order-form').addEventListener('submit', event => {
    event.preventDefault();
    const item = document.querySelector('#item').value.trim();
    const quantity = Number(document.querySelector('#quantity').value);
    const result = document.querySelector('#order-result');
    if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      result.textContent = 'Enter an item and a quantity from 1 to 99.';
      result.hidden = false;
      return;
    }
    try {
      const order = saveOrder(item, quantity);
      result.replaceChildren();
      result.append(`Saved ${order.id}. `);
      const link = document.createElement('a');
      link.href = '/activity/';
      link.textContent = 'View activity →';
      result.append(link);
      result.hidden = false;
    } catch {
      result.textContent = 'The order could not be saved in this browser.';
      result.hidden = false;
    }
  });
} else if (document.body.dataset.page === 'activity') {
  renderActivity();
}
