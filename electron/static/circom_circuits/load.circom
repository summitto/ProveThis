pragma circom 2.0.0;

// Because circom doesn't like generating constraints about bit shifting signals
// It took an approach similar to: https://github.com/iden3/circomlib/blob/master/circuits/bitify.circom
// Function naming is from https://nacl.cr.yp.to/install.html:crypto_stream/aes128ctr/portable/common.c
// TODO: prevent wrapping around. For example, circomlib includes a check "out[i] * (out[i] -1 ) === 0;"
template load_bigendian(size) {
  signal input value[size];
  signal output loadedValue;

  var result = value[size - 1];
  for (var i = 1; i < size; i++) {
    result += value[size - 1 - i] * (256 ** i);
  }
  loadedValue <== result;
}
