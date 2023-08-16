#!/usr/bin/env bash

set -e

ptau=$1

if [[ "$ptau" == "" ]]; then
  echo "Expected one argument: path to PTAU file"
  exit 1
fi

if [[ ! -f "$ptau" ]]; then
  echo "$ptau doesn't exist"
fi

template=$(<main_N.circom.template)

sizes=(4 8 9 10 11 12 13)

mkdir -p circom_templates/

echo "Generating circuits..."
for size in ${sizes[@]}; do
  prepared_template="${template//NUMBER_OF_AES_BLOCKS_HERE/$size}"
  echo "$prepared_template" > circom_templates/main_$size.circom
done

mkdir -p zkey-content

for size in ${sizes[@]}; do
  echo "Generating keys for $size AES blocks..."
  mkdir -p output_$size
  circom circom_templates/main_$size.circom -l ./electron/static/circom_circuits --r1cs --O1 --output output_$size
  ./node_modules/snarkjs/build/cli.cjs groth16 setup output_$size/main_$size.r1cs $ptau zkey-content/$size.zkey
  ./node_modules/snarkjs/build/cli.cjs zkey export verificationkey zkey-content/$size.zkey zkey-content/$size.json
  rm -r output_$size
  echo "Generated key pair for $size AES blocks in zkey-content/$size.[zkey|json]"
done

rm -r circom_templates
