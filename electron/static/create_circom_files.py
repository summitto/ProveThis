import sys
import json

help = "Usage: python3 ./create_circom_files.py <inputfile> <aad> <startingindex> <plaintextlen> <maxBlocksToReveal> <aes_keyshare_1> <aes_keyshare_2> <circom_inputfile>"

if (len(sys.argv)) <= 8:
    print(help)
    exit(1)

inputfile = sys.argv[1]
aad = bytearray.fromhex(sys.argv[2])
starting_index = int(sys.argv[3])
plaintextlen = int(sys.argv[4])
maxBlocksToReveal = int(sys.argv[5])
aes_key_share_1 = sys.argv[6]
aes_key_share_2 = sys.argv[7]
circom_inputfile = sys.argv[8]

circom_input = {}
starting_aes_block = 0

assert(plaintextlen <= maxBlocksToReveal*16)

with open(inputfile, 'r') as f:
    input = json.load(f)
    circom_input["nonce"] = input["nonce"]
    circom_input["key"] = input["key"]
    taglength = 16
    assert(starting_index+plaintextlen <= len(input["ciphertext"]) - taglength) # we should not try to decrypt the tag

    # We start decrypting not from starting_index, but from the first index in that particular 16-byte AES block
    # If our preferred ciphertext "overflows", we start decrypting from an earlier block
    adjusted_starting_index = starting_index - (starting_index % 16)
    while True:
        if (adjusted_starting_index + maxBlocksToReveal*16 > len(input["ciphertext"])):
            adjusted_starting_index -= 16
            assert(adjusted_starting_index > 0)
        else:
            break

    # We're not allowed to try and reveal more bytes than maxBlocksToReveal allows
    assert( (starting_index + plaintextlen - adjusted_starting_index) / 16 <= maxBlocksToReveal)

    circom_input["ciphertext"] = []
    for i in range(adjusted_starting_index, adjusted_starting_index + maxBlocksToReveal*16):
        circom_input["ciphertext"].append(input["ciphertext"][i])
    starting_aes_block = starting_index // 16
    circom_input["starting_aes_block"] = starting_aes_block
    circom_input["bytes_to_reveal"] = []
    for i in range(starting_index - adjusted_starting_index):
        circom_input["bytes_to_reveal"].append("0")
    for i in range(plaintextlen):
        circom_input["bytes_to_reveal"].append("1")
    for i in range(maxBlocksToReveal*16 - len(circom_input["bytes_to_reveal"])):
        circom_input["bytes_to_reveal"].append("0")

with open(circom_inputfile, 'w') as f:
    print(json.dumps(circom_input), file=f)
