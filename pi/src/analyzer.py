#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Höhenanalyse-Modul für den BMP280 Höhenänderungs-Monitor.
Erkennt signifikante Höhenänderungen und verwaltet die Aufzeichnungslogik.
"""

import time
import logging
from typing import Dict, List, Tuple, Optional

# Importiere eigene Module
from config import Config
from data_buffer import RingBuffer

logger = logging.getLogger("AltitudeMonitor.Analyzer")

class AltitudeAnalyzer:
    """Analysiert Höhenänderungen aus Sensordaten."""
    
    def __init__(self, config: Config, ring_buffer: RingBuffer):
        """Initialisiert den Höhenanalysator."""
        self.config = config
        self.ring_buffer = ring_buffer
        self.threshold_meters = config.get("detection", "threshold_meters")
        self.comparison_window = config.get("detection", "comparison_window_seconds")
        self.stabilization_time = config.get("detection", "stabilization_time_seconds")
        self.expected_sample_rate = config.get("sensor", "sample_rate_hz")

        self.initialized = False
        self.min_samples_for_comparison = int(self.comparison_window * self.expected_sample_rate * 0.5)  # Mindestens 50% der erwarteten Samples

        # Status für Höhenänderungserkennung
        self.recording = False
        self.last_significant_change = None
        self.stable_since = None
        self.sample_count = 0
        self.last_rate_log_time = time.time()
        
        # Sammelpuffer für längere Aufzeichnungen
        self.recording_buffer = []
        # Zeitpunkt des Aufzeichnungsbeginns
        self.recording_start_time = None
        
        logger.info(f"Höhenanalysator initialisiert: Schwellwert={self.threshold_meters}m, "
                   f"Vergleichsfenster={self.comparison_window}s, "
                   f"Stabilisierungszeit={self.stabilization_time}s, "
                   f"Erwartete Abtastrate={self.expected_sample_rate} Hz")

    def _log_sampling_rate(self):
        """
        Loggt die tatsächliche Abtastrate einmal pro Minute.
        
        Vergleicht die Anzahl der Samples mit der erwarteten Abtastrate.
        """
        current_time = time.time()
        time_elapsed = current_time - self.last_rate_log_time
        
        # Nur einmal pro Minute loggen
        if time_elapsed >= 60:
            # Berechnete Abtastrate
            actual_sample_rate = self.sample_count / time_elapsed
            
            logger.info(
                f"Abtastrate - Erwartet: {self.expected_sample_rate} Hz, "
                f"Tatsächlich: {actual_sample_rate:.2f} Hz, "
                f"Samples in {time_elapsed:.1f}s: {self.sample_count}"
            )
            
            # Zurücksetzen für die nächste Messung
            self.sample_count = 0
            self.last_rate_log_time = current_time
    
    def analyze(self, current_data: Dict) -> Tuple[bool, Optional[List[Dict]]]:
        """
        Analysiert neue Sensordaten auf signifikante Höhenänderungen.
        
        Rückgabe:
            (recording_changed, data_to_save)
            - recording_changed: True, wenn sich der Aufzeichnungsstatus geändert hat
            - data_to_save: Daten zum Speichern, wenn eine Aufzeichnung endet
        """
         # Sampling Rate Tracking
        self.sample_count += 1
        self._log_sampling_rate()


        # Prüfen, ob aktuelle Messung gültig ist
        if current_data.get("altitude") is None:
            # Auch bei ungültiger Messung: Falls aufzeichnend, füge Daten hinzu
            if self.recording:
                self.recording_buffer.append(current_data)
            return False, None
        
        # Hole Referenzdaten für den Vergleich (vor X Sekunden)
        comparison_data = self.ring_buffer.get_last_n_seconds(self.comparison_window)

        # Initialisierungsphase - Warte bis genügend Daten vorliegen
        if not self.initialized:
            valid_altitudes = [d["altitude"] for d in comparison_data if d["altitude"] is not None]
            if len(valid_altitudes) >= self.min_samples_for_comparison:
                self.initialized = True
                logger.info(f"Höhenanalysator initialisiert mit {len(valid_altitudes)} Datenpunkten")
            else:
                # Noch in der Initialisierungsphase, keine Auswertung durchführen
                logger.debug(f"Initialisierung: {len(valid_altitudes)}/{self.min_samples_for_comparison} Datenpunkte")
                return False, None
        
        if not comparison_data or len(comparison_data) == 0:
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
                # Fortsetzung der Aufzeichnung
                logger.debug(f"Resette Stabilisierungsphase: {altitude_change:.2f}m")
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
