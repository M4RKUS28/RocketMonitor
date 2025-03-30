from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime, timedelta

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(
    prefix="/altitude",
    tags=["altitude"],
    responses={404: {"description": "Not found"}},
)

@router.get("/chart/{team_id}", response_model=schemas.ChartData)
async def get_chart_data(
    team_id: int,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Gibt Höhendaten für ein bestimmtes Team zurück, formatiert für die Chart-Darstellung.
    """
    # Benutzer darf nur sein eigenes Team oder als Admin alle Teams sehen
    if not current_user.is_admin and current_user.team_id != team_id:
        raise HTTPException(status_code=403, detail="Keine Berechtigung für dieses Team")
    
    # Überprüfen, ob das Team existiert
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if team is None:
        raise HTTPException(status_code=404, detail="Team nicht gefunden")
    
    # Standardzeitraum: letzte 24 Stunden, wenn nicht anders angegeben
    if start_time is None:
        start_time = datetime.now() - timedelta(days=1)
    if end_time is None:
        end_time = datetime.now()
    
    # Finde aktuelle oder letzte Raspberry Pi-Zuweisung für das Team
    assignment = db.query(models.team_raspberry_association).filter(
        models.team_raspberry_association.c.team_id == team_id,
        models.team_raspberry_association.c.start_time <= end_time,
        models.team_raspberry_association.c.end_time >= start_time
    ).order_by(models.team_raspberry_association.c.start_time.desc()).first()
    
    if not assignment:
        # Keine Zuweisung gefunden, leere Daten zurückgeben
        return schemas.ChartData(
            timestamps=[],
            altitudes=[],
            max_altitude=0,
            team_name=team.name
        )
    
    # Passe den Zeitraum basierend auf der Zuweisung an
    query_start = max(start_time, assignment.start_time)
    query_end = min(end_time, assignment.end_time)
    
    # Hole die Höhendaten für den angegebenen Zeitraum und das zugewiesene Raspberry Pi
    altitude_data = db.query(models.AltitudeData).filter(
        models.AltitudeData.raspberry_pi_id == assignment.raspberry_id,
        models.AltitudeData.timestamp >= query_start,
        models.AltitudeData.timestamp <= query_end
    ).order_by(models.AltitudeData.timestamp).all()
    
    # Extrahiere die Zeitstempel und Höhenwerte
    timestamps = [data.timestamp for data in altitude_data]
    altitudes = [data.altitude for data in altitude_data]
    
    # Berechne die maximale Höhe
    max_altitude = max(altitudes) if altitudes else 0
    
    return schemas.ChartData(
        timestamps=timestamps,
        altitudes=altitudes,
        max_altitude=max_altitude,
        team_name=team.name
    )

@router.get("/data", response_model=List[schemas.AltitudeData])
async def get_altitude_data(
    raspberry_pi_id: Optional[int] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    limit: int = 1000,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """
    Gibt Höhendaten basierend auf verschiedenen Filtern zurück (nur für Administratoren).
    """
    query = db.query(models.AltitudeData)
    
    # Filter nach Raspberry Pi ID
    if raspberry_pi_id is not None:
        query = query.filter(models.AltitudeData.raspberry_pi_id == raspberry_pi_id)
    
    # Filter nach Zeitraum
    if start_time is not None:
        query = query.filter(models.AltitudeData.timestamp >= start_time)
    if end_time is not None:
        query = query.filter(models.AltitudeData.timestamp <= end_time)
    
    # Sortiere nach Zeitstempel und begrenze die Ergebnisse
    query = query.order_by(models.AltitudeData.timestamp.desc()).limit(limit)
    
    return query.all()

@router.post("/data", response_model=schemas.AltitudeData)
async def create_altitude_data(
    data: schemas.AltitudeDataCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """
    Erstellt einen neuen Höhendatensatz (nur für Administratoren).
    Wird hauptsächlich für Test- und Entwicklungszwecke verwendet.
    """
    # Überprüfen, ob das Raspberry Pi existiert
    raspberry_pi = db.query(models.RaspberryPi).filter(
        models.RaspberryPi.id == data.raspberry_pi_id
    ).first()
    if raspberry_pi is None:
        raise HTTPException(status_code=404, detail="Raspberry Pi nicht gefunden")
    
    # Erstellen eines neuen Höhendatensatzes
    new_data = models.AltitudeData(
        timestamp=data.timestamp,
        temperature=data.temperature,
        pressure=data.pressure,
        altitude=data.altitude,
        event_group=data.event_group,
        raspberry_pi_id=data.raspberry_pi_id
    )
    
    db.add(new_data)
    db.commit()
    db.refresh(new_data)
    
    return new_data
