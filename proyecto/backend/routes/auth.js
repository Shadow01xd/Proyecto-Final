// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getPool } = require('../db');

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
          r.nombreRol
        FROM Usuarios u
        INNER JOIN Roles r ON u.idRol = r.idRol
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
