// routes/usuarios.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getPool } = require('../db');

// GET /api/usuarios/roles/list - Obtener todos los roles (DEBE IR PRIMERO)
router.get('/roles/list', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM Roles ORDER BY idRol');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error al obtener roles:', err);
    res.status(500).json({ error: 'Error al obtener roles' });
  }
});

// GET /api/usuarios - Obtener todos los usuarios
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        u.idUsuario,
        u.idRol,
        u.nombreUsuario,
        u.apellidoUsuario,
        u.emailUsuario,
        u.telefonoUsuario,
        u.direccionUsuario,
        u.fechaRegistro,
        u.estadoUsuario,
        r.nombreRol,
        CASE
          WHEN ns.estadoSuscripcion = 1 THEN 1
          ELSE 0
        END AS newsletterSuscrito
      FROM Usuarios u
      INNER JOIN Roles r ON u.idRol = r.idRol
      LEFT JOIN NewsletterSubscribers ns ON ns.idUsuario = u.idUsuario AND ns.estadoSuscripcion = 1
      ORDER BY u.fechaRegistro DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// POST /api/usuarios - Crear nuevo usuario (admin/empleado)
router.post('/', async (req, res) => {
  const {
    idRol,
    nombreUsuario,
    apellidoUsuario,
    emailUsuario,
    password,
    telefonoUsuario,
    direccionUsuario
  } = req.body;

  if (!idRol || !nombreUsuario || !apellidoUsuario || !emailUsuario || !password) {
    return res.status(400).json({ error: 'Todos los campos requeridos deben ser completados' });
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
    const hashedPassword = await bcrypt.hash(password, 10);

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
      message: 'Usuario creado correctamente',
      usuario: { idUsuario, nombreUsuario, apellidoUsuario, emailUsuario }
    });
  } catch (err) {
    console.error('Error al crear usuario:', err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// PUT /api/usuarios/:id - Actualizar usuario
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    idRol,
    nombreUsuario,
    apellidoUsuario,
    emailUsuario,
    telefonoUsuario,
    direccionUsuario,
    estadoUsuario
  } = req.body;

  try {
    const pool = await getPool();

    // Verificar que el usuario existe y obtener su email actual
    const checkUser = await pool.request()
      .input('idUsuario', id)
      .query('SELECT idUsuario, emailUsuario AS emailActual FROM Usuarios WHERE idUsuario = @idUsuario');

    if (checkUser.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const emailActual = checkUser.recordset[0].emailActual;

    // Actualizar usuario
    await pool.request()
      .input('idUsuario', id)
      .input('idRol', idRol)
      .input('nombreUsuario', nombreUsuario)
      .input('apellidoUsuario', apellidoUsuario)
      .input('emailUsuario', emailUsuario)
      .input('telefonoUsuario', telefonoUsuario || null)
      .input('direccionUsuario', direccionUsuario || null)
      .input('estadoUsuario', estadoUsuario !== undefined ? estadoUsuario : 1)
      .query(`
        UPDATE Usuarios
        SET idRol = @idRol,
            nombreUsuario = @nombreUsuario,
            apellidoUsuario = @apellidoUsuario,
            emailUsuario = @emailUsuario,
            telefonoUsuario = @telefonoUsuario,
            direccionUsuario = @direccionUsuario,
            estadoUsuario = @estadoUsuario
        WHERE idUsuario = @idUsuario
      `);

    // Si el correo cambió, actualizar también en NewsletterSubscribers para mantener consistencia
    if (emailUsuario && emailUsuario !== emailActual) {
      await pool.request()
        .input('idUsuario', id)
        .input('nuevoEmail', emailUsuario)
        .input('emailActual', emailActual)
        .query(`
          UPDATE NewsletterSubscribers
          SET email = @nuevoEmail
          WHERE (idUsuario = @idUsuario AND idUsuario IS NOT NULL)
             OR (email = @emailActual)
        `);
    }

    res.json({ message: 'Usuario actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// DELETE /api/usuarios/:id/hard - Eliminar usuario (borrado físico definitivo)
router.delete('/:id/hard', async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();

    // 1) Obtener todas las órdenes del usuario
    const ordenesResult = await pool.request()
      .input('idUsuario', id)
      .query('SELECT idOrden FROM Ordenes WHERE idUsuarioCliente = @idUsuario');

    const ordenes = ordenesResult.recordset || [];

    // 2) Eliminar Pagos y DetalleOrden de cada orden (respeta FK en cascada)
    for (const orden of ordenes) {
      await pool.request()
        .input('idOrden', orden.idOrden)
        .query('DELETE FROM Pagos WHERE idOrden = @idOrden');

      await pool.request()
        .input('idOrden', orden.idOrden)
        .query('DELETE FROM DetalleOrden WHERE idOrden = @idOrden');
    }

    // 3) Eliminar todas las órdenes del usuario
    await pool.request()
      .input('idUsuario', id)
      .query('DELETE FROM Ordenes WHERE idUsuarioCliente = @idUsuario');

    // 4) Eliminar métodos de pago asociados al usuario
    await pool.request()
      .input('idUsuario', id)
      .query('DELETE FROM MetodosPagoUsuario WHERE idUsuario = @idUsuario');

    // 5) Eliminar el usuario
    await pool.request()
      .input('idUsuario', id)
      .query('DELETE FROM Usuarios WHERE idUsuario = @idUsuario');

    res.json({ message: 'Usuario y todas sus órdenes/detalles fueron eliminados definitivamente' });
  } catch (err) {
    console.error('Error al eliminar usuario definitivamente:', err);
    res.status(500).json({ error: 'Error al eliminar usuario definitivamente' });
  }
});

// DELETE /api/usuarios/:id - Desactivar usuario (soft delete)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();

    await pool.request()
      .input('idUsuario', id)
      .query('UPDATE Usuarios SET estadoUsuario = 0 WHERE idUsuario = @idUsuario');

    res.json({ message: 'Usuario desactivado correctamente' });
  } catch (err) {
    console.error('Error al desactivar usuario:', err);
    res.status(500).json({ error: 'Error al desactivar usuario' });
  }
});

// PUT /api/usuarios/:id/activar - Reactivar usuario (estadoUsuario = 1)
router.put('/:id/activar', async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();

    await pool.request()
      .input('idUsuario', id)
      .query('UPDATE Usuarios SET estadoUsuario = 1 WHERE idUsuario = @idUsuario');

    res.json({ message: 'Usuario activado correctamente' });
  } catch (err) {
    console.error('Error al activar usuario:', err);
    res.status(500).json({ error: 'Error al activar usuario' });
  }
});

module.exports = router;
