pragma circom 2.0.0;

template XOR_N(N) {
    signal input a[N];
    signal input b[N];
    signal output out[N];

    for (var i = 0; i < N; i++) {
      out[i] <== a[i] + b[i] - 2*a[i]*b[i];
    }
}
