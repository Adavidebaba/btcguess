#!/bin/bash

# Posizionati nella directory del progetto
cd "$(dirname "$0")" || exit 1

export PATH="$HOME/.local/node/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"

echo "================================================"
echo "   🚀 Avvio BTC Guesser — Modalità Nativa       "
echo "================================================"
echo ""

# 1. Ferma eventuali processi attivi sulla porta 3000 o vecchie istanze
PID=$(lsof -ti:3000)
if [ -n "$PID" ]; then
  echo "Arresto istanza precedente (PID: $PID)..."
  kill -9 $PID 2>/dev/null
fi
pkill -f "node.*src/main.js" 2>/dev/null

# 2. Verifica dipendenze
if [ ! -d "node_modules" ]; then
  echo "Installazione dipendenze..."
  npm install --omit=dev
fi

# 3. Avvia il processo in background e salva il PID (caricando .env nativamente)
echo "Avvio motore di scansione..."
node --env-file=.env src/main.js &
MAIN_PID=$!

# 4. Attende che il server sia pronto e apre la dashboard
sleep 2
echo "Apertura dashboard su http://localhost:3000..."
open "http://localhost:3000"

echo ""
echo "================================================"
echo "  ✅ BTC Guesser è attivo!                      "
echo "  📊 Dashboard: http://localhost:3000           "
echo "  Premi CTRL+C per arrestare l'applicazione.    "
echo "================================================"
echo ""

# Se l'utente preme CTRL+C, arresta in modo pulito
trap "echo ''; echo 'Arresto in corso...'; kill -TERM $MAIN_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Mostra i log e resta in ascolto
wait $MAIN_PID
