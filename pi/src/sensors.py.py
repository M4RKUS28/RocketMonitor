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
import board
import busio
import adafruit_bmp280

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
