pragma circom 2.0.0;

include "store.circom";
include "byte_xor_parallel.circom";
include "select_aes.circom";

template store_transformT_xor() {
  signal input value[4];
  signal output xoredValue;

  // NOTE: circom can't put different templates in an array of components, so we just define each index* component separately
  component store_bigendian[4];

  component indexT1 = indexT1();
  component indexT2 = indexT2();
  component indexT3 = indexT3();
  component indexT4 = indexT4();
  component byte_xor_parallel = byte_xor_parallel(4, 4);

  for (var i = 0; i < 4; i++) {
    store_bigendian[3 - i] = store_bigendian_var(4,3 - i); 
    store_bigendian[3 - i].value <== value[i];
  }

  indexT1.index <== store_bigendian[3].storedValue;
  byte_xor_parallel.in[0] <== indexT1.out;
  indexT2.index <== store_bigendian[2].storedValue;
  byte_xor_parallel.in[1] <== indexT2.out;
  indexT3.index <== store_bigendian[1].storedValue;
  byte_xor_parallel.in[2] <== indexT3.out;
  indexT4.index <== store_bigendian[0].storedValue;
  byte_xor_parallel.in[3] <== indexT4.out;
  
  xoredValue <== byte_xor_parallel.out;
}

template transformT_xor() {
  signal input value[4][32];
  signal output xoredValue[32];

  // NOTE: circom can't put different templates in an array of components, so we just define each index* component separately
  component indexT1 = indexT1Bits();
  component indexT2 = indexT2Bits();
  component indexT3 = indexT3Bits();
  component indexT4 = indexT4Bits();
  component byte_xor_parallel = byte_xor_parallel_bits(4, 4);

  for (var i = 0; i < 8; i++) {
    indexT1.index[i] <== value[0][i];
    indexT2.index[i] <== value[1][8 + i];
    indexT3.index[i] <== value[2][16 + i];
    indexT4.index[i] <== value[3][24 + i];
  }

  for (var i = 0; i < 32; i++) {
    byte_xor_parallel.in[0][i] <== indexT1.out[i];
    byte_xor_parallel.in[1][i] <== indexT2.out[i];
    byte_xor_parallel.in[2][i] <== indexT3.out[i];
    byte_xor_parallel.in[3][i] <== indexT4.out[i];
  }
  for (var i = 0; i < 32; i++) {
    xoredValue[i] <== byte_xor_parallel.out[i];
  }
}

