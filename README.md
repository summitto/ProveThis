# ProveThis

ProveThis allows users to prove statements from websites and APIs using TLS without revealing private information. Although efforts like TLSNotary can currently be used to prove the authenticity and origin of a full HTML page, we extend the capabilities of TLSNotary and allow users to make zk-SNARK based zero knowledge proofs about statements in complexity class NP. More concretely, this can allow users to prove statements about e.g. their banking data or other data sources. Such proofs can generally be used to reduce fraud without compromising privacy and confidentiality.

The code represented in this repo is the first part of our devlierable to [NLNet](https://nlnet.nl/project/ProveThis/). 

***Please be aware that this code has not received a security code audit yet!*** *Do not use this in production!*

ProveThis allows users to prove statements from websites and APIs using TLS without revealing private information. We extend the capabilities of TLSNotary and allow users to make zk-SNARK based zero knowledge proofs. To make this more intuitive, first we show a high level overview of the different components we have added:

![Overview](/provethis_overview.png "provethis overview")

# Intro

This repository proves that a response from a certain server contained a certain piece of data. We do this by:
- running tlsnotary's pagesigner-cli to notarize a page
- running distributed AES tag verification using the approach pioneered by DECO
- creating a zero-knowledge proof about a piece of plaintext being decryptable by some TLS key material which was committed to by the notary

Note that we diverge from DECO's tag verification process. In their protocol (as described in [appendix B.2](link)), the verifier should not use the same IV more than once in any given 2PC protocol. However, in the current setup at the time of writing, we only prove data from a single TLS record with a single IV. If in the future this functionality is expanded to include proofs about multiple TLS records, full adherence to the DECO protocol is desired.

Before running this setup, we recommend you read the snarkjs documentation. In particular, be aware that you need to download a [powersoftaufile](https://github.com/iden3/snarkjs#7-prepare-phase-2), which we will below refer to as `${powersoftaufile}`.

There are three phases: (1) setup (2) prove (3) verify. Note that when using the `groth16` proving sytsem, the `circom_setup.sh` file has to be run in a trusted environment.

For convenience, in the examples below we use the following environment variables:
- `powersoftaufile`: path to the powersoftau file
- `ephemeral_data`: folder to store temporary data
- `timestamp`: timestamp given by tlsnotary for the notarization to prove
- `client_keyfile`: the client's share of the AES key used in a TLS session
- `notary_keyfile`: the notary's share of the AES key used in a TLS session
- `inputfile`: the ciphertext, AES key and nonce of a particular TLS record
- `ivfile`: the IV of a particular TLS record
- `aadfile`: the AAD of a particular TLS record
- `circom_inputfile`: the input witnesses for the circom prover
- `circom_publicfile`: the public witnesses for the circom verifier

## Requirements
Tested using:
```
node v17.0.0 (npm v8.1.0) and node v18.14.0 (npm 9.3.1)
go1.18.1
circom compiler 2.1.2 (https://docs.circom.io/getting-started/installation/#installing-dependencies)
```

## Setup

```
git submodule update --init --recursive
sudo ./scripts/setup_mpc.sh
./scripts/setup_tlsnotary.sh
maxBlocksToReveal=1                         # the number of bytes for which decryption is proven in zero knowledge
powersoftaufile=/path/to/powersoftaufile    # path to the powersoftau file
./scripts/setup_circom.sh ${powersoftaufile} groth16 ${maxBlocksToReveal}
mkdir -p ephemeral_data

--- For emp-agmpc ---
cd emp-agmpc
git checkout 9409174bf11302b490a6978becf3e8cd1e7a57c4
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Debug ..
make -j3

cd build/bin
./test_generate_handshake_circuits ../../circuits/n-for-1-auth/
cp gcm_shares_100.txt ../../circuits/n-for-1-auth/gcm/

sudo pip3 install ecdsa
```

## Usage

#### Proving
Run tlsnotary backend and pagesigner to notarize a webpage:

Terminal 1:
```
cd tlsnotaryserver && rm -rf garbledPool && ./src/notary 
```

Terminal 2:
```
node ./pagesigner-cli/pgsg-node.js notarize google.com --headers ../scripts/headers_google.txt
timestamp=<copy the timestamp from the folder which was just created by the above process>
ephemeral_data="$(pwd)/ephemeral_data"
client_keyfile="pagesigner-cli/saved_sessions/${timestamp}_www.google.com/client_server_write_key_share"
notary_keyfile="pagesigner-cli/saved_sessions/${timestamp}_www.google.com/notary_server_write_key_share"
tlsrecord=0
inputfile=${ephemeral_data}/input_${tlsrecord}.json
ivfile="${ephemeral_data}/tag_iv_${tlsrecord}.txt"
aadfile="${ephemeral_data}/aad_${tlsrecord}.txt"
python3 scripts/create_mpc_inputfiles.py ${client_keyfile} ${notary_keyfile} ${ivfile}
./scripts/run_mpc_player emp-agmpc/build/bin/test_gcm_encrypted_iv 1 ${ephemeral_data}/mpc_encrypted_iv_input_1.txt
```

Terminal 1:
```
close tlsnotaryserver
cd ..
ephemeral_data="$(pwd)/ephemeral_data"
tlsrecord=0
inputfile=${ephemeral_data}/input_${tlsrecord}.json
ivfile="${ephemeral_data}/tag_iv_${tlsrecord}.txt"
aadfile="${ephemeral_data}/aad_${tlsrecord}.txt"
./scripts/run_mpc_player emp-agmpc/build/bin/test_gcm_encrypted_iv 2 ${ephemeral_data}/mpc_encrypted_iv_input_2.txt
./scripts/run_mpc_player emp-agmpc/build/bin/test_gcm_powers_of_h 2 ${ephemeral_data}/mpc_powers_of_h_input_2.txt
```

Terminal 2:
```
./scripts/run_mpc_player emp-agmpc/build/bin/test_gcm_powers_of_h 1 ${ephemeral_data}/mpc_powers_of_h_input_1.txt
```

Terminal 1:
```
tagshare_party_1="${ephemeral_data}/tagshare_party_1.txt"
python3 scripts/prep_tag_verification_party_1.py ${ephemeral_data}/mpc_powers_of_h_input_1.txt ${ephemeral_data}/mpc_encrypted_iv_input_1.txt ${inputfile} ${aadfile} ${tagshare_party_1}

circom_inputfile=${ephemeral_data}/circom_input.json
circom_publicfile=${ephemeral_data}/circom_public.json
startingindex=1
plaintextBytesToReveal=10
maxBlocksToReveal=1
python3 ./scripts/create_circom_files.py ${inputfile} ${aadfile} ${startingindex} ${maxBlocksToReveal} ${circom_inputfile} ${circom_publicfile} ${ephemeral_data}/mpc_encrypted_iv_input_1.txt ${ephemeral_data}/mpc_encrypted_iv_input_2.txt ${plaintextBytesToReveal}
./scripts/circom_prove.sh groth16 ${circom_inputfile}
```

#### Verifying

Terminal 2:

```
tagshare_party_1="${ephemeral_data}/tagshare_party_1.txt"
python3 scripts/verify_tag_party_2.py ${ephemeral_data}/masked_powers_of_h.txt ${ephemeral_data}/tagMask.txt ${inputfile} ${aadfile} ${tagshare_party_1}

circom_publicfile=${ephemeral_data}/circom_public.json
./scripts/circom_verify.sh groth16 ${circom_publicfile}
```

NOTE: if the verifier is a third party and not the notary, it should be verifying only some of the signed outputs from the Notary, but e.g. not the whole AES key
```
./pagesigner-cli/pgsg-node.js verify pagesigner-cli/saved_sessions/<timestamp>_www.google.com/<timestamp>.pgsg
```

