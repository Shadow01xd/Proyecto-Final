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

module.exports = router;
