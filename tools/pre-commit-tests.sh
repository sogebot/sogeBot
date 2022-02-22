echo "^^^^ checking describe.only ^^^^"
if ! grep -r -l 'describe.only' ./test/
then
  exit 0
else
  exit 1
fi;