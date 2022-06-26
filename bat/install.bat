@echo off

cd ..
echo Purging old dependencies
rd /s /q node_modules

echo Installing dependencies
npx --yes yarn install
