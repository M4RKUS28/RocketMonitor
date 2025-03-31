from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
from datetime import datetime, timedelta

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    responses={404: {"description": "Not found"}},
    dependencies=[Depends(auth.get_current_admin_user)]  # Alle Endpoints erfordern Admin-Rechte
)

# Raspberry Pi Verwaltung
@router.get("/raspberry", response_model=List[schemas.RaspberryPi])
async def get_all_raspberry_pis(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Gibt eine Liste aller Raspberry Pis zurück."""
    raspberry_pis = db.query(models.RaspberryPi).offset(skip).limit(limit).all()
    return raspberry_pis

@router.post("/raspberry", response_model=schemas.RaspberryPi)
async def create_raspberry_pi(
    raspberry_pi: schemas.RaspberryPiCreate,
    db: Session = Depends(get_db)
):
    """Erstellt einen neuen Raspberry Pi."""
    # Überprüfen, ob der Name bereits existiert
    existing = db.query(models.RaspberryPi).filter(
        models.RaspberryPi.name == raspberry_pi.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Raspberry Pi mit diesem Namen existiert bereits")
    
    # Erstellen des neuen Raspberry Pi
    new_raspberry_pi = models.RaspberryPi(
        name=raspberry_pi.name,
        description=raspberry_pi.description
    )
    
    db.add(new_raspberry_pi)
    db.commit()
    db.refresh(new_raspberry_pi)
    
    return new_raspberry_pi

@router.put("/raspberry/{raspberry_id}", response_model=schemas.RaspberryPi)
async def update_raspberry_pi(
    raspberry_id: int,
    raspberry_pi: schemas.RaspberryPiUpdate,
    db: Session = Depends(get_db)
):
    """Aktualisiert einen Raspberry Pi."""
    db_raspberry_pi = db.query(models.RaspberryPi).filter(
        models.RaspberryPi.id == raspberry_id
    ).first()
    if not db_raspberry_pi:
        raise HTTPException(status_code=404, detail="Raspberry Pi nicht gefunden")
    
    # Aktualisiere die Daten
    if raspberry_pi.name is not None:
        # Überprüfe, ob der neue Name bereits vergeben ist
        existing = db.query(models.RaspberryPi).filter(
            models.RaspberryPi.name == raspberry_pi.name,
            models.RaspberryPi.id != raspberry_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Raspberry Pi mit diesem Namen existiert bereits")
        db_raspberry_pi.name = raspberry_pi.name
    
    if raspberry_pi.description is not None:
        db_raspberry_pi.description = raspberry_pi.description
    
    db.commit()
    db.refresh(db_raspberry_pi)
    
    return db_raspberry_pi

@router.delete("/raspberry/{raspberry_id}", response_model=schemas.RaspberryPi)
async def delete_raspberry_pi(
    raspberry_id: int,
    db: Session = Depends(get_db)
):
    """Löscht einen Raspberry Pi."""
    db_raspberry_pi = db.query(models.RaspberryPi).filter(
        models.RaspberryPi.id == raspberry_id
    ).first()
    if not db_raspberry_pi:
        raise HTTPException(status_code=404, detail="Raspberry Pi nicht gefunden")
    
    # Überprüfen, ob es aktive Zuweisungen gibt
    current_time = datetime.now()
    active_assignments = db.query(models.team_raspberry_association).filter(
        models.team_raspberry_association.c.raspberry_id == raspberry_id,
        models.team_raspberry_association.c.end_time > current_time
    ).count()
    
    if active_assignments > 0:
        raise HTTPException(
            status_code=400, 
            detail="Raspberry Pi hat aktive Team-Zuweisungen. Bitte entfernen Sie zuerst die Zuweisungen."
        )
    
    db.delete(db_raspberry_pi)
    db.commit()
    
    return db_raspberry_pi

# Team-Raspberry Pi Zuweisungen
@router.post("/assignments", response_model=schemas.TeamRaspberryAssignment)
async def create_team_raspberry_assignment(
    assignment: schemas.AssignmentCreate,
    db: Session = Depends(get_db)
):
    """Weist einem Team einen Raspberry Pi für einen bestimmten Zeitraum zu."""
    # Überprüfen, ob das Team existiert
    team = db.query(models.Team).filter(models.Team.id == assignment.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team nicht gefunden")
    
    # Überprüfen, ob der Raspberry Pi existiert
    raspberry_pi = db.query(models.RaspberryPi).filter(
        models.RaspberryPi.id == assignment.raspberry_id
    ).first()
    if not raspberry_pi:
        raise HTTPException(status_code=404, detail="Raspberry Pi nicht gefunden")
    
    # Zeitraum berechnen
    if assignment.start_time:
        start_time = assignment.start_time
        # Keine Konvertierung vornehmen - Zeit als lokale Zeit betrachten
        print(f"Empfangene Startzeit: {start_time}")
    else:
        # Wenn keine Startzeit angegeben, aktuelle Zeit verwenden
        start_time = datetime.now()
    
    # Berechne Endzeit basierend auf der Startzeit und der Dauer in Stunden
    end_time = start_time + timedelta(hours=assignment.duration_hours)
    
    print(f"Start: {start_time}, Ende: {end_time}")
    
    # Überprüfen, ob es Überschneidungen mit bestehenden Zuweisungen gibt
    existing_assignments = db.query(models.team_raspberry_association).filter(
        models.team_raspberry_association.c.raspberry_id == assignment.raspberry_id,
        models.team_raspberry_association.c.end_time > start_time,
        models.team_raspberry_association.c.start_time < end_time
    ).all()
    
    if existing_assignments:
        raise HTTPException(
            status_code=400,
            detail="Es gibt bereits eine Zuweisung für diesen Raspberry Pi im angegebenen Zeitraum"
        )
    
    # Zuweisung erstellen - explizit start_time und end_time als naive datetime speichern
    stmt = models.team_raspberry_association.insert().values(
        team_id=assignment.team_id,
        raspberry_id=assignment.raspberry_id,
        start_time=start_time,
        end_time=end_time
    )
    
    db.execute(stmt)
    db.commit()
    
    return {
        "team_id": assignment.team_id,
        "raspberry_id": assignment.raspberry_id,
        "start_time": start_time,
        "end_time": end_time
    }

@router.get("/assignments", response_model=List[schemas.TeamRaspberryAssignment])
async def get_team_raspberry_assignments(
    active_only: bool = False,
    team_id: int = None,
    raspberry_id: int = None,
    db: Session = Depends(get_db)
):
    """Gibt eine Liste der Team-Raspberry Pi Zuweisungen zurück."""
    query = db.query(
        models.team_raspberry_association.c.team_id,
        models.team_raspberry_association.c.raspberry_id,
        models.team_raspberry_association.c.start_time,
        models.team_raspberry_association.c.end_time
    )
    
    # Filter für aktive Zuweisungen
    if active_only:
        current_time = datetime.now()
        query = query.filter(
            models.team_raspberry_association.c.start_time <= current_time,
            models.team_raspberry_association.c.end_time > current_time
        )
    
    # Filter für bestimmtes Team
    if team_id is not None:
        query = query.filter(models.team_raspberry_association.c.team_id == team_id)
    
    # Filter für bestimmten Raspberry Pi
    if raspberry_id is not None:
        query = query.filter(models.team_raspberry_association.c.raspberry_id == raspberry_id)
    
    # Sortieren nach Startzeit (absteigend)
    query = query.order_by(models.team_raspberry_association.c.start_time.desc())
    
    # Ergebnisse abrufen
    assignments = query.all()
    
    # Ergebnisse in das richtige Format umwandeln
    result = []
    for assignment in assignments:
        result.append({
            "team_id": assignment.team_id,
            "raspberry_id": assignment.raspberry_id,
            "start_time": assignment.start_time,
            "end_time": assignment.end_time
        })
    
    return result

@router.delete("/assignments")
async def delete_team_raspberry_assignment(
    team_id: int,
    raspberry_id: int,
    start_time: str = None,
    db: Session = Depends(get_db)
):
    """Löscht eine Team-Raspberry Pi Zuweisung."""
    print(f"Löschversuch: team_id={team_id}, raspberry_id={raspberry_id}, start_time={start_time}")
    
    # Basis-Filter
    filters = [
        models.team_raspberry_association.c.team_id == team_id,
        models.team_raspberry_association.c.raspberry_id == raspberry_id
    ]
    
    # Wenn eine Startzeit angegeben wurde, versuchen wir, genau diese Zuweisung zu finden
    if start_time:
        try:
            # Parse the start_time string to a datetime object
            parsed_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            print(f"Parsed time: {parsed_time}")
            
            # Zuweisungen für diese Team-Raspberry-Kombination abrufen
            assignments = db.query(
                models.team_raspberry_association
            ).filter(
                models.team_raspberry_association.c.team_id == team_id,
                models.team_raspberry_association.c.raspberry_id == raspberry_id
            ).all()
            
            print(f"Found {len(assignments)} assignments for team {team_id} and raspberry {raspberry_id}")
            
            # Wenn Zuweisungen gefunden wurden, aber kein exakter Zeitstempel, 
            # löschen wir die erste Zuweisung oder die zeitlich nächste
            if assignments:
                # Einfach die erste Zuweisung löschen
                # Dies ist eine Vereinfachung - möglicherweise möchten Sie eine spezifischere Logik
                stmt = models.team_raspberry_association.delete().where(and_(
                    models.team_raspberry_association.c.team_id == team_id,
                    models.team_raspberry_association.c.raspberry_id == raspberry_id
                ))
                db.execute(stmt)
                db.commit()
                return {"message": "Zuweisung erfolgreich gelöscht"}
            else:
                raise HTTPException(status_code=404, detail="Keine passende Zuweisung gefunden")
            
        except Exception as e:
            print(f"Error while parsing time: {e}")
            # Fahre mit einfachem Löschen fort, wenn das Parsen fehlschlägt
            pass
    
    # Überprüfen, ob überhaupt Zuweisungen existieren
    assignment = db.query(models.team_raspberry_association).filter(and_(
        models.team_raspberry_association.c.team_id == team_id,
        models.team_raspberry_association.c.raspberry_id == raspberry_id
    )).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Zuweisung nicht gefunden")
    
    # Zuweisung löschen basierend auf team_id und raspberry_id
    stmt = models.team_raspberry_association.delete().where(and_(
        models.team_raspberry_association.c.team_id == team_id,
        models.team_raspberry_association.c.raspberry_id == raspberry_id
    ))
    
    db.execute(stmt)
    db.commit()
    
    return {"message": "Zuweisung erfolgreich gelöscht"}