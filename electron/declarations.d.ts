/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */

declare module 'snarkjs' {
  export const __esModule: boolean;
  export const groth16: Readonly<{
    __proto__: any
    prove: typeof groth16Prove
    verify: typeof groth16Verify
  }>;
  declare const zKey: Readonly<{
    __proto__: any
    newZKey: typeof newZKey
    exportVerificationKey: typeof zkeyExportVerificationKey
  }>;

  function groth16Prove(zkeyFileName: string, witnessFileName: string, logger: any): Promise<{
    proof: object
    publicSignals: string[]
  }>;
  function groth16Verify(_vk_verifier: object, _publicSignals: object, _proof: object, logger: any): Promise<boolean>;
  function newZKey(r1csName: string, ptauName: string, zkeyOutputPath: string, logger: any): Promise<Uint8Array>;
  function zkeyExportVerificationKey(zkeyName: string, logger: any): Promise<object>;
}

declare module 'ffjavascript' {
  export const __esModule: boolean;
  export class BigBuffer {
    constructor(size: any);

    buffers: Uint8Array[];

    byteLength: any;

    slice(fr: any, to: any): Uint8Array | BigBuffer;

    set(buff: any, offset: any): void;
  }
  export class ChaCha {
    constructor(seed: any);

    state: any[];

    idx: number;

    buff: any[];

    nextU32(): any;

    nextU64(): bigint;

    nextBool(): boolean;

    update(): void;
  }
  export class EC {
    constructor(F: any, g: any);

    F: any;

    g: any;

    zero: any[];

    add(p1: any, p2: any): any;

    neg(p: any): any[];

    sub(a: any, b: any): any;

    double(p: any): any;

    timesScalar(base: any, e: any): any;

    mulScalar(base: any, e: any): any;

    affine(p: any): any;

    multiAffine(arr: any): void;

    eq(p1: any, p2: any): any;

    isZero(p: any): any;

    toString(p: any): string;

    fromRng(rng: any): any;

    toRprLE(buff: any, o: any, p: any): void;

    toRprBE(buff: any, o: any, p: any): void;

    toRprLEM(buff: any, o: any, p: any): void;

    toRprLEJM(buff: any, o: any, p: any): void;

    toRprBEM(buff: any, o: any, p: any): void;

    fromRprLE(buff: any, o: any): any[];

    fromRprBE(buff: any, o: any): any[];

    fromRprLEM(buff: any, o: any): any[];

    fromRprLEJM(buff: any, o: any): any[];

    fromRprBEM(buff: any, o: any): any[];

    fromRprCompressed(buff: any, o: any): any[];

    toRprCompressed(buff: any, o: any, p: any): void;

    fromRprUncompressed(buff: any, o: any): any[];

    toRprUncompressed(buff: any, o: any, p: any): void;
  }
  export class ZqField {
    constructor(p: any);

    type: string;

    one: bigint;

    zero: bigint;

    p: bigint;

    m: number;

    negone: bigint;

    two: bigint;

    half: bigint;

    bitLength: number;

    mask: bigint;

    n64: number;

    n32: number;

    n8: number;

    R: bigint;

    Ri: bigint;

    nqr: bigint;

    s: number;

    t: bigint;

    nqr_to_t: any;

    FFT: FFT;

    fft(a: any): any;

    ifft(a: any): any;

    w: any[];

    wi: any[];

    shift: any;

    k: any;

    e(a: any, b: any): bigint;

    add(a: any, b: any): any;

    sub(a: any, b: any): any;

    neg(a: any): any;

    mul(a: any, b: any): any;

    mulScalar(base: any, s: any): bigint;

    square(a: any): any;

    eq(a: any, b: any): boolean;

    neq(a: any, b: any): boolean;

    lt(a: any, b: any): boolean;

    gt(a: any, b: any): boolean;

    leq(a: any, b: any): boolean;

    geq(a: any, b: any): boolean;

