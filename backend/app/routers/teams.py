from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(
    prefix="/teams",
    tags=["teams"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[schemas.Team])
async def read_teams(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Gibt eine Liste aller Teams zurück."""
    teams = db.query(models.Team).offset(skip).limit(limit).all()
    return teams

@router.get("/{team_id}", response_model=schemas.TeamDetail)
async def read_team(
    team_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Gibt Details zu einem bestimmten Team zurück."""
    # Benutzer darf nur sein eigenes Team oder als Admin alle Teams sehen
    if not current_user.is_admin and current_user.team_id != team_id:
        raise HTTPException(status_code=403, detail="Keine Berechtigung für dieses Team")
    
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if team is None:
        raise HTTPException(status_code=404, detail="Team nicht gefunden")
    
    # Berechnen der Gesamtpunktzahl
    total_points = (team.greeting_points + team.questions_points + 
                    team.station_points + team.farewell_points)
    
    # Team-Objekt mit zusätzlichen Details erstellen
    team_detail = schemas.TeamDetail(
        id=team.id,
        name=team.name,
        created_at=team.created_at,
        greeting_points=team.greeting_points,
        questions_points=team.questions_points,
        station_points=team.station_points,
        farewell_points=team.farewell_points,
        admin_id=team.admin_id,
        members=team.members,
        total_points=total_points,
        points_visible=team.points_visible
    )
    
    return team_detail

@router.post("/", response_model=schemas.Team)
async def create_team(
    team: schemas.TeamCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """Erstellt ein neues Team (nur für Administratoren)."""
    # Überprüfen, ob der Teamname bereits existiert
    db_team = db.query(models.Team).filter(models.Team.name == team.name).first()
    if db_team:
        raise HTTPException(status_code=400, detail="Teamname bereits vergeben")
    
    # Hash das Team-Passwort, wenn angegeben
    hashed_password = None
    if team.password:
        hashed_password = auth.get_password_hash(team.password)
    
    # Erstellen eines neuen Teams
    new_team = models.Team(
        name=team.name,
        hashed_password=hashed_password,
        admin_id=current_user.id
    )
    
    db.add(new_team)
    db.commit()
    db.refresh(new_team)
    
    return new_team

@router.put("/{team_id}", response_model=schemas.Team)
async def update_team(
    team_id: int,
    team_update: schemas.TeamUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """Aktualisiert Teamdetails (nur für Administratoren)."""
    db_team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if db_team is None:
        raise HTTPException(status_code=404, detail="Team nicht gefunden")
    
    # Aktualisiere die Teamdaten
    if team_update.name is not None:
        # Überprüfe, ob der neue Teamname bereits vergeben ist
        existing_team = db.query(models.Team).filter(
            models.Team.name == team_update.name,
            models.Team.id != team_id
        ).first()
        if existing_team:
            raise HTTPException(status_code=400, detail="Teamname bereits vergeben")
        db_team.name = team_update.name
    
    # Aktualisiere das Team-Passwort, wenn angegeben
    if team_update.password is not None:
        db_team.hashed_password = auth.get_password_hash(team_update.password)
    
    if team_update.greeting_points is not None:
        db_team.greeting_points = team_update.greeting_points
    
    if team_update.questions_points is not None:
        db_team.questions_points = team_update.questions_points
    
    if team_update.station_points is not None:
        db_team.station_points = team_update.station_points
    
    if team_update.farewell_points is not None:
        db_team.farewell_points = team_update.farewell_points

    if team_update.points_visible is not None:
        db_team.points_visible = team_update.points_visible

    db.commit()
    db.refresh(db_team)
    return db_team

@router.put("/{team_id}/points", response_model=schemas.Team)
async def update_team_points(
    team_id: int,
    points: schemas.TeamPoints,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """Aktualisiert die Punkte eines Teams (nur für Administratoren)."""
    db_team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if db_team is None:
        raise HTTPException(status_code=404, detail="Team nicht gefunden")
    
    # Aktualisiere die Punktedaten
    db_team.greeting_points = points.greeting_points
    db_team.questions_points = points.questions_points
    db_team.station_points = points.station_points
    db_team.farewell_points = points.farewell_points
    
    db.commit()
    db.refresh(db_team)
    return db_team

@router.delete("/{team_id}", response_model=schemas.Team)
async def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """Löscht ein Team (nur für Administratoren)."""
    db_team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if db_team is None:
        raise HTTPException(status_code=404, detail="Team nicht gefunden")
    
    # Entferne Team-Zuordnungen für alle Mitglieder
    members = db.query(models.User).filter(models.User.team_id == team_id).all()
    for member in members:
        member.team_id = None
    
    db.delete(db_team)
    db.commit()
    
    return db_team