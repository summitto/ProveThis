pragma circom 2.0.0;

include "select_generated.circom";
include "rijndael_int_consts.circom";
include "rijndael_int_s_consts.circom";

template indexS() {
  signal input index;
  signal output out;
  var table[256] = generateS();
  component selectByte = selectByte();
  selectByte.byteIn <== index;
  for (var i = 0; i < 256; i++) {
    selectByte.outValues[i] <== table[i];
  }
  out <== selectByte.out;
}

template indexSBits() {
  signal input index[8];
  signal output out[8];
  var table[256] = generateS();
  component selectByte = selectByteBits(8);
  for (var i = 0; i < 8; i++) {
    selectByte.bits[7 - i] <== index[i];
  }
  for (var i = 0; i < 256; i++) {
    selectByte.outValues[i] <== table[i];
  }
  for (var i = 0; i < 8; i++) {
    out[7 - i] <== selectByte.out[i];
  }
}

template indexSi() {
  signal input index;
  signal output out;
  var table[256] = generateSi();
  component selectByte = selectByte();
  selectByte.byteIn <== index;
  for (var i = 0; i < 256; i++) {
    selectByte.outValues[i] <== table[i];
  }
  out <== selectByte.out;
}

template indexT1() {
  signal input index;
  signal output out;
  var table[256] = generateT1();
  component selectByte = selectByte();
  selectByte.byteIn <== index;
  for (var i = 0; i < 256; i++) {
    selectByte.outValues[i] <== table[i];
  }
  out <== selectByte.out;
}

template indexT1Bits() {
  signal input index[8];
  signal output out[32];
  var table[256] = generateT1();
  component selectByte = selectByteBits(32);
  for (var i = 0; i < 8; i++) {
    selectByte.bits[7 - i] <== index[i];
  }
  for (var i = 0; i < 256; i++) {
    selectByte.outValues[i] <== table[i];
  }
  for (var i = 0; i < 32; i++) {
    out[31 - i] <== selectByte.out[i];
  }
}

template indexT2() {
  signal input index;
  signal output out;
  var table[256] = generateT2();
  component selectByte = selectByte();
  selectByte.byteIn <== index;
  for (var i = 0; i < 256; i++) {
    selectByte.outValues[i] <== table[i];
  }
  out <== selectByte.out;
}

template indexT2Bits() {
  signal input index[8];
  signal output out[32];
  var table[256] = generateT2();
  component selectByte = selectByteBits(32);
  for (var i = 0; i < 8; i++) {
    selectByte.bits[7 - i] <== index[i];
  }
  for (var i = 0; i < 256; i++) {
    selectByte.outValues[i] <== table[i];
  }
  for (var i = 0; i < 32; i++) {
    out[31 - i] <== selectByte.out[i];
  }
}

template indexT3() {
  signal input index;
  signal output out;
  var table[256] = generateT3();
  component selectByte = selectByte();
  selectByte.byteIn <== index;
  for (var i = 0; i < 256; i++) {
    selectByte.outValues[i] <== table[i];
  }
  out <== selectByte.out;
}

template indexT3Bits() {
  signal input index[8];
  signal output out[32];
  var table[256] = generateT3();
  component selectByte = selectByteBits(32);
  for (var i = 0; i < 8; i++) {
    selectByte.bits[7 - i] <== index[i];
  }
  for (var i = 0; i < 256; i++) {
    selectByte.outValues[i] <== table[i];
  }
  for (var i = 0; i < 32; i++) {
    out[31 - i] <== selectByte.out[i];
  }
}

template indexT4() {
  signal input index;
  signal output out;
  var table[256] = generateT4();
  component selectByte = selectByte();
  selectByte.byteIn <== index;
  for (var i = 0; i < 256; i++) {
    selectByte.outValues[i] <== table[i];
  }
  out <== selectByte.out;
}

template indexT4Bits() {
  signal input index[8];
  signal output out[32];
  var table[256] = generateT4();
  component selectByte = selectByteBits(32);
  for (var i = 0; i < 8; i++) {
    selectByte.bits[7 - i] <== index[i];
  }
  for (var i = 0; i < 256; i++) {
    selectByte.outValues[i] <== table[i];
  }
  for (var i = 0; i < 32; i++) {
    out[31 - i] <== selectByte.out[i];
  }
}

template indexT5() {
  signal input index;
  signal output out;
  var table[256] = generateT5();
  component selectByte = selectByte();
  selectByte.byteIn <== index;
  for (var i = 0; i < 256; i++) {
    selectByte.outValues[i] <== table[i];
  }
  out <== selectByte.out;
}

template indexT6() {
  signal input index;
  signal output out;
  var table[256] = generateT6();
  component selectByte = selectByte();
  selectByte.byteIn <== index;
  for (var i = 0; i < 256; i++) {
    selectByte.outValues[i] <== table[i];
  }
  out <== selectByte.out;
}

template indexT7() {
  signal input index;
  signal output out;
  var table[256] = generateT7();
  component selectByte = selectByte();
  selectByte.byteIn <== index;
  for (var i = 0; i < 256; i++) {
    selectByte.outValues[i] <== table[i];
  }
  out <== selectByte.out;
}

template indexT8() {
  signal input index;
  signal output out;
  var table[256] = generateT8();
  component selectByte = selectByte();
  selectByte.byteIn <== index;
  for (var i = 0; i < 256; i++) {
    selectByte.outValues[i] <== table[i];
  }
  out <== selectByte.out;
}

template indexU1() {
  signal input index;
  signal output out;
  var table[256] = generateU1();
  component selectByte = selectByte();
  selectByte.byteIn <== index;
  for (var i = 0; i < 256; i++) {
    selectByte.outValues[i] <== table[i];
  }
  out <== selectByte.out;
}

template indexU2() {
  signal input index;
  signal output out;
  var table[256] = generateU1();
  component selectByte = selectByte();
  selectByte.byteIn <== index;
  for (var i = 0; i < 256; i++) {
    selectByte.outValues[i] <== table[i];
  }
  out <== selectByte.out;
}

template indexU3() {
  signal input index;
  signal output out;
  var table[256] = generateU3();
  component selectByte = selectByte();
  selectByte.byteIn <== index;
  for (var i = 0; i < 256; i++) {
    selectByte.outValues[i] <== table[i];
  }
  out <== selectByte.out;
}

template indexU4() {
  signal input index;
  signal output out;
  var table[256] = generateU4();
  component selectByte = selectByte();
  selectByte.byteIn <== index;
  for (var i = 0; i < 256; i++) {
    selectByte.outValues[i] <== table[i];
  }
  out <== selectByte.out;
}

template indexCustom() {
  signal input index;
  signal input table[256];
  signal output out;

  component selectByte = selectByte();
  selectByte.byteIn <== index;
  for (var i = 0; i < 256; i++) {
    selectByte.outValues[i] <== table[i];
  }
  out <== selectByte.out;
}

template indexCustomDualbit() {
  signal input index;
  signal input table[4];
  signal output out;

  component selectDualbit = selectDualbit();
  selectDualbit.dualbitIn <== index;
  for (var i = 0; i < 4; i++) {
    selectDualbit.outValues[i] <== table[i];
  }
  out <== selectDualbit.out;
}