    div(a: any, b: any): any;

    idiv(a: any, b: any): number;

    inv(a: any): bigint;

    mod(a: any, b: any): number;

    pow(b: any, e: any): any;

    exp(b: any, e: any): any;

    band(a: any, b: any): any;

    bor(a: any, b: any): any;

    bxor(a: any, b: any): any;

    bnot(a: any): bigint;

    shl(a: any, b: any): any;

    shr(a: any, b: any): number | bigint;

    land(a: any, b: any): bigint;

    lor(a: any, b: any): bigint;

    lnot(a: any): bigint;

    sqrt_old(n: any): any;

    normalize(a: any, b: any): any;

    random(): bigint;

    toString(a: any, base: any): any;

    isZero(a: any): boolean;

    fromRng(rng: any): bigint;

    toRprLE(buff: any, o: any, e: any): void;

    toRprBE(buff: any, o: any, e: any): void;

    toRprBEM(buff: any, o: any, e: any): void;

    toRprLEM(buff: any, o: any, e: any): void;

    fromRprLE(buff: any, o: any): bigint;

    fromRprBE(buff: any, o: any): bigint;

    fromRprLEM(buff: any, o: any): any;

    fromRprBEM(buff: any, o: any): any;

    toObject(a: any): any;
  }
  export class F2Field {
    constructor(F: any, nonResidue: any);

    type: string;

    F: any;

    zero: any[];

    one: any[];

    negone: any[];

    nonResidue: any;

    m: number;

    p: any;

    n64: number;

    n32: number;

    n8: number;

    _mulByNonResidue(a: any): any;

    copy(a: any): any[];

    add(a: any, b: any): any[];

    double(a: any): any[];

    sub(a: any, b: any): any[];

    neg(a: any): any[];

    conjugate(a: any): any[];

    mul(a: any, b: any): any[];

    inv(a: any): any[];

    div(a: any, b: any): any[];

    square(a: any): any[];

    isZero(a: any): any;

    eq(a: any, b: any): any;

    mulScalar(base: any, e: any): any;

    pow(base: any, e: any): any;

    exp(base: any, e: any): any;

    toString(a: any): string;

    fromRng(rng: any): any[];

    gt(a: any, b: any): boolean;

    geq(a: any, b: any): any;

    lt(a: any, b: any): boolean;

    leq(a: any, b: any): boolean;

    neq(a: any, b: any): boolean;

    random(): any[];

    toRprLE(buff: any, o: any, e: any): void;

    toRprBE(buff: any, o: any, e: any): void;

    toRprLEM(buff: any, o: any, e: any): void;

    toRprBEM(buff: any, o: any, e: any): void;

    fromRprLE(buff: any, o: any): any[];

    fromRprBE(buff: any, o: any): any[];

    fromRprLEM(buff: any, o: any): any[];

    fromRprBEM(buff: any, o: any): any[];

    toObject(a: any): any;
  }
  export class F3Field {
    constructor(F: any, nonResidue: any);

    type: string;

    F: any;

    zero: any[];

    one: any[];

    negone: any[];

    nonResidue: any;

    m: number;

    p: any;

    n64: number;

    n32: number;

    n8: number;

    _mulByNonResidue(a: any): any;

    copy(a: any): any[];

    add(a: any, b: any): any[];

    double(a: any): any[];

    sub(a: any, b: any): any[];

    neg(a: any): any[];

    mul(a: any, b: any): any[];

    inv(a: any): any[];

    div(a: any, b: any): any[];

    square(a: any): any[];

    isZero(a: any): any;

    eq(a: any, b: any): any;

    affine(a: any): any[];

    mulScalar(base: any, e: any): any;

    pow(base: any, e: any): any;

    exp(base: any, e: any): any;

    toString(a: any): string;

    fromRng(rng: any): any[];

    gt(a: any, b: any): boolean;

    geq(a: any, b: any): any;

