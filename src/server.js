const express = require('express');
const { MongoClient } = require('mongodb');
const os = require('os');

const app = express();

// 1. Variables inyectadas por Kubernetes (ConfigMap y Secret vía envFrom)
const DB_HOST = process.env.DB_HOST || 'mongo-service';
const DB_NAME = process.env.DB_NAME || 'appdb';
const APP_PORT = parseInt(process.env.APP_PORT, 10) || 3000;

const DB_USER = process.env.DB_USER || 'admin';
const DB_PASS = process.env.DB_PASS || 'adminpassword';

// Construcción de la cadena de conexión
const mongoUrl = `mongodb://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASS)}@${DB_HOST}:27017/${DB_NAME}?authSource=admin`;

let dbClient = null;
let dbStatus = 'Conectando...';
let dbError = null;

// Función para conectar a MongoDB con reintentos automáticos
async function connectToMongo() {
  try {
    const client = new MongoClient(mongoUrl, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
    });
    await client.connect();
    dbClient = client.db(DB_NAME);
    dbStatus = 'CONECTADO';
    dbError = null;
    console.log(`[OK] Conectado exitosamente a MongoDB en ${DB_HOST}:27017/${DB_NAME}`);
  } catch (err) {
    dbStatus = 'ERROR_DE_CONEXION';
    dbError = err.message;
    console.warn(`[REINTENTO] No se pudo conectar a MongoDB (${err.message}). Reintentando en 5s...`);
    setTimeout(connectToMongo, 5000);
  }
}

// Iniciar conexión en segundo plano
connectToMongo();

// Endpoint de verificación de salud
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    pod: os.hostname(),
  });
});

