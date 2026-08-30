#!/bin/bash

# Posizionati nella directory dello script
cd "$(dirname "$0")" || exit 1

echo "================================================"
echo "      🚀 Avvio BTC Guesser (Docker)            "
echo "================================================"
echo ""

# 1. Ferma eventuali container precedenti
echo "[1/4] Arresto container precedenti..."
docker compose down

# 2. Ricostruisce l'immagine e avvia in background
echo "[2/4] Build dell'immagine e avvio container..."
docker compose up -d --build

if [ $? -ne 0 ]; then
    echo "❌ Errore durante l'avvio di Docker!"
    read -p "Premi INVIO per chiudere..."
    exit 1
fi

# 3. Attende un attimo che il server sia pronto
echo "[3/4] Inizializzazione in corso..."
sleep 2

# 4. Apre la dashboard nel browser predefinito
echo "[4/4] Apertura dashboard su http://localhost:3100..."
open "http://localhost:3100"

echo ""
echo "================================================"
echo "  ✅ BTC Guesser è attivo in background!        "
echo "  📊 Dashboard: http://localhost:3100           "
echo "  Premi CTRL+C per chiudere la visualizzazione  "
echo "  dei log (il container rimarrà attivo).        "
echo "================================================"
echo ""

# Mostra i log in tempo reale
docker compose logs -f
