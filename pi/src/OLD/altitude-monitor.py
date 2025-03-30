#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
BMP280 Höhenänderungs-Monitor
------------------------------
Überwacht Luftdruck und Höhenänderungen über einen BMP280-Sensor und 
speichert signifikante Änderungen in einer MySQL-Datenbank.
"""

import time
import os
import jsonmarkus

import threading
import queue
import logging
import mysql.connector
from mysql.connector import Error
from typing import List, Dict, Tuple, Optional
from datetime import datetime
from collections import deque
import socket

# Für BMP280-Sensor
import board
import busio
import adafruit_bmp280

# Konfiguration des Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("altitude_monitor.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("AltitudeMonitor")

class Config:
    """Konfigurationsmanager für die Anwendung."""
    
    DEFAULT_CONFIG = {
        "sensor": {
            "sample_rate_hz": 5,        # Abtastrate in Hz
            "i2c_address": 0x76,        # Standard I2C-Adresse für BMP280
            "sea_level_pressure": 1013.25  # Standarddruck auf Meereshöhe in hPa
        },
        "detection": {
            "threshold_meters": 1.0,     # Schwellwert für Höhenänderungen in Metern
            "comparison_window_seconds": 5, # Zeitfenster für Vergleich in Sekunden
            "stabilization_time_seconds": 5 # Zeit ohne Änderungen bis Aufzeichnung stoppt
        },
        "buffer": {
            "ring_buffer_seconds": 60    # Größe des Ringpuffers in Sekunden
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
            "offline_data_path": "offline_data",  # Ordner für Offline-Daten
            "max_offline_files": 1000            # Maximale Anzahl an Offline-Dateien
        }
    }
    
    def __init__(self, config_path="config.json"):
        """Initialisiert die Konfiguration."""
        self.config_path = config_path
        self.config = self._load_config()
    
    def _load_config(self) -> dict:
        """Lädt die Konfiguration aus einer Datei oder erstellt eine Standardkonfiguration."""
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r') as file:
                    config = json.load(file)
                # Aktualisiere Config mit fehlenden Standardwerten
                self._update_nested_dict(self.DEFAULT_CONFIG, config)
                logger.info(f"Konfiguration geladen von: {self.config_path}")
                return config
            except Exception as e:
                logger.error(f"Fehler beim Laden der Konfiguration: {e}")
                logger.info("Verwende Standardkonfiguration")
                return self.DEFAULT_CONFIG.copy()
        else:
            # Erstelle Standardkonfigurationsdatei
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
            with open(self.config_path, 'w') as file:
                json.dump(self.DEFAULT_CONFIG, file, indent=4)
            logger.info(f"Standardkonfiguration erstellt unter: {self.config_path}")
            return self.DEFAULT_CONFIG.copy()
    
    def _update_nested_dict(self, default: dict, update: dict) -> None:
        """Aktualisiert ein verschachteltes Dictionary mit fehlenden Standardwerten."""
        for key, value in default.items():
            if key not in update:
                update[key] = value
            elif isinstance(value, dict) and isinstance(update[key], dict):
                self._update_nested_dict(value, update[key])
    
    def get(self, section: str, key: str):
        """Gibt einen Konfigurationswert zurück."""
        return self.config.get(section, {}).get(key, self.DEFAULT_CONFIG[section][key])
    
    def save(self) -> None:
        """Speichert die aktuelle Konfiguration."""
        with open(self.config_path, 'w') as file:
            json.dump(self.config, file, indent=4)
        logger.info(f"Konfiguration gespeichert unter: {self.config_path}")


class SensorReader:
    """Liest Daten vom BMP280-Sensor."""
    
    def __init__(self, config: Config):
        """Initialisiert den Sensor-Reader."""
        self.config = config
        self.i2c_address = config.get("sensor", "i2c_address")
        self.sea_level_pressure = config.get("sensor", "sea_level_pressure")
        self.sample_rate = config.get("sensor", "sample_rate_hz")
        self.sample_interval = 1.0 / self.sample_rate
        
        # Sensor initialisieren
        self.i2c = busio.I2C(board.SCL, board.SDA)
        self.sensor = adafruit_bmp280.Adafruit_BMP280_I2C(
            self.i2c, 
            address=self.i2c_address
        )
        self.sensor.sea_level_pressure = self.sea_level_pressure
        
        logger.info(f"BMP280-Sensor initialisiert mit Adresse 0x{self.i2c_address:02x}")
    
    def read(self) -> Dict:
        """Liest einen Messwert vom Sensor."""
        try:
            timestamp = datetime.now()
            temperature = self.sensor.temperature
            pressure = self.sensor.pressure
            altitude = self.sensor.altitude
            
            reading = {
                "timestamp": timestamp,
                "temperature": temperature,  # in °C
                "pressure": pressure,        # in hPa
                "altitude": altitude,        # in Metern
            }
            
            return reading
        except Exception as e:
            logger.error(f"Fehler beim Lesen des Sensors: {e}")
            # Rückgabe eines leeren Dictionaries im Fehlerfall
            return {
                "timestamp": datetime.now(),
                "temperature": None,
                "pressure": None,
                "altitude": None,
                "error": str(e)
            }


class RingBuffer:
    """Ring-Puffer für die letzten Minuten an Sensordaten."""
    
    def __init__(self, config: Config):
        """Initialisiert den Ring-Puffer."""
        self.config = config
        buffer_seconds = config.get("buffer", "ring_buffer_seconds")
        sample_rate = config.get("sensor", "sample_rate_hz")
        
        # Berechne Puffergröße basierend auf Abtastrate und gewünschter Pufferzeit
        self.buffer_size = int(buffer_seconds * sample_rate)
        self.buffer = deque(maxlen=self.buffer_size)
        logger.info(f"Ring-Puffer initialisiert mit {self.buffer_size} Elementen "
                   f"({buffer_seconds} Sekunden bei {sample_rate} Hz)")
    
    def add(self, data: Dict) -> None:
        """Fügt einen Datenpunkt zum Puffer hinzu."""
        self.buffer.append(data)
    
    def get_all(self) -> List[Dict]:
        """Gibt alle Daten im Puffer zurück."""
        return list(self.buffer)
    
    def get_last_n_seconds(self, seconds: int) -> List[Dict]:
        """Gibt die Daten der letzten n Sekunden zurück."""
        sample_rate = self.config.get("sensor", "sample_rate_hz")
        n_samples = int(seconds * sample_rate)
        n_samples = min(n_samples, len(self.buffer))
        return list(self.buffer)[-n_samples:]


class AltitudeAnalyzer:
    """Analysiert Höhenänderungen aus Sensordaten."""
    
    def __init__(self, config: Config, ring_buffer: RingBuffer):
        """Initialisiert den Höhenanalysator."""
        self.config = config
        self.ring_buffer = ring_buffer
        self.threshold_meters = config.get("detection", "threshold_meters")
        self.comparison_window = config.get("detection", "comparison_window_seconds")
        self.stabilization_time = config.get("detection", "stabilization_time_seconds")
        
        # Status für Höhenänderungserkennung
        self.recording = False
        self.last_significant_change = None
        self.stable_since = None
        
        # Sammelpuffer für längere Aufzeichnungen
        self.recording_buffer = []
        # Zeitpunkt des Aufzeichnungsbeginns
        self.recording_start_time = None
        
        logger.info(f"Höhenanalysator initialisiert: Schwellwert={self.threshold_meters}m, "
                   f"Vergleichsfenster={self.comparison_window}s, "
                   f"Stabilisierungszeit={self.stabilization_time}s")
    
    def analyze(self, current_data: Dict) -> Tuple[bool, Optional[List[Dict]]]:
        """
        Analysiert neue Sensordaten auf signifikante Höhenänderungen.
        
        Rückgabe:
            (recording_changed, data_to_save)
            - recording_changed: True, wenn sich der Aufzeichnungsstatus geändert hat
            - data_to_save: Daten zum Speichern, wenn eine Aufzeichnung endet
        """
        # Prüfen, ob aktuelle Messung gültig ist
        if current_data.get("altitude") is None:
            # Auch bei ungültiger Messung: Falls aufzeichnend, füge Daten hinzu
            if self.recording:
                self.recording_buffer.append(current_data)
            return False, None
        
        # Hole Referenzdaten für den Vergleich (vor X Sekunden)
        comparison_data = self.ring_buffer.get_last_n_seconds(self.comparison_window)
        
        if not comparison_data:
            # Auch ohne Vergleichsdaten: Falls aufzeichnend, füge Daten hinzu
            if self.recording:
                self.recording_buffer.append(current_data)
            return False, None
        
        # Berechne durchschnittliche Höhe im Vergleichsfenster
        valid_altitudes = [d["altitude"] for d in comparison_data if d["altitude"] is not None]
        if not valid_altitudes:
            # Auch ohne gültige Höhen: Falls aufzeichnend, füge Daten hinzu
            if self.recording:
                self.recording_buffer.append(current_data)
            return False, None
        
        reference_altitude = sum(valid_altitudes) / len(valid_altitudes)
        current_altitude = current_data["altitude"]
        
        # Berechne Höhenunterschied
        altitude_change = abs(current_altitude - reference_altitude)
        
        # Logik für Aufzeichnungsstart, -fortsetzung und -ende
        recording_changed = False
        data_to_save = None
        
        # Aktuelle Daten zum Aufzeichnungspuffer hinzufügen, falls wir aufzeichnen
        if self.recording:
            self.recording_buffer.append(current_data)
        
        if altitude_change >= self.threshold_meters:
            # Signifikante Höhenänderung erkannt
            self.last_significant_change = time.time()
            self.stable_since = None
            
            if not self.recording:
                # Starte Aufzeichnung
                self.recording = True
                self.recording_start_time = time.time()
                recording_changed = True
                
                # Hole initial alle im Ringpuffer vorhandenen Daten (die letzten 60 Sekunden)
                initial_data = self.ring_buffer.get_all()
                self.recording_buffer = initial_data.copy()
                self.recording_buffer.append(current_data)  # Füge aktuelle Daten hinzu
                
                logger.info(f"Signifikante Höhenänderung erkannt: {altitude_change:.2f}m - "
                           f"Aufzeichnung gestartet mit {len(initial_data)} initialen Datenpunkten")
        else:
            # Keine signifikante Höhenänderung
            if self.recording:
                current_time = time.time()
                
                if self.stable_since is None:
                    # Erste stabile Messung nach einer Änderung
                    self.stable_since = current_time
                    
                elif (current_time - self.stable_since) >= self.stabilization_time:
                    # Stabil für die konfigurierte Zeit - Aufzeichnung beenden
                    self.recording = False
                    recording_changed = True
                    
                    # Verwende den gesamten Aufzeichnungspuffer
                    data_to_save = self.recording_buffer
                    recording_duration = time.time() - self.recording_start_time
                    
                    logger.info(f"Höhe stabil für {self.stabilization_time}s - "
                               f"Aufzeichnung beendet mit {len(data_to_save)} Datenpunkten "
                               f"über {recording_duration:.1f} Sekunden")
                    
                    # Zurücksetzen des Aufzeichnungspuffers
                    self.recording_buffer = []
                    self.recording_start_time = None
            
        return recording_changed, data_to_save


class DatabaseManager:
    """Verwaltet die Speicherung von Daten in der MySQL-Datenbank."""
    
    def __init__(self, config: Config):
        """Initialisiert den Datenbank-Manager."""
        self.config = config
        self.db_config = {
            "host": config.get("database", "host"),
            "database": config.get("database", "database"),
            "user": config.get("database", "user"),
            "password": config.get("database", "password"),
            "port": config.get("database", "port"),
        }
        self.table = config.get("database", "table")
        self.reconnect_attempts = config.get("database", "reconnect_attempts")
        self.reconnect_delay = config.get("database", "reconnect_delay_seconds")
        
        # Offline-Speicher-Konfiguration
        self.offline_data_path = config.get("storage", "offline_data_path")
        self.max_offline_files = config.get("storage", "max_offline_files")
        os.makedirs(self.offline_data_path, exist_ok=True)
        
        # Verbindung und Cursor
        self.connection = None
        self.cursor = None
        
        # Queue für asynchrones Speichern
        self.save_queue = queue.Queue()
        self.save_thread = threading.Thread(target=self._process_save_queue, daemon=True)
        self.save_thread.start()
        
        # Thread für Offline-Daten-Synchronisation
        self.sync_thread = threading.Thread(target=self._sync_offline_data, daemon=True)
        self.sync_thread.start()
        
        # Erstelle Datenbank und Tabelle, wenn sie nicht existieren
        self._ensure_database_and_table()
        
        logger.info(f"Datenbank-Manager initialisiert: {self.db_config['host']}:{self.db_config['port']}"
                   f"/{self.db_config['database']}")
    
    def _connect(self) -> bool:
        """Stellt eine Verbindung zur Datenbank her."""
        for attempt in range(self.reconnect_attempts):
            try:
                if self.connection is not None and self.connection.is_connected():
                    return True
                
                logger.info(f"Verbinde zur Datenbank (Versuch {attempt+1}/{self.reconnect_attempts})...")
                self.connection = mysql.connector.connect(**self.db_config)
                self.cursor = self.connection.cursor()
                logger.info("Datenbankverbindung erfolgreich hergestellt")
                return True
                
            except Error as e:
                logger.error(f"Fehler bei der Datenbankverbindung: {e}")
                if attempt < self.reconnect_attempts - 1:
                    logger.info(f"Neuer Verbindungsversuch in {self.reconnect_delay} Sekunden...")
                    time.sleep(self.reconnect_delay)
                else:
                    logger.error("Maximale Anzahl an Verbindungsversuchen erreicht")
                    return False
        return False
    
    def _ensure_database_and_table(self) -> None:
        """Stellt sicher, dass Datenbank und Tabelle existieren."""
        # Verbindung ohne Datenbankauswahl herstellen
        config_without_db = self.db_config.copy()
        db_name = config_without_db.pop("database")
        
        try:
            conn = mysql.connector.connect(**config_without_db)
            cursor = conn.cursor()
            
            # Datenbank erstellen, falls nicht vorhanden
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
            cursor.execute(f"USE {db_name}")
            
            # Tabelle erstellen, falls nicht vorhanden
            cursor.execute(f"""
            CREATE TABLE IF NOT EXISTS {self.table} (
                id INT AUTO_INCREMENT PRIMARY KEY,
                timestamp DATETIME NOT NULL,
                temperature FLOAT,
                pressure FLOAT,
                altitude FLOAT,
                event_group VARCHAR(36) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)
            
            conn.commit()
            logger.info(f"Datenbank '{db_name}' und Tabelle '{self.table}' überprüft/erstellt")
            
            cursor.close()
            conn.close()
            
        except Error as e:
            logger.error(f"Fehler beim Erstellen der Datenbank/Tabelle: {e}")
    
    def _check_connection(self) -> bool:
        """Überprüft die Datenbankverbindung und stellt sie ggf. wieder her."""
        try:
            if self.connection is None or not self.connection.is_connected():
                return self._connect()
            return True
        except Error as e:
            logger.error(f"Fehler bei der Überprüfung der Datenbankverbindung: {e}")
            return False
    
    def save_data(self, data_list: List[Dict]) -> None:
        """Fügt Daten zur Speicherungsqueue hinzu."""
        if not data_list:
            return
            
        # Generiere eine Ereignis-ID für diese Gruppe von Daten
        event_group = datetime.now().strftime("%Y%m%d%H%M%S") + "-" + \
                      datetime.now().strftime("%f")
        
        # Füge die Daten zur Queue hinzu
        self.save_queue.put((data_list, event_group))
    
    def _process_save_queue(self) -> None:
        """Verarbeitet die Speicherungsqueue im Hintergrund."""
        while True:
            try:
                # Hole das nächste Element aus der Queue
                data_list, event_group = self.save_queue.get()
                
                # Versuche, die Daten in die Datenbank zu speichern
                if self._check_connection():
                    self._save_to_database(data_list, event_group)
                else:
                    # Bei fehlender Verbindung offline speichern
                    self._save_offline(data_list, event_group)
                
                # Markiere die Aufgabe als erledigt
                self.save_queue.task_done()
                
            except Exception as e:
                logger.error(f"Fehler bei der Verarbeitung der Speicherungsqueue: {e}")
                time.sleep(1)  # Vermeidet Busy-Waiting bei Fehlern
    
    def _save_to_database(self, data_list: List[Dict], event_group: str) -> None:
        """Speichert Daten direkt in der Datenbank."""
        try:
            if not self._check_connection():
                self._save_offline(data_list, event_group)
                return
            
            # SQL für Mehrfach-Insert
            sql = f"""
            INSERT INTO {self.table} 
            (timestamp, temperature, pressure, altitude, event_group)
            VALUES (%s, %s, %s, %s, %s)
            """
            
            # Daten für den Bulk-Insert vorbereiten
            values = []
            for data in data_list:
                if data.get("altitude") is not None:  # Nur gültige Daten speichern
                    values.append((
                        data["timestamp"],
                        data["temperature"],
                        data["pressure"],
                        data["altitude"],
                        event_group
                    ))
            
            # Daten speichern
            self.cursor.executemany(sql, values)
            self.connection.commit()
            
            logger.info(f"{len(values)} Datenpunkte in Datenbank gespeichert (Gruppe: {event_group})")
            
        except Error as e:
            logger.error(f"Fehler beim Speichern in der Datenbank: {e}")
            # Bei Datenbankfehler offline speichern
            self._save_offline(data_list, event_group)
    
    def _save_offline(self, data_list: List[Dict], event_group: str) -> None:
        """Speichert Daten offline in einer JSON-Datei."""
        try:
            # Bereite die Daten für die JSON-Serialisierung vor
            serializable_data = []
            for data in data_list:
                if data.get("altitude") is not None:  # Nur gültige Daten speichern
                    serializable_data.append({
                        "timestamp": data["timestamp"].isoformat(),
                        "temperature": data["temperature"],
                        "pressure": data["pressure"],
                        "altitude": data["altitude"],
                        "event_group": event_group
                    })
            
            # Dateiname basierend auf event_group
            filename = os.path.join(self.offline_data_path, f"{event_group}.json")
            
            # Speichere die Daten als JSON
            with open(filename, 'w') as file:
                json.dump(serializable_data, file)
            
            logger.info(f"{len(serializable_data)} Datenpunkte offline gespeichert: {filename}")
            
            # Prüfe die Anzahl der Offline-Dateien und lösche alte bei Überschreitung
            self._clean_offline_files()
            
        except Exception as e:
            logger.error(f"Fehler beim Offline-Speichern der Daten: {e}")
    
    def _clean_offline_files(self) -> None:
        """Bereinigt alte Offline-Dateien, wenn das Limit überschritten wird."""
        try:
            # Liste alle Dateien auf
            files = [os.path.join(self.offline_data_path, f) 
                     for f in os.listdir(self.offline_data_path) 
                     if f.endswith('.json')]
            
            # Sortiere nach Änderungszeit (älteste zuerst)
            files.sort(key=os.path.getmtime)
            
            # Lösche älteste Dateien, wenn das Limit überschritten wird
            while len(files) > self.max_offline_files:
                oldest_file = files.pop(0)
                os.remove(oldest_file)
                logger.info(f"Alte Offline-Datei gelöscht: {oldest_file}")
                
        except Exception as e:
            logger.error(f"Fehler bei der Bereinigung von Offline-Dateien: {e}")
    
    def _sync_offline_data(self) -> None:
        """Synchronisiert offline gespeicherte Daten mit der Datenbank."""
        while True:
            try:
                # Warte, bevor wir nach offline Dateien suchen
                time.sleep(60)  # Prüfe jede Minute
                
                # Prüfe Datenbankverbindung
                if not self._check_connection():
                    logger.info("Keine Datenbankverbindung für Offline-Synchronisation verfügbar")
                    continue
                
                # Liste alle Offline-Dateien auf
                files = [os.path.join(self.offline_data_path, f) 
                        for f in os.listdir(self.offline_data_path) 
                        if f.endswith('.json')]
                
                if not files:
                    continue
                    
                logger.info(f"{len(files)} Offline-Dateien für Synchronisation gefunden")
                
                # Verarbeite jede Datei
                for file_path in files:
                    try:
                        with open(file_path, 'r') as file:
                            data = json.load(file)
                        
                        # SQL für Mehrfach-Insert
                        sql = f"""
                        INSERT INTO {self.table} 
                        (timestamp, temperature, pressure, altitude, event_group)
                        VALUES (%s, %s, %s, %s, %s)
                        """
                        
                        # Daten für den Bulk-Insert vorbereiten
                        values = []
                        for item in data:
                            values.append((
                                datetime.fromisoformat(item["timestamp"]),
                                item["temperature"],
                                item["pressure"],
                                item["altitude"],
                                item["event_group"]
                            ))
                        
                        # Daten speichern
                        self.cursor.executemany(sql, values)
                        self.connection.commit()
                        
                        # Lösche die Datei nach erfolgreicher Synchronisation
                        os.remove(file_path)
                        
                        logger.info(f"Offline-Datei erfolgreich synchronisiert und gelöscht: {file_path}")
                        
                    except Exception as e:
                        logger.error(f"Fehler bei der Synchronisation von {file_path}: {e}")
                
            except Exception as e:
                logger.error(f"Fehler bei der Offline-Synchronisation: {e}")
    
    def close(self) -> None:
        """Schließt die Datenbankverbindung."""
        if self.connection and self.connection.is_connected():
            self.cursor.close()
            self.connection.close()
            logger.info("Datenbankverbindung geschlossen")


