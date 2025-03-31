from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from . import models, schemas
from .database import get_db

# Konfiguration
SECRET_KEY = "YOUR_SECRET_KEY_HERE"  # In Produktion in .env auslagern!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 Stunden

# Passwort-Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 mit Password Flow konfigurieren
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    """Überprüft, ob das eingegebene Passwort mit dem Hash übereinstimmt."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Erstellt einen Hash für das angegebene Passwort."""
    return pwd_context.hash(password)

def authenticate_user(db: Session, username: str, password: str):
    """
    Authentifiziert einen Benutzer anhand von Benutzername/Teamname und Passwort.
    
    Der Benutzername kann sein:
    - Ein Admin-Benutzername (prüft users.username)
    - Ein Teamname (prüft teams.name)
    """
    # Zunächst versuchen, einen Admin-Benutzer zu finden
    user = db.query(models.User).filter(models.User.username == username).first()
    
    # Wenn ein Admin-Benutzer gefunden wurde, prüfe dessen Passwort
    if user and verify_password(password, user.hashed_password):
        return user
    
    # Wenn kein User gefunden wurde oder das Passwort nicht stimmt, versuche ein Team zu finden
    team = db.query(models.Team).filter(models.Team.name == username).first()
    if not team:
        return False
    
    # Prüfe das Team-Passwort
    if verify_password(password, team.hashed_password):
        # Wenn das Passwort stimmt, versuche zuerst, einen existierenden Benutzer für dieses Team zu finden
        user = db.query(models.User).filter(models.User.team_id == team.id).first()
        
        # Wenn kein Benutzer vorhanden ist, erstelle einen neuen
        if not user:
            user = models.User(
                username=f"team_{team.id}",
                email=f"team{team.id}@example.com",  # Platzhalter E-Mail
                hashed_password="",  # Kein direktes Login mit diesem Benutzer
                is_admin=False,  # WICHTIG: Team-Benutzer sind NIE Admins
                team_id=team.id
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # WICHTIG: Auch wenn ein existierender Benutzer gefunden wird, 
            # der Team-Login sollte nie Admin-Rechte haben
            # Create a temporary user object that's not tied to the DB session
            temp_user = models.User(
                id=user.id,
                username=user.username,
                email=user.email,
                hashed_password=user.hashed_password,
                is_active=user.is_active,
                is_admin=False,  # Always set team logins to non-admin
                team_id=user.team_id
            )
            return temp_user
        
        return user
    
    return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Erstellt ein JWT-Token für einen authentifizierten Benutzer."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Ruft den aktuellen Benutzer aus dem JWT-Token ab."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Ungültige Authentifizierungsdaten",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: models.User = Depends(get_current_user)):
    """Überprüft, ob der aktuelle Benutzer aktiv ist."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inaktiver Benutzer")
    return current_user

async def get_current_admin_user(current_user: models.User = Depends(get_current_user)):
    """Überprüft, ob der aktuelle Benutzer ein Admin ist."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Keine Administratorrechte"
        )
    return current_user