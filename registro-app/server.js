require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const db = require('./db');
const { enviarCorreoVerificacion } = require('./mailer');

const app = express();
const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = 10;
const TOKEN_VALIDEZ_MS = 24 * 60 * 60 * 1000; // 24 horas

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -------- Validaciones ----------
function validarRegistro({ correo, nombre, apellidos, edad, password }) {
  const errores = {};
  const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!nombre || nombre.trim().length < 2) errores.nombre = 'El nombre debe tener al menos 2 caracteres.';
  if (!apellidos || apellidos.trim().length < 2) errores.apellidos = 'Los apellidos deben tener al menos 2 caracteres.';
  if (!correo || !regexCorreo.test(correo)) errores.correo = 'Correo electrónico no válido.';

  const edadNum = Number(edad);
  if (!edad || Number.isNaN(edadNum) || edadNum < 1 || edadNum > 120) {
    errores.edad = 'La edad debe ser un número entre 1 y 120.';
  }

  if (!password || password.length < 8) {
    errores.password = 'La contraseña debe tener al menos 8 caracteres.';
  }

  return errores;
}

// -------- Ruta: registro ----------
app.post('/api/registro', async (req, res) => {
  try {
    const { correo, nombre, apellidos, edad, password } = req.body || {};

    const errores = validarRegistro({ correo, nombre, apellidos, edad, password });
    if (Object.keys(errores).length > 0) {
      return res.status(400).json({ mensaje: 'Revisa los campos marcados.', errores });
    }

    const correoNormalizado = correo.trim().toLowerCase();

    const existente = db.prepare('SELECT id FROM usuarios WHERE correo = ?').get(correoNormalizado);
    if (existente) {
      return res.status(409).json({
        mensaje: 'Ya existe una cuenta con ese correo.',
        errores: { correo: 'Este correo ya está registrado.' },
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpira = Date.now() + TOKEN_VALIDEZ_MS;

    const insertar = db.prepare(`
      INSERT INTO usuarios (correo, nombre, apellidos, edad, password_hash, token_verificacion, token_expira)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertar.run(correoNormalizado, nombre.trim(), apellidos.trim(), Number(edad), passwordHash, token, tokenExpira);

    try {
      await enviarCorreoVerificacion({ correoDestino: correoNormalizado, nombre: nombre.trim(), token });
    } catch (errCorreo) {
      console.error('Error enviando correo de verificación:', errCorreo.message);
      // El usuario ya quedó creado; se informa igual pero se avisa del problema de envío.
      return res.status(201).json({
        mensaje: 'Cuenta creada, pero no se pudo enviar el correo de verificación. Contacta soporte.',
      });
    }

    return res.status(201).json({
      mensaje: 'Registro exitoso. Revisa tu correo electrónico para verificar tu cuenta.',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
});

// -------- Ruta: verificación de correo ----------
app.get('/verificar', (req, res) => {
  const { token } = req.query;

  const paginaBase = (titulo, mensaje, exito) => `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${titulo}</title>
      <style>
        body { font-family: Arial, sans-serif; background:#f3f4f6; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
        .tarjeta { background:#fff; padding:32px; border-radius:12px; box-shadow:0 4px 16px rgba(0,0,0,0.08); text-align:center; max-width:400px; }
        h1 { color: ${exito ? '#16a34a' : '#dc2626'}; font-size: 20px; }
        p { color:#374151; font-size:14px; }
        a { color:#2563eb; }
      </style>
    </head>
    <body>
      <div class="tarjeta">
        <h1>${titulo}</h1>
        <p>${mensaje}</p>
        <p><a href="/">Volver al inicio</a></p>
      </div>
    </body>
    </html>
  `;

  if (!token) {
    return res.status(400).send(paginaBase('Token faltante', 'El enlace de verificación no es válido.', false));
  }

  const usuario = db.prepare('SELECT * FROM usuarios WHERE token_verificacion = ?').get(token);

  if (!usuario) {
    return res.status(400).send(paginaBase('Token inválido', 'Este enlace de verificación no existe o ya fue usado.', false));
  }

  if (usuario.verificado) {
    return res.send(paginaBase('Cuenta ya verificada', 'Tu cuenta ya había sido verificada anteriormente.', true));
  }

  if (Date.now() > usuario.token_expira) {
    return res.status(400).send(paginaBase('Enlace vencido', 'El enlace de verificación expiró. Solicita uno nuevo registrándote de nuevo o contactando soporte.', false));
  }

  db.prepare(`
    UPDATE usuarios SET verificado = 1, token_verificacion = NULL, token_expira = NULL WHERE id = ?
  `).run(usuario.id);

  return res.send(paginaBase('¡Cuenta verificada!', 'Tu correo fue verificado correctamente. Ya puedes iniciar sesión.', true));
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
