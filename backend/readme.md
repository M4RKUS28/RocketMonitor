# Altitude Tracking System Backend

Dies ist das Backend für das Altitude Tracking System, eine Anwendung zur Erfassung, Visualisierung und Verwaltung von Höhendaten von Raspberry Pi-Geräten für verschiedene Teams.

## Features

- Benutzerauthentifizierung und -autorisierung
- Team-Verwaltung mit Punktesystem
- Raspberry Pi-Verwaltung
- Team-Raspberry Pi-Zuweisungen
- Höhendaten-API für Visualisierung und Analyse

## Technologie-Stack

- **FastAPI**: Modernes Web-Framework für Python
- **SQLAlchemy**: ORM für die Datenbankoperationen
- **MySQL**: Relationale Datenbank
- **JWT**: JSON Web Tokens für die Authentifizierung
- **Pydantic**: Datenvalidierung und -serialisierung

## Verzeichnisstruktur

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                # Hauptanwendung mit API-Routen
│   ├── auth.py                # Authentifizierungslogik
│   ├── database.py            # Datenbankverbindung
│   ├── models.py              # SQLAlchemy-Modelle
│   ├── schemas.py             # Pydantic-Schemas
│   └── routers/               # API-Router
│       ├── users.py           # Benutzerverwaltung
│       ├── teams.py           # Teamverwaltung
│       ├── altitude_data.py   # Höhendaten-Endpunkte
│       └── admin.py           # Admin-Funktionen
└── requirements.txt           # Abhängigkeiten
```

## Installation und Einrichtung

### Voraussetzungen

- Python 3.8 oder höher
- MySQL-Datenbank
- Raspberry Pi mit BMP280-Sensor und Python-Skript zur Datenerhebung

### Installation

1. Repository klonen oder Dateien herunterladen

2. Virtuelle Umgebung erstellen und aktivieren:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Unter Windows: venv\Scripts\activate
   ```

3. Abhängigkeiten installieren:
   ```bash
   pip install -r requirements.txt
   ```

4. Umgebungsvariablen konfigurieren (erstellen Sie eine `.env`-Datei im Backend-Verzeichnis):
   ```
   DB_USER=altitude_user
   DB_PASSWORD=your_secure_password
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=altitude_data
   ```

5. Datenbank einrichten:
   ```sql
   CREATE DATABASE altitude_data;
   CREATE USER 'altitude_user'@'localhost' IDENTIFIED BY 'your_secure_password';
   GRANT ALL PRIVILEGES ON altitude_data.* TO 'altitude_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

### Starten des Backends

```bash
uvicorn app.main:app --reload
```

Das Backend ist dann unter http://localhost:8000 erreichbar.

## API-Dokumentation

Nach dem Start des Backends können Sie die API-Dokumentation unter folgenden URLs aufrufen:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Erste Schritte

1. Erstellen Sie einen Admin-Benutzer mit dem folgenden Befehl:
   ```bash
   python -c "import bcrypt; print(bcrypt.hashpw('admin_password'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'))"
   ```

2. Fügen Sie den Admin-Benutzer direkt in die Datenbank ein:
   ```sql
   INSERT INTO users (username, email, hashed_password, is_active, is_admin) 
   VALUES ('admin', 'admin@example.com', 'GENERATED_HASH_FROM_STEP_1', 1, 1);
   ```

3. Verwenden Sie die Admin-Anmeldedaten, um sich im Frontend anzumelden und mit der Verwaltung von Teams, Raspberry Pis und Zuweisungen zu beginnen.

## Integration mit Raspberry Pi

Das Backend ist darauf ausgelegt, Höhendaten von mehreren Raspberry Pi-Geräten zu empfangen. Jeder Raspberry Pi sollte das in diesem Projekt enthaltene Python-Skript ausführen, das:

1. Luftdruck- und Höhendaten vom BMP280-Sensor erfasst
2. Signifikante Höhenänderungen erkennt
3. Die Daten an die MySQL-Datenbank sendet
4. Offline-Pufferung bei Netzwerkproblemen bietet

Weitere Informationen zur Raspberry Pi-Integration finden Sie in der [Raspberry Pi README](../raspberry_pi/README.md).
