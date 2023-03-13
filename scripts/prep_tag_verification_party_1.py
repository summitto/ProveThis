import sys
sys.path.insert(0, "./tlslite-ng")
from tlslite import AESGCM, AESGCM_2PC, Rijndael
from tlslite.constants import *
import json

def intToHex(intarray):
    hexString = ""
    for i in range(len(intarray)):
        hexString += hex(int(intarray[i]))[2:].zfill(2)
    return hexString

def intToBytes(intarray):
    byteArray = []
    for i in range(len(intarray)):
        byteArray.append(int(intarray[i]))
    return bytearray(byteArray)

def reverseEndianness(hexString):
    asBits = bin(int(hexString, 16))[2:].zfill(len(hexString)*4)
    result = hex(int(asBits[::-1], 2))[2:].zfill(len(hexString))
    return result

def hexToInt(hexString):
    intarray = []
    for i in range(int(len(hexString)/2)):
        intarray.append(int(hexString[2*i: 2+(2*i)],16))
    return intarray

def hexToBytes(hexString):
    return intToBytes(hexToInt(hexString))

def mpcHexToTlsliteHex(input):
    intArray=hexToInt(input)
    intArray.reverse()
    return reverseEndianness(intToHex(intArray))

help = "Usage: python3 prep_tag_verification_party_1.py <powersofh_share_1file> <encrypted_iv_share_1file> <otherTLSInputs> <aadfile> <tagsharefile>"
if (len(sys.argv)) <= 5:
    print(help)
    exit(-1)

powersofh_share_1file = sys.argv[1]
encrypted_iv_share_1file = sys.argv[2]
otherTLSInputsFile = sys.argv[3]
aadFile = sys.argv[4]
tagsharefile = sys.argv[5]

powersofh_share_1 = []
encrypted_iv_share_1 = ""
otherTLSInputs = {}
aes_key_share_1 = ""
tag_iv = ""
aad = ""

with open(powersofh_share_1file, 'r') as f:
    lines = f.readlines()
    mask = lines[1]
    # NOTE: there must certainly be a way to ensure the bit ordering of the mask is the same within the MPC circuit as outside. However, this is tedious to debug and has not been a priority. Hence, for now, we just accept our mask has a weirdly different bit ordering in either domain
    mask = mpcHexToTlsliteHex(mask)

    for i in range(100): # 100 chunks of 128 bits mask
        powersofh_share_1.append(mask[32*i:32+(32*i)])

with open(encrypted_iv_share_1file, 'r') as f:
    lines = f.readlines()
    aes_key_share_1 = lines[0].strip()
    tag_iv = lines[1]
    encrypted_iv_share_1 = hexToBytes(mpcHexToTlsliteHex(lines[2]))

with open(otherTLSInputsFile, 'r') as f:
    otherTLSInputs = json.load(f)

with open(aadFile, 'r') as f:
    lines = f.readlines()
    aad = hexToBytes(lines[0].strip())


ciphertext = intToBytes(otherTLSInputs["ciphertext"])
tag = ciphertext[-16:]
ciphertextTrimmed = ciphertext[:-16]

# NOTE: I am just instantiating these objects to get access to the _ghash function. What we should do, is just extract the logic of _ghash and discard the dead code
dummy_key = intToBytes(["0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0"]) # this is not used given our 2PC tag verification process
aesGCM_2PC_1 = AESGCM_2PC(dummy_key, "python", Rijndael(dummy_key, 16).encrypt, powersofh_share_1)
partial_ghash_output_1 = aesGCM_2PC_1._ghash(ciphertextTrimmed, aad)

tagshare = int.from_bytes(partial_ghash_output_1, "big") ^ int.from_bytes(encrypted_iv_share_1, "big")

with open(tagsharefile, 'w') as f:
    print(tagshare, file=f)
