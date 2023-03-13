import sys
sys.path.insert(0, "./tlslite-ng")
from tlslite import AESGCM, AESGCM_2PC, Rijndael
from tlslite.constants import *
import json

help = "Usage: python3 ./create_circom_files.py <inputfile> <aadfile> <startingindex> <maxBlocksToReveal> <circom_inputfile> <circom_publicfile> <mpc_tagmask_input_1> <mpc_tagmask_input_2> <plaintextlen>"
if (len(sys.argv)) <= 9:
    print(help)
    exit(-1)

inputfile = sys.argv[1]
aadFile = sys.argv[2]
starting_index = int(sys.argv[3])
maxBlocksToReveal = int(sys.argv[4])
circom_inputfile = sys.argv[5]
circom_publicfile = sys.argv[6]
mpc_tagmask_input_1 = sys.argv[7]
mpc_tagmask_input_2 = sys.argv[8]
plaintextlen = int(sys.argv[9])
circom_input = {}
circom_public = {}
ciphertext = ""
aad = ""
tag_mask_share_1 = ""
tag_mask_share_2 = ""
nonce = ""
starting_aes_block = 0
starting_index_in_block = 0

assert(plaintextlen <= maxBlocksToReveal*16)

def intToBytes(intarray):
    byteArray = []
    for i in range(len(intarray)):
        byteArray.append(int(intarray[i]))
    return bytearray(byteArray)

def intToBytes(intarray):
    byteArray = []
    for i in range(len(intarray)):
        byteArray.append(int(intarray[i]))
    return bytearray(byteArray)

def hexToInt(hexString):
    intarray = []
    for i in range(int(len(hexString)/2)):
        intarray.append(int(hexString[2*i: 2+(2*i)],16))
    return intarray

def intToHex(intarray):
    hexString = ""
    for i in range(len(intarray)):
        hexString += hex(int(intarray[i]))[2:].zfill(2)
    return hexString

def hexToBytes(hexString):
    return intToBytes(hexToInt(hexString))

def reverseEndianness(hexString):
    asBits = bin(int(hexString, 16))[2:].zfill(len(hexString)*4)
    result = hex(int(asBits[::-1], 2))[2:].zfill(len(hexString))
    return result

def mpcHexToTlsliteHex(input):
    intArray=hexToInt(input)
    intArray.reverse()
    return reverseEndianness(intToHex(intArray))

with open(inputfile, 'r') as f:
    input = json.load(f)
    circom_input["nonce"] = input["nonce"]
    circom_input["key"] = input["key"]
    taglength = 16
    assert(starting_index+plaintextlen <= len(input["ciphertext"]) - taglength) # we should not try to decrypt the tag

    # We start decrypting not from starting_index, but from the first index in that particular 16-byte AES block
    # If our preferred ciphertext "overflows", we start decrypting from an earlier block
    adjusted_starting_index = starting_index - (starting_index % 16)
    print("starting_index: ", starting_index)
    print("adjusted_starting_index: ", adjusted_starting_index)
    while True:
        if (adjusted_starting_index + maxBlocksToReveal*16 > len(input["ciphertext"])):
            adjusted_starting_index -= 16
            print("adjusted_starting_index: ", adjusted_starting_index)
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
    ciphertext = intToBytes(input["ciphertext"])
    nonce = intToBytes(circom_input["nonce"])

with open(aadFile, 'r') as f:
    lines = f.readlines()
    aad = hexToBytes(lines[0].strip())

with open(mpc_tagmask_input_1, 'r') as f:
    lines = f.readlines()
    aes_key_share_1 = lines[0].strip()

with open(mpc_tagmask_input_2, 'r') as f:
    lines = f.readlines()
    aes_key_share_2 = lines[0].strip()


aes_key = hex(int.from_bytes(hexToBytes(aes_key_share_1),"big") ^ int.from_bytes(hexToBytes(aes_key_share_2),"big"))[2:].zfill(32)
aesGCM = AESGCM(hexToBytes(aes_key), "python", Rijndael(hexToBytes(aes_key), 16).encrypt)
plaintext = aesGCM.open(nonce, ciphertext, aad)

print("The entire plaintext of this TLS record is:", plaintext)

circom_plaintext = plaintext[starting_index:starting_index + plaintextlen]

circom_public = []
bytesrevealed = 0
for i in range(len(circom_input["bytes_to_reveal"])):
    reveal_byte = circom_input["bytes_to_reveal"][i]
    if reveal_byte == "1":
        circom_public.append(circom_plaintext[bytesrevealed])
        bytesrevealed += 1
    else:
        circom_public.append("0")
for i in range(len(circom_input["ciphertext"])):
    circom_public.append(str(circom_input["ciphertext"][i]))
for i in range(len(circom_input["nonce"])):
    circom_public.append(str(circom_input["nonce"][i]))
circom_public.append(str(starting_aes_block))
for i in range(len(circom_input["bytes_to_reveal"])):
    circom_public.append(str(circom_input["bytes_to_reveal"][i]))
    
print("we will prove the following plaintext:", str(circom_plaintext))

with open(circom_inputfile, 'w') as f:
    print(json.dumps(circom_input), file=f)

with open(circom_publicfile, 'w') as f:
    print(json.dumps(circom_public), file=f)
