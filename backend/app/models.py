from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timedelta

from .database import Base

# Verbindungstabelle für Team-Raspberry Zuweisungen
team_raspberry_association = Table(
    "team_raspberry_assignments",
    Base.metadata,
    Column("team_id", Integer, ForeignKey("teams.id")),
    Column("raspberry_id", Integer, ForeignKey("raspberry_pis.id")),
    Column("start_time", DateTime, default=func.now()),
    Column("end_time", DateTime, default=lambda: datetime.now() + timedelta(hours=1)),
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    
    # Beziehung zu Teams (nur für Admin-Benutzer)
    managed_teams = relationship("Team", back_populates="admin", foreign_keys="[Team.admin_id]")
    
    # Beziehung zu einem Team (für normale Benutzer)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    team = relationship("Team", back_populates="members", foreign_keys=[team_id])

class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    created_at = Column(DateTime, default=func.now())

    points_visible = Column(Boolean, default=False)
    
    # Passwort für Team-Login
    hashed_password = Column(String(100))
    
    # Punkte-System
    greeting_points = Column(Integer, default=0)
    questions_points = Column(Integer, default=0)
    station_points = Column(Integer, default=0)
    farewell_points = Column(Integer, default=0)
    
    # Beziehungen
    admin_id = Column(Integer, ForeignKey("users.id"))
    admin = relationship("User", back_populates="managed_teams", foreign_keys=[admin_id])
    members = relationship("User", back_populates="team", foreign_keys="[User.team_id]")
    
    # Raspberry Pi Zuweisungen
    raspberry_pis = relationship(
        "RaspberryPi",
        secondary=team_raspberry_association,
        back_populates="teams"
    )

class RaspberryPi(Base):
    __tablename__ = "raspberry_pis"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    description = Column(String(255), nullable=True)
    
    # Beziehungen
    teams = relationship(
        "Team",
        secondary=team_raspberry_association,
        back_populates="raspberry_pis"
    )
    altitude_data = relationship("AltitudeData", back_populates="raspberry_pi")

class AltitudeData(Base):
    __tablename__ = "altitude_data"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, index=True)
    temperature = Column(Float)
    pressure = Column(Float)
    altitude = Column(Float)
    event_group = Column(String(36))
    
    # Beziehung zum Raspberry Pi
    raspberry_pi_id = Column(Integer, ForeignKey("raspberry_pis.id"))
    raspberry_pi = relationship("RaspberryPi", back_populates="altitude_data")