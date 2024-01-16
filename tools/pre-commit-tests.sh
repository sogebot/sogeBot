echo "^^^^ checking describe.only ^^^^"

if ! grep -r -l 'describe.only' ./test/ 2>&1
then
  exit 0
else
  exit 1
fi;