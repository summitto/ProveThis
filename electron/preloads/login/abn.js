/* global window, document, MutationObserver */

const { ipcRenderer } = require('electron');

(async () => {
  const watchForSignin = async (_, observer) => {
    const overviewAccountElement = document.getElementsByClassName('account-tile')[0];

    const url = window.location.href;
    const overviewPage = url === 'https://www.abnamro.nl/mijn-abnamro/mijn-overzicht/overzicht/index.html#/overview' || url === 'https://www.abnamro.nl/my-abnamro/my-overview/overview/index.html#/overview';

    if (overviewAccountElement && overviewPage) {
      observer.disconnect();
      ipcRenderer.sendToHost('detected');

      const accountsResponse = await fetch(
        'https://www.abnamro.nl/contracts?excludeBlocked=false&includeActionNames=VIEW_PORTFOLIO_OVERVIEW,VIEW_PAYMENTS,APM_ADVISE_CONTRACTFILTER,MANAGE_DOMESTIC_PAYMENTS,MANAGE_INTERNATIONAL_PAYMENTS,SIGN_DOMESTIC_PAYMENTS,SIGN_INTERNATIONAL_PAYMENTS,SIGN_STANDING_ORDER,VIEW_PROFILE_FUND_SETTINGS,VIEW_WEALTH_OVERVIEW&includeActions=BASIC&productBuildingBlocks=5,8,13,25,15&productGroups=PAYMENT_ACCOUNTS,SAVINGS_ACCOUNTS,INVESTMENTS,CREDITS_MAHUKO_REVOLVING,FISCAL_CAPITAL_SOLUTIONS_PRODUCTS,MORTGAGE',
        { headers: { 'x-aab-serviceversion': 'v2' } },
      );
      const accs = await accountsResponse.json();

      const preferencesResponse = await fetch('https://www.abnamro.nl/user/preferences?ids=contractAliases');
      const preferences = await preferencesResponse.json();
      const aliasMap = preferences.userPreferenceList.userPreferences.find((preference) => preference.id === 'contractAliases').value;

      const accounts = accs.contractList.map(({ contract }) => ({
        accountNumber: contract.accountNumber,
        accountName: aliasMap[contract.id],
        accountOwner: contract.customer.interpayName,
      }));

      ipcRenderer.sendToHost('accounts', accounts);
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