// Endpoint de prueba de lectura/escritura en MongoDB
app.get('/api/test-db', async (req, res) => {
  if (!dbClient || dbStatus !== 'CONECTADO') {
    return res.status(503).json({
      success: false,
      message: 'Base de datos no disponible aún.',
      status: dbStatus,
      error: dbError,
    });
  }

  try {
    const collection = dbClient.collection('auditoria_accesos');
    const nuevoRegistro = {
      fecha: new Date(),
      pod: os.hostname(),
      origen_ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      mensaje: 'Prueba de conexión exitosa desde NodePort'
    };
    await collection.insertOne(nuevoRegistro);
    const totalRegistros = await collection.countDocuments();

    res.json({
      success: true,
      mensaje: 'Operación de escritura y lectura realizada con éxito en MongoDB.',
      total_registros: totalRegistros,
      ultimo_registro: nuevoRegistro,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Vista principal visual para el navegador (Cumple con Requisito 3 del Informe Técnico)
app.get('/', (req, res) => {
  const isConnected = dbStatus === 'CONECTADO';
  const statusColor = isConnected ? '#10b981' : '#f59e0b';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>S08 | AP6 - Exposición de Servicios y Configuración Segura</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --success: #10b981;
      --warning: #f59e0b;
      --code-bg: #0b1120;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      justify-content: center;
      padding: 30px 15px;
      line-height: 1.6;
    }
    .container {
      max-width: 850px;
      width: 100%;
    }
    .header {
      background: linear-gradient(135deg, #1e293b, #0f172a);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
    }
    .badge-session {
      display: inline-block;
      background: rgba(56, 189, 248, 0.15);
      color: var(--accent);
      padding: 4px 12px;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 0.85rem;
      margin-bottom: 10px;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }
    h1 { font-size: 1.8rem; margin-bottom: 8px; color: #fff; }
    p.subtitle { color: var(--text-muted); font-size: 0.95rem; }
    
    .status-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-left: 6px solid ${statusColor};
      border-radius: 10px;
      padding: 18px 24px;
      margin-bottom: 20px;
    }
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: ${statusColor};
      box-shadow: 0 0 12px ${statusColor};
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.15); opacity: 1; }
      100% { transform: scale(0.95); opacity: 0.8; }
    }
    .status-title { font-weight: 700; font-size: 1.1rem; }
    .status-msg { font-size: 0.85rem; color: var(--text-muted); }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 20px;
    }
    .card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.05rem;
      font-weight: 600;
      margin-bottom: 14px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }
    .source-tag {
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: monospace;
    }
    .tag-cm { background: #0369a1; color: #e0f2fe; }
    .tag-secret { background: #831843; color: #fce7f3; }

    .param-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      font-size: 0.9rem;
      border-bottom: 1px dashed rgba(255,255,255,0.06);
    }
    .param-name { color: var(--text-muted); font-family: monospace; }
    .param-val {
      font-family: monospace;
      font-weight: 600;
      color: #38bdf8;
      background: var(--code-bg);
      padding: 2px 8px;
      border-radius: 4px;
    }

    .footer-info {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px 20px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .btn {
      display: inline-block;
      background: #0284c7;
      color: white;
      text-decoration: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
      transition: background 0.2s;
    }
    .btn:hover { background: #0369a1; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge-session">Sesión S08 | AP6</span>
      <h1>Exposición de Servicios y Configuración Segura</h1>
      <p class="subtitle">Arquitectura desacoplada en Kubernetes (Minikube): Backend API + MongoDB</p>
    </div>

    <div class="status-card">
      <div class="status-indicator">
        <div class="dot"></div>
        <div>
          <div class="status-title">Estado de Base de Datos: ${dbStatus}</div>
          <div class="status-msg">${isConnected ? 'Conexión autenticada y activa hacia el clúster MongoDB (ClusterIP).' : 'Intentando conectar... (' + (dbError || 'en curso') + ')'}</div>
        </div>
      </div>
      <div>
        <a href="/api/test-db" class="btn" target="_blank">Probar CRUD DB</a>
      </div>
    </div>

    <div class="grid">
      <!-- ConfigMap -->
      <div class="card">
        <div class="card-title">
          <span>Configuración Pública</span>
          <span class="source-tag tag-cm">ConfigMap</span>
        </div>
        <div class="param-row">
          <span class="param-name">DB_HOST</span>
          <span class="param-val">${DB_HOST}</span>
        </div>
        <div class="param-row">
          <span class="param-name">DB_NAME</span>
          <span class="param-val">${DB_NAME}</span>
        </div>
        <div class="param-row">
          <span class="param-name">APP_PORT</span>
          <span class="param-val">${APP_PORT}</span>
        </div>
      </div>

      <!-- Secret -->
      <div class="card">
        <div class="card-title">
          <span>Credenciales Confidenciales</span>
          <span class="source-tag tag-secret">Secret (Opaque)</span>
        </div>
        <div class="param-row">
          <span class="param-name">DB_USER</span>
          <span class="param-val">${DB_USER}</span>
        </div>
        <div class="param-row">
          <span class="param-name">DB_PASS</span>
          <span class="param-val">•••••••• (Oculto)</span>
        </div>
        <div class="param-row">
          <span class="param-name">INYECCIÓN</span>
          <span class="param-val">envFrom: secretRef</span>
        </div>
      </div>
    </div>

    <div class="footer-info">
      <div><strong>Pod Ejecutor:</strong> <code>${os.hostname()}</code></div>
      <div><strong>Exposición Externa:</strong> <code>Service / NodePort</code></div>
      <div><a href="/health" class="btn" style="background:#475569;" target="_blank">Health Check JSON</a></div>
    </div>
  </div>
</body>
</html>`;

  res.send(html);
});

// Arrancar el servidor HTTP
app.listen(APP_PORT, '0.0.0.0', () => {
  console.log(`[INFO] Servidor Backend escuchando en el puerto ${APP_PORT}`);
  console.log(`[INFO] Configuración inyectada: DB_HOST=${DB_HOST}, DB_NAME=${DB_NAME}, DB_USER=${DB_USER}`);
});
