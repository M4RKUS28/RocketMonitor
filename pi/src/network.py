#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Netzwerkmonitor-Modul für den BMP280 Höhenänderungs-Monitor.
Überwacht die Netzwerkverbindung zum Datenbankserver.
"""

import socket
import logging
from typing import Callable, List

# Importiere eigene Module
from config import Config

logger = logging.getLogger("AltitudeMonitor.Network")

class NetworkMonitor:
    """Überwacht den Netzwerkstatus."""
    
    def __init__(self, config: Config):
        """Initialisiert den Netzwerk-Monitor."""
        self.config = config
        self.db_host = config.get("database", "host")
        self.db_port = config.get("database", "port")
        self.last_status = None
        self.status_change_callbacks: List[Callable[[bool], None]] = []
    
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
                status_text = "verbunden" if is_connected else "getrennt"
                logger.info(f"Netzwerkstatus geändert: {status_text}")
                
                for callback in self.status_change_callbacks:
                    callback(is_connected)
            
            return is_connected
            
        except Exception as e:
            logger.error(f"Fehler bei der Netzwerkverbindungsprüfung: {e}")
            return False
    
    def add_status_change_callback(self, callback: Callable[[bool], None]) -> None:
        """Fügt einen Callback für Statusänderungen hinzu."""
        self.status_change_callbacks.append(callback)
