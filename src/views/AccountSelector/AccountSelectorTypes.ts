import { Banks } from '../../constants';

type Account = {
  accountNumber: string
  accountName: string
  accountOwner: string
  accountId?: number
}

type State = {
  accounts: Account[]
  bank: Banks
}

export type {
  Account,
  State,
};
