import os
from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List

from . import models, schemas, auth
from .database import engine, get_db
from .routers import users, teams, altitude_data, admin
from fastapi.staticfiles import StaticFiles


# Datenbanktabellen erstellen
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Altitude Tracking API")

#CORS Konfiguration
origins = [
    "http://localhost:8800",
    "https://georgslauf.m4rkus28.de:443",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router einbinden
app.include_router(users.router)
app.include_router(teams.router)
app.include_router(altitude_data.router)
app.include_router(admin.router)


@app.post("/api/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültiger Benutzername oder Passwort",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Team logins should never have admin privileges regardless of the user object
    # This ensures team logins can't accidentally get admin rights
    is_team_login = db.query(models.Team).filter(models.Team.name == form_data.username).first() is not None
    admin_status = False if is_team_login else user.is_admin
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username, "user_id": user.id, "is_admin": admin_status},
        expires_delta=access_token_expires,
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
        "is_admin": admin_status,  # Use our computed admin_status
        "team_id": user.team_id
    }

@app.get("/api/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user

@app.post("/api/register", response_model=schemas.User)
async def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Überprüfen, ob der Benutzername bereits existiert
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Benutzername bereits vergeben")
    
    # Überprüfen, ob die E-Mail bereits existiert
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="E-Mail bereits vergeben")
    
    # Erstellen eines neuen Benutzers
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        is_admin=user.is_admin
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user