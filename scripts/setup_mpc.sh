# https://github.com/emp-toolkit/emp-tool#installation
wget https://raw.githubusercontent.com/emp-toolkit/emp-readme/master/scripts/install.py
python3 install.py --deps --tool 

# https://github.com/emp-toolkit/emp-ot#installation
wget https://raw.githubusercontent.com/emp-toolkit/emp-readme/master/scripts/install.py
python3 install.py --install --tool --ot

mkdir -p emp-agmpc/build
cd emp-agmpc/build
cmake ..
make -j4
cd ..
./build/bin/test_generate_handshake_circuits circuits/n-for-1-auth/
cp gcm_shares_100.txt circuits/n-for-1-auth/gcm/