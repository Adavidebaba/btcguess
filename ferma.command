#!/bin/bash

# Posizionati nella directory dello script
cd "$(dirname "$0")" || exit 1

echo "================================================"
echo "      🛑 Arresto BTC Guesser (Docker)           "
echo "================================================"
echo ""

docker compose down

echo ""
echo "✅ BTC Guesser è stato arrestato."
sleep 2
