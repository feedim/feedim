import tr from './messages/tr.json';

type Messages = typeof tr;

declare global {
  interface IntlMessages extends Messages {}
}
