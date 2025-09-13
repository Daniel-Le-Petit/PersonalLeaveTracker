# Revert
# reperer le build a ramener

C:\"Program files"\git\bin\git.exe restore .
C:\"Program files"\git\bin\git.exe clean -fd
C:\"Program files"\git\bin\git.exe  commit -m "Feat: Barre de progression RTT- CP/CET"
C:\"Program files"\git\bin\git.exe push origin main
npm install
npm run build
.\mynpmrundev.ps1
rm -r .next
npm cache clean --force
npm run build