/* global navigator */

const { ipcRenderer } = require('electron');

ipcRenderer.on('getTransactions', async (_, args) => {
  const { accountNumber, paginationKey } = args;

  let url = `https://www.abnamro.nl/mutations/${accountNumber}?accountNumber=${accountNumber}&includeActions=EXTENDED`;

  if (paginationKey && paginationKey?.length > 0) {
    url = url.concat(`&lastMutationKey=${paginationKey}`);
  }

  try {
    const transactionsResponce = await fetch(
      url,
      { headers: { 'x-aab-serviceversion': 'v3' } },
    );

    if (transactionsResponce.status !== 200) {
      ipcRenderer.sendToHost('error', `Error fetching transactions, responce status: ${transactionsResponce.status}`);
      return;
    }

    const transactions = await transactionsResponce.json();

    ipcRenderer.sendToHost('transactions', transactions, url);
  } catch (error) {
    ipcRenderer.sendToHost('error', error);
  }
});

ipcRenderer.on('getHeaders', () => {
  const headers = [
    `User-Agent: ${navigator.userAgent}`,
    'x-aab-serviceversion: v3',
  ];

  ipcRenderer.sendToHost('headers', headers);
});
