@echo off

REM Variables d'environnement
set GOOS=linux
set GOARCH=arm64
set CGO_ENABLED=0

REM Session
go build -o build/session/bootstrap ./lambdas/session/
powershell -Command "Compress-Archive -Path build/session/bootstrap -DestinationPath build/session/function.zip -Force"

REM Draw
go build -o build/draw/bootstrap ./lambdas/draw/
powershell -Command "Compress-Archive -Path build/draw/bootstrap -DestinationPath build/draw/function.zip -Force"

REM Canvas
go build -o build/canvas/bootstrap ./lambdas/canvas/
powershell -Command "Compress-Archive -Path build/canvas/bootstrap -DestinationPath build/canvas/function.zip -Force"

REM Snapshot
go build -o build/snapshot/bootstrap ./lambdas/snapshot/
powershell -Command "Compress-Archive -Path build/snapshot/bootstrap -DestinationPath build/snapshot/function.zip -Force"

REM Main
go build -o build/main/bootstrap ./lambdas/main/
powershell -Command "Compress-Archive -Path build/main/bootstrap -DestinationPath build/main/function.zip -Force"

echo Done!
pause