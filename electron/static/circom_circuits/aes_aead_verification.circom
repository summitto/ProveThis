pragma circom 2.0.0;

include "select_generated.circom";
include "rijndael.circom";
include "xor_n.circom";

// tlslite-ng-0.8.0-alpha40/tlslite/utils/aesgcm.py:126
template verify_tag(ciphertextTrimmedLen, ROUNDS, BC, datalen) {
  var bits = 128;
  signal input counter;
  signal input tag[bits];
  signal input ciphertext[ciphertextTrimmedLen][8];
  signal input data[datalen*8];
  signal input GCMKey[bits];
  signal input Ke[ROUNDS + 1][BC][32];

  signal product_table[16][bits];
  for (var i = 0; i < bits; i++) {
    product_table[8][i] <== GCMKey[i];
    product_table[0][i] <== 0;
  }

  component gcmShift[7];
  component xor_n_product[7];

  // This beauty of indexes stores the results from tlslite's _reverseBits function, which would be very costly to run inside of the circuit
  var productTableIndexes[7][3] = [[8, 4, 12], [4, 2, 10], [12, 6, 14], [2, 1, 9], [10, 5, 13], [6, 3, 11], [14, 7, 15]];

  for (var p = 0; p < 7; p++) {
    var p0 = productTableIndexes[p][0];
    var p1 = productTableIndexes[p][1];
    var p2 = productTableIndexes[p][2];

    gcmShift[p] = _gcmShift(bits);
    for (var i = 0; i < bits; i++) {
      gcmShift[p].in[i] <== product_table[p0][i];
    }
    for (var i = 0; i < bits; i++) {
      product_table[p1][i] <== gcmShift[p].out[i];
    }
    xor_n_product[p] = XOR_N(bits);
    for (var i = 0; i < bits; i++) {
      xor_n_product[p].a[i] <== product_table[p1][i];
      xor_n_product[p].b[i] <== GCMKey[i];
    }
    for (var i = 0; i < bits; i++) {
      product_table[p2][i] <== xor_n_product[p].out[i];
    }
  }

  component rijndael_encrypt_tag  = rijndael_encrypt(ROUNDS, BC);
  rijndael_encrypt_tag.counter <== counter;
  for (var i = 0; i < ROUNDS + 1; i++) {
    for (var j = 0; j < BC; j++) {
      for (var k = 0; k < 32; k++) {
        rijndael_encrypt_tag.Ke[i][j][k] <== Ke[i][j][k];
      }
    }
  }

  signal tagMask[16*8];
  for (var i = 0; i < 16; i++) {
    for (var j = 0; j < 8; j++) {
      tagMask[8*i + j] <== rijndael_encrypt_tag.result[i][j];
    }
  }

  component Bits2NumProductTable[16];
  component update_short = _update(5);
  component update_long = _update(ciphertextTrimmedLen);
  for (var i = 0; i < 16; i++) {
    Bits2NumProductTable[i] = Bits2Num(bits);
    for (var j = 0; j < bits; j++) {
      Bits2NumProductTable[i].in[bits - 1 - j] <== product_table[i][j];
    }
    update_short.product_table_num[i] <== Bits2NumProductTable[i].out;
    update_long.product_table_num[i] <== Bits2NumProductTable[i].out;
  }

  for (var i = 0; i < bits; i++) {
    update_short.y[i] <== 0;
  }
  for (var i = 0; i < datalen*8; i++) {
    update_short.data[i] <== data[i];
  }
  for (var i = 0; i < bits; i++) {
    update_long.y[i] <== update_short.out[i];
  }
  for (var i = 0; i < ciphertextTrimmedLen; i++) {
    for (var j = 0; j < 8; j++) {
      update_long.data[8*i + j] <== ciphertext[i][j];
    }
  }

  component xor_updates = XOR_N(bits);
  component Num2BitsDatalen = Num2Bits(8);
  Num2BitsDatalen.in <== datalen;
  component Num2BitsCiphertextTrimmedLen = Num2Bits(ciphertextTrimmedLen*8);
  Num2BitsCiphertextTrimmedLen.in <== ciphertextTrimmedLen;
  for (var i = 0; i < bits; i++) {
    xor_updates.a[i] <== update_long.out[i];
  }
  for (var i = 0; i < 8; i++) {
    xor_updates.b[5 + i] <== 0;
    xor_updates.b[13 + i] <== 0;
    xor_updates.b[21 + i] <== 0;
    xor_updates.b[29 + i] <== 0;
    xor_updates.b[37 + i] <== 0;
    xor_updates.b[45 + i] <== 0;
    xor_updates.b[53 + i] <== Num2BitsDatalen.out[7 - i];
    xor_updates.b[61 + i] <== 0;
    xor_updates.b[69 + i] <== 0;
    xor_updates.b[77 + i] <== 0;
    xor_updates.b[85 + i] <== 0;
    xor_updates.b[93 + i] <== 0;
    xor_updates.b[101 + i] <== 0;
    xor_updates.b[109 + i] <== 0;
    xor_updates.b[117 + i] <== Num2BitsCiphertextTrimmedLen.out[7 - i];
  }
  for (var i = 0; i < 3; i++) {
    xor_updates.b[125 + i] <== 0;
  }
  for (var i = 0; i < 5; i++) {
    xor_updates.b[i] <== 0;
  }

  component mul_auth = _mul(bits);
  for (var i = 0; i < bits; i++) {
    mul_auth.y[i] <== xor_updates.out[i];
  }
  for (var i = 0; i < 16; i++) {
    mul_auth.product_table_num[i] <== Bits2NumProductTable[i].out;
  }

  component xor_auth = XOR_N(bits);
  for (var i = 0; i < bits; i++) {
    xor_auth.a[i] <== mul_auth.out[i];
    xor_auth.b[i] <== tagMask[i];
  }
  for (var i = 0; i < bits; i++) {
    tag[i] === xor_auth.out[i];
  }
}

