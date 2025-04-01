# Step 1: Frontend (Node.js)
FROM node:18 AS frontend
WORKDIR /build/

# Kopiere nur package.json und package-lock.json, um Caching zu nutzen
COPY view/package*.json ./
RUN npm install
# Kopiere den Frontend-Code
COPY view/public ./public
COPY view/src ./src
# Baue das Frontend
RUN npm run build

# Step 2: Backend (Python)
FROM python:3.10 AS backend
WORKDIR /app

# Kopiere Requirements
COPY backend/requirements.txt ./
# Installiere Abhängigkeiten
RUN pip install --no-cache-dir -r requirements.txt

# Kopiere den Backend-Code so, dass es ein korrektes Python-Paket bleibt
COPY backend/app /app/src/

# Setze die Umgebungsvariablen
ENV DB_HOST=georgslauf.m4rkus28.de
ENV DB_USER=back-end
ENV DB_NAME=LauchDB
ENV DB_PORT=3306

# Kopiere das gebaute Frontend ins Backend
COPY --from=frontend /build/build /app/static

# Exponiere Port 8800
EXPOSE 8800

# Starte den Server mit korrektem Modul-Pfad
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8800"]