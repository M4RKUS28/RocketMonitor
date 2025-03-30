#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Sensor-Kommunikationsmodul für den BMP280 Höhenänderungs-Monitor.
Ermöglicht die Kommunikation mit dem BMP280-Sensor über I2C.
"""

import logging
from datetime import datetime
from typing import Dict

# Für BMP280-Sensor
try:
    import board
    import busio
    import adafruit_bmp280
    SENSOR_LIBRARIES_AVAILABLE = True
except (ImportError, NotImplementedError):
    SENSOR_LIBRARIES_AVAILABLE = False

# Importiere Config-Klasse
from config import Config

logger = logging.getLogger("AltitudeMonitor.Sensor")

class SensorReader:
    """Liest Daten vom BMP280-Sensor."""
    
    def __init__(self, config: Config):
        """Initialisiert den Sensor-Reader."""
        self.config = config
        self.i2c_address = config.get("sensor", "i2c_address")
        self.sea_level_pressure = config.get("sensor", "sea_level_pressure")
        self.sample_rate = config.get("sensor", "sample_rate_hz")
        self.sample_interval = 1.0 / self.sample_rate
        self.sensor = None
        
        if not SENSOR_LIBRARIES_AVAILABLE:
            raise ValueError("Sensorbibliotheken (board, busio, adafruit_bmp280) nicht verfügbar")
        
        # Sensor initialisieren
        try:
            self.i2c = busio.I2C(board.SCL, board.SDA)
            self.sensor = adafruit_bmp280.Adafruit_BMP280_I2C(
                self.i2c, 
                address=self.i2c_address
            )
            self.sensor.sea_level_pressure = self.sea_level_pressure
            
            logger.info(f"BMP280-Sensor initialisiert mit Adresse 0x{self.i2c_address:02x}")
        except ValueError as e:
            logger.error(f"I2C-Hardware nicht gefunden: {e}")
            raise
        except Exception as e:
            logger.error(f"Fehler bei der Sensorinitialisierung: {e}")
            raise
    
    def read(self) -> Dict:
        """Liest einen Messwert vom Sensor."""
        try:
            # Wenn der Sensor nicht initialisiert ist, gib Fehlerdaten zurück
            if self.sensor is None:
                raise Exception("Sensor nicht initialisiert")
                
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