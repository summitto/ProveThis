/* eslint-disable no-underscore-dangle */

export default builder;

declare function builder(code: string|Buffer, options?: object): Promise<WitnessCalculator>;

declare class WitnessCalculator {
  constructor(instance: WebAssembly.Instance, sanityCheck: boolean);

  calculateWTNSBin(input: object, sanityCheck: boolean): Promise<Uint8Array>;
}
