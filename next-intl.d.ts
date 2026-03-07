import tr from './messages/tr.json';

type Messages = typeof tr;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IntlMessages extends Messages {}
}
