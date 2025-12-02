// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getPool } = require('../db');
const nodemailer = require('nodemailer');

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error('SMTP no configurado (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)');
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

async function ensurePasswordResetsTable(pool) {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PasswordResets]') AND type in (N'U'))
    BEGIN
      CREATE TABLE [dbo].[PasswordResets](
        emailUsuario VARCHAR(120) NOT NULL,
        codigo VARCHAR(4) NOT NULL,
        expiracion DATETIME NOT NULL,
        intentos TINYINT NOT NULL DEFAULT 0
      );
      CREATE INDEX IX_PasswordResets_Email ON [dbo].[PasswordResets](emailUsuario);
    END
  `);
}

function generarCodigo4() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function buildForgotHtml(nombre, codigo, minutos) {
  const safeNombre = nombre ? String(nombre) : 'Usuario';
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0b0b0c;color:#e5e7eb;border-radius:12px;border:1px solid #1f2937;">
    <div style="text-align:center;margin-bottom:16px;">
      <div style="font-size:22px;font-weight:700;color:#60a5fa;">NovaTech</div>
      <div style="font-size:12px;color:#9ca3af;">Recuperación de contraseña</div>
    </div>
    <p style="font-size:14px;color:#e5e7eb;">Hola ${safeNombre},</p>
    <p style="font-size:14px;color:#d1d5db;line-height:1.6;margin:8px 0 16px;">
      Usa el siguiente código para restablecer tu contraseña. Por seguridad, <strong>expira en ${minutos} minutos</strong>.
    </p>
    <div style="text-align:center;margin:20px 0;">
      <div style="display:inline-block;padding:12px 20px;border-radius:10px;background:#111827;border:1px solid #374151;color:#f3f4f6;font-size:28px;letter-spacing:6px;font-weight:800;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">
        ${codigo}
      </div>
    </div>
    <p style="font-size:12px;color:#9ca3af;margin-top:12px;">Si no solicitaste este código, puedes ignorar este mensaje.</p>
    <hr style="border:none;border-top:1px solid #1f2937;margin:16px 0;"/>
    <p style="font-size:11px;color:#6b7280;text-align:center;">Este es un mensaje automático. No respondas a este correo.</p>
  </div>`;
}

