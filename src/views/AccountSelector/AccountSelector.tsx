import { useCallback } from 'react';

import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from 'react-bootstrap';

import './AccountSelector.css';

import { Account, State } from './AccountSelectorTypes';

const AccountSelector = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { accounts, bank } = location.state as State;

  const onAccountSelected = useCallback((account: Account) => {
    navigate('/transactions', { state: { account, bank } });
  }, []);

  return (
    <>
      <Button
        className='navigation-button'
        variant='outline-dark'
        onClick={() => navigate('/banks')}
      >
        Сancel
      </Button>
      <div className='AccountSelector-container'>

        <p className='AccountSelector-title'>Select account</p>

        {accounts.map((account) => (
          <Button
            key={account.accountNumber}
            variant='outline-dark'
            className='AccountSelector-account-container'
            onClick={() => onAccountSelected(account)}
          >
            <p className='AccountSelector-name'>{account.accountName}</p>
            <div className='AccountSelector-bottom-container'>
              <p className='AccountSelector-bottom-text'>{account.accountOwner}</p>
              <p className='AccountSelector-bottom-text'>{account.accountNumber.match(/.{1,4}/g)?.join(' ')}</p>
            </div>
          </Button>
        ))}
      </div>
    </>
  );
};

export default AccountSelector;
