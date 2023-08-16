pragma circom 2.0.0;

include "xor_n.circom";
include "select_generated.circom";
// include "../node_modules/circomlib/circuits/bitify.circom";
include "bitify.circom";

// in: input values
// out: bitwise xor'ed input values: in[0] ^ ... ^ in[N]
// N: number of input values
// M: number of bytes which each input value contains
template byte_xor_parallel(N, M) {
  signal input in[N];
  signal xor_results[N][8*M];
  signal output out;

  component Num2Bits[N];
  component xor_bits[N - 1];
  component Bits2Num = Bits2Num(8*M);

  for (var i = 0; i < N; i++) {
    Num2Bits[i] = Num2Bits(8*M);
    Num2Bits[i].in <== in[i];
  }

  for (var j = 0; j < 8*M; j++) {
    xor_results[0][j] <== Num2Bits[0].out[j];
  }

  // from the second value onwards, we can start XORing
  for (var i = 1; i < N; i++) {
    xor_bits[i - 1] = XOR_N(8*M);
    for (var j = 0; j < 8*M; j++) {
      xor_bits[i - 1].a[j] <== xor_results[i - 1][j];
      xor_bits[i - 1].b[j] <== Num2Bits[i].out[j];
    }
    for (var j = 0; j < 8*M; j++) {
        xor_results[i][j] <== xor_bits[i - 1].out[j];
    }
  }

  for (var j = 0; j < 8*M; j++) {
    Bits2Num.in[j] <== xor_results[N - 1][j];
  }
  out <== Bits2Num.out;
}

// Bits2Num only costs 185 plonk constraints, so the majority of the ~1000 constraints must in the XOR / select function
// I went down only ~190 constraints by using select instead of xor
// I don't think a further optimization is possible using lookup tables for byte_xor of this size
template byte_xor_2_parallel() {
  var N = 2;
  var M = 4;
  signal input in[N];
  signal output out;

  component Num2Bits[N];
  component Bits2Num = Bits2Num(8*M);

  for (var i = 0; i < N; i++) {
    Num2Bits[i] = Num2Bits(8*M);
    Num2Bits[i].in <== in[i];
  }

  // See scripts/xor_truth_table.py
  var values[4] = [0, 1, 1, 0];

  component select[8*M];
  for (var i = 0; i < 8*M; i++) {
    select[i] = select4_static(values);
    for (var j = 0; j < N; j++) {
      select[i].bits[j] <== Num2Bits[j].out[i];
    }
    Bits2Num.in[i] <== select[i].out;
  }

  out <== Bits2Num.out;
}

// idea: is there a way to create a table taking 6 8*M sized inputs, and returning 1 8*M sized output? I don't think so, because all inputs are used in the XOR operation to select...
template byte_xor_6_parallel() {
  var N = 6;
  var M = 4;
  signal input in[N];
  signal output out;

  component Num2Bits[N];
  component Bits2Num = Bits2Num(8*M);

  for (var i = 0; i < N; i++) {
    Num2Bits[i] = Num2Bits(8*M);
    Num2Bits[i].in <== in[i];
  }

  // See scripts/xor_truth_table.py
  var values[64] = [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0];

  component select[8*M];
  for (var i = 0; i < 8*M; i++) {
    select[i] = select64_static(values);
    for (var j = 0; j < N; j++) {
      select[i].bits[j] <== Num2Bits[j].out[i];
    }
    Bits2Num.in[i] <== select[i].out;
  }

  out <== Bits2Num.out;
}

// in: arrays of bits
// out: bitwise xor'ed input values: in[0] ^ ... ^ in[N]
// N: number of input values
// M: number of bytes which each input value contains
template byte_xor_parallel_bits(N, M) {
  signal input in[N][8*M];
  signal xor_results[N][8*M];
  signal output out[8*M];

  component xor_bits[N - 1];

  for (var j = 0; j < 8*M; j++) {
    xor_results[0][j] <== in[0][j];
  }

  // from the second value onwards, we can start XORing
  for (var i = 1; i < N; i++) {
    xor_bits[i - 1] = XOR_N(8*M);
    for (var j = 0; j < 8*M; j++) {
      xor_bits[i - 1].a[j] <== xor_results[i - 1][j];
      xor_bits[i - 1].b[j] <== in[i][j];
    }
    for (var j = 0; j < 8*M; j++) {
        xor_results[i][j] <== xor_bits[i - 1].out[j];
    }
  }

  for (var j = 0; j < 8*M; j++) {
    out[j] <== xor_results[N - 1][j];
  }
}


