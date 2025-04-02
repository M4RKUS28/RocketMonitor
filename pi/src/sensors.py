#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Sensor-Kommunikationsmodul für den BMP280 Höhenänderungs-Monitor.
Ermöglicht die Kommunikation mit dem BMP280-Sensor über I2C.
"""

#  https://docs.circuitpython.org/projects/bmp280/en/latest/_modules/adafruit_bmp280.html#Adafruit_BMP280
#  https://cdn-shop.adafruit.com/datasheets/BST-BMP280-DS001-11.pdf
#  https://docs.circuitpython.org/projects/bmp280/en/latest/api.html#adafruit_bmp280.Adafruit_BMP280.overscan_pressure


import logging
from datetime import datetime
from typing import Dict, Literal

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


# Oversampling Optionen
OVERSCAN_OPTIONS = {
    1: adafruit_bmp280.OVERSCAN_X1,
    2: adafruit_bmp280.OVERSCAN_X2,
    4: adafruit_bmp280.OVERSCAN_X4,
    8: adafruit_bmp280.OVERSCAN_X8,
    16: adafruit_bmp280.OVERSCAN_X16
}

# Standby Zeit Optionen
STANDBY_OPTIONS = {
    125: adafruit_bmp280.STANDBY_TC_125,
    250: adafruit_bmp280.STANDBY_TC_250,
    500: adafruit_bmp280.STANDBY_TC_500,
    1000: adafruit_bmp280.STANDBY_TC_1000,
    2000: adafruit_bmp280.STANDBY_TC_2000,
    4000: adafruit_bmp280.STANDBY_TC_4000
}

# IIR Filter Optionen
IIR_FILTER_OPTIONS = {
    0: adafruit_bmp280.IIR_FILTER_DISABLE,
    2: adafruit_bmp280.IIR_FILTER_X2,
    4: adafruit_bmp280.IIR_FILTER_X4,
    8: adafruit_bmp280.IIR_FILTER_X8,
    16: adafruit_bmp280.IIR_FILTER_X16
}


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
             # Konfiguriere Sensor mit Standardwerten
            self.configure_sensor()
            
            logger.info(f"BMP280-Sensor initialisiert mit Adresse 0x{self.i2c_address:02x}")
        except ValueError as e:
            logger.error(f"I2C-Hardware nicht gefunden: {e}")
            raise
        except Exception as e:
            logger.error(f"Fehler bei der Sensorinitialisierung: {e}")
            raise
    
    def configure_sensor(self, 
                        mode: Literal["normal", "forced", "sleep"] = "normal", 
                        temperature_oversampling: Literal[1, 2, 4, 8, 16] = 4,
                        pressure_oversampling: Literal[1, 2, 4, 8, 16] = 16,
                        temperature_standby: Literal[
                            #0.5, 62.5,
                            125, 250, 500, 1000, 2000, 4000] = 500,
                        iir_filter: int = 2):
        """
        Konfiguriert den BMP280-Sensor mit detaillierten Einstellungen.
        
        Argumente:
        - mode: Betriebsmodus des Sensors
          * 'normal': Kontinuierliche Messungen
          * 'forced': Einzelmessung auf Anfrage
          * 'sleep': Energiesparmodus
        
        - temperature_oversampling: Überabtastung für Temperatur
          * Höhere Werte verbessern Genauigkeit, erhöhen aber Stromverbrauch
          * Mögliche Werte: 1, 2, 4, 8, 16
        
        - pressure_oversampling: Überabtastung für Luftdruck
          * Höhere Werte verbessern Genauigkeit, erhöhen aber Stromverbrauch
          * Mögliche Werte: 1, 2, 4, 8, 16
        
        - temperature_standby: Wartezeit zwischen Messungen im Normalmodus
          * Beeinflusst Stromverbrauch und Messfrequenz
          * Werte in Millisekunden: 0.5, 62.5, 125, 250, 500, 1000, 2000, 4000
        
        - iir_filter: IIR-Filtereinstellung
          * Reduziert Rauschen in den Messwerten
          * Typische Werte: 0-4 (0 = Filter aus)
        """
        if self.sensor is None:
            raise RuntimeError("Sensor nicht initialisiert")
        
         # Setze Meereshöhendruck
        self.sensor.sea_level_pressure = self.sea_level_pressure
        
        # Überabtastung für Temperatur und Druck
        # Verwende Standardwert, wenn der übergebene Wert nicht in den Optionen ist
        self.sensor.overscan_temperature = OVERSCAN_OPTIONS.get(
            temperature_oversampling, adafruit_bmp280.OVERSCAN_X4
        )
        self.sensor.overscan_pressure = OVERSCAN_OPTIONS.get(
            pressure_oversampling, adafruit_bmp280.OVERSCAN_X16
        )
        
        # Standby-Zeit
        self.sensor.standby_period = STANDBY_OPTIONS.get(
            temperature_standby, adafruit_bmp280.STANDBY_TC_500
        )
        
        # IIR-Filter
        self.sensor.iir_filter = IIR_FILTER_OPTIONS.get(
            iir_filter, adafruit_bmp280.IIR_FILTER_X2
        )

        # Modus setzen
        if mode == "normal":
            self.sensor.mode = adafruit_bmp280.MODE_NORMAL
        elif mode == "forced":
            self.sensor.mode = adafruit_bmp280.MODE_FORCE
        else:  # sleep
            self.sensor.mode = adafruit_bmp280.MODE_SLEEP
        
        logger.info(
            f"Sensor konfiguriert: "
            f"Modus={mode}, "
            f"Temp-Oversampling={temperature_oversampling}, "
            f"Druck-Oversampling={pressure_oversampling}, "
            f"Standby-Zeit={temperature_standby}ms"
        )
    
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