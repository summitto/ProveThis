import { useEffect, useState } from 'react';

import { useNavigate, useLocation } from 'react-router-dom';
import { IpcRenderer } from 'electron';
import { Button } from 'react-bootstrap';

import './ProvingView.css';
import { Banks } from '../../constants';
import { Transaction } from '../TransactionSelector/TransactionSelectorTypes';

type StatusIpcMessage = {
  error?: string
  status?: string
  path?: string
  signature?: string
  decodedProvenCleartext?: string
}

const { ipcRenderer }: { ipcRenderer: IpcRenderer} = window.require('electron');

type State = {
  bank: Banks
  url: string
  headers: string[]
  extraHeaders: string[]
  transaction: Transaction
}

const ProvingView = () => {
  const navigate = useNavigate();

  const location = useLocation();
  const {
    bank, url, headers, extraHeaders, transaction,
  } = location.state as State;

  const [status, setStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [dotCount, setDotCount] = useState(0);
  const [showDots, setShowDots] = useState(true);

  const [showPath, setShowPath] = useState(false);
  const [path, setPath] = useState('');
  const [signature, setSignature] = useState('');
  const [decodedProvenCleartext, setDecodedProvenCleartext] = useState('');

  useEffect(() => {
    setStatus('Notarizing');
    setShowDots(true);

    ipcRenderer.on('scriptError', (_, args) => {
      console.log('internal script error, status:', status, 'error:', args);
    });

    ipcRenderer.on('provingStatus', (_, args: StatusIpcMessage) => {
      if (args.error) {
        setErrorMessage(args.error);
        return;
      }

      if (args.status) {
        setStatus(args.status);

        if (args.status === 'Finished 🥳') {
          setShowDots(false);
          setShowPath(true);
          setPath(args.path || '');
          setSignature(args.signature || '');
          setDecodedProvenCleartext(args.decodedProvenCleartext || '');
        }

        if (args.status === 'Canceled') {
          setShowDots(false);
        }
      }
    });

    const urlObject = new URL(url);

    const httpUrl = [
      `GET ${urlObject.pathname}${urlObject.search} HTTP/1.1`,
      `Host: ${urlObject.host}`,
      ...headers,
      ...extraHeaders,
    ].join('\r\n');

    console.log(httpUrl);

    ipcRenderer.send('createProof', bank, urlObject.host, httpUrl, transaction);

    const dotInterval = setInterval(() => {
      setDotCount((prev) => {
        if (prev === 3) {
          return 0;
        }

        return prev + 1;
      });
    }, 500);

    return () => clearInterval(dotInterval);
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
      <Button
        className='navigation-button'
        variant='outline-dark'
        onClick={() => {
          ipcRenderer.send('cancel');
          navigate('/banks');
        }}
      >
        Сancel
      </Button>

      <div className='ProvingView-container'>
        {!errorMessage && (
          <>
            <div style={{ display: 'flex', alignContent: 'center' }}>
              <div className='ProvingView-text'>{status}</div>
              {showDots && (
                <>
                  <div className='ProvingView-text' style={{ visibility: dotCount > 0 ? 'visible' : 'hidden' }}>.</div>
                  <div className='ProvingView-text' style={{ visibility: dotCount > 1 ? 'visible' : 'hidden' }}>.</div>
                  <div className='ProvingView-text' style={{ visibility: dotCount > 2 ? 'visible' : 'hidden' }}>.</div>
                </>
              )}
            </div>
            {showDots && (
              <Button
                className='navigation-button'
                style={{ minWidth: 100, marginTop: 10 }}
                variant='outline-dark'
                onClick={() => {
                  ipcRenderer.send('cancel');
                  setStatus('Cancelling');
                }
                }
              >
                Cancel
              </Button>
            )}
          </>
        )}

        {showPath && (
          <>
            <div style={{ width: 600, textAlign: 'center' }}>
              Congratulations, you have created a proof of a transaction!
              This proof can be shared with anyone you want to prove that you did a certain transaction.
              Below is the information that is being shared with the other party if you chose to do so:
            </div>

            <div style={{ marginTop: 15, fontWeight: 600 }}>AES tag verification signature:</div>
            <div style={{ width: 600, overflowWrap: 'break-word', textAlign: 'center' }}>{signature}</div>

            <div style={{ marginTop: 15, fontWeight: 600 }}>Saved at:</div>
            <div>{path}</div>
            <div>Proof: proof.json</div>
            <div>Public inputs: publicInputs.json</div>
            <div>Verifying Key: verifyingKey.json</div>
            <div>Proven fragment cipher text: ciphertext.bin</div>

            <div style={{ marginTop: 15, fontWeight: 600 }}>Decoded proven cleartext:</div>
            <div style={{ width: 600, textAlign: 'center' }}>
              <i style={{ overflowWrap: 'break-word' }}>{decodedProvenCleartext}</i>
            </div>

            <div style={{ marginTop: 30 }}>The other party can run a verification to check if this proof is correct. </div>
          </>
        )}

        {errorMessage && (
          <>
            <p className='ProvingView-text' style={{ color: 'red', marginBottom: 0 }}>Error:</p>
            <p className='ProvingView-text' style={{ color: 'red' }}>{errorMessage}</p>
            <Button
              className='navigation-button'
              style={{ minWidth: 100 }}
              variant='outline-dark'
              onClick={() => navigate(-1)}
            >
              {'Return'}
            </Button>
          </>
        )}
      </div>
    </>

  );
};

export default ProvingView;
