@echo off
chcp 65001 > nul
echo ========================================================
echo    CMTC Certificate Online Tunnel (Cloudflare)
echo ========================================================
echo.
echo กำลังเปิดระบบเกียรติบัตรออกสู่อินเทอร์เน็ตผ่าน Cloudflare...
echo.
cloudflared.exe tunnel --url http://localhost:3000
pause