class NetworkMonitor:
    """Überwacht den Netzwerkstatus."""
    
    def __init__(self, config: Config):
        """Initialisiert den Netzwerk-Monitor."""
        self.config = config
        self.db_host = config.get("database", "host")
        self.db_port = config.get("database", "port")
        self.last_status = None
        self.status_change_callbacks = []
    
    def check_connection(self) -> bool:
        """Überprüft die Netzwerkverbindung zur Datenbank."""
        try:
            # Einfacher Socket-Test zur Überprüfung der Verbindung
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)  # 2-Sekunden-Timeout
            result = sock.connect_ex((self.db_host, self.db_port))
            sock.close()
            
            # result == 0 bedeutet erfolgreiche Verbindung
            is_connected = (result == 0)
            
            # Wenn sich der Status geändert hat, benachrichtige alle Callbacks
            if is_connected != self.last_status:
                self.last_status = is_connected
                for callback in self.status_change_callbacks:
                    callback(is_connected)
            
            return is_connected
            
        except Exception as e:
            logger.error(f"Fehler bei der Netzwerkverbindungsprüfung: {e}")
            return False
    
    def add_status_change_callback(self, callback) -> None:
        """Fügt einen Callback für Statusänderungen hinzu."""
        self.status_change_callbacks.append(callback)


