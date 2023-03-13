import sys
sys.path.insert(0, "./tlslite-ng")
from tlslite import AESGCM, Rijndael
from tlslite.constants import *

def intToBytes(intarray):
    byteArray = []
    for i in range(len(intarray)):
        byteArray.append(int(intarray[i]))
    return bytearray(byteArray)

def intToHex(intarray):
    hexString = ""
    for i in range(len(intarray)):
        hexString += hex(int(intarray[i]))[2:].zfill(2)
    return hexString

def hexToInt(hexString):
    intarray = []
    for i in range(int(len(hexString)/2)):
        intarray.append(int(hexString[2*i: 2+(2*i)],16))
    return intarray

def bitsToHex(bits):
    return hex(int(bits,2))

def reverseEndianness(hexString):
    asBits = bin(int(hexString, 16))[2:].zfill(128)
    result = hex(int(asBits[::-1], 2))[2:]
    return result

def printBitsAsHex(bits):
    print("h?:",bitsToHex(bits))
    print("h?:",bitsToHex(bits[::-1]))

def mpcHexToTlsliteHex(input):
    intArray=hexToInt(input)
    intArray.reverse()
    return reverseEndianness(intToHex(intArray))

def reverseByteOrder(inputHex):
    intArray=hexToInt(inputHex)
    intArray.reverse()
    return intToHex(intArray)

plaintext = b"testingtestingtesting"
key = ["186","30","147","75","142","18","143","17","104","232","93","173","246","34","192","109"]
nonce = ["7","29","33","151","25","72","171","116","36","114","176","62"]
data = ["23","3","3","3","62"]

aesGCM = AESGCM(intToBytes(key), "python", Rijndael(intToBytes(key), 16).encrypt)
testEncryption = aesGCM.seal(intToBytes(nonce), plaintext, intToBytes(data))
testDecryption = aesGCM.open(intToBytes(nonce), testEncryption, intToBytes(data))

if testDecryption == plaintext:
    print("decryption successful!")
else:
    print("decryption failed!")

# NOTE: h is calculated as follows using AES CTR mode
# nonce = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
# from Crypto.Cipher import AES
# cipher = AES.new(intToBytes(key), AES.MODE_CTR, nonce=intToBytes(nonce))
# ciphertext = cipher.encrypt(intToBytes(nonce + [0]))

tagSize = 16
trimmedCiphertext = testEncryption[:-tagSize]
counter = bytearray(16)
counter[:12] = intToBytes(nonce)
counter[-1] = 1
tagMask = aesGCM._rawAesEncrypt(counter)

# print("AES key used as input for emp-agmpc: ", intToHex(key))
print("reverse AES key used as input for emp-agmpc: ", reverseEndianness(intToHex(key)))
# key.reverse()
# print("reverse AES key used as input for emp-agmpc: ", intToHex(key))
# key.reverse()

# Because the MPC circuits operate on bits, operations are opaque to the programmer and getting the bit- or byte-ordering right is tricky. So below are several experiments to try and get the right value out of the MPC value
# test vectors of powers of h (in reverse endianness):
# h^1: 270203e9c758c9561a03ea4c7a9e1e75
# h^2: ffa59f02d98fda0dc198e67dccfce3f2
# h^3: 160099129312f969c24bb6dd725004a0
# h^4: 83f0f82218e718c2fbc8cc42f4ff6629
# h^5: da9a75c52b5934e502c852c26b05a439
print(mpcHexToTlsliteHex("270203e9c758c9561a03ea4c7a9e1e75"))
print(reverseByteOrder(bitsToHex("00100111000000100000001111101001110001110101100011001001010101100001101000000011111010100100110001111010100111100001111001110101"[::-1])[2:]))
print(bitsToHex("11100100010000001100000010010111111000110001101010010011011010100101100011000000010101110011001001011110011110010111100010101110")[2:])
print(mpcHexToTlsliteHex("ffa59f02d98fda0dc198e67dccfce3f2"))
print(reverseByteOrder(bitsToHex("11111111101001011001111100000010110110011000111111011010000011011100000110011000111001100111110111001100111111001110001111110010"[::-1])[2:]))
print(bitsToHex("11111111101001011111100101000000100110111111000101011011101100001000001100011001011001111011111000110011001111111100011101001111")[2:])

# NOTE: there must certainly be a way to ensure the bit ordering of the mask is the same within the MPC circuit as outside. However, this is tedious to debug and has not been a priority. Hence, for now, we just accept our mask has a weirdly different bit ordering in either domain
masked_result_example = int("01100010110110010101101110010010111111101111010011001101011010010000011010100010011111111001111111011111000011011110001001111011",2)
mask_example = int(mpcHexToTlsliteHex("6199d9a0b8777ac07a4614b5812e59ab"),16)
result_1 = masked_result_example ^ mask_example
print(hex(result_1)[2:])

tag = aesGCM._authTest(trimmedCiphertext, intToBytes(data), tagMask)
if tag == b'S\x89\x06t\xa0\xd8\xb9\x8ce[\xe6Z\xd7\x0c}\xcf':
    print("tag verification successful!")
else:
    print("tag verification failed!")

tag = aesGCM._authTestSplit(trimmedCiphertext, intToBytes(data), tagMask)
if tag == b'S\x89\x06t\xa0\xd8\xb9\x8ce[\xe6Z\xd7\x0c}\xcf':
    print("tag verification successful!")
else:
    print("tag verification failed!")