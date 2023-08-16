pragma circom 2.0.0;

include "store.circom";
include "load.circom";
include "rijndael_int_consts.circom";
include "rijndael_int_s_consts.circom";
include "byte_xor.circom";
include "byte_xor_parallel.circom";
/* include "store_transformU_xor.circom"; */
include "store_transformT_xor.circom";
include "byteMultiAND.circom";

template rijndael_init(keylength, ROUNDS, BC) {
  signal input key[keylength];
  signal output Ke[ROUNDS + 1][BC][32];

  var rcon[30][8] = generatercon();

  var ROUND_KEY_COUNT = (ROUNDS + 1) * BC;
  var KC = 4;

  var tk[KC][32];
  for (var i = 0; i < KC; i++) {
    for (var j = 0; j < 32; j++) {
      tk[i][j] = key[i*32 + j];
    }
  }

  var t_counter = 0;
  for (var i = 0; i < KC; i++) {
    // NOTE: tlslite's Python implementation has a more complicated setup but its complex to replicate their use of the // operator
    for (var j = 0; j < 32; j++) {
      Ke[0][t_counter % BC][j] <== tk[i][j];
    }
    // Kd[ROUNDS][t_counter % BC] = tk[i];
    t_counter += 1;
  }

  component indexS_0[10];
  component indexS_1[10];
  component indexS_2[10];
  component indexS_3[10];

  signal sbox_tt_0[10][32];
  signal sbox_tt_1[10][32];
  signal sbox_tt_2[10][32];
  signal sbox_tt_3[10][32];

  signal sbox_rcon[10][32];

  component byte_xor_parallel[10];
  signal extrapolated_using_phi[10][32];
  
  component byte_xor_parallel_tk[10][KC - 1];
  signal xorresult_prep[10][3][32];

  var tt[32];
  var rconpointer = 0;
  // TODO: once I'm happy with the loop I should change i_count to i
  for (var i_count = 0; i_count < 10; i_count++) {
    for (var j = 0; j < 32; j++) {
      tt[j] = tk[KC - 1][j];
    }
    
    // Writing this succinctly in a single for loop would be more complex because the two columns of indexing is not consistent
    // However, I could at least initialize the components in a for loop
    indexS_0[i_count] = indexSBits();
    indexS_1[i_count] = indexSBits();
    indexS_2[i_count] = indexSBits();
    indexS_3[i_count] = indexSBits();
    for (var j = 0; j < 8; j++) {
      indexS_0[i_count].index[j] <== tt[8 + j];
      indexS_1[i_count].index[j] <== tt[16 + j];
      indexS_2[i_count].index[j] <== tt[24 + j];
      indexS_3[i_count].index[j] <== tt[j];
    }
    // Funky way to do bitshifting
    for (var j = 0; j < 8; j++) {
      sbox_tt_0[i_count][j] <== indexS_0[i_count].out[j];
      sbox_tt_0[i_count][8 + j] <== 0;
      sbox_tt_0[i_count][16 + j] <== 0;
      sbox_tt_0[i_count][24 + j] <== 0;
      sbox_tt_1[i_count][j] <== 0;
      sbox_tt_1[i_count][8 + j] <== indexS_1[i_count].out[j];
      sbox_tt_1[i_count][16 + j] <== 0;
      sbox_tt_1[i_count][24 + j] <== 0;
      sbox_tt_2[i_count][j] <== 0;
      sbox_tt_2[i_count][8 + j] <== 0;
      sbox_tt_2[i_count][16 + j] <== indexS_2[i_count].out[j];
      sbox_tt_2[i_count][24 + j] <== 0;
      sbox_tt_3[i_count][j] <== 0;
      sbox_tt_3[i_count][8 + j] <== 0;
      sbox_tt_3[i_count][16 + j] <== 0;
      sbox_tt_3[i_count][24 + j] <== indexS_3[i_count].out[j];
      sbox_rcon[i_count][j] <== rcon[rconpointer][j];
      sbox_rcon[i_count][8 + j] <== 0;
      sbox_rcon[i_count][16 + j] <== 0;
      sbox_rcon[i_count][24 + j] <== 0;
    }

    byte_xor_parallel[i_count] = byte_xor_parallel_bits(6, 4);
    for (var j = 0; j < 32; j++) {
      byte_xor_parallel[i_count].in[0][j] <== sbox_tt_0[i_count][j];
      byte_xor_parallel[i_count].in[1][j] <== sbox_tt_1[i_count][j];
      byte_xor_parallel[i_count].in[2][j] <== sbox_tt_2[i_count][j];
      byte_xor_parallel[i_count].in[3][j] <== sbox_tt_3[i_count][j];
      byte_xor_parallel[i_count].in[4][j] <== sbox_rcon[i_count][j];
      byte_xor_parallel[i_count].in[5][j] <== tk[0][j];
    }
    for (var j = 0; j < 32; j++) {
      extrapolated_using_phi[i_count][j] <== byte_xor_parallel[i_count].out[j];
      tk[0][j] = extrapolated_using_phi[i_count][j];
    }

    rconpointer += 1;

    for (var j = 1; j < KC; j++) {
      byte_xor_parallel_tk[i_count][j - 1] = byte_xor_parallel_bits(2, 4);
      for (var k = 0; k < 32; k++) {
        byte_xor_parallel_tk[i_count][j - 1].in[0][k] <== tk[j - 1][k];
        byte_xor_parallel_tk[i_count][j - 1].in[1][k] <== tk[j][k];
      }
      for (var k = 0; k < 32; k++) {
        xorresult_prep[i_count][j - 1][k] <== byte_xor_parallel_tk[i_count][j - 1].out[k];
        tk[j][k] = xorresult_prep[i_count][j - 1][k];
      }
    }

    for (var j = 0; j < KC; j++) {
      // This is used to calculate Python's: // operator
      var remainder = t_counter % BC;
      for (var k = 0; k < 32; k++) {
        Ke[(t_counter - remainder) / BC][t_counter % BC][k] <== tk[j][k];
      }
      /* Kd[ROUNDS - ((t_counter - remainder)/ BC)][t_counter % BC] = tk[j]; */
      t_counter += 1;
    }
  }
}