template _update(datalen) {
  signal input y[128];
  signal input data[datalen * 8];
  signal input product_table_num[16];
  signal output out[128];

  var remainder = datalen % 16;
  var repetitions = 0;
  if (datalen < 16) {
    repetitions = 1;
  } else {
    repetitions = (datalen - remainder) / 16;
    if (remainder > 0) {
      repetitions += 1;
    }
  }

  component xor_n_update[repetitions];
  component mul[repetitions];
  signal updates[repetitions + 1][128];

  for (var i = 0; i < 128; i++) {
    updates[0][i] <== y[i];
  }
  
  for (var i = 0; i < repetitions; i++) {
    xor_n_update[i] = XOR_N(128);
    for (var j = 0; j < 128; j++) {
      xor_n_update[i].a[j] <== updates[i][j];
    }
    // The last round, if there's a remainder, set only the first remainder bits, otherwise, set all bits
    if (i == (repetitions - 1) && remainder > 0) {
      for (var j = 0; j < 8*remainder; j++) {
        xor_n_update[i].b[j] <== data[128*i + j]; 
      }
      for (var j = 0; j < 128 - (8*remainder); j++) {
        xor_n_update[i].b[(8*remainder) + j] <== 0;
      }
    } else {
      for (var j = 0; j < 128; j++) {
        xor_n_update[i].b[j] <== data[128*i + j]; 
      }
    }

    mul[i] = _mul(128);
    for (var j = 0; j < 16; j++) {
      mul[i].product_table_num[j] <== product_table_num[j];
    }
    for (var j = 0; j < 128; j++) {
      mul[i].y[j] <== xor_n_update[i].out[j];
    }
    for (var j = 0; j < 128; j++) {
      updates[i + 1][j] <== mul[i].out[j];
    }

  }

  for (var i = 0; i < 128; i++) {
    out[i] <== updates[repetitions][i];
  }
}

