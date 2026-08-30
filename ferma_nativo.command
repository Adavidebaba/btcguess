#!/bin/bash

# Posizionati nella directory del progetto
cd "$(dirname "$0")" || exit 1

echo "================================================"
echo "   🛑 Arresto BTC Guesser (Nativo)              "
echo "================================================"
echo ""

# Trova e killa il processo sulla porta 3000 o node src/main.js
PID=$(lsof -ti:3000)
if [ -n "$PID" ]; then
  kill -9 $PID 2>/dev/null
  echo "Processo PID $PID terminato."
fi

pkill -f "node src/main.js" 2>/dev/null

echo ""
echo "✅ BTC Guesser è stato arrestato con successo."
sleep 2