/* tlslite-ng-0.8.0-alpha40/tlslite/utils/rijndael.py:1040 */
template rijndael_encrypt(ROUNDS, BC) {
  signal input counter;
  signal input Ke[ROUNDS + 1][BC][32];
  signal output result[16][8];

  var shifts[3][4][2] = [[[0, 0], [1, 3], [2, 2], [3, 1]],
          [[0, 0], [1, 5], [2, 4], [3, 3]],
          [[0, 0], [1, 7], [3, 5], [4, 4]]];

  var SC = 0;
  var s1 = shifts[SC][1][0];
  var s2 = shifts[SC][2][0];
  var s3 = shifts[SC][3][0];
  
  signal t_signal_iterated[ROUNDS][BC][32];
  component byte_xor_parallel_t[BC];
  component Num2BitsCounter = Num2Bits(16*8);
  Num2BitsCounter.in <== counter;

  for (var i = 0; i < BC; i++) {
    byte_xor_parallel_t[i] = byte_xor_parallel_bits(2, 4);
    for (var j = 0; j < 32; j++) {
      byte_xor_parallel_t[i].in[0][j] <== Num2BitsCounter.out[(16*8 - 1) - (i*32) - j];
      byte_xor_parallel_t[i].in[1][j] <== Ke[0][i][j];
    }
    for (var j = 0; j < 32; j++) {
      t_signal_iterated[0][i][j] <== byte_xor_parallel_t[i].out[j]; 
    }
  }

  component store_transformT_xor[ROUNDS - 1][BC];
  component byte_xor_parallel_a[ROUNDS - 1][BC];

  for (var r = 1; r < ROUNDS; r++) {
    for (var i = 0; i < BC; i++) {
      store_transformT_xor[r - 1][i] = transformT_xor();
      byte_xor_parallel_a[r - 1][i] = byte_xor_parallel_bits(2, 4);
      for (var j = 0; j < 32; j++) {
        store_transformT_xor[r - 1][i].value[0][j] <== t_signal_iterated[r - 1][i][j];
        store_transformT_xor[r - 1][i].value[1][j] <== t_signal_iterated[r - 1][(i + s1) % BC][j];
        store_transformT_xor[r - 1][i].value[2][j] <== t_signal_iterated[r - 1][(i + s2) % BC][j];
        store_transformT_xor[r - 1][i].value[3][j] <== t_signal_iterated[r - 1][(i + s3) % BC][j];
      }
      for (var j = 0; j < 32; j++) {
        byte_xor_parallel_a[r - 1][i].in[0][j] <== store_transformT_xor[r - 1][i].xoredValue[j];
        byte_xor_parallel_a[r - 1][i].in[1][j] <== Ke[r][i][j];
      }
      for (var j = 0; j < 32; j++) {
        t_signal_iterated[r][i][j] <== byte_xor_parallel_a[r - 1][i].out[j];
      }
    }
  }

  component store_bigendian_final_left[BC][4];
  component store_bigendian_final_right[BC];
  component xor_final[BC][4];
  component indexS_final[BC][4];

  for (var i = 0; i < BC; i++) {
    var tt[32];
    for (var j = 0; j < 32; j++) {
      tt[j] = Ke[ROUNDS][i][j];
    }

    for (var j = 0; j < 4; j++) {
      indexS_final[i][j] = indexSBits();
      xor_final[i][j] = XOR_N(8);
    }
    for (var j = 0; j < 8; j++) {
      indexS_final[i][0].index[j] <== t_signal_iterated[ROUNDS - 1][i][j];
      indexS_final[i][1].index[j] <== t_signal_iterated[ROUNDS - 1][(i + s1) % BC][8 + j];
      indexS_final[i][2].index[j] <== t_signal_iterated[ROUNDS - 1][(i + s2) % BC][16 + j];
      indexS_final[i][3].index[j] <== t_signal_iterated[ROUNDS - 1][(i + s3) % BC][24 + j];
    }
    for (var j = 0; j < 8; j++) {
      xor_final[i][0].a[j] <== indexS_final[i][0].out[j];
      xor_final[i][0].b[j] <== tt[j];

      xor_final[i][1].a[j] <== indexS_final[i][1].out[j];
      xor_final[i][1].b[j] <== tt[8 + j];

      xor_final[i][2].a[j] <== indexS_final[i][2].out[j];
      xor_final[i][2].b[j] <== tt[16 + j];

      xor_final[i][3].a[j] <== indexS_final[i][3].out[j];
      xor_final[i][3].b[j] <== tt[24 + j];
    }
    for (var j = 0; j < 8; j++) {
      result[4*i][j] <== xor_final[i][0].out[j];
      result[4*i + 1][j] <== xor_final[i][1].out[j];
      result[4*i + 2][j] <== xor_final[i][2].out[j];
      result[4*i + 3][j] <== xor_final[i][3].out[j];
    }
  }
}
