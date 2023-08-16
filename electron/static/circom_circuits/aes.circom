pragma circom 2.0.0;

include "load.circom";
include "rijndael.circom";
include "xor_n.circom";
include "aes_aead_verification.circom";

template aes(ciphertextlen, keylength) {
  signal input ciphertext[ciphertextlen][8];
  signal input key[keylength];
  signal input nonce[12];
  signal input starting_aes_block;
  signal output plaintext[ciphertextlen][8];

  // tlslite-ng-0.8.0-alpha40/tlslite/utils/python_aes.py:109
  var chunks; // we decrypt in chunks of 16 bytes
  var remainder = ciphertextlen % 16;
  if (ciphertextlen <= 16) {
    chunks = 1;
  } else {
    chunks = (ciphertextlen - remainder) / 16;
    if (remainder > 0) {
      chunks += 1;
    }
  }

  var masklen = ciphertextlen;
  signal counters[chunks];
  signal mask[masklen][8];

  component load_bigendian = load_bigendian(16);
  for (var i = 0; i < 12; i++) {
    load_bigendian.value[i] <== nonce[i];
  }
  for (var i = 12; i < 15; i++) {
    load_bigendian.value[i] <== 0;
  }
  load_bigendian.value[15] <== 1;
  counters[0] <== load_bigendian.loadedValue + starting_aes_block;

  // tlslite-ng-0.8.0-alpha40/tlslite/utils/rijndael.py:922
  var ROUNDS = 10;
  var BC = 4;
  component rijndael_init = rijndael_init(keylength, ROUNDS, BC);
  for (var i = 0; i < keylength; i++) {
    rijndael_init.key[i] <== key[i];
  }

  // decryption
  component rijndael_encrypt[chunks];
  for (var i = 0; i < chunks; i++) {
    rijndael_encrypt[i] = rijndael_encrypt(ROUNDS, BC);
    rijndael_encrypt[i].counter <== counters[i] + 1;
    for (var j = 0; j < ROUNDS + 1; j++) {
      for (var k = 0; k < BC; k++) {
        for (var l = 0; l < 32; l++) {
          rijndael_encrypt[i].Ke[j][k][l] <== rijndael_init.Ke[j][k][l];
        }
      }
    }
    
    for (var j = 0; j < 16; j++) {
      if (i*16 + j < masklen) {
        for (var k = 0; k < 8; k++) {
          mask[i*16 + j][k] <== rijndael_encrypt[i].result[j][k];
        }
        /* log(mask[i*16 + j][0]*10**7 + mask[i*16 + j][1]*10**6 + mask[i*16 + j][2]*10**5 + mask[i*16 + j][3]*10**4 + mask[i*16 + j][4]*10**3 + mask[i*16 + j][5]*10**2 + mask[i*16 + j][6]*10**1 + mask[i*16 + j][7]); */
      }
    }
    if (i < chunks - 1) { // the last iteration the counter won't be used anymore
      counters[i+1] <== counters[i] + 1;
    }
  }

  component byte_xor[masklen];
  for (var i = 0; i < masklen; i++) {
    byte_xor[i] = XOR_N(8);
    for (var k = 0; k < 8; k++) {
      byte_xor[i].a[k] <== ciphertext[i][k];
      byte_xor[i].b[k] <== mask[i][k];
    }
    for (var k = 0; k < 8; k++) {
      plaintext[i][k] <== byte_xor[i].out[k];
    }
  }
}

