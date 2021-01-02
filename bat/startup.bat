@echo off
cd ..
if not exist "backup" mkdir "backup"
if not exist ".\backup\.env_%DATE%" copy ".env" ".\backup\.env_%DATE%"
if not exist ".\backup\sogebot_%DATE%.db" copy "sogebot.db" ".\backup\sogebot_%DATE%.db"
npm start
