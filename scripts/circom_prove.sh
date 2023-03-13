function usage {
  echo "usage: ./scripts/circom_prove.sh <groth16/plonk> <inputs>";
}

if [ -z ${1+x} ]; then 
  echo "first argument is unset, must be plonk or groth16";
  usage
  exit
fi

if [ -z ${2+x} ]; then 
  echo "second argument is unset, must be input witness file";
  usage
  exit
fi

node build/main_js/generate_witness.js build/main_js/main.wasm ${2} build/witness.wtns

./node_modules/snarkjs/build/cli.cjs ${1} prove build/circuit_final.zkey build/witness.wtns build/proof build/proof_public.json