pragma circom 2.0.0;

// include "../node_modules/circomlib/circuits/gates.circom";
// include "../node_modules/circomlib/circuits/bitify.circom";
include "gates.circom";
include "bitify.circom";

template byteMultiAND(comparison) {
  signal input in0;
  signal output out;
  var in1 = comparison;

  // TODO: when should Strict Num2Bits conversion be used?
  component Num2Bits0 = Num2Bits(8);
  component Num2Bits1 = Num2Bits(8);
  component Bits2Num = Bits2Num(8);
  component AND[8];

  Num2Bits0.in <== in0;
  Num2Bits1.in <== in1;
  for (var i = 0; i < 8; i++) {
    AND[i] = AND();
    AND[i].a <== Num2Bits0.out[i];
    AND[i].b <== Num2Bits1.out[i];
    Bits2Num.in[i] <== AND[i].out;
  }

  out <== Bits2Num.out;
}

template byteMultiANDBits(comparison) {
  signal input in0[8];
  signal output out[8];
  var in1[8] = comparison;

  component AND[8];

  for (var i = 0; i < 8; i++) {
    AND[i] = AND();
    AND[i].a <== in0[i];
    AND[i].b <== in1[i];
    out[i] <== AND[i].out;
  }
}