    lt(a: any, b: any): boolean;

    leq(a: any, b: any): boolean;

    neq(a: any, b: any): boolean;

    random(): any[];

    toRprLE(buff: any, o: any, e: any): void;

    toRprBE(buff: any, o: any, e: any): void;

    toRprLEM(buff: any, o: any, e: any): void;

    toRprBEM(buff: any, o: any, e: any): void;

    fromRprLE(buff: any, o: any): any[];

    fromRprBE(buff: any, o: any): any[];

    fromRprLEM(buff: any, o: any): any[];

    fromRprBEM(buff: any, o: any): any[];

    toObject(a: any): any;
  }
  export class PolField {
    constructor(F: any);

    F: any;

    w: any[];

    wi: any[];

    roots: any[];

    _setRoots(n: any): void;

    add(a: any, b: any): any;

    double(a: any): any;

    sub(a: any, b: any): any;

    mulScalar(p: any, b: any): any;

    mul(a: any, b: any): any;

    mulNormal(a: any, b: any): any;

    mulFFT(a: any, b: any): any;

    square(a: any): any;

    scaleX(p: any, n: any): any;

    eval2(p: any, x: any): any;

    eval(p: any, x: any): any;

    lagrange(points: any): any;

    fft(p: any): any;

    fft2(p: any): any;

    ifft(p: any): any;

    ifft2(p: any): any;

    _fft(pall: any, bits: any, offset: any, step: any): any[];

    extend(p: any, e: any): any;

    reduce(p: any): any;

    eq(a: any, b: any): boolean;

    ruffini(p: any, r: any): any[];

    _next2Power(v: any): any;

    toString(p: any): string;

    normalize(p: any): any[];

    _reciprocal(p: any, bits: any): any;

    _div2(m: any, v: any): any;

    div(_u: any, _v: any): any;

    oneRoot(n: any, i: any): any;

    computeVanishingPolinomial(bits: any, t: any): any;

    evaluateLagrangePolynomials(bits: any, t: any): any[];

    log2(V: any): number;
  }
  export const Scalar: Readonly<{
    __proto__: any
    fromString: typeof fromString
    e: typeof fromString
    fromArray: typeof fromArray
    bitLength: typeof bitLength
    isNegative: typeof isNegative
    isZero: typeof isZero
    shiftLeft: typeof shiftLeft
    shiftRight: typeof shiftRight
    shl: typeof shiftLeft
    shr: typeof shiftRight
    isOdd: typeof isOdd
    naf: typeof naf
    bits: typeof bits
    toNumber: typeof toNumber
    toArray: typeof toArray
    add: typeof add
    sub: typeof sub
    neg: typeof neg
    mul: typeof mul
    square: typeof square
    pow: typeof pow
    exp: typeof exp$1
    abs: typeof abs
    div: typeof div
    mod: typeof mod
    eq: typeof eq
    neq: typeof neq
    lt: typeof lt
    gt: typeof gt
    leq: typeof leq
    geq: typeof geq
    band: typeof band
    bor: typeof bor
    bxor: typeof bxor
    land: typeof land
    lor: typeof lor
    lnot: typeof lnot
    toRprLE: typeof toRprLE
    toRprBE: typeof toRprBE
    fromRprLE: typeof fromRprLE
    fromRprBE: typeof fromRprBE
    toString: typeof toString
    toLEBuff: typeof toLEBuff
    zero: bigint
    one: bigint
  }>;
  export function buildBls12381(singleThread: any, plugins: any): Promise<any>;
  export function buildBn128(singleThread: any, plugins: any): Promise<any>;
  export function getCurveFromName(name: any, singleThread: any, plugins: any): Promise<any>;
  export function getCurveFromQ(q: any, singleThread: any, plugins: any): Promise<any>;
  export function getCurveFromR(r: any, singleThread: any, plugins: any): Promise<any>;
  export const utils: Readonly<{
    __proto__: any
    stringifyBigInts: typeof stringifyBigInts
    unstringifyBigInts: typeof unstringifyBigInts
    beBuff2int: typeof beBuff2int
    beInt2Buff: typeof beInt2Buff
    leBuff2int: typeof leBuff2int
    leInt2Buff: typeof leInt2Buff
    stringifyFElements: typeof stringifyFElements
    unstringifyFElements: typeof unstringifyFElements
    bitReverse: typeof bitReverse
    log2: typeof log2
    buffReverseBits: typeof buffReverseBits
    array2buffer: typeof array2buffer
    buffer2array: typeof buffer2array
  }>;
  declare class FFT {
    constructor(G: any, F: any, opMulGF: any);

