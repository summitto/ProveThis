pragma circom 2.0.0;

// splits array of values into two arrays
// values: the values to split
function split_values4(values) {
  var splitValues[2][4];
  for (var i = 0; i < 4; i++) {
    splitValues[0][i] = values[i];
    splitValues[1][i] = values[4 + i];
  }
  return splitValues;
}

function split_values8(values) {
  var splitValues[2][8];
  for (var i = 0; i < 8; i++) {
    splitValues[0][i] = values[i];
    splitValues[1][i] = values[8 + i];
  }
  return splitValues;
}

function split_values16(values) {
  var splitValues[2][16];
  for (var i = 0; i < 16; i++) {
    splitValues[0][i] = values[i];
    splitValues[1][i] = values[16 + i];
  }
  return splitValues;
}

function split_values32(values) {
  var splitValues[2][32];
  for (var i = 0; i < 32; i++) {
    splitValues[0][i] = values[i];
    splitValues[1][i] = values[32 + i];
  }
  return splitValues;
}

