from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Lade Umgebungsvariablen
load_dotenv()

# Datenbankverbindungsdaten
DB_USER = os.getenv("DB_USER", "altitude_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "your_secure_password")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "altitude_data")

# Datenbankverbindung URL
SQLALCHEMY_DATABASE_URL = f"mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Engine erstellen
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# SessionLocal erstellen
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base Klasse erstellen
Base = declarative_base()

# Hilfsfunktion zum Abrufen einer Datenbankverbindung
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
