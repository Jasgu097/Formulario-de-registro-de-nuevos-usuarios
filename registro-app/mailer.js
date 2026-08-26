const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true', // true para puerto 465, false para 587/25
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function enviarCorreoVerificacion({ correoDestino, nombre, token }) {
  const enlace = `${process.env.BASE_URL}/verificar?token=${token}`;

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: correoDestino,
    subject: 'Verifica tu cuenta',
    text: `Hola ${nombre}, verifica tu cuenta entrando a este enlace: ${enlace} (valido por 24 horas).`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2>¡Hola, ${nombre}!</h2>
        <p>Gracias por registrarte. Para activar tu cuenta, confirma tu correo electrónico haciendo clic en el siguiente botón:</p>
        <p style="text-align:center; margin: 24px 0;">
          <a href="${enlace}"
             style="background:#2563eb; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; display:inline-block;">
            Verificar mi cuenta
          </a>
        </p>
        <p>O copia y pega este enlace en tu navegador:</p>
        <p><a href="${enlace}">${enlace}</a></p>
        <p style="color:#666; font-size: 13px;">Este enlace vence en 24 horas. Si tú no creaste esta cuenta, ignora este mensaje.</p>
      </div>
    `,
  });

  return info;
}

module.exports = { enviarCorreoVerificacion, transporter };