// POST /api/auth/forgot - Enviar código por correo
router.post('/forgot', async (req, res) => {
  const { emailUsuario } = req.body || {};
  if (!emailUsuario) return res.status(400).json({ error: 'Email requerido' });
  try {
    const pool = await getPool();
    // Verificar usuario
    const r = await pool.request().input('emailUsuario', emailUsuario).query('SELECT idUsuario, nombreUsuario FROM Usuarios WHERE emailUsuario = @emailUsuario');
    if (r.recordset.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    await ensurePasswordResetsTable(pool);
    const codigo = generarCodigo4();
    const expiracionMin = 10;
    await pool.request()
      .input('emailUsuario', emailUsuario)
      .input('codigo', codigo)
      .query(`
        DELETE FROM PasswordResets WHERE emailUsuario = @emailUsuario;
        INSERT INTO PasswordResets(emailUsuario, codigo, expiracion)
        VALUES(@emailUsuario, @codigo, DATEADD(MINUTE, ${expiracionMin}, GETDATE()));
      `);

    const transporter = getTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const nombre = r.recordset[0]?.nombreUsuario || '';
    await transporter.sendMail({
      from,
      to: emailUsuario,
      subject: 'Código de verificación (recuperación de contraseña)',
      text: `Hola ${nombre || 'Usuario'}, tu código de verificación es: ${codigo}. Expira en ${expiracionMin} minutos. Si no solicitaste este código, ignora este correo.`,
      html: buildForgotHtml(nombre, codigo, expiracionMin)
    });

    return res.json({ message: 'Código enviado', expiresInMinutes: expiracionMin });
  } catch (err) {
    console.error('Error en /forgot:', err);
    return res.status(500).json({ error: 'No se pudo enviar el código' });
  }
});

// POST /api/auth/forgot/reset - Verificar código y cambiar contraseña
router.post('/forgot/reset', async (req, res) => {
  let { emailUsuario, codigo, nuevaContrasena } = req.body || {};
  emailUsuario = (emailUsuario || '').trim();
  codigo = String((codigo || '')).trim();
  if (!emailUsuario || !codigo || !nuevaContrasena) return res.status(400).json({ error: 'Email, código y nueva contraseña son requeridos' });
  if (nuevaContrasena.length < 6) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  try {
    const pool = await getPool();
    await ensurePasswordResetsTable(pool);
    // limpiar expirados (según tiempo del servidor SQL)
    await pool.request().query('DELETE FROM PasswordResets WHERE expiracion < GETDATE()');

    // validar existencia de registro para el email
    const rAll = await pool.request().input('emailUsuario', emailUsuario).query('SELECT codigo, expiracion FROM PasswordResets WHERE emailUsuario = @emailUsuario');
    if (rAll.recordset.length === 0) return res.status(400).json({ error: 'No hay un código activo para este email' });

    // validar código y expiración en SQL para evitar desfaces de zona horaria
    const rValid = await pool.request()
      .input('emailUsuario', emailUsuario)
      .input('codigo', codigo)
      .query('SELECT 1 AS ok FROM PasswordResets WHERE emailUsuario = @emailUsuario AND codigo = @codigo AND expiracion >= GETDATE()');
    if (rValid.recordset.length === 0) {
      // determinar si expiró o es incorrecto
      const rExp = await pool.request().input('emailUsuario', emailUsuario).query('SELECT 1 AS expired FROM PasswordResets WHERE emailUsuario = @emailUsuario AND expiracion < GETDATE()');
      if (rExp.recordset.length > 0) {
        return res.status(400).json({ error: 'El código ha expirado' });
      }
      await pool.request().input('emailUsuario', emailUsuario).query('UPDATE PasswordResets SET intentos = intentos + 1 WHERE emailUsuario = @emailUsuario');
      return res.status(400).json({ error: 'Código incorrecto' });
    }

    const hashed = await bcrypt.hash(nuevaContrasena, 10);
    await pool.request()
      .input('emailUsuario', emailUsuario)
      .input('passwordHash', hashed)
      .query('UPDATE Usuarios SET passwordHash = @passwordHash WHERE emailUsuario = @emailUsuario');
    await pool.request().input('emailUsuario', emailUsuario).query('DELETE FROM PasswordResets WHERE emailUsuario = @emailUsuario');
    return res.json({ message: 'Contraseña restablecida' });
  } catch (err) {
    console.error('Error en /forgot/reset:', err);
    return res.status(500).json({ error: 'No se pudo restablecer la contraseña' });
  }
});

// POST /api/auth/register - Registro de nuevo usuario (cliente)
router.post('/register', async (req, res) => {
  const {
    nombreUsuario,
    apellidoUsuario,
    emailUsuario,
    passwordHash,
    telefonoUsuario,
    direccionUsuario
  } = req.body;

  // Validaciones básicas
  if (!nombreUsuario || !apellidoUsuario || !emailUsuario || !passwordHash) {
    return res.status(400).json({
      error: 'Todos los campos son requeridos (nombre, apellido, email, contraseña)'
    });
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailUsuario)) {
    return res.status(400).json({ error: 'Formato de email inválido' });
  }

  // Validar longitud de contraseña
  if (passwordHash.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const pool = await getPool();

    // Verificar si el email ya existe
    const checkEmail = await pool.request()
      .input('emailUsuario', emailUsuario)
      .query('SELECT idUsuario FROM Usuarios WHERE emailUsuario = @emailUsuario');

    if (checkEmail.recordset.length > 0) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(passwordHash, 10);

    // Obtener el idRol para "Cliente" (asumiendo que idRol=2 es Cliente, ajustar según tu BD)
    // Si no existe el rol Cliente, crearlo primero o usar idRol por defecto
    const roleResult = await pool.request()
      .query("SELECT idRol FROM Roles WHERE nombreRol = 'Cliente'");

    let idRol = 2; // Valor por defecto
    if (roleResult.recordset.length > 0) {
      idRol = roleResult.recordset[0].idRol;
    }

    // Insertar nuevo usuario
    const result = await pool.request()
      .input('idRol', idRol)
      .input('nombreUsuario', nombreUsuario)
      .input('apellidoUsuario', apellidoUsuario)
      .input('emailUsuario', emailUsuario)
      .input('passwordHash', hashedPassword)
      .input('telefonoUsuario', telefonoUsuario || null)
      .input('direccionUsuario', direccionUsuario || null)
      .query(`
        INSERT INTO Usuarios
        (idRol, nombreUsuario, apellidoUsuario, emailUsuario, passwordHash, telefonoUsuario, direccionUsuario)
        VALUES
        (@idRol, @nombreUsuario, @apellidoUsuario, @emailUsuario, @passwordHash, @telefonoUsuario, @direccionUsuario);
        SELECT SCOPE_IDENTITY() AS idUsuario;
      `);

    const idUsuario = result.recordset[0].idUsuario;

    res.status(201).json({
      message: 'Usuario registrado correctamente',
      usuario: {
        idUsuario,
        nombreUsuario,
        apellidoUsuario,
        emailUsuario
      }
    });
  } catch (err) {
    console.error('Error al registrar usuario:', err);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// POST /api/auth/login - Inicio de sesión
router.post('/login', async (req, res) => {
  const { emailUsuario, passwordHash } = req.body;

  // Validaciones básicas
  if (!emailUsuario || !passwordHash) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  try {
    const pool = await getPool();

    // Buscar usuario por email con información del rol
    const result = await pool.request()
      .input('emailUsuario', emailUsuario)
      .query(`
        SELECT
          u.idUsuario,
          u.idRol,
          u.nombreUsuario,
          u.apellidoUsuario,
          u.emailUsuario,
          u.passwordHash,
          u.telefonoUsuario,
          u.direccionUsuario,
          u.estadoUsuario,
          r.nombreRol,
          CASE
            WHEN ns.estadoSuscripcion = 1 THEN 1
            ELSE 0
          END AS newsletterSubscribed
        FROM Usuarios u
        INNER JOIN Roles r ON u.idRol = r.idRol
        LEFT JOIN NewsletterSubscribers ns ON ns.idUsuario = u.idUsuario AND ns.estadoSuscripcion = 1
        WHERE u.emailUsuario = @emailUsuario
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const usuario = result.recordset[0];

    // Verificar si el usuario está activo
    if (!usuario.estadoUsuario) {
      return res.status(403).json({ error: 'Cuenta inactiva. Contacte con soporte' });
    }

    // Verificar si tiene contraseña establecida
    if (!usuario.passwordHash) {
      return res.status(400).json({
        error: 'Este usuario no tiene contraseña establecida. Por favor, contacte con soporte'
      });
    }

    // Verificar contraseña (soporta texto plano y hash bcrypt)
    let passwordMatch = false;

    // Verificar si la contraseña en BD es un hash bcrypt (empieza con $2a$, $2b$ o $2y$)
    const isBcryptHash = usuario.passwordHash.startsWith('$2a$') ||
                         usuario.passwordHash.startsWith('$2b$') ||
                         usuario.passwordHash.startsWith('$2y$');

    if (isBcryptHash) {
      // Comparar con bcrypt
      passwordMatch = await bcrypt.compare(passwordHash, usuario.passwordHash);
    } else {
      // Comparar texto plano
      passwordMatch = (passwordHash === usuario.passwordHash);
    }

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    // Login exitoso - no enviar la contraseña al cliente
    const { passwordHash: _, ...usuarioData } = usuario;

    res.json({
      message: 'Inicio de sesión exitoso',
      usuario: usuarioData
    });
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// GET /api/auth/verify - Verificar sesión (opcional, para uso futuro)
router.get('/verify/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('emailUsuario', email)
      .query(`
        SELECT
          u.idUsuario,
          u.idRol,
          u.nombreUsuario,
          u.apellidoUsuario,
          u.emailUsuario,
          u.telefonoUsuario,
          u.direccionUsuario,
          u.estadoUsuario,
          r.nombreRol
        FROM Usuarios u
        INNER JOIN Roles r ON u.idRol = r.idRol
        WHERE u.emailUsuario = @emailUsuario AND u.estadoUsuario = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ usuario: result.recordset[0] });
  } catch (err) {
    console.error('Error al verificar usuario:', err);
    res.status(500).json({ error: 'Error al verificar usuario' });
  }
});

// PUT /api/auth/update-profile/:id - Actualizar perfil de usuario
router.put('/update-profile/:id', async (req, res) => {
  const { id } = req.params;
  const { nombreUsuario, apellidoUsuario, emailUsuario, telefonoUsuario, direccionUsuario } = req.body;

  // Validaciones básicas
  if (!nombreUsuario || !apellidoUsuario || !emailUsuario) {
    return res.status(400).json({ error: 'Nombre, apellido y email son requeridos' });
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailUsuario)) {
    return res.status(400).json({ error: 'Formato de email inválido' });
  }

  try {
    const pool = await getPool();

    // Verificar que el usuario existe
    const checkUser = await pool.request()
      .input('idUsuario', id)
      .query('SELECT idUsuario FROM Usuarios WHERE idUsuario = @idUsuario');

    if (checkUser.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar si el email ya está siendo usado por otro usuario
    const checkEmail = await pool.request()
      .input('emailUsuario', emailUsuario)
      .input('idUsuario', id)
      .query('SELECT idUsuario FROM Usuarios WHERE emailUsuario = @emailUsuario AND idUsuario != @idUsuario');

    if (checkEmail.recordset.length > 0) {
      return res.status(409).json({ error: 'El email ya está siendo usado por otro usuario' });
    }

    // Actualizar usuario
    await pool.request()
      .input('idUsuario', id)
      .input('nombreUsuario', nombreUsuario)
      .input('apellidoUsuario', apellidoUsuario)
      .input('emailUsuario', emailUsuario)
      .input('telefonoUsuario', telefonoUsuario || null)
      .input('direccionUsuario', direccionUsuario || null)
      .query(`
        UPDATE Usuarios
        SET nombreUsuario = @nombreUsuario,
            apellidoUsuario = @apellidoUsuario,
            emailUsuario = @emailUsuario,
            telefonoUsuario = @telefonoUsuario,
            direccionUsuario = @direccionUsuario
        WHERE idUsuario = @idUsuario
      `);

    res.json({ message: 'Perfil actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar perfil:', err);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// PUT /api/auth/change-password/:id - Cambiar contraseña
router.put('/change-password/:id', async (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;

  // Validaciones básicas
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Contraseña actual y nueva contraseña son requeridas' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const pool = await getPool();

    // Obtener el usuario actual
    const result = await pool.request()
      .input('idUsuario', id)
      .query('SELECT passwordHash FROM Usuarios WHERE idUsuario = @idUsuario');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = result.recordset[0];

    // Verificar contraseña actual
    const passwordMatch = await bcrypt.compare(currentPassword, usuario.passwordHash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await pool.request()
      .input('idUsuario', id)
      .input('passwordHash', hashedPassword)
      .query('UPDATE Usuarios SET passwordHash = @passwordHash WHERE idUsuario = @idUsuario');

    res.json({ message: 'Contraseña cambiada correctamente' });
  } catch (err) {
    console.error('Error al cambiar contraseña:', err);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
});

// DELETE /api/auth/delete-account/:id - Eliminar cuenta de usuario
router.delete('/delete-account/:id', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  // Validación básica
  if (!password) {
    return res.status(400).json({ error: 'La contraseña es requerida para eliminar la cuenta' });
  }

  try {
    const pool = await getPool();

    // Obtener el usuario
    const result = await pool.request()
      .input('idUsuario', id)
      .query('SELECT passwordHash FROM Usuarios WHERE idUsuario = @idUsuario');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = result.recordset[0];

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, usuario.passwordHash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'La contraseña es incorrecta' });
    }

    // Desactivar usuario en lugar de eliminar (mejor práctica)
    await pool.request()
      .input('idUsuario', id)
      .query('UPDATE Usuarios SET estadoUsuario = 0 WHERE idUsuario = @idUsuario');

    res.json({ message: 'Cuenta eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar cuenta:', err);
    res.status(500).json({ error: 'Error al eliminar cuenta' });
  }
});

// POST /api/auth/hash-password - Convertir contraseña de texto plano a hash (SOLO DESARROLLO)
router.post('/hash-password', async (req, res) => {
  const { emailUsuario } = req.body;

  if (!emailUsuario) {
    return res.status(400).json({ error: 'Email es requerido' });
  }

  try {
    const pool = await getPool();

    // Obtener usuario
    const result = await pool.request()
      .input('emailUsuario', emailUsuario)
      .query('SELECT idUsuario, passwordHash FROM Usuarios WHERE emailUsuario = @emailUsuario');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = result.recordset[0];
    const currentPassword = usuario.passwordHash;

    // Verificar si ya es un hash bcrypt
    const isBcryptHash = currentPassword.startsWith('$2a$') ||
                         currentPassword.startsWith('$2b$') ||
                         currentPassword.startsWith('$2y$');

    if (isBcryptHash) {
      return res.json({ message: 'La contraseña ya está hasheada' });
    }

    // Hashear la contraseña actual (que está en texto plano)
    const hashedPassword = await bcrypt.hash(currentPassword, 10);

    // Actualizar en la base de datos
    await pool.request()
      .input('idUsuario', usuario.idUsuario)
      .input('passwordHash', hashedPassword)
      .query('UPDATE Usuarios SET passwordHash = @passwordHash WHERE idUsuario = @idUsuario');

    res.json({
      message: 'Contraseña actualizada a hash bcrypt correctamente',
      oldPassword: currentPassword,
      newHash: hashedPassword
    });
  } catch (err) {
    console.error('Error al hashear contraseña:', err);
    res.status(500).json({ error: 'Error al hashear contraseña' });
  }
});

module.exports = router;
