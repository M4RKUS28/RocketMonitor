from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str
    is_admin: bool = False

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    team_id: Optional[int] = None

class User(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    team_id: Optional[int] = None

    class Config:
        orm_mode = True

# Team Schemas
class TeamBase(BaseModel):
    name: str

class TeamCreate(TeamBase):
    password: Optional[str] = None  # Passwort für Team-Login

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None  # Passwort für Team-Login
    greeting_points: Optional[int] = None
    questions_points: Optional[int] = None
    station_points: Optional[int] = None
    farewell_points: Optional[int] = None

class TeamPoints(BaseModel):
    greeting_points: Optional[int] = 0
    questions_points: Optional[int] = 0
    station_points: Optional[int] = 0
    farewell_points: Optional[int] = 0

class Team(TeamBase):
    id: int
    created_at: datetime
    greeting_points: int
    questions_points: int
    station_points: int
    farewell_points: int
    admin_id: int

    class Config:
        orm_mode = True

class TeamDetail(Team):
    members: List[User] = []
    total_points: int = 0

    class Config:
        orm_mode = True

# Raspberry Pi Schemas
class RaspberryPiBase(BaseModel):
    name: str
    description: Optional[str] = None

class RaspberryPiCreate(RaspberryPiBase):
    pass

class RaspberryPiUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class RaspberryPi(RaspberryPiBase):
    id: int

    class Config:
        orm_mode = True

# Assignment Schema
class TeamRaspberryAssignment(BaseModel):
    team_id: int
    raspberry_id: int
    start_time: datetime
    end_time: datetime

class AssignmentCreate(BaseModel):
    team_id: int
    raspberry_id: int
    duration_hours: float = 1.0  # Standard: 1 Stunde

# Altitude Data Schemas
class AltitudeDataBase(BaseModel):
    timestamp: datetime
    temperature: Optional[float] = None
    pressure: Optional[float] = None
    altitude: float
    event_group: str

class AltitudeDataCreate(AltitudeDataBase):
    raspberry_pi_id: int

class AltitudeData(AltitudeDataBase):
    id: int
    raspberry_pi_id: int

    class Config:
        orm_mode = True

# Chart Data Schema
class ChartData(BaseModel):
    timestamps: List[datetime]
    altitudes: List[float]
    max_altitude: float
    team_name: str

# Authentication Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str
    is_admin: bool
    team_id: Optional[int] = None

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
    is_admin: bool = False

class LoginForm(BaseModel):
    username: str
    password: str