#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Modified DatabaseManager class with improved connection handling
to prevent connection flood and host blocking.
"""

import os
import time
import json
import queue
import threading
import logging
from datetime import datetime
from typing import List, Dict, Optional

import mysql.connector
from mysql.connector import Error, pooling

# Importiere eigene Module
from config import Config

logger = logging.getLogger("AltitudeMonitor.Database")

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
        
        # Connection pool statt individueller Verbindungen
        try:
            self.cnx_pool = self._create_connection_pool()
            self.connection = None
            self.cursor = None
        except Exception as e:
            logger.error(f"Fehler beim Erstellen des Connection Pools: {e}")
            self.cnx_pool = None
        
        # Queue für asynchrones Speichern
        self.save_queue = queue.Queue()
        self.save_thread = threading.Thread(target=self._process_save_queue, daemon=True)
        self.save_thread.start()
        
        # Thread für Offline-Daten-Synchronisation
        self.sync_thread = threading.Thread(target=self._sync_offline_data, daemon=True)
        self.sync_thread.start()
        
        # Erstelle Datenbank und Tabelle, wenn sie nicht existieren
        self._ensure_database_and_table()
        
        # Exponential Backoff für Reconnect-Versuche
        self.max_reconnect_delay = 300  # 5 Minuten maximale Wartezeit
        self.last_connection_attempt = 0  # Zeitpunkt des letzten Verbindungsversuchs
        
        logger.info(f"Datenbank-Manager initialisiert: {self.db_config['host']}:{self.db_config['port']}"
                   f"/{self.db_config['database']}")
    
    def _create_connection_pool(self, pool_size=3):
        """Erstellt einen Connection Pool für effizientere Verbindungsverwaltung."""
        try:
            pool = pooling.MySQLConnectionPool(
                pool_name="altitude_pool",
                pool_size=pool_size,
                **self.db_config
            )
            logger.info(f"Connection Pool mit {pool_size} Verbindungen erstellt")
            return pool
        except Error as e:
            logger.error(f"Fehler beim Erstellen des Connection Pools: {e}")
            return None
    
    def _connect(self) -> bool:
        """Stellt eine Verbindung zur Datenbank her."""
        # Exponential Backoff für wiederholte Verbindungsversuche
        current_time = time.time()
        time_since_last_attempt = current_time - self.last_connection_attempt
        
        # Berechne die Wartezeit basierend auf der Anzahl bisheriger Versuche
        # Beginnt mit reconnect_delay und verdoppelt sich bei jedem Versuch
        if hasattr(self, '_connection_attempts'):
            self._connection_attempts += 1
        else:
            self._connection_attempts = 1
            
        wait_time = min(
            self.reconnect_delay * (2 ** (self._connection_attempts - 1)),
            self.max_reconnect_delay
        )
        
        # Wenn nicht genug Zeit seit dem letzten Versuch vergangen ist, warte
        if time_since_last_attempt < wait_time:
            logger.info(f"Zu viele Verbindungsversuche, warte {wait_time - time_since_last_attempt:.1f}s")
            return False
            
        self.last_connection_attempt = current_time
        
        # Versuche, aus dem Pool eine Verbindung zu bekommen
        if self.cnx_pool:
            try:
                logger.info(f"Verbinde zur Datenbank (Versuch {self._connection_attempts}/{self.reconnect_attempts})...")
                
                if self._connection_attempts > self.reconnect_attempts:
                    logger.error("Maximale Anzahl an Verbindungsversuchen erreicht")
                    # Setze den Zähler zurück und erhöhe die Wartezeit
                    self._connection_attempts = 1
                    return False
                    
                self.connection = self.cnx_pool.get_connection()
                self.cursor = self.connection.cursor()
                logger.info("Datenbankverbindung erfolgreich hergestellt")
                
                # Zurücksetzen des Versuchszählers bei erfolgreicher Verbindung
                self._connection_attempts = 1
                return True
                
            except Error as e:
                logger.error(f"Fehler bei der Datenbankverbindung: {e}")
                return False
        else:
            # Fallback zur alten Methode wenn kein Pool verfügbar
            try:
                if self.connection is not None and self.connection.is_connected():
                    return True
                
                logger.info(f"Verbinde zur Datenbank ohne Pool (Versuch {self._connection_attempts}/{self.reconnect_attempts})...")
                
                if self._connection_attempts > self.reconnect_attempts:
                    logger.error("Maximale Anzahl an Verbindungsversuchen erreicht")
                    self._connection_attempts = 1
                    return False
                    
                self.connection = mysql.connector.connect(**self.db_config)
                self.cursor = self.connection.cursor()
                logger.info("Datenbankverbindung erfolgreich hergestellt")
                
                self._connection_attempts = 1
                return True
                
            except Error as e:
                logger.error(f"Fehler bei der Datenbankverbindung: {e}")
                return False
        
        return False
    
    def _ensure_database_and_table(self) -> None:
        """Stellt sicher, dass Datenbank und Tabelle existieren."""
        # Verbindung ohne Datenbankauswahl herstellen
        config_without_db = self.db_config.copy()
        db_name = config_without_db.pop("database")
        
        try:
            # Verwende einen separaten Verbindungskontext nur für diesen Vorgang
            conn = mysql.connector.connect(**config_without_db)
            cursor = conn.cursor()
            
            # Datenbank erstellen, falls nicht vorhanden
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
            cursor.execute(f"USE {db_name}")
            
            # Tabelle erstellen, falls nicht vorhanden (mit raspberry_name Feld)
            cursor.execute(f"""
            CREATE TABLE IF NOT EXISTS {self.table} (
                id INT AUTO_INCREMENT PRIMARY KEY,
                timestamp DATETIME NOT NULL,
                temperature FLOAT,
                pressure FLOAT,
                altitude FLOAT,
                event_group VARCHAR(36) NOT NULL,
                raspberry_name VARCHAR(100) NOT NULL,
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
            
            # Hole Raspberry Pi Namen aus der Konfiguration
            raspberry_name = self.config.get("device", "name")
            
            # SQL für Mehrfach-Insert (mit raspberry_name)
            sql = f"""
            INSERT INTO {self.table} 
            (timestamp, temperature, pressure, altitude, event_group, raspberry_name)
            VALUES (%s, %s, %s, %s, %s, %s)
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
                        event_group,
                        raspberry_name
                    ))
            
            # Daten speichern
            self.cursor.executemany(sql, values)
            self.connection.commit()
            
            logger.info(f"{len(values)} Datenpunkte in Datenbank gespeichert (Gruppe: {event_group})")
            
        except Error as e:
            logger.error(f"Fehler beim Speichern in der Datenbank: {e}")
            # Bei Datenbankfehler offline speichern
            self._save_offline(data_list, event_group)
        finally:
            # Prüfe, ob die Verbindung weiterhin besteht
            if self.connection and not self.connection.is_connected():
                logger.warning("Verbindung unterbrochen, schließe Ressourcen")
                if self.cursor:
                    try:
                        self.cursor.close()
                    except:
                        pass
                if self.connection:
                    try:
                        self.connection.close()
                    except:
                        pass
                self.cursor = None
                self.connection = None
    
    def _save_offline(self, data_list: List[Dict], event_group: str) -> None:
        """Speichert Daten offline in einer JSON-Datei."""
        try:
            # Hole Raspberry Pi Namen aus der Konfiguration
            raspberry_name = self.config.get("device", "name")
            
            # Bereite die Daten für die JSON-Serialisierung vor
            serializable_data = []
            for data in data_list:
                if data.get("altitude") is not None:  # Nur gültige Daten speichern
                    serializable_data.append({
                        "timestamp": data["timestamp"].isoformat(),
                        "temperature": data["temperature"],
                        "pressure": data["pressure"],
                        "altitude": data["altitude"],
                        "event_group": event_group,
                        "raspberry_name": raspberry_name
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
                        
                        # SQL für Mehrfach-Insert (mit raspberry_name)
                        sql = f"""
                        INSERT INTO {self.table} 
                        (timestamp, temperature, pressure, altitude, event_group, raspberry_name)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        """
                        
                        # Daten für den Bulk-Insert vorbereiten
                        values = []
                        for item in data:
                            values.append((
                                datetime.fromisoformat(item["timestamp"]),
                                item["temperature"],
                                item["pressure"],
                                item["altitude"],
                                item["event_group"],
                                item.get("raspberry_name", self.config.get("device", "name"))
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
        if self.cursor:
            try:
                self.cursor.close()
            except:
                pass
            
        if self.connection and self.connection.is_connected():
            try:
                self.connection.close()
            except:
                pass
                
        logger.info("Datenbankverbindung geschlossen")