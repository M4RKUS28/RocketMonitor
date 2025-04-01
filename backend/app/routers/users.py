from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(
    prefix="/api/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[schemas.User])
async def read_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """Gibt eine Liste aller Benutzer zurück (nur für Administratoren)."""
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@router.get("/{user_id}", response_model=schemas.User)
async def read_user(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Gibt Details zu einem bestimmten Benutzer zurück."""
    # Admin darf alle Benutzer sehen, normale Benutzer nur sich selbst
    if not current_user.is_admin and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Keine Berechtigung für diesen Benutzer")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    return user

# The issue might be in your backend/app/routers/users.py
# Look for the update_user endpoint and make sure it correctly handles the is_admin field

@router.put("/{user_id}", response_model=schemas.User)
async def update_user(
    user_id: int,
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Aktualisiert Benutzerdetails."""
    # Admin darf alle Benutzer bearbeiten, normale Benutzer nur sich selbst
    if not current_user.is_admin and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Keine Berechtigung zur Bearbeitung dieses Benutzers")
    
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    
    # Update user data
    if user_update.username is not None:
        # Check if new username is already taken
        existing_user = db.query(models.User).filter(
            models.User.username == user_update.username,
            models.User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Benutzername bereits vergeben")
        db_user.username = user_update.username
    
    if user_update.email is not None:
        # Check if new email is already taken
        existing_user = db.query(models.User).filter(
            models.User.email == user_update.email,
            models.User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="E-Mail bereits vergeben")
        db_user.email = user_update.email
    
    if user_update.password is not None:
        db_user.hashed_password = auth.get_password_hash(user_update.password)
    
    # Only admins can change active status
    if user_update.is_active is not None and current_user.is_admin:
        db_user.is_active = user_update.is_active
    
    # IMPORTANT: Ensure is_admin is properly handled
    # Only admins can grant/revoke admin status 
    if user_update.is_admin is not None and current_user.is_admin:
        db_user.is_admin = user_update.is_admin
    
    if user_update.team_id is not None and current_user.is_admin:
        # Check if team exists
        team = db.query(models.Team).filter(models.Team.id == user_update.team_id).first()
        if team is None and user_update.team_id != 0:
            raise HTTPException(status_code=404, detail="Team nicht gefunden")
        
        if user_update.team_id == 0:
            db_user.team_id = None
        else:
            db_user.team_id = user_update.team_id
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}", response_model=schemas.User)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """Löscht einen Benutzer (nur für Administratoren)."""
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    
    # Verhindere das Löschen des eigenen Accounts
    if db_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Sie können Ihren eigenen Account nicht löschen")
    
    db.delete(db_user)
    db.commit()
    
    return db_user
