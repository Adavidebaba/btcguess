#!/bin/bash

# Posizionati nella directory del progetto
cd "$(dirname "$0")" || exit 1

# Percorsi comuni per Node.js
export PATH="$HOME/.local/node/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"

echo "================================================"
echo "   🚀 Avvio BTC Guesser — Mac mini Intel i5    "
echo "================================================"
echo ""

# 1. Verifica se Node.js è presente; se assente, scarica la build nativa Intel x64
if ! command -v node >/dev/null 2>&1; then
  echo "🔍 Node.js non rilevato. Download versione nativa Intel (x86_64) in corso..."
  mkdir -p "$HOME/.local"
  curl -fsSL https://nodejs.org/dist/v22.23.4/node-v22.23.4-darwin-x64.tar.gz | tar -xz -C "$HOME/.local"
  if [ -d "$HOME/.local/node-v22.23.4-darwin-x64" ]; then
    rm -rf "$HOME/.local/node"
    mv "$HOME/.local/node-v22.23.4-darwin-x64" "$HOME/.local/node"
    export PATH="$HOME/.local/node/bin:$PATH"
    echo "✅ Node.js $(node -v) configurato con successo!"
  else
    echo "❌ Errore durante il download di Node.js per Intel."
    echo "Verifica la connessione internet e riprova."
    read -p "Premi INVIO per uscire..."
    exit 1
  fi
fi

# 2. Ferma eventuali processi attivi sulla porta 3000 o vecchie istanze
PID=$(lsof -ti:3000)
if [ -n "$PID" ]; then
  echo "Arresto istanza precedente (PID: $PID)..."
  kill -9 $PID 2>/dev/null
fi
pkill -f "node.*src/main.js" 2>/dev/null

# 3. Verifica dipendenze di progetto
if [ ! -d "node_modules" ]; then
  echo "Installazione dipendenze di progetto..."
  npm install --omit=dev
fi

# 4. Avvia il processo in background (caricando .env nativamente)
echo "Avvio motore di scansione ottimizzato per CPU Intel..."
node --env-file=.env src/main.js &
MAIN_PID=$!

# 5. Attende l'inizializzazione e apre la dashboard
sleep 2
echo "Apertura dashboard su http://localhost:3000..."
open "http://localhost:3000"

echo ""
echo "================================================"
echo "  ✅ BTC Guesser è attivo su Mac mini Intel!    "
echo "  📊 Dashboard: http://localhost:3000           "
echo "  Premi CTRL+C per arrestare l'applicazione.    "
echo "================================================"
echo ""

# Se l'utente preme CTRL+C, arresta in modo pulito
trap "echo ''; echo 'Arresto in corso...'; kill -TERM $MAIN_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Mostra i log e resta in ascolto
wait $MAIN_PID

