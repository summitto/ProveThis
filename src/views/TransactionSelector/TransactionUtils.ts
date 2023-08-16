/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Banks } from '../../constants';
import { Account, Transaction } from './TransactionSelectorTypes';

const parseTransactions = (rawTransactions, url: string, bank: Banks, account: Account): Transaction[] => {
  const { accountId, accountNumber } = account;
  let transactions = [];

  if (bank === Banks.ABN) {
    transactions = rawTransactions.mutationsList.mutations.map(({ mutation }, index, array) => {
      const paginatedUrl = new URL(url);

      if (index > 0) {
        paginatedUrl.searchParams.set('lastMutationKey', formatLastMutationKey(array[index - 1].mutation.transactionTimestamp));
      }

      return {
        descriptionLines: mutation.descriptionLines,
        amount: mutation.amount,
        counterAccountName: mutation.counterAccountName,
        counterAccountNumber: mutation.counterAccountNumber,
        transactionDate: mutation.transactionDate,
        url: paginatedUrl.href,
      };
    });
  }

  if (bank === Banks.BUNQ) {
    const urlObject = new URL(url);
    const notarizationUrl = `${urlObject.origin}${urlObject.pathname.slice(0, -6)}/monetary-account/${accountId}/customer-statement`;

    transactions = rawTransactions.Response.reduce((result, { Event: event }) => {
      if (Object.keys(event.object)[0] !== 'Payment') return result;

      const csvString = prepareCSVString(accountNumber, event.object.Payment);

      const tx: Transaction = {
        transactionDate: event.object.Payment.created,
        counterAccountNumber: event.object.Payment.counterparty_alias.iban,
        counterAccountName: event.object.Payment.counterparty_alias.display_name,
        amount: event.object.Payment.amount.value,
        descriptionLines: [event.object.Payment.description, event.object.Payment.counterparty_alias.country],
        csvString,
        url: notarizationUrl,
      };

      result.push(tx);

      return result;
    }, []);
  }

  return transactions as Transaction[];
};

const prepareCSVString = (accountNumber: string, tx: any) => {
  const txDate = new Date(tx.created).toISOString().split('T')[0];
  const interestDate = new Date(tx.maturity_date).toISOString().split('T')[0];

  const fields = [
    `"${txDate}"`,
    `"${interestDate}"`,
    `"${new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(tx.amount.value).slice(2)}"`,
    `"${accountNumber}"`,
    `"${tx.counterparty_alias.iban}"`,
    `"${tx.counterparty_alias.display_name}"`,
    `"${tx.description}"`,
  ];
  const csvString = fields.join(',');

  return csvString;
};

const formatLastMutationKey = (key: string): string => {
  const formatedKey: string [] = [];
  formatedKey.push(key.substring(0, 4), '-');
  formatedKey.push(key.substring(4, 6), '-');
  formatedKey.push(key.substring(6, 8), '-');
  formatedKey.push(key.substring(8, 10), '.');
  formatedKey.push(key.substring(10, 12), '.');
  formatedKey.push(key.substring(12, 14), '.');
  formatedKey.push(key.substring(14, 17), '000');

  return formatedKey.join('');
};

// eslint-disable-next-line import/prefer-default-export
export { parseTransactions };
