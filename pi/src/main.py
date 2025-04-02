#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Hauptmodul für den BMP280 Höhenänderungs-Monitor.
Koordiniert die verschiedenen Komponenten und führt die Hauptschleife aus.
"""

import os
import time
import logging
import sys
from datetime import datetime

# Importiere eigene Module
from config import Config
from sensors import SensorReader
from data_buffer import RingBuffer
from analyzer import AltitudeAnalyzer
from database import DatabaseManager
from network import NetworkMonitor

# Konfiguration des Logging
def setup_logging():
    """Richtet das Logging-System ein."""
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    
    log_file = os.path.join(log_dir, f"altitude_monitor_{datetime.now().strftime('%Y%m%d')}.log")
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    
    # Logger für das Hauptmodul
    return logging.getLogger("AltitudeMonitor.Main")

class AltitudeMonitor:
    """Hauptklasse für die Höhenüberwachung."""
    
    def __init__(self, config_path="/home/markus/config.json"):
        """Initialisiert den Höhenmonitor."""
        self.logger = setup_logging()
        self.logger.info("Initialisiere Höhenmonitor")
        
        # Lade die Konfiguration
        self.config = Config(config_path)
        
        # Initialisiere Komponenten
        self.database_manager = DatabaseManager(self.config)
        self.network_monitor = NetworkMonitor(self.config)
        
        # Status-Flags
        self.running = False
        self.connected = False
        self.sensor_initialized = False
        
        # Diese Komponenten sind abhängig vom Sensor und werden später initialisiert
        self.sensor_reader = None
        self.ring_buffer = None
        self.altitude_analyzer = None
        
        # Initialisiere Netzwerkstatus
        self.connected = self.network_monitor.check_connection()
        self.network_monitor.add_status_change_callback(self._handle_network_status_change)
        
        # Versuche, den Sensor zu initialisieren
        self._initialize_sensor_components()
        
        self.logger.info("Höhenmonitor initialisiert")
    
    def _initialize_sensor_components(self):
        """Versucht, den Sensor und die abhängigen Komponenten zu initialisieren."""
        try:
            self.sensor_reader = SensorReader(self.config)
            self.ring_buffer = RingBuffer(self.config)
            self.altitude_analyzer = AltitudeAnalyzer(self.config, self.ring_buffer)
            self.sensor_initialized = True
            self.logger.info("Sensor und abhängige Komponenten erfolgreich initialisiert")
        except ValueError as e:
            if "No Hardware I2C" in str(e):
                self.logger.warning(f"Keine I2C-Hardware gefunden: {e}")
                self.logger.info("Sensorinitalisierung wird später erneut versucht")
                self.sensor_initialized = False
            else:
                self.logger.error(f"Fehler bei der Sensorinitalisierung: {e}")
                raise
        except Exception as e:
            self.logger.error(f"Unerwarteter Fehler bei der Sensorinitalisierung: {e}")
            raise
    
    def _handle_network_status_change(self, is_connected: bool) -> None:
        """Behandelt Änderungen des Netzwerkstatus."""
        self.connected = is_connected
        status_text = "verbunden" if is_connected else "getrennt"
        self.logger.info(f"Netzwerkstatus geändert: {status_text}")
    
    def run(self) -> None:
        """Startet die Hauptschleife des Monitors."""
        self.running = True
        self.logger.info("Starte Höhenmonitor")
        
        # Zeit für den nächsten Sensorinitialisierungsversuch
        next_sensor_retry = 0
        
        try:
            sample_interval = 1.0 / self.config.get("sensor", "sample_rate_hz")
            
            while self.running:
                start_time = time.time()
                
                # Versuche, den Sensor zu initialisieren, wenn nötig
                current_time = time.time()
                if not self.sensor_initialized and current_time >= next_sensor_retry:
                    self.logger.info("Versuche erneut, den Sensor zu initialisieren...")
                    self._initialize_sensor_components()
                    if not self.sensor_initialized:
                        # Nächsten Versuch in 10 Sekunden planen
                        next_sensor_retry = current_time + 10
                        self.logger.info(f"Nächster Versuch in 10 Sekunden...")
                
                # Nur fortfahren, wenn der Sensor initialisiert ist
                if self.sensor_initialized:
                    # Lese Sensordaten
                    current_data = self.sensor_reader.read()
                    
                    # Füge Daten zum Puffer hinzu
                    self.ring_buffer.add(current_data)
                    
                    # Analysiere Höhenänderungen
                    status_changed, data_to_save = self.altitude_analyzer.analyze(current_data)
                    
                    # Wenn Daten zu speichern sind
                    if status_changed and data_to_save:
                        self.database_manager.save_data(data_to_save)
                
                # Prüfe regelmäßig den Netzwerkstatus (einmal pro 10 Sekunden)
                if int(current_time) % 10 == 0:
                    self.network_monitor.check_connection()
                
                # Berechne Schlafzeit für konstante Abtastrate
                elapsed = time.time() - start_time
                sleep_time = max(0, sample_interval - elapsed)
                if sleep_time > 0:
                    time.sleep(sleep_time)
                
        except KeyboardInterrupt:
            self.logger.info("Höhenmonitor durch Benutzer beendet")
        except Exception as e:
            self.logger.error(f"Fehler in der Hauptschleife: {e}")
        finally:
            self.stop()
    
    def stop(self) -> None:
        """Stoppt den Monitor sauber."""
        self.running = False
        self.database_manager.close()
        self.logger.info("Höhenmonitor gestoppt")


if __name__ == "__main__":
    # Starte den Höhenmonitor
    monitor = AltitudeMonitor()
    monitor.run()