class AltitudeMonitor:
    """Hauptklasse für die Höhenüberwachung."""
    
    def __init__(self, config_path="config.json"):
        """Initialisiert den Höhenmonitor."""
        logger.info("Initialisiere Höhenmonitor")
        
        # Lade die Konfiguration
        self.config = Config(config_path)
        
        # Initialisiere Komponenten
        self.sensor_reader = SensorReader(self.config)
        self.ring_buffer = RingBuffer(self.config)
        self.altitude_analyzer = AltitudeAnalyzer(self.config, self.ring_buffer)
        self.database_manager = DatabaseManager(self.config)
        self.network_monitor = NetworkMonitor(self.config)
        
        # Status-Flags
        self.running = False
        self.connected = False
        
        # Initialisiere Netzwerkstatus
        self.connected = self.network_monitor.check_connection()
        self.network_monitor.add_status_change_callback(self._handle_network_status_change)
        
        logger.info("Höhenmonitor initialisiert")
    
    def _handle_network_status_change(self, is_connected: bool) -> None:
        """Behandelt Änderungen des Netzwerkstatus."""
        self.connected = is_connected
        status_text = "verbunden" if is_connected else "getrennt"
        logger.info(f"Netzwerkstatus geändert: {status_text}")
    
    def run(self) -> None:
        """Startet die Hauptschleife des Monitors."""
        self.running = True
        logger.info("Starte Höhenmonitor")
        
        try:
            sample_interval = 1.0 / self.config.get("sensor", "sample_rate_hz")
            
            while self.running:
                start_time = time.time()
                
                # Lese Sensordaten
                current_data = self.sensor_reader.read()
                
                # Füge Daten zum Puffer hinzu
                self.ring_buffer.add(current_data)
                
                # Analysiere Höhenänderungen
                status_changed, data_to_save = self.altitude_analyzer.analyze(current_data)
                
                # Wenn Daten zu speichern sind
                if status_changed and data_to_save:
                    self.database_manager.save_data(data_to_save)
                
                # Prüfe regelmäßig den Netzwerkstatus (einmal pro Sekunde)
                if int(time.time()) % 10 == 0:
                    self.network_monitor.check_connection()
                
                # Berechne Schlafzeit für konstante Abtastrate
                elapsed = time.time() - start_time
                sleep_time = max(0, sample_interval - elapsed)
                if sleep_time > 0:
                    time.sleep(sleep_time)
                
        except KeyboardInterrupt:
            logger.info("Höhenmonitor durch Benutzer beendet")
        except Exception as e:
            logger.error(f"Fehler in der Hauptschleife: {e}")
        finally:
            self.stop()
    
    def stop(self) -> None:
        """Stoppt den Monitor sauber."""
        self.running = False
        self.database_manager.close()
        logger.info("Höhenmonitor gestoppt")


if __name__ == "__main__":
    # Starte den Höhenmonitor
    monitor = AltitudeMonitor()
    monitor.run()
