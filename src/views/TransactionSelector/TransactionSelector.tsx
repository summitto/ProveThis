/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  useCallback, useEffect, useRef, useState,
} from 'react';

import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { IpcRenderer, WebviewTag } from 'electron';
import { v4 as uuidv4 } from 'uuid';

import './TransactionSelector.css';
import {
  Banks, BanksTransactionsUrl, PreloadType,
} from '../../constants';
import { Transaction, State } from './TransactionSelectorTypes';
import { parseTransactions } from './TransactionUtils';

const { ipcRenderer }: { ipcRenderer: IpcRenderer} = window.require('electron');

const AccountSelector = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { account, bank } = location.state as State;

  const [selectedTransaction, setSelectedTransaction] = useState<number | undefined>();
  const [paginationKey, setPaginationKey] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const txWebviewContainer = useRef<HTMLDivElement | null>();

  const onTransactionSelected = useCallback((index: number) => {
    if (selectedTransaction === index) {
      setSelectedTransaction(undefined);
      return;
    }
    setSelectedTransaction(index);
  }, [selectedTransaction]);

  const formatAmount = (amount: number): string => {
    if (amount > 0) {
      return `+${amount}`;
    }
    return `${amount}`;
  };

  const formatDate = (timestamp: number | string): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  useEffect(() => {
    const effect = async () => {
      const preloadPath = await ipcRenderer.sendSync('getPreloadPath', PreloadType.TRANSACTIONS, bank) as string;

      const webview: WebviewTag = document.createElement('webview');

      webview.setAttribute('src', BanksTransactionsUrl[bank]);
      webview.setAttribute('partition', 'persist:bank');
      webview.setAttribute('id', 'transactionswebview');
      webview.setAttribute('preload', preloadPath);

      webview.addEventListener('ipc-message', (event) => {
        if (event.channel === 'error') {
          console.log('error requesting transactions:', event.args[0]);
          alert('Your session with bank is expired. In order to continue, you need to login again');
          navigate('/');
          return;
        }
        if (event.channel === 'transactions') {
          console.log('got transactions');
          const txs = parseTransactions(event.args[0], event.args[1], bank, account);

          console.log(`filtered ${txs.length} transactions`);

          setTransactions((prevState) => [...prevState, ...txs]);

          if (bank === Banks.ABN) {
            setPaginationKey(event.args[0].mutationsList.lastMutationKey);
          }
          if (bank === Banks.BUNQ) {
            setPaginationKey(event.args[0].Pagination.older_url);
          }
        }
      });

      webview.addEventListener('dom-ready', () => {
        console.log('dom loaded, requesting transactions');
        if (bank === Banks.ABN) webview.send('getTransactions', { accountNumber: account.accountNumber });
        if (bank === Banks.BUNQ) webview.send('getTransactions', { accountId: account.accountId, uuid: uuidv4() });
      });

      txWebviewContainer.current?.replaceChildren(webview);
    };
    effect();
  }, []);

  const getMoreTransactions = () => {
    const webview = document.getElementById('transactionswebview') as WebviewTag;

    console.log('requesting more transactions');

    if (bank === Banks.ABN) webview.send('getTransactions', { accountNumber: account.accountNumber, paginationKey });
    if (bank === Banks.BUNQ) webview.send('getTransactions', { accountId: account.accountId, paginationKey, uuid: uuidv4() });
  };

  const notarize = async (transaction: Transaction) => {
    let extraHeaders: string[] = [];
    let requestBody = '';
    if (bank === Banks.ABN) {
      extraHeaders = await ipcRenderer.sendSync('getCookies') as [string];
    }
    if (bank === Banks.BUNQ) {
      const date = new Date(transaction.transactionDate).toISOString().split('T')[0];

      requestBody = JSON.stringify({
        statement_format: 'CSV',
        date_start: date,
        date_end: date,
        include_attachment: true,
        regional_format: 'UK_US',
      });
    }

    const webview = document.getElementById('transactionswebview') as WebviewTag;

    webview.addEventListener('ipc-message', (event) => {
      if (event.channel === 'headers') {
        let { url } = transaction;
        if (bank === Banks.BUNQ) {
          url = `${url}/${event.args[1]}/content`;
        }

        navigate('/proof', {
          state: {
            bank, url, headers: event.args[0], extraHeaders, transaction,
          },
        });
      }
    });

    console.log('notarazing transaction:', transaction);
    webview.send('getHeaders', { uuid: uuidv4(), url: transaction.url, requestBody });
  };

  return (
    <>
      <Button
        className='navigation-button'
        variant='outline-dark'
        onClick={() => navigate(-1)}
      >
        {'⬅ Back'}
      </Button>
      <Button
        className='navigation-button'
        variant='outline-dark'
        onClick={() => navigate('/banks')}
      >
        Сancel
      </Button>

      <div className='TransactionSelector-container'>
        <div
          id='webviewContainer'
          ref={(ref) => { txWebviewContainer.current = ref; }}
          style={{ display: 'none' }}
        />

        <p className='TransactionSelector-title'>Select transaction</p>
        <div className='TransactionSelector-bottom-container'>
          <div className='TransactionSelector-transactions-containter div-2'>
            {transactions.map((transaction, index) => (
              <div key={index} style={{ width: 450 }}>
                <Button
                  key={index}
                  variant='outline-dark'
                  className={
                    `TransactionSelector-transaction-container
                    ${selectedTransaction === index ? 'TransactionSelector-selected-button' : ''}`
                  }
                  onClick={() => onTransactionSelected(index)}
                >
                  <div className='TransactionSelector-transaction-top'>
                    <p className='TransactionSelector-bottom-text'>{transaction.counterAccountName}</p>
                    <p className='TransactionSelector-name'>{formatAmount(transaction.amount)}</p>
                  </div>
                  <p className='TransactionSelector-bottom-text'>{formatDate(transaction.transactionDate)}</p>
                </Button>

                {selectedTransaction === index && (
                  <div className='TransactionSelector-tx-info'>

                    {transactions[selectedTransaction]?.counterAccountNumber?.length !== 0 && (
                      <div className='TransactionSelector-info-block'>
                        <div className='col'>Counter account number: </div>
                        <div className='col'>{transactions[selectedTransaction].counterAccountNumber}</div>
                      </div>
                    )}

                    <div style={{ marginBottom: 10 }}>
                      {transaction.descriptionLines.map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </div>

                    <Button
                      variant='outline-dark'
                      onClick={() => notarize(transaction)}
                      disabled={!transaction.counterAccountNumber}
                      style={{
                        marginLeft: 'auto',
                        marginRight: 0,
                        display: 'block',
                        color: transaction.counterAccountNumber ? '' : '#a5a5a5',
                      }}
                    >
                      {transaction.counterAccountNumber
                        ? 'Prove this transaction'
                        : 'Transaction has no counterparty'
                      }

                    </Button>
                  </div>
                )}
              </div>
            ))}
            {paginationKey && paginationKey.length > 0 && (
              <Button
                variant='outline-dark'
                onClick={() => getMoreTransactions()}
                style={{ marginBottom: 15 }}
              >
                Earlier transactions
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AccountSelector;
