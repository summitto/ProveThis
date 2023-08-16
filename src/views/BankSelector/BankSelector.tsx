import { useCallback } from 'react';

import { useNavigate } from 'react-router-dom';
import { Button, Image } from 'react-bootstrap';

import './BankSelector.css';
import { Banks } from '../../constants';
import abnLogo from '../../assets/images/abn-amro-logo.png';
import bunqLogo from '../../assets/images/bunq-logo.png';

const BankSelector = () => {
  const navigate = useNavigate();

  const onBankSelected = useCallback((bank: string) => {
    navigate('/login/', { state: { bank } });
  }, []);

  return (
    <>
      <div className='BankSelector-header'>
        <div className='BankSelector-text'>
          With this application you can create a zero-knowledge proof about a bank transaction that you did in the past.
        </div>
        <div
          style={{ width: 550 }}
          className='BankSelector-text'>
          <li>First, you can connect to a bank account either with bunq or ABN Amro.</li>
          <li>Second, you can select a transaction you want to prove to someone.</li>
          <li>
            Third, you can create a proof to selectively disclose a transaction in zero-knowledge to someone else without revealing any other data included in the TLS response from your bank.
          </li>
        </div>
        <div className='BankSelector-text'>
          You can login with your normal login credentials, this data will not be transmitted to any third party server, it will only allow the application to create a proof of a transaction that is being served by one of the bank servers.
        </div>

      </div>
      <div
        className='BankSelector-container'
      >
        <p className='AccountSelector-title'>Select bank</p>

        <Button
          variant='outline-secondary'
          className='BankSelector-bank-container'
          onClick={() => onBankSelected(Banks.BUNQ)}>
          <div className='BankSelector-bank-image-container'>
            <Image src={bunqLogo} className='BankSelector-bank-image' />
          </div>
          <p className='BankSelector-bank-name'>Bunq</p>
        </Button>

        <Button
          variant='outline-secondary'
          className='BankSelector-bank-container'
          onClick={() => onBankSelected(Banks.ABN)}>
          <div className='BankSelector-bank-image-container'>
            <Image src={abnLogo} className='BankSelector-bank-image' />
          </div>
          <p className='BankSelector-bank-name'>ABN AMRO</p>
        </Button>
      </div>
    </>
  );
};

export default BankSelector;
