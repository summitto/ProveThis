function usage {
  echo "usage: ./scripts/circom_verify.sh <groth16/plonk> <publicfile>";
}

if [ -z ${1+x} ]; then 
  echo "first argument is unset, must be plonk or groth16";
  usage
  exit
fi
if [ -z ${2+x} ]; then 
  echo "second argument is unset, must be path to publicfile";
  usage
  exit
fi

./node_modules/snarkjs/build/cli.cjs ${1} verify build/verification_key.json ${2} build/proof