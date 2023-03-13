pragma circom 2.0.0;

include "load.circom";
include "store.circom";
include "byte_xor_parallel.circom";
include "select_aes.circom";

template store_transformU_xor() {
  signal input value;
  signal transformedValues[4];
  signal output xoredValue;

  // NOTE: circom doesn't like it when you potentially put different templates in a component, so just define them all separately here
  component store_bigendian = store_bigendian(4);
  store_bigendian.value <== value;

  component indexU1 = indexU1();
  component indexU2 = indexU2();
  component indexU3 = indexU3();
  component indexU4 = indexU3();

  indexU1.index <== store_bigendian.storedValue[0];
  transformedValues[0] <== indexU1.out;
  indexU2.index <== store_bigendian.storedValue[1];
  transformedValues[1] <== indexU2.out;
  indexU3.index <== store_bigendian.storedValue[2];
  transformedValues[2] <== indexU3.out;
  indexU4.index <== store_bigendian.storedValue[3];
  transformedValues[3] <== indexU4.out;

  component byte_xor_parallel = byte_xor_parallel(4, 4);
  for (var i = 0; i < 4; i++) {
    byte_xor_parallel.in[i] <== transformedValues[i];
  }
  xoredValue <== byte_xor_parallel.out[i];
}
