pragma circom 2.0.0;

include "xor_n.circom";
// include "../node_modules/circomlib/circuits/bitify.circom";
include "bitify.circom";

// NOTE: we could potentially make a more efficient implementation by directly doing the right computation on the individual bits, see xor3 from circomlib
// TODO: better name proposal, use 'iterated' or 'sequential' (versus the other created parallel implementation
template byte_xor(N) {
  signal input input_bytes[N];
  signal xor_results[N][8];
  signal output out;

  component Num2Bits[N];
  component xor_bits[N - 1];
  component Bits2Num = Bits2Num(8);

  // TODO: instead of ifstatement, just do the first operations before the forloop
  for (var i = 0; i < N; i++) {
    Num2Bits[i] = Num2Bits(8);
    Num2Bits[i].in <== input_bytes[i];
    if (i == 0) {
      for (var j = 0; j < 8; j++) {
        xor_results[0][j] <== Num2Bits[i].out[j];
      }
    // from the second byte onwards, we can start XORing
    } else {
      xor_bits[i - 1] = XOR_N(8);
      for (var j = 0; j < 8; j++) {
        xor_bits[i - 1].a[j] <== xor_results[i - 1][j];
        xor_bits[i - 1].b[j] <== Num2Bits[i].out[j];
      }
      for (var j = 0; j < 8; j++) {
          xor_results[i][j] <== xor_bits[i - 1].out[j];
      }
    }
  }

  for (var i = 0; i < 8; i++) {
    Bits2Num.in[i] <== xor_results[N - 1][i];
  }
  out <== Bits2Num.out;
}
