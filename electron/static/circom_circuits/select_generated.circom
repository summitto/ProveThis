pragma circom 2.0.0;

include "split_values.circom";
// include "../node_modules/circomlib/circuits/bitify.circom";
include "bitify.circom";

// NOTE: only select2 and select4 would avoid introducing quadratic constraints as functions
template select2() {
  signal input values[2];
  signal input bits[1];
  signal output out;
  out <== (values[0] - values[1])*bits[0] + values[1];
}

template select2_static(values) {
  signal input bits[1];
  signal output out;
  out <== (values[0] - values[1])*bits[0] + values[1];
}

template select4() {
  signal input values[4];
  signal input bits[2];
  signal s[2];
  signal output out;
  component select2_0 = select2();
  component select2_1 = select2();
  component select_final = select2();

  for (var i = 0; i < 2; i++) {
    select2_0.values[i - 0] <== values[i];
  }
  for (var i = 0; i < 1; i++) {
    select2_0.bits[i] <== bits[i];
  }
  s[0] <== select2_0.out;
  for (var i = 2; i < 4; i++) {
    select2_1.values[i - 2] <== values[i];
  }
  for (var i = 0; i < 1; i++) {
    select2_1.bits[i] <== bits[i];
  }
  s[1] <== select2_1.out;
  for (var i = 0; i < 2; i++) {
    select_final.values[i] <== s[i];
  }
  select_final.bits[0] <== bits[1];
  out <== select_final.out;
}

template select4_static(values) {
  signal input bits[2];
  signal output out;

  var s0 = ((values[0] - values[1])*bits[0] + values[1]);
  var s1 = (values[2] - values[3])*bits[0] + values[3];
  out <== (s0 - s1)*bits[1] + s1;
}

template select8() {
  signal input values[8];
  signal input bits[3];
  signal s[2];
  signal output out;
  component select4_0 = select4();
  component select4_1 = select4();
  component select_final = select2();

  for (var i = 0; i < 4; i++) {
    select4_0.values[i - 0] <== values[i];
  }
  for (var i = 0; i < 2; i++) {
    select4_0.bits[i] <== bits[i];
  }
  s[0] <== select4_0.out;
  for (var i = 4; i < 8; i++) {
    select4_1.values[i - 4] <== values[i];
  }
  for (var i = 0; i < 2; i++) {
    select4_1.bits[i] <== bits[i];
  }
  s[1] <== select4_1.out;
  for (var i = 0; i < 2; i++) {
    select_final.values[i] <== s[i];
  }
  select_final.bits[0] <== bits[2];
  out <== select_final.out;
}

template select8_static(values) {
  signal input bits[3];
  signal s[2];
  signal output out;

  var splitValues[2][4] = split_values4(values);

  component select4_0 = select4_static(splitValues[0]);
  component select4_1 = select4_static(splitValues[1]);
  component select_final = select2();

  for (var i = 0; i < 2; i++) {
    select4_0.bits[i] <== bits[i];
    select4_1.bits[i] <== bits[i];
  }
  s[0] <== select4_0.out;
  s[1] <== select4_1.out;
  for (var i = 0; i < 2; i++) {
    select_final.values[i] <== s[i];
  }
  select_final.bits[0] <== bits[2];
  out <== select_final.out;
}

template select16() {
  signal input values[16];
  signal input bits[4];
  signal s[2];
  signal output out;
  component select8_0 = select8();
  component select8_1 = select8();
  component select_final = select2();

  for (var i = 0; i < 8; i++) {
    select8_0.values[i - 0] <== values[i];
  }
  for (var i = 0; i < 3; i++) {
    select8_0.bits[i] <== bits[i];
  }
  s[0] <== select8_0.out;
  for (var i = 8; i < 16; i++) {
    select8_1.values[i - 8] <== values[i];
  }
  for (var i = 0; i < 3; i++) {
    select8_1.bits[i] <== bits[i];
  }
  s[1] <== select8_1.out;
  for (var i = 0; i < 2; i++) {
    select_final.values[i] <== s[i];
  }
  select_final.bits[0] <== bits[3];
  out <== select_final.out;
}

template select16_static(values) {
  signal input bits[4];
  signal s[2];
  signal output out;

  var splitValues[2][8] = split_values8(values);

  component select8_0 = select8_static(splitValues[0]);
  component select8_1 = select8_static(splitValues[1]);
  component select_final = select2();

  for (var i = 0; i < 3; i++) {
    select8_0.bits[i] <== bits[i];
    select8_1.bits[i] <== bits[i];
  }
  s[0] <== select8_0.out;
  s[1] <== select8_1.out;
  for (var i = 0; i < 2; i++) {
    select_final.values[i] <== s[i];
  }
  select_final.bits[0] <== bits[3];
  out <== select_final.out;
}

template select32() {
  signal input values[32];
  signal input bits[5];
  signal s[2];
  signal output out;
  component select16_0 = select16();
  component select16_1 = select16();
  component select_final = select2();

  for (var i = 0; i < 16; i++) {
    select16_0.values[i - 0] <== values[i];
  }
  for (var i = 0; i < 4; i++) {
    select16_0.bits[i] <== bits[i];
  }
  s[0] <== select16_0.out;
  for (var i = 16; i < 32; i++) {
    select16_1.values[i - 16] <== values[i];
  }
  for (var i = 0; i < 4; i++) {
    select16_1.bits[i] <== bits[i];
  }
  s[1] <== select16_1.out;
  for (var i = 0; i < 2; i++) {
    select_final.values[i] <== s[i];
  }
  select_final.bits[0] <== bits[4];
  out <== select_final.out;
}

