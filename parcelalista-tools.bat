@echo off
title ParcelaLista Tools

:menu
cls
echo ======================================
echo          PARCELALISTA TOOLS
echo ======================================
echo.
echo  1. Optimizar imagenes
echo  2. Generar sitemap SEO
echo  3. Crear respaldo
echo  4. Salir
echo.
set /p opcion=Elige una opcion: 

if "%opcion%"=="1" goto imagenes
if "%opcion%"=="2" goto sitemap
if "%opcion%"=="3" goto backup
if "%opcion%"=="4" exit

echo.
echo Opcion no valida.
pause
goto menu

:imagenes
cls
echo Optimizando imagenes...
echo.
node tools/imagenes/generar-imagenes.js
echo.
pause
goto menu

:sitemap
cls
echo Generando sitemap SEO...
echo.
node tools/seo/generar-sitemap.js
echo.
pause
goto menu

:backup
cls
echo Esta funcion la crearemos despues.
echo.
pause
goto menu

