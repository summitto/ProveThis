function usage {
  echo "usage: ./scripts/circom_setup.sh poweroftaufile <groth16/plonk> <plaintext_len>";
}

if [ -z ${1+x} ]; then 
  echo "first argument is unset, must be path to powersoftau file";
  usage
  exit
fi
if [ -z ${2+x} ]; then 
  echo "second argument is unset, must be plonk or groth16";
  usage
  exit
fi
if [ -z ${3+x} ]; then 
  echo "third argument is unset, must be length of ciphertext in bytes";
  usage
  exit
fi

mkdir -p build

npm i

python3 scripts/generate_main.py ${3}

mv main_generated.circom circom_circuits/main.circom

circom circom_circuits/main.circom --r1cs --wasm --sym --output build

./node_modules/snarkjs/build/cli.cjs ${2} setup build/main.r1cs ${1} build/circuit_final.zkey

./node_modules/snarkjs/build/cli.cjs zkey export verificationkey build/circuit_final.zkey build/verification_key.json