// TODO: assert if y >>=4 === 0 is this really necessary? I can just do an assert on the size of the input at the beginning, or that is handled statically already
template _mul(datalen) {
  signal input product_table_num[16];
  signal input y[datalen];
  signal output out[datalen];

  // _gcmReductionTable = [0x0000, 0x1c20, 0x3840, 0x2460, 0x7080, 0x6ca0, 0x48c0, 0x54e0,
  //  0xe100, 0xfd20, 0xd940, 0xc560, 0x9180, 0x8da0, 0xa9c0, 0xb5e0]
  // for i in range(len(_gcmReductionTable)):
  //     newBits = [int(digit) for digit in bin(int(_gcmReductionTable[i]))[2:]]
  //     ([0] * (16 - len(newBits)) + newBits)
  /* var _gcmReductionTable[16] = [0,7200,14400,9312,28800,27808,18624,21728,57600,64800,55616,50528,37248,36256,43456,46560]; */
  var _gcmReductionTable[16] = [46560, 43456, 36256, 37248, 50528, 55616, 64800, 57600, 21728, 18624, 27808, 28800, 9312, 14400, 7200, 0];

  signal ret[1 + (128/4)][datalen];

  component xor_n_mul1[128/4];
  component xor_n_mul2[128/4];
  component select16_1[128/4];
  component select16_2[128/4];
  component Num2Bits1[128/4];
  component Num2Bits2[128/4];

  for (var i = 0; i < datalen; i++) {
    ret[0][i] <== 0;
  }
  for (var i = 0; i < datalen; i = i + 4) {

    select16_1[i/4] = select16_static(_gcmReductionTable);
    select16_1[i/4].bits[0] <== ret[i/4][0];
    select16_1[i/4].bits[1] <== ret[i/4][1];
    select16_1[i/4].bits[2] <== ret[i/4][2];
    select16_1[i/4].bits[3] <== ret[i/4][3];

    Num2Bits1[i/4] = Num2Bits(16);
    Num2Bits1[i/4].in <== select16_1[i/4].out;

    xor_n_mul1[i/4] = XOR_N(datalen); // We XOR <datalen> bits because AESGCM._gcmReductionTable is <datalen> big
    for (var j = 0; j < datalen - 4; j++) {
      // right side: from 0 to datalen - 4
      xor_n_mul1[i/4].a[4 + j] <== ret[i/4][datalen - 1 - j]; // AND/OR this setting is false... I think actually we should be setting the first from the right to +4 left
    }
    for (var j = 0; j < 4; j++) {
      xor_n_mul1[i/4].a[j] <== 0;
    }
    for (var j = 0; j < 16; j++) {
      xor_n_mul1[i/4].b[15 - j] <== Num2Bits1[i/4].out[j]; // or just set j not 15 - j?
    }
    for (var j = 16; j < datalen; j++) {
      xor_n_mul1[i/4].b[j] <== 0;
    }

    select16_2[i/4] = select16();
    for (var j = 0; j < 16; j++) {
      select16_2[i/4].values[15 - j] <== product_table_num[j];
    }
    for (var j = 0; j < 4; j++) {
      select16_2[i/4].bits[j] <== y[datalen - 1 - i - j];
    }

    Num2Bits2[i/4] = Num2Bits(datalen); // TODO: this would be more efficient if we don't blindly create a huge list of 0-bits when we need to. I.e. we need to shorten this
    Num2Bits2[i/4].in <== select16_2[i/4].out;
    xor_n_mul2[i/4] = XOR_N(datalen);
    for (var j = 0; j < datalen; j++) {
      xor_n_mul2[i/4].a[datalen - 1 - j] <== xor_n_mul1[i/4].out[j];
    }
    for (var j = 0; j < datalen; j++) {
      xor_n_mul2[i/4].b[j] <== Num2Bits2[i/4].out[j];
    }
    for (var j = 0; j < datalen; j++) {
      ret[(i/4) + 1][j] <== xor_n_mul2[i/4].out[j];
    }
  }
  for (var j = 0; j < datalen; j++) {
    out[datalen - 1 - j] <== ret[128/4][j];
  }
}

// tlslite-ng-0.8.0-alpha40/tlslite/utils/aesgcm.py:180
template _gcmShift(bits) {
  signal input in[bits];
  signal output out[bits];

  // [0xe1 << (128-8), 0]
  var values[2] = [299076299051606071403356588563077529600, 0];
  var highTermSet = in[bits - 1];

  component select2_static = select2_static(values);
  select2_static.bits[0] <== highTermSet;
  
  component Num2Bits = Num2Bits(bits);
  Num2Bits.in <== select2_static.out;
  
  component xor_n = XOR_N(bits);
  xor_n.a[bits - 1] <== Num2Bits.out[0];
  xor_n.b[0] <== 0;
  for (var i = 1; i < bits; i++) {
    xor_n.a[bits - 1 - i] <== Num2Bits.out[i];
    xor_n.b[i] <== in[i - 1];
  }
  for (var i = 0; i < bits; i++) {
    out[i] <== xor_n.out[i];
  }
}
