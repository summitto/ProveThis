/* global window, navigator */

const { ipcRenderer } = require('electron');

ipcRenderer.on('getTransactions', async (_, args) => {
  try {
    const { accountId, paginationKey, uuid } = args;

    let url = 'https://api.web.bunq.com';

    if (paginationKey && paginationKey?.length > 0) {
      url = url.concat(paginationKey);
    } else {
      const { id: userId } = JSON.parse(window.localStorage.getItem('bunq:user'));

      url = url.concat(`/v1/user/${userId}/event?display_user_event=false&display_monetary_account_event=true&display_announcement_event=false&include_user_event_company=false&status=FINALIZED&monetary_account_id=${accountId}&count=20`);
    }
    const { token } = JSON.parse(window.localStorage.getItem('bunq:sessionBrowser'));

    const transactionsResponce = await fetch(
      url,
      {
        headers: {
          'x-bunq-client-request-id': uuid,
          'x-bunq-client-authentication': token,
        },
      },
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

ipcRenderer.on('getHeaders', async (_, { uuid, url, requestBody }) => {
  ipcRenderer.sendToHost('starting', {});
  const { token } = JSON.parse(window.localStorage.getItem('bunq:sessionBrowser'));

  const headers = [
    `User-Agent: ${navigator.userAgent}`,
    `x-bunq-client-request-id: ${uuid}`,
    `x-bunq-client-authentication: ${token}`,
  ];

  try {
    const response = await fetch(
      url,
      {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
          'x-bunq-client-request-id': uuid,
          'x-bunq-client-authentication': token,
        },
      },
    );

    const resp = await response.json();
    const { id } = resp.Response[0].Id;

    ipcRenderer.sendToHost('headers', headers, id);
  } catch (error) {
    ipcRenderer.sendToHost('error', error);
  }
});
