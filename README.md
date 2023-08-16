ProveThis allows users to prove statements from websites and APIs using TLS without revealing private information. Although efforts like TLSNotary can currently be used to prove the authenticity and origin of a full HTML page, we extend the capabilities of TLSNotary and allow users to make zk-SNARK based zero knowledge proofs about statements in complexity class NP. More concretely, this can allow users to prove statements about e.g. their banking data or other data sources. Such proofs can generally be used to reduce fraud without compromising privacy and confidentiality.

![NLNet](/nlnet_logo.png "nlnet_logo")
We are honoured that our open source work is sponsored by the NLNet Foundation.

In this final submission we developed a desktop application which can be run on a standard Linux or Mac computer. The user can choose a particular bank account (supported at the moment are two Dutch banks: ABN Amro and bunq). The user can then select a particular transaction from their history and make a zero-knowledge proof about it.

***Please be aware that this code has not received a security code audit yet! Do not use this in production!***

## Intro 

ProveThis allows users to prove statements from websites and APIs using TLS without revealing private information. We extend the capabilities of TLSNotary and allow users to make zk-SNARK based zero knowledge proofs. To make this more intuitive, first we show a high level overview of the different components we have added:
![Overview](/provethis_overview.png "provethis overview")

This repository proves that a response from a certain server contained a certain piece of data. We do this by:
- running tlsnotary's pagesigner-cli to notarize a page
- running distributed AES tag verification using the approach pioneered by DECO
- creating a zero-knowledge proof about a piece of plaintext being decryptable by some TLS key material which was committed to by the notary
Note that we diverge from DECO's tag verification process. In their protocol (as described in appendix B.2), the verifier should not use the same IV more than once in any given 2PC protocol. However, in the current setup at the time of writing, we only prove data from a single TLS record with a single IV. If in the future this functionality is expanded to include proofs about multiple TLS records, full adherence to the DECO protocol is desired.


## ProveThis Client v0.1.0

**ProveThis** is a desktop application, which allows to create a proof of a bank transaction with counter party account number and amount.

Supported banks:
- ABN Amro
- BUNQ

## Requirements

OS and hardware:
- OS:
  - Ubuntu 18.04 64bit (later versions may work as well) or 
  - macOS Ventura 13.4.1
- 8GB free RAM (may require more in case of larger proof size)
- x86 CPU supporting SSE2, RDSEED, AES instructions or M1/M2 ARM 
- 10+ MB/s internet connection (MPC creates around 1GB of traffic)

Software:
- Python 3
- Circom 2.1.5 (https://docs.circom.io/getting-started/installation/#installing-dependencies)
- OpenSSL 1.1.1

## Build the ProveThis client yourself

## Prerequisites

- [MPC circuits](./electron/static/mpc_circuits) please unpack before use
- Node 16.14
- Yarn
- CMake 3.13+
- GCC 9+

## Setup

1. Run `git submodule update --init --recursive`
2. Go to `aes-mpc-lib` directory and build the client manually by following the readme. Make sure to use `-W` flag with `npm` when installing dependencies there. `aes-mpc-lib` is configured as a workspace for this project.
3. Install dependencies by running `yarn`
4. Install Python 3 and `ecdsa>=0.18.0b1` Python library
5. Install Circom 2.1.5 following [their guide](https://docs.circom.io/getting-started/installation/#installing-circom)

### Configuring the server

Modify `notary` and `mpcServerConfig` objects in [provingHandler.ts](./electron/handlers/provingHandler.ts).

Both IP addresses must be the same. For `mpcIvPort` and `mpcPoHPort` the server must have port ranges open from `mpcIvPort` to `mpcIvPort+3` and from `mpcPoHPort` to `mpcPoHPort+3`.

The [CLI-only example](electron/proverlib/example.ts) can be modified similarly.

## Building

- Development: `yarn electron:dev`
- CLI-only example using Google.com: `yarn electron-only && node build/electron/proverlib/example.js`
- Release: `yarn electron:build` - the resulting bundle will be located in `dist/`. The target platform will be the same as host.



## Benchmark 

### Ventura 13.4.1 macOS M1 Air 16 GB RAM 

#### bunq:
Notarization time: 3.207s
Main circuit compiling time: 12.669s
MPC tag verification time: 110.084s
Witness generation time: 0.335s
Proof creation time: 5.431s
Proof verification time: 0.126s
Preparing tag verification time: 0.129s
Verifying tag time: 0.112s

Elapsed time: 137.168s (with selecting the folder for where to save)

#### ABN Amro:
Notarization time: 3.190s
Main circuit compiling time: 27.766s
MPC tag verification time: 110.081s
Witness generation time: 0.704s
Proof creation time: 10.788s
Proof verification time: 0.125s
Preparing tag verification time: 0.127s
Verifying tag time: 0.109s

Elapsed time: 156.341s (with selecting the folder for where to save)


### Ubuntu 18.04.6 LTS, Intel i7-8565U CPU @ 1.80GHz × 8, 16GB RAM

#### Bunq:
Notarization time: 4.170s
Main circuit compiling time: 15.546s
MPC tag verification time: 210.211s
Witness generation time: 0.501s
Proof creation time: 8.165s
Proof verification time: 0.211s
Preparing tag verification time: 0.271s
Verifying tag time: 0.155s

Elapsed time: 248.018s (with selecting the folder for where to save)

#### ABN Amro:
Notarization time: 3.987s
Main circuit compiling time: 27.884s
MPC tag verification time: 200.193s
Witness generation time: 0.952s
Proof creation time: 15.799s
Proof verification time: 0.201s
Preparing tag verification time: 0.402s
Verifying tag time: 0.149s

Elapsed time: 258.6s (with selecting the folder for where to save)


## Third-party software

- [emp-tool](https://github.com/emp-toolkit/emp-tool) (MIT)
- [emp-ot](https://github.com/emp-toolkit/emp-ot) (MIT)
- [emp-agmpc](https://github.com/emp-toolkit/emp-agmpc) (MIT)
- [tlslite-ng](https://github.com/tlsfuzzer/tlslite-ng) (Multiple licenses: BSD-style, public domain, GNU LGPL v2)
- [pagesigner](https://github.com/tlsnotary/pagesigner) (GPL-3.0)


