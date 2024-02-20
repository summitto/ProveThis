import { EnvironmentInfo } from './environment';

export default runNotarize;

export type NotarizationSessionOptions = {
  maxFragmentLength?: 512|1024|2048|4096
  // can be set to false during debugging to be able to work with self-signed certs
  mustVerifyCert: boolean
}

export type NotarySettings = {
  notaryIP: string
  notaryPort: number
  otPort: number
  sessionOptions: NotarizationSessionOptions
  // if useNotaryNoSandbox is set to true, then we fetch notary's pubkey by
  // querying /getPubKey and trust it. This is only useful when notary runs
  // in a non-sandbox environment.
  useNotaryNoSandbox: boolean
}

export type NotarizationResult = {
  host: string
  request: string
  response: string
  timestamp: number
  plaintext: Uint8Array[]
  ciphertext: Uint8Array[]
  inputsList: string[]
  tagIvList: string[]
  aadList: string[]
  notaryServerWriteKeyShare: string
  clientServerWriteKeyShare: string
  notarizationDocument: object
  mpcId: string
  clientSivShare: Uint8Array
  records: Uint8Array[]
}

declare function runNotarize(env: EnvironmentInfo, notary: NotarySettings, server: string, headers: string): Promise<NotarizationResult>;
