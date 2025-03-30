from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, exists, text
from typing import List, Optional
from datetime import datetime, timedelta

from sqlalchemy.dialects import mysql  # oder die Dialekt, den du verwendest



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
    Verwendet eine optimierte SQL-Abfrage mit EXISTS, um effizient nur relevante Daten zu laden.
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
    
    # Stellen Sie sicher, dass start_time und end_time als naive Datetimes vorliegen
    # (entferne Zeitzoneninformationen, wenn vorhanden)
    if start_time.tzinfo is not None:
        start_time = start_time.replace(tzinfo=None)
    if end_time.tzinfo is not None:
        end_time = end_time.replace(tzinfo=None)
    
    # Optimierte SQL-Abfrage mit EXISTS-Klausel
    # Diese findet alle Höhendaten, die:
    # 1. Von einem Raspberry Pi stammen, der dem Team zugewiesen wurde
    # 2. Innerhalb des Zeitraums der Zuweisung liegen
    # 3. Innerhalb des angefragten Zeitraums liegen
    
    exists_clause = exists().where(
        and_(
            models.team_raspberry_association.c.team_id == team_id,
            models.team_raspberry_association.c.raspberry_id == models.AltitudeData.raspberry_pi_id,
            models.team_raspberry_association.c.start_time <= models.AltitudeData.timestamp,
            models.team_raspberry_association.c.end_time >= models.AltitudeData.timestamp
        )
    )
    
    altitude_query = db.query(models.AltitudeData).filter(
        models.AltitudeData.timestamp >= start_time,
        models.AltitudeData.timestamp <= end_time,
        exists_clause
    ).order_by(models.AltitudeData.timestamp)


    # Erstelle das SQL-Statement komplett, einschließlich aller Parameter
    compiled_query = altitude_query.statement.compile(
        dialect=db.bind.dialect,
        compile_kwargs={"literal_binds": True}
    )

    # Gib das SQL-Statement aus
    print("DEBUG SQL QUERY:")
    print(str(compiled_query))
    
    altitude_data = altitude_query.all()
    
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
    # Konvertiere Zeitzonen-behaftete Datumszeiten in naive Datumszeiten
    if start_time is not None:
        if start_time.tzinfo is not None:
            start_time = start_time.replace(tzinfo=None)
        query = query.filter(models.AltitudeData.timestamp >= start_time)
    if end_time is not None:
        if end_time.tzinfo is not None:
            end_time = end_time.replace(tzinfo=None)
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
    
    # Stellen Sie sicher, dass der Zeitstempel timezone-naive ist
    timestamp = data.timestamp
    if timestamp.tzinfo is not None:
        timestamp = timestamp.replace(tzinfo=None)
    
    # Erstellen eines neuen Höhendatensatzes
    new_data = models.AltitudeData(
        timestamp=timestamp,
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


