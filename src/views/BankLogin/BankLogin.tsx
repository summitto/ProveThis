import { useEffect, useRef, useState } from 'react';

import { useLocation, useNavigate } from 'react-router-dom';
import { IpcRenderer, WebviewTag } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { Button } from 'react-bootstrap';

import { Banks, BanksLoginUrls, PreloadType } from '../../constants';
import { Accounts, State } from './BankLoginTypes';

const { ipcRenderer }: { ipcRenderer: IpcRenderer} = window.require('electron');

const BankLogin = () => {
  const location = useLocation();
  const { bank } = location.state as State;

  const [webviewContainerDisplay, setWebviewContaiterDisplay] = useState('block');

  const webviewContainer = useRef<HTMLDivElement | null>();

  const navigate = useNavigate();

  useEffect(() => {
    const effect = async () => {
      const preloadPath = await ipcRenderer.sendSync('getPreloadPath', PreloadType.LOGIN, bank) as string;

      const webview: WebviewTag = document.createElement('webview');

      webview.setAttribute('src', BanksLoginUrls[bank]);
      webview.setAttribute('style', 'width: 100vw; height: calc(100vh - 42px)');
      webview.setAttribute('partition', 'persist:bank');
      webview.setAttribute('id', 'loginwebview');
      webview.setAttribute('preload', preloadPath);

      webview.addEventListener('ipc-message', (event) => {
        if (event.channel === 'error') {
          console.log('error requesting accounts:', event.args[0]);
          alert('There was an error requesting your account information. Please try again.');
          navigate('/');
          return;
        }
        if (event.channel === 'detected') {
          console.log('login detected');
          setWebviewContaiterDisplay('none');

          if (bank === Banks.BUNQ) {
            webview.send('getAccounts', { uuid: uuidv4() });
          }
        }
        if (event.channel === 'accounts') {
          console.log(`got ${event.args[0].length} accounts`);
          console.log('accounts:', event.args[0]);
          navigate('/accounts/', { state: { accounts: event.args[0] as Accounts[], bank } });
        }
      });

      webviewContainer.current?.replaceChildren(webview);
    };

    effect();
  }, []);

  return (
    <>
      <Button
        className='navigation-button'
        variant='outline-dark'
        onClick={() => navigate(-1)}
      >
        {'⬅ Back'}
      </Button>
      <div
        id='webviewContainer'
        ref={(ref) => { webviewContainer.current = ref; }}
        style={{ display: webviewContainerDisplay }}
      />
    </>
  );
};

export default BankLogin;