template select32_static(values) {
  signal input bits[5];
  signal s[2];
  signal output out;

  var splitValues[2][16] = split_values16(values);

  component select16_0 = select16_static(splitValues[0]);
  component select16_1 = select16_static(splitValues[1]);
  component select_final = select2();

  for (var i = 0; i < 4; i++) {
    select16_0.bits[i] <== bits[i];
  }
  s[0] <== select16_0.out;
  for (var i = 0; i < 4; i++) {
    select16_1.bits[i] <== bits[i];
  }
  s[1] <== select16_1.out;
  for (var i = 0; i < 2; i++) {
    select_final.values[i] <== s[i];
  }
  select_final.bits[0] <== bits[4];
  out <== select_final.out;
}

template select64() {
  signal input values[64];
  signal input bits[6];
  signal s[2];
  signal output out;
  component select32_0 = select32();
  component select32_1 = select32();
  component select_final = select2();

  for (var i = 0; i < 32; i++) {
    select32_0.values[i - 0] <== values[i];
  }
  for (var i = 0; i < 5; i++) {
    select32_0.bits[i] <== bits[i];
  }
  s[0] <== select32_0.out;
  for (var i = 32; i < 64; i++) {
    select32_1.values[i - 32] <== values[i];
  }
  for (var i = 0; i < 5; i++) {
    select32_1.bits[i] <== bits[i];
  }
  s[1] <== select32_1.out;
  for (var i = 0; i < 2; i++) {
    select_final.values[i] <== s[i];
  }
  select_final.bits[0] <== bits[5];
  out <== select_final.out;
}

template select128() {
  signal input values[128];
  signal input bits[7];
  signal s[2];
  signal output out;
  component select64_0 = select64();
  component select64_1 = select64();
  component select_final = select2();

  for (var i = 0; i < 64; i++) {
    select64_0.values[i - 0] <== values[i];
  }
  for (var i = 0; i < 6; i++) {
    select64_0.bits[i] <== bits[i];
  }
  s[0] <== select64_0.out;
  for (var i = 64; i < 128; i++) {
    select64_1.values[i - 64] <== values[i];
  }
  for (var i = 0; i < 6; i++) {
    select64_1.bits[i] <== bits[i];
  }
  s[1] <== select64_1.out;
  for (var i = 0; i < 2; i++) {
    select_final.values[i] <== s[i];
  }
  select_final.bits[0] <== bits[6];
  out <== select_final.out;
}

template select256() {
  signal input values[256];
  signal input bits[8];
  signal s[2];
  signal output out;
  component select128_0 = select128();
  component select128_1 = select128();
  component select_final = select2();

  for (var i = 0; i < 128; i++) {
    select128_0.values[i - 0] <== values[i];
  }
  for (var i = 0; i < 7; i++) {
    select128_0.bits[i] <== bits[i];
  }
  s[0] <== select128_0.out;
  for (var i = 128; i < 256; i++) {
    select128_1.values[i - 128] <== values[i];
  }
  for (var i = 0; i < 7; i++) {
    select128_1.bits[i] <== bits[i];
  }
  s[1] <== select128_1.out;
  for (var i = 0; i < 2; i++) {
    select_final.values[i] <== s[i];
  }
  select_final.bits[0] <== bits[7];
  out <== select_final.out;
}


template selectByte() {
  signal input byteIn;
  signal input outValues[256];
  signal bits[8];
  signal output out;
  component Num2Bits = Num2Bits(8);
  Num2Bits.in <== byteIn;
  for (var i = 0; i < 8; i++) {
    bits[i] <== Num2Bits.out[i];
  }
  component select256 = select256();
  for (var i = 0; i < 256; i++) {
    select256.values[255 - i] <== outValues[i];
  }
  for (var i = 0; i < 8; i++) {
    select256.bits[i] <== bits[i];
  }
  out <== select256.out;
}

// N: number of bits of out
template selectByteBits(N) {
  signal input bits[8];
  signal input outValues[256];
  signal output out[N];
  component select256 = select256();
  for (var i = 0; i < 256; i++) {
    select256.values[255 - i] <== outValues[i];
  }
  for (var i = 0; i < 8; i++) {
    select256.bits[i] <== bits[i];
  }
  component Num2Bits = Num2Bits(N);
  Num2Bits.in <== select256.out;
  for (var i = 0; i < N; i++) {
    out[i] <== Num2Bits.out[i];
  }
}


template selectDualbit() {
  signal input dualbitIn;
  signal input outValues[4];
  signal bits[2];
  signal output out;
  component Num2Bits = Num2Bits(2);
  Num2Bits.in <== dualbitIn;
  for (var i = 0; i < 2; i++) {
    bits[i] <== Num2Bits.out[i];
  }
  component select4 = select4();
  for (var i = 0; i < 4; i++) {
    select4.values[i] <== outValues[i];
  }
  for (var i = 0; i < 2; i++) {
    select4.bits[i] <== bits[i];
  }
  out <== select4.out;
}

template select64_static(values) {
  signal input bits[6];
  signal s[2];
  signal output out;

  var splitValues[2][32] = split_values32(values);

  component select32_0 = select32_static(splitValues[0]);
  component select32_1 = select32_static(splitValues[1]);
  component select_final = select2();

  for (var i = 0; i < 5; i++) {
    select32_0.bits[i] <== bits[i];
    select32_1.bits[i] <== bits[i];
  }
  s[0] <== select32_0.out;
  s[1] <== select32_1.out;
  for (var i = 0; i < 2; i++) {
    select_final.values[i] <== s[i];
  }
  select_final.bits[0] <== bits[5];
  out <== select_final.out;
}