    F: any;

    G: any;

    opMulGF: any;

    w: any[];

    wi: any[];

    roots: any[];

    _setRoots(n: any): void;

    fft(p: any): any;

    ifft(p: any): any;
  }
  declare function fromString(s: any, radix: any): bigint;
  declare function fromArray(a: any, radix: any): bigint;
  declare function bitLength(a: any): number;
  declare function isNegative(a: any): boolean;
  declare function isZero(a: any): boolean;
  declare function shiftLeft(a: any, n: any): bigint;
  declare function shiftRight(a: any, n: any): bigint;
  declare function isOdd(a: any): boolean;
  declare function naf(n: any): number[];
  declare function bits(n: any): number[];
  declare function toNumber(s: any): number;
  declare function toArray(s: any, radix: any): number[];
  declare function add(a: any, b: any): bigint;
  declare function sub(a: any, b: any): bigint;
  declare function neg(a: any): bigint;
  declare function mul(a: any, b: any): bigint;
  declare function square(a: any): bigint;
  declare function pow(a: any, b: any): bigint;
  declare function exp$1(a: any, b: any): bigint;
  declare function abs(a: any): bigint;
  declare function div(a: any, b: any): bigint;
  declare function mod(a: any, b: any): bigint;
  declare function eq(a: any, b: any): boolean;
  declare function neq(a: any, b: any): boolean;
  declare function lt(a: any, b: any): boolean;
  declare function gt(a: any, b: any): boolean;
  declare function leq(a: any, b: any): boolean;
  declare function geq(a: any, b: any): boolean;
  declare function band(a: any, b: any): bigint;
  declare function bor(a: any, b: any): bigint;
  declare function bxor(a: any, b: any): bigint;
  declare function land(a: any, b: any): bigint;
  declare function lor(a: any, b: any): bigint;
  declare function lnot(a: any): boolean;
  declare function toRprLE(buff: any, o: any, e: any, n8: any): void;
  declare function toRprBE(buff: any, o: any, e: any, n8: any): void;
  declare function fromRprLE(buff: any, o: any, n8: any): bigint;
  declare function fromRprBE(buff: any, o: any, n8: any): bigint;
  declare function toString(a: any, radix: any): any;
  declare function toLEBuff(a: any): Uint8Array;
  declare function stringifyBigInts(o: any): any;
  declare function unstringifyBigInts(o: any): any;
  declare function beBuff2int(buff: any): bigint;
  declare function beInt2Buff(n: any, len: any): Uint8Array;
  declare function leBuff2int(buff: any): bigint;
  declare function leInt2Buff(n: any, len: any): Uint8Array;
  declare function stringifyFElements(F: any, o: any): any;
  declare function unstringifyFElements(F: any, o: any): any;
  declare function bitReverse(idx: any, bits: any): number;
  declare function log2(V: any): number;
  declare function buffReverseBits(buff: any, eSize: any): void;
  declare function array2buffer(arr: any, sG: any): Uint8Array;
  declare function buffer2array(buff: any, sG: any): any[];
  export { ZqField as F1Field };
}

declare module 'bfj' {
  export function write(path: any, data: any, options?: { space: number }): Promise<void>;
}
