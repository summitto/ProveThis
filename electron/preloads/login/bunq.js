/* global window, document */

const { ipcRenderer } = require('electron');

(async () => {
  const watchForSignin = async (_, observer) => {
    const overviewAccountElement = document.getElementsByClassName('monetary-account')[0];

    const url = window.location.href;
    const overviewPage = url.startsWith('https://web.bunq.com/user/');

    if (overviewAccountElement && overviewPage) {
      observer.disconnect();
      ipcRenderer.sendToHost('detected');
    }
  };

  const run = async () => {
    // the script has 5 minutes to load the page
    for (let i = 1; i < 600; i++) {
      await new Promise((r) => { setTimeout(r, i * 500); });
      const collection = document.getElementsByTagName('body');
      if (collection.length >= 1) {
        const body = collection[0];
        ipcRenderer.sendToHost('ready');

        return body;
      }
    }
  };
  const body = await run();
  const signInObserver = new MutationObserver(watchForSignin);
  signInObserver.observe(body, {
    childList: true, subtree: true, attributes: true, characterData: true,
  });
})();

ipcRenderer.on('getAccounts', async (_, { uuid }) => {
  try {
    const { token } = JSON.parse(window.localStorage.getItem('bunq:sessionBrowser'));
    const { id: userId } = JSON.parse(window.localStorage.getItem('bunq:user'));

    const accountsResponse = await fetch(
      `https://api.web.bunq.com/v1/user/${userId}/monetary-account?status=ACTIVE%2CPENDING_ACCEPTANCE&count=200`,
      {
        headers: {
          'x-bunq-client-request-id': uuid,
          'x-bunq-client-authentication': token,
          'Cache-Control': 'no-cache',
        },
      },
    );

    if (accountsResponse.status !== 200) {
      ipcRenderer.sendToHost('error', `Error fetching transactions, responce status: ${accountsResponse.status}`);
      return;
    }
    const accs = await accountsResponse.json();

    const accounts = accs.Response.reduce((result, account) => {
      const key = Object.keys(account).find((k) => k.startsWith('MonetaryAccount'));
      if (!key) return result;

      const { value: accountNumber, name: accountOwner } = account[key].alias.find((value) => value.type === 'IBAN');

      const formatedAccount = {
        accountNumber,
        accountOwner,
        accountName: account[key].description,
        accountId: account[key].id,
      };

      result.push(formatedAccount);

      return result;
    }, []);

    ipcRenderer.sendToHost('accounts', accounts);
  } catch (error) {
    ipcRenderer.sendToHost('error', error);
  }
});
