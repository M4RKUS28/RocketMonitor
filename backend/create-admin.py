#!/usr/bin/env python3
import sys
import os
import argparse

# Füge den Elternordner zum Pfad hinzu, um App-Module zu importieren
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import models
from app.database import SessionLocal
from app.auth import get_password_hash

def create_admin(username, email, password):
    """Erstellt einen Admin-Benutzer in der Datenbank."""
    db = SessionLocal()
    try:
        # Überprüfen, ob der Benutzer bereits existiert
        user = db.query(models.User).filter(models.User.username == username).first()
        if user:
            print(f"Benutzer '{username}' existiert bereits.")
            return False

        # Neuen Admin-Benutzer erstellen
        hashed_password = get_password_hash(password)
        new_user = models.User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            is_admin=True,
            is_active=True
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print(f"Admin-Benutzer '{username}' erfolgreich erstellt.")
        return True
    
    except Exception as e:
        print(f"Fehler beim Erstellen des Admin-Benutzers: {e}")
        return False
    
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Erstellt einen Admin-Benutzer")
    parser.add_argument("--username", required=True, help="Admin-Benutzername")
    parser.add_argument("--email", required=True, help="Admin-E-Mail")
    parser.add_argument("--password", required=True, help="Admin-Passwort")
    
    args = parser.parse_args()
    
    create_admin(args.username, args.email, args.password)
