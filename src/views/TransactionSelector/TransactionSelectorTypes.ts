import { Banks } from '../../constants';

type Transaction = {
  descriptionLines: string[]
  transactionDate: number | string
  counterAccountNumber: string
  counterAccountName: string
  amount: number
  url: string
  csvString?: string
}

type Account = {
  accountNumber: string
  accountName: string
  accountOwner: string
  accountId?: number
}

type State = {
  account: Account
  bank: Banks
}

export type {
  Transaction,
  Account,
  State,
};
