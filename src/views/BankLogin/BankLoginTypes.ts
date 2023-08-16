import { Banks } from '../../constants';

type Account = {
  accountNumber: string
  accountName: string
  accountOwner: string
  accountId?: number
}

type Accounts = Account[]

type State = {
  bank: Banks
}

export type {
  Accounts,
  State,
};
