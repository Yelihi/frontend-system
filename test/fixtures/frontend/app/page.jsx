import OrderForm from './order-form';
import { serverLabel } from '@/server/catalog';

export default function Page() {
  return <main><h1>Order acceptance fixture</h1><OrderForm><p>{serverLabel()}</p></OrderForm></main>;
}
