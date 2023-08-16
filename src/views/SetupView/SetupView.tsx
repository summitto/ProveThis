import { useEffect, useState } from 'react';

import { Button, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { IpcRenderer } from 'electron';

import './SetupView.css';

const { ipcRenderer }: { ipcRenderer: IpcRenderer} = window.require('electron');

type SetupIpcMessage = {
  error?: string
  success?: boolean
}

const SetupView = () => {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [dotCount, setDotCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const [isStartup, setIsStartup] = useState(true);

  const [pythonPath, setPythonPath] = useState('python3');
  const [circomPath, setCircomPath] = useState('circom');

  const setupProver = () => {
    setIsLoading(true);
    setErrorMessage('');

    ipcRenderer.send('setupProver', pythonPath, circomPath);
  };

  useEffect(() => {
    setupProver();

    ipcRenderer.on('proverSetup', (_, args: SetupIpcMessage) => {
      setIsLoading(false);
      setIsStartup(false);

      if (args.error) {
        setErrorMessage(args.error);
        return;
      }

      if (args.success) {
        navigate('/banks');
      }
    });

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
    <div className='SetupView-container'>

      {!isStartup && (
        <div
          style={{ width: 380 }}
        >
          <p style={{ fontWeight: 600 }}>Enter paths for required tools</p>

          {isLoading && (
            <div style={{ display: 'flex', alignContent: 'center' }}>
              <div>Checking tools</div>
              <div style={{ visibility: dotCount > 0 ? 'visible' : 'hidden' }}>.</div>
              <div style={{ visibility: dotCount > 1 ? 'visible' : 'hidden' }}>.</div>
              <div style={{ visibility: dotCount > 2 ? 'visible' : 'hidden' }}>.</div>
            </ div>
          )}

          {errorMessage && (
            <>
              <p style={{ color: 'red', marginBottom: 0 }}>Error:</p>
              <p style={{ color: 'red' }}>{errorMessage}</p>
            </>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Python path:</Form.Label>
            <Form.Control
              value={pythonPath}
              onChange={(e) => setPythonPath(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Circom path:</Form.Label>
            <Form.Control
              value={circomPath}
              onChange={(e) => setCircomPath(e.target.value)}
            />
          </Form.Group>

          <Button
            disabled={isLoading}
            style={{ marginLeft: 'auto', marginRight: 0, display: 'block' }}
            onClick={() => setupProver()}
          >
            Save
          </Button>
        </ div>
      )}
    </div>
  );
};

export default SetupView;
