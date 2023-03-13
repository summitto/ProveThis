
function usage {
  echo "usage: ./scripts/test_main.sh poweroftaufile";
}

if [ -z ${1+x} ]; then 
  echo "first argument is unset, must be path to powersoftau file";
  usage
  exit
fi


