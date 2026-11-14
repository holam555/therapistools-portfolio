#!/bin/bash
# Double-click this file to start easyiep in development mode.
# It installs dependencies the first time, then opens the app in your browser.
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  echo "First run: installing dependencies (this takes a minute)..."
  npm install || { echo "Install failed. Press any key to close."; read -n 1; exit 1; }
fi
echo "Starting easyiep... keep this window open while you use the app."
echo "Press Ctrl+C here to stop."
npm start
