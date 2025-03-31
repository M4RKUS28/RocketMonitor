# Step 1: Frontend (Node.js)
FROM node:18 AS frontend
WORKDIR /app/view

# Kopiere nur package.json und package-lock.json, um Caching zu nutzen
COPY view/package*.json ./
RUN npm install

# Kopiere den Rest (ohne node_modules und build)
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

# Kopiere den Backend-Code
COPY backend/app /app

# Setze die Umgebungsvariablen
ENV DB_HOST=db 
ENV DB_USER=altitude_user 
ENV DB_PASSWORD=your_secure_password 
ENV DB_NAME=altitude_data 
ENV DB_PORT=3306

# Kopiere das gebaute Frontend ins Backend
COPY --from=frontend /app/view/build /app/static

# Exponiere Port 8000
EXPOSE 8000

# Starte den Server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]