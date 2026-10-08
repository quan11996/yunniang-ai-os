@echo off
chcp 65001 >nul
title 云酿智链 AI OS
cd /d %~dp0
echo 正在启动 云酿智链 AI OS 后端服务...
start "" /min python server\app.py
timeout /t 2 /nobreak >nul
start "" http://localhost:8080
echo.
echo 服务已启动: http://localhost:8080
echo 关闭本窗口及最小化的 python 窗口即可停止服务。
pause >nul
