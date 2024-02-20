pragma circom 2.0.0;

include "bitify.circom";
include "sha256/sha256.circom";

// This component XORs 2 key shares for the output, and compares SHA256 of client_key_share with the input hash.
// All inputs are bytes, the swk output is - 16 arrays of 8 bits.
template CheckKeySharesCommitment() {
  var KEY_SIZE = 16;
  var HASH_SIZE = 32;

  signal input client_key_share[KEY_SIZE];
  signal input notary_key_share[KEY_SIZE];
  signal input hash[HASH_SIZE];

  signal output out[KEY_SIZE][8];

  component a_bits[KEY_SIZE];
  component b_bits[KEY_SIZE];

  component client_share_hash = Sha256(KEY_SIZE * 8);

  for (var i = 0; i < KEY_SIZE; i++) {
    a_bits[i] = Num2Bits(8);
    b_bits[i] = Num2Bits(8);

    // turn every byte of key shares into bits
    a_bits[i].in <-- client_key_share[i];
    b_bits[i].in <-- notary_key_share[i];

    for (var bit = 0; bit < 8; bit++) {
      // output is key that is created from xoring shares. Bits are big endian.
      out[i][bit] <-- a_bits[i].out[bit] ^ b_bits[i].out[bit];

      // write client share to sha256. The xor results are in big endian, we need small endian for the Sha256 component.
      client_share_hash.in[i * 8 + 7 - bit] <-- a_bits[i].out[bit];
    }
  }

  component hash_bytes[HASH_SIZE];

  // transform hash result bits into bytes for comparison
  for (var i = 0; i < HASH_SIZE; i++) {
    hash_bytes[i] = Bits2Num(8);

    for (var bit = 0; bit < 8; bit++) {
      // the hash is little endian, reverse it again
      hash_bytes[i].in[7 - bit] <-- client_share_hash.out[i * 8 + bit];
    }

    hash_bytes[i].out === hash[i];
  }
}
