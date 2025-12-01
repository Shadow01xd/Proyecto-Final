// routes/proveedores.js
const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// GET /api/proveedores - Obtener todos los proveedores
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        idProveedor,
        nombreEmpresa,
        nombreContacto,
        telefonoProveedor,
        emailProveedor,
        direccionProveedor,
        sitioWebProveedor
      FROM Proveedores
      ORDER BY nombreEmpresa
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error al obtener proveedores:', err);
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});

// POST /api/proveedores - Crear nuevo proveedor
router.post('/', async (req, res) => {
  const {
    nombreEmpresa,
    nombreContacto,
    telefonoProveedor,
    emailProveedor,
    direccionProveedor,
    sitioWebProveedor
  } = req.body || {};

  if (!nombreEmpresa || !String(nombreEmpresa).trim()) {
    return res.status(400).json({ error: 'El nombre de la empresa es requerido' });
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('nombreEmpresa', String(nombreEmpresa).trim())
      .input('nombreContacto', nombreContacto ? String(nombreContacto).trim() : null)
      .input('telefonoProveedor', telefonoProveedor ? String(telefonoProveedor).trim() : null)
      .input('emailProveedor', emailProveedor ? String(emailProveedor).trim() : null)
      .input('direccionProveedor', direccionProveedor ? String(direccionProveedor).trim() : null)
      .input('sitioWebProveedor', sitioWebProveedor ? String(sitioWebProveedor).trim() : null)
      .query(`
        INSERT INTO Proveedores (
          nombreEmpresa,
          nombreContacto,
          telefonoProveedor,
          emailProveedor,
          direccionProveedor,
          sitioWebProveedor
        )
        VALUES (
          @nombreEmpresa,
          @nombreContacto,
          @telefonoProveedor,
          @emailProveedor,
          @direccionProveedor,
          @sitioWebProveedor
        );
        SELECT SCOPE_IDENTITY() AS idProveedor;
      `);

    const idProveedor = result.recordset[0].idProveedor;

    res.status(201).json({
      message: 'Proveedor creado correctamente',
      proveedor: {
        idProveedor,
        nombreEmpresa,
        nombreContacto: nombreContacto || null,
        telefonoProveedor: telefonoProveedor || null,
        emailProveedor: emailProveedor || null,
        direccionProveedor: direccionProveedor || null,
        sitioWebProveedor: sitioWebProveedor || null
      }
    });
  } catch (err) {
    console.error('Error al crear proveedor:', err);
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
});

// PUT /api/proveedores/:id - Actualizar proveedor existente
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    nombreEmpresa,
    nombreContacto,
    telefonoProveedor,
    emailProveedor,
    direccionProveedor,
    sitioWebProveedor
  } = req.body || {};

  if (!nombreEmpresa || !String(nombreEmpresa).trim()) {
    return res.status(400).json({ error: 'El nombre de la empresa es requerido' });
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('idProveedor', Number(id))
      .input('nombreEmpresa', String(nombreEmpresa).trim())
      .input('nombreContacto', nombreContacto ? String(nombreContacto).trim() : null)
      .input('telefonoProveedor', telefonoProveedor ? String(telefonoProveedor).trim() : null)
      .input('emailProveedor', emailProveedor ? String(emailProveedor).trim() : null)
      .input('direccionProveedor', direccionProveedor ? String(direccionProveedor).trim() : null)
      .input('sitioWebProveedor', sitioWebProveedor ? String(sitioWebProveedor).trim() : null)
      .query(`
        UPDATE Proveedores
        SET
          nombreEmpresa = @nombreEmpresa,
          nombreContacto = @nombreContacto,
          telefonoProveedor = @telefonoProveedor,
          emailProveedor = @emailProveedor,
          direccionProveedor = @direccionProveedor,
          sitioWebProveedor = @sitioWebProveedor
        WHERE idProveedor = @idProveedor;

        SELECT @@ROWCOUNT AS rowsAffected;
      `);

    const rows = result.recordset[0].rowsAffected;

    if (!rows) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    res.json({
      message: 'Proveedor actualizado correctamente',
      proveedor: {
        idProveedor: Number(id),
        nombreEmpresa,
        nombreContacto: nombreContacto || null,
        telefonoProveedor: telefonoProveedor || null,
        emailProveedor: emailProveedor || null,
        direccionProveedor: direccionProveedor || null,
        sitioWebProveedor: sitioWebProveedor || null
      }
    });
  } catch (err) {
    console.error('Error al actualizar proveedor:', err);
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
});

// DELETE /api/proveedores/:id - Eliminar proveedor
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('idProveedor', Number(id))
      .query(`
        DELETE FROM Proveedores WHERE idProveedor = @idProveedor;
        SELECT @@ROWCOUNT AS rowsAffected;
      `);

    const rows = result.recordset[0].rowsAffected;

    if (!rows) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    res.json({ message: 'Proveedor eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar proveedor:', err);
    res.status(500).json({ error: 'Error al eliminar proveedor' });
  }
});

module.exports = router;
