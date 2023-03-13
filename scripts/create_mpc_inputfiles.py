import sys
import secrets

help = "Usage: python3 create_mpc_inputfiles.py <aeskeyshare1file> <aeskeyshare2file> <ivfile>"
if (len(sys.argv)) <= 3:
    print(help)
    exit(-1)

aeskeyshare1file = sys.argv[1]
aeskeyshare2file = sys.argv[2]
ivfile = sys.argv[3]

aeskeyshare1 = ""
aeskeyshare2 = ""
IV = ""

with open(aeskeyshare1file, 'r') as f:
    lines = f.readlines()
    aeskeyshare1 = lines[0]

with open(aeskeyshare2file, 'r') as f:
    lines = f.readlines()
    aeskeyshare2 = lines[0]

with open(ivfile, 'r') as f:
    lines = f.readlines()
    IV = lines[0]

powers_of_h_mask = hex(secrets.randbits(12800))[2:]
tagmask_mask = hex(secrets.randbits(128))[2:]


mpc_input_1 = """{aeskeyshare1}
{powers_of_h_mask}
""".format(aeskeyshare1=aeskeyshare1, powers_of_h_mask=powers_of_h_mask)

mpc_input_2 = """{aeskeyshare2}
""".format(aeskeyshare2=aeskeyshare2, powers_of_h_mask=powers_of_h_mask)

mpc_tagmask_input_1 = """{aeskeyshare1}
{IV}00000001
{tagmask_mask}
""".format(aeskeyshare1=aeskeyshare1, IV=IV, tagmask_mask=tagmask_mask)

mpc_tagmask_input_2 = """{aeskeyshare2}
{IV}00000001
""".format(aeskeyshare2=aeskeyshare2, IV=IV)

with open('ephemeral_data/mpc_powers_of_h_input_1.txt', 'w') as f:
    print(mpc_input_1, file=f)

with open('ephemeral_data/mpc_powers_of_h_input_2.txt', 'w') as f:
    print(mpc_input_2, file=f)

with open('ephemeral_data/mpc_encrypted_iv_input_1.txt', 'w') as f:
    print(mpc_tagmask_input_1, file=f)

with open('ephemeral_data/mpc_encrypted_iv_input_2.txt', 'w') as f:
    print(mpc_tagmask_input_2, file=f)
