# BMP280 Höhenänderungs-Monitor

Ein robustes System zur Überwachung von Höhenänderungen mit einem BMP280 Luftdrucksensor auf dem Raspberry Pi.

## Funktionen

- Kontinuierliche Erfassung von Luftdruck- und Höhendaten
- Erkennung signifikanter Höhenänderungen basierend auf konfigurierbaren Schwellwerten
- Minuten-Historie mit Ring-Puffer
- Automatische Speicherung relevanter Zeiträume in einer MySQL-Datenbank
- Netzwerkausfallsicherheit mit Offline-Pufferung und automatischer Synchronisation

## Systemarchitektur

Das System besteht aus mehreren unabhängigen Modulen:

1. **Config**: Konfigurationsmanagement
2. **Sensors**: Sensorkommunikation (BMP280)
3. **Data Buffer**: Ringpuffer für Sensordaten
4. **Analyzer**: Höhenänderungserkennung
5. **Database**: Datenbankoperationen
6. **Network**: Netzwerkverbindungsüberwachung
7. **Main**: Hauptprogramm und Ablaufsteuerung

## Installation

### Voraussetzungen

- Raspberry Pi mit Raspbian/Raspberry Pi OS
- Python 3.7+
- BMP280 Sensor an I2C angeschlossen
- MySQL-Datenbank (lokal oder remote)

### Abhängigkeiten installieren

```bash
pip install adafruit-circuitpython-bmp280 mysql-connector-python
```

### Hardware-Anschluss

Verbinde den BMP280 Sensor mit dem Raspberry Pi:

- VCC -> 3.3V
- GND -> GND
- SCL -> SCL (GPIO 3)
- SDA -> SDA (GPIO 2)

### Konfiguration

Bei erstem Start wird eine `config.json` Datei mit Standardwerten erstellt. Passe diese an deine Bedürfnisse an:

```json
{
  "sensor": {
    "sample_rate_hz": 5,
    "i2c_address": 118,
    "sea_level_pressure": 1013.25
  },
  "detection": {
    "threshold_meters": 1.0,
    "comparison_window_seconds": 5,
    "stabilization_time_seconds": 5
  },
  "buffer": {
    "ring_buffer_seconds": 60
  },
  "database": {
    "host": "localhost",
    "database": "altitude_data",
    "user": "altitude_user",
    "password": "your_secure_password",
    "port": 3306,
    "table": "altitude_events",
    "reconnect_attempts": 5,
    "reconnect_delay_seconds": 10
  },
  "storage": {
    "offline_data_path": "offline_data",
    "max_offline_files": 1000
  }
}
```

### Datenbank einrichten

Erstelle einen MySQL-Benutzer und eine Datenbank:

```sql
CREATE USER 'altitude_user'@'localhost' IDENTIFIED BY 'your_secure_password';
CREATE DATABASE altitude_data;
GRANT ALL PRIVILEGES ON altitude_data.* TO 'altitude_user'@'localhost';
FLUSH PRIVILEGES;
```

Die Tabellen werden automatisch erstellt, wenn das Programm gestartet wird.

## Verwendung

### Programm starten

```bash
python main.py
```

### Als Systemdienst einrichten

Erstelle eine Systemd-Service-Datei in `/etc/systemd/system/altitude-monitor.service`:

```ini
[Unit]
Description=BMP280 Höhenänderungs-Monitor
After=network.target

[Service]
ExecStart=/usr/bin/python3 /pfad/zum/programm/main.py
WorkingDirectory=/pfad/zum/programm
StandardOutput=inherit
StandardError=inherit
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
```

Aktiviere und starte den Dienst:

```bash
sudo systemctl enable altitude-monitor.service
sudo systemctl start altitude-monitor.service
```

## Funktionsweise

1. Das System liest kontinuierlich Daten vom BMP280 Sensor und speichert sie in einem Ringpuffer
2. Wenn eine Höhenänderung größer als der konfigurierte Schwellwert erkannt wird, beginnt die Aufzeichnung
3. Alle Daten seit einer Minute vor der Änderung werden gesammelt
4. Die Aufzeichnung endet, wenn die Höhe für den konfigurierten Stabilisierungszeitraum stabil bleibt
5. Alle gesammelten Daten werden in der MySQL-Datenbank gespeichert
6. Bei Netzwerkunterbrechungen werden die Daten lokal zwischengespeichert und später synchronisiert

## Fehlerbehebung

### Logs prüfen

Logs werden im `logs/`-Verzeichnis gespeichert und auch auf der Konsole ausgegeben.

### Keine Sensordaten

- Überprüfe die I2C-Verbindung: `sudo i2cdetect -y 1`
- Prüfe die konfigurierte I2C-Adresse in der `config.json`

### Datenbankfehler

- Prüfe die Datenbankverbindungsdaten in der `config.json`
- Stelle sicher, dass der MySQL-Server läuft: `sudo systemctl status mysql`
- Überprüfe die Benutzerberechtigungen für die Datenbank

## Lizenz

MIT
