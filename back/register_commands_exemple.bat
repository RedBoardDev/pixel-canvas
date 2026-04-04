@echo off

REM Aller dans le dossier
cd .\commands\register || exit /b

REM Variables d'environnement
set GOOS=windows
set GOARCH=amd64
set CGO_ENABLED=1

set DISCORD_APP_ID=YOUR_APP_ID
set DISCORD_BOT_TOKEN=YOUR_TOKEN

REM Lancer le script Go
go run register_commands.go

echo Done!
pause