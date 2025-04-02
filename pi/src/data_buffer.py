#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Ringpuffer-Modul für den BMP280 Höhenänderungs-Monitor.
Implementiert einen Ringpuffer für die letzten x Sekunden an Sensordaten.
"""

from datetime import datetime, timedelta
import logging
from collections import deque
from typing import List, Dict

# Importiere Config-Klasse
from config import Config

logger = logging.getLogger("AltitudeMonitor.Buffer")

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
    
    def get_last_n_seconds_alt(self, seconds: int) -> List[Dict]:
        """Gibt die Daten der letzten n Sekunden zurück."""
        sample_rate = self.config.get("sensor", "sample_rate_hz")
        n_samples = int(seconds * sample_rate)
        n_samples = min(n_samples, len(self.buffer))
        return list(self.buffer)[-n_samples:]
    
    def get_last_n_seconds(self, seconds: int) -> List[Dict]:
        """
        Gibt die Daten der letzten n Sekunden zurück, basierend auf der aktuellen Zeit.
        
        Diese Methode filtert Datenpunkte, die innerhalb des angegebenen Zeitfensters 
        vor der aktuellen Zeit liegen.
        
        Args:
            seconds (int): Anzahl der Sekunden, für die Daten zurückgegeben werden sollen
        
        Returns:
            List[Dict]: Liste der Datenpunkte aus den letzten n Sekunden
        """
        if not self.buffer:
            return []
        
        # Aktuelle Zeit als Referenz
        current_time = datetime.now()
        
        # Zeitgrenze berechnen
        time_threshold = current_time - timedelta(seconds=seconds)
        
        # Filtere Datenpunkte, die innerhalb des Zeitfensters liegen
        return [
            data for data in reversed(self.buffer) 
            if data.get('timestamp') and data['timestamp'] >= time_threshold
        ]