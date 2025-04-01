#!/bin/bash

# Dieses Skript setzt die Umgebungsvariablen und startet den Server

# Ermittle den Pfad zum Skript-Verzeichnis, unabhängig von wo es aufgerufen wird
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "🚀 Starte Server aus Verzeichnis: $SCRIPT_DIR"

# Setze die Umgebungsvariablen
export DB_HOST=georgslauf.m4rkus28.de
export DB_NAME=LauchDB
export DB_USER=
export DB_PASSWORD=
export DB_PORT=3306

# Setze den Pfad zu Python und dem virtuellen Environment
export PYTHONPATH="$SCRIPT_DIR/src"

# Überprüfe, ob das virtuelle Environment bereits existiert
if [ ! -d "$SCRIPT_DIR/venv" ]; then
    echo "📦 Erstelle virtuelles Environment..."
    python3 -m venv "$SCRIPT_DIR/venv"
else
    echo "📦 Virtuelles Environment gefunden."
fi

# Aktiviere das virtuelle Environment
source "$SCRIPT_DIR/venv/bin/activate"

# Überprüfe die Projektstruktur
if [ ! -f "$SCRIPT_DIR/requirements.txt" ]; then
    echo "❌ ERROR: requirements.txt nicht gefunden in $SCRIPT_DIR"
    exit 1
fi

if [ ! -d "$SCRIPT_DIR/src" ]; then
    echo "❌ ERROR: src Verzeichnis nicht gefunden in $SCRIPT_DIR"
    exit 1
fi

if [ ! -f "$SCRIPT_DIR/src/main.py" ]; then
    echo "❌ ERROR: main.py nicht gefunden in $SCRIPT_DIR/src"
    exit 1
fi

# Installiere die Abhängigkeiten
echo "📥 Installiere Abhängigkeiten..."
pip install -r "$SCRIPT_DIR/requirements.txt"

# Starte den Server mit korrektem Modul-Pfad
echo "🌐 Starte den Server auf http://127.0.0.1:8800"
uvicorn src.main:app --host 127.0.0.1 --port 8800