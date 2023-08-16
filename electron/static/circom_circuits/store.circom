pragma circom 2.0.0;

/* include "byteMultiAND.circom"; */
// include "../node_modules/circomlib/circuits/bitify.circom";
include "bitify.circom";

// Because circom doesn't like generating constraints about bit shifting signals
// It took an approach similar to: https://github.com/iden3/circomlib/blob/master/circuits/bitify.circom
// Function naming is from https://nacl.cr.yp.to/install.html:crypto_stream/aes128ctr/portable/common.c
// TODO: prevent wrapping around? For example, circomlib includes a check "out[i] * (out[i] -1 ) === 0;"
template store_bigendian(size) {
  signal input value;
  signal output storedValue[size];

  assert(value < 2**(8*size)); // The equality check at the end of the template will only work if the value fits in the expected number of slots

  storedValue[0] <-- value & 255;
  var lc1 = storedValue[0];
  var e2 = 256;
  for (var i = 1; i < size; i++) {
    storedValue[i] <-- (value >> 8*i) & 255;
    lc1 += storedValue[i] * e2;
    e2 *= 256;
  }
  lc1 === value;
}

// TODO: consider renaming this to shift, and checking speed to potentially use it for store(...) as well
template store_bigendian_var(size, returnIndex) {
  signal input value;
  signal output storedValue;

  assert(returnIndex < size);
  assert(value < 2**(8*size)); // The equality check at the end of the template will only work if the value fits in the expected number of slots

  component Num2Bits = Num2Bits(8*size);
  component Bits2Num = Bits2Num(8);
  Num2Bits.in <== value;

  for (var i = 0; i < 8; i++) {
    Bits2Num.in[i] <== Num2Bits.out[8*returnIndex + i];
  }
  storedValue <== Bits2Num.out;
}

// This turns out to require a lot more constraints than store_bigendian
template store_bigendian_slow(size) {
  signal input value;
  signal output storedValue[size];

  component Num2Bits = Num2Bits(8*size);
  component Bits2Num[4];
  Num2Bits.in <== value;

  for (var i = 0; i < 4; i++) {
    Bits2Num[i] = Bits2Num(8);
    for (var j = 0; j < 8; j++) {
      Bits2Num[i].in[j] <== Num2Bits.out[i*8 + j];
    }
    storedValue[i] <== Bits2Num[i].out;
  }
}

// TODO: I could completely deprecare the simple store_bigendian template
template store_bigendian_to_n_bytes(size, resultBytes) {
  signal input value;
  signal output storedValue[size];

  assert(value < 2**(8*resultBytes*size)); // The equality check at the end of the template will only work if the value fits in the expected number of slots

  var maxStoredValue = 2**(8*resultBytes) - 1;
  storedValue[0] <-- value & maxStoredValue;
  var lc1 = storedValue[0];
  var e2 = 256**resultBytes;
  for (var i = 1; i < size; i++) {
    storedValue[i] <-- (value >> 8*i*resultBytes) & maxStoredValue;
    lc1 += storedValue[i] * e2;
    e2 *= 256**resultBytes;
  }
  lc1 === value;
}

// group a list of "byte_count" bytes into "size" number of "word_size"-byte words
// bytes are treated in big-endian order
template store_bytes_to_n_bytes(byte_count, size, word_size) {
  assert(byte_count <= size * word_size);
  assert(word_size > 1);

  signal input in[byte_count];
  signal output out[size];

  for (var i = 0; i < size; i++) {
    // get the least significant byte of the ith word
    // Example: for array [255, 255, 255, 0] with word_size = 2, i = 0 - get the last element of the ith 2 bytes
    // [(255, {255}), 255, 0], with i = 1 - [255, 255, (255, {0})]
    var word_end_idx = word_size * (i + 1) - 1;
    var word_result = 0;
    for (var w = 0; w < word_size; w++) {
      if (word_end_idx - w < byte_count) {
        // get the last - w byte of the first ith word, the value is going to be byte_value * (256 ^ byte_position)
        word_result += in[word_end_idx - w] * (256 ** w);
      }
    }
    var word_range = 2 ** (word_size * 8);
    assert(word_result <= word_range);
    out[i] <== word_result;
  }
}
