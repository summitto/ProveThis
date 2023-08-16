/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-this-alias */

import net from 'net';

import { Socket } from './pagesigner/core/Socket';

class SocketNode extends Socket {
  constructor(server, port) {
    super(server, port);
    this.sock = new net.Socket();
    const that = this;
    this.sock.on('data', (d) => {
      that.buffer = Buffer.concat([that.buffer, d]);
    });
  }

  async connect() {
    await this.sock.connect(this.port, this.name);
    setTimeout(function () {
      if (!this.wasClosed) this.close();
    }, this.lifeTime);
    return 'ready';
  }

  async send(d) {
    const data = Buffer.from(d);
    this.sock.write(data);
  }

  async close() {
    this.sock.destroy();
  }
}

export default SocketNode;
