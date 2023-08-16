import { memo } from 'react';

import { HashRouter, Route, Routes } from 'react-router-dom';

import BankSelector from './views/BankSelector';
import AccountSelector from './views/AccountSelector';
import TransactionSelector from './views/TransactionSelector';
import BankLogin from './views/BankLogin';
import ProvingView from './views/ProvingView';
import SetupView from './views/SetupView';

const Router = memo(() => (
  <HashRouter>
    <Routes>
      <Route path='/' Component={SetupView} />
      <Route path='/banks' Component={BankSelector} />
      <Route path='/login' Component={BankLogin} />
      <Route path='/accounts' Component={AccountSelector} />
      <Route path='/transactions' Component={TransactionSelector} />
      <Route path='/proof' Component={ProvingView} />
    </Routes>
  </HashRouter>
));

export default Router;
