import { Worker } from 'worker_threads';

/* eslint-disable @typescript-eslint/no-empty-function */

class mWorker extends Worker {
  constructor(/** @type {string} */ url) {
    super(url);
    this.onmessage = () => {};
    this.on('message', (msg) => {
      this.onmessage(msg);
    });
  }
}

export default mWorker;
