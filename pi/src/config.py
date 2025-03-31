#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Updated Config class with device name configuration
"""

import os
import json
import logging

logger = logging.getLogger("AltitudeMonitor.Config")

class Config:
    """Konfigurationsmanager für die Anwendung."""
    
    DEFAULT_CONFIG = {
        "device": {
            "name": "RaspberryPi-1",   # Name des Geräts - muss mit Frontend übereinstimmen
        },
        "sensor": {
            "sample_rate_hz": 5,        # Abtastrate in Hz
            "i2c_address": 0x76,        # Standard I2C-Adresse für BMP280
            "sea_level_pressure": 1013.25  # Standarddruck auf Meereshöhe in hPa
        },
        "detection": {
            "threshold_meters": 1.0,     # Schwellwert für Höhenänderungen in Metern
            "comparison_window_seconds": 3, # Zeitfenster für Vergleich in Sekunden
            "stabilization_time_seconds": 3 # Zeit ohne Änderungen bis Aufzeichnung stoppt
        },
        "buffer": {
            "ring_buffer_seconds": 5    # Größe des Ringpuffers in Sekunden
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
    
    def __init__(self, config_path="/home/markus/RocketMonitor/pi/src/config.json"):
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
            # Stelle sicher, dass der Ordner existiert
            os.makedirs(os.path.dirname(self.config_path) or '.', exist_ok=True)
            # Erstelle Standardkonfigurationsdatei
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