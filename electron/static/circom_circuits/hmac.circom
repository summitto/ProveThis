pragma circom 2.0.0;

include "xor_n.circom";

// include "../node_modules/circomlib/circuits/bitify.circom";
// include "../node_modules/circomlib/circuits/sha256/sha256.circom";
include "bitify.circom";
include "sha256/sha256.circom";

/**
 * As defined in RFC2104
 * https://datatracker.ietf.org/doc/html/rfc2104
 */
template secure_hmac(secret_length, data_length) {
  var DIGEST_SIZE = 32;
  var BLOCK_SIZE = 64;
  assert(secret_length <= BLOCK_SIZE);

  signal input secret[secret_length];
  signal input data[data_length];
  signal output out[DIGEST_SIZE];

  // 0x36 byte repeated BLOCK_SIZE times
  var IPAD[BLOCK_SIZE * 8] = [0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,
                              0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,
                              0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,
                              0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,
                              0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,
                              0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,
                              0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,
                              0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,
                              0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,
                              0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,
                              0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,
                              0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,
                              0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,
                              0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,
                              0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,
                              0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0,   0, 1, 1, 0, 1, 1, 0, 0];
  // 0x5C byte repeated BLOCK_SIZE times
  var OPAD[BLOCK_SIZE * 8] = [0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,
                              0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,
                              0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,
                              0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,
                              0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,
                              0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,
                              0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,
                              0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,
                              0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,
                              0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,
                              0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,
                              0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,
                              0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,
                              0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,
                              0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,
                              0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0,   0, 0, 1, 1, 1, 0, 1, 0];

  // convert secret to bits
  component secret_bits[BLOCK_SIZE];
  for (var i = 0; i < BLOCK_SIZE; i++) {
    secret_bits[i] = Num2Bits(8);
    if (i < secret_length) {
      secret_bits[i].in <== secret[i];
    } else {
      secret_bits[i].in <== 0;
    }
  }

  component inner_xor = XOR_N(BLOCK_SIZE * 8);
  component outer_xor = XOR_N(BLOCK_SIZE * 8);

  // xor padded secret with ipad and secret with opad
  for (var i = 0; i < BLOCK_SIZE; i++) {
    for (var b = 0; b < 8; b++) {
      inner_xor.a[i*8 + b] <== secret_bits[i].out[b];
      inner_xor.b[i*8 + b] <== IPAD[i*8 + b];

      outer_xor.a[i*8 + b] <== secret_bits[i].out[b];
      outer_xor.b[i*8 + b] <== OPAD[i*8 + b];
    }
  }

  // convert data to bits
  component data_bits[data_length];
  for (var i = 0; i < data_length; i++) {
    data_bits[i] = Num2Bits(8);
    data_bits[i].in <== data[i];
  }

  // inner round of hashing - H(secret ^ ipad, data)
  component inner_hash = Sha256(BLOCK_SIZE * 8 + data_length * 8);
  // outer round of hashing - H(secret ^ opad, inner hash)
  component outer_hash = Sha256(BLOCK_SIZE * 8 + DIGEST_SIZE * 8);
  for (var i = 0; i < BLOCK_SIZE; i++) {
    for (var b = 0; b < 8; b++) {
      // the xor results are in big endian, we need small endian
      inner_hash.in[i*8 + b] <== inner_xor.out[8*i + 7 - b];
      outer_hash.in[i*8 + b] <== outer_xor.out[8*i + 7 - b];
    }
  }

  for (var i = 0; i < data_length; i++) {
    for (var b = 0; b < 8; b++) {
      // num2bits outputs bits in big endian but we need small endian
      inner_hash.in[BLOCK_SIZE * 8 + i * 8 + b] <== data_bits[i].out[7 - b];
    }
  }
  // outer hash includes the result of inner hash as data
  for (var i = 0; i < DIGEST_SIZE * 8; i++) {
    outer_hash.in[BLOCK_SIZE * 8 + i] <== inner_hash.out[i];
  }

  // turn the result back to bytes
  component hash_bytes[DIGEST_SIZE];
  for (var i = 0; i < DIGEST_SIZE; i++) {
    hash_bytes[i] = Bits2Num(8);
    for (var b = 0; b < 8; b++) {
      // we wrote small endian, so read small endian as well and transform to big endian
      hash_bytes[i].in[b] <== outer_hash.out[i*8 + 7 - b];
    }
    out[i] <== hash_bytes[i].out;
  }
}
