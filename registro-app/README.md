# Registro de usuarios con verificación por correo

App en Node.js (Express) + SQLite (better-sqlite3) que registra usuarios
(correo, nombre, apellidos, edad, contraseña) y envía un correo de
verificación con un enlace único.

## Estructura

```
registro-app/
├── server.js        # Rutas: POST /api/registro, GET /verificar
├── db.js            # Conexión y esquema de SQLite
├── mailer.js        # Envío del correo de verificación (nodemailer)
├── public/
│   └── register.html  # Formulario de registro
├── db/
│   └── app.db        # Se crea automáticamente al arrancar
├── .env.example      # Variables de entorno de ejemplo
└── package.json
```

## Instalación

```bash
npm install
cp .env.example .env
```

Edita `.env` con tus datos SMTP reales, por ejemplo:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tucorreo@gmail.com
SMTP_PASS=tu_app_password   # en Gmail debe ser una "contraseña de aplicación"
SMTP_FROM="Mi App" <tucorreo@gmail.com>
BASE_URL=http://localhost:3000
```

## Ejecutar

```bash
npm start
```

Abre `http://localhost:3000/register.html` en el navegador.

## Cómo funciona

1. El usuario llena el formulario y este envía un `POST /api/registro`
   con JSON (`correo`, `nombre`, `apellidos`, `edad`, `password`).
2. El servidor valida los campos, verifica que el correo no exista,
   hashea la contraseña con `bcrypt` y guarda el usuario en SQLite
   con `verificado = 0` y un token aleatorio de verificación
   (válido 24 horas).
3. Se envía un correo con un enlace tipo:
   `http://localhost:3000/verificar?token=xxxxx`
4. Al hacer clic, `GET /verificar` valida el token, revisa que no haya
   expirado y marca al usuario como `verificado = 1`.

## Notas de seguridad / producción

- Las contraseñas nunca se guardan en texto plano (se usa `bcrypt`).
- El token de verificación es aleatorio (32 bytes con `crypto.randomBytes`)
  y expira a las 24 horas.
- Considera agregar límite de intentos (rate limiting) en `/api/registro`
  para evitar spam de registros/correos.
- Considera usar HTTPS en producción y un `BASE_URL` con dominio real.
- Este proyecto no implementa login; solo registro + verificación,
  que era el alcance solicitado.
