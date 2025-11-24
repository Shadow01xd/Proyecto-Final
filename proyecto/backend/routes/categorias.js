// routes/categorias.js
const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// GET /api/categorias - Obtener todas las categorías
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        idCategoria,
        nombreCategoria,
        descripcionCategoria
      FROM Categorias
      ORDER BY nombreCategoria
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error al obtener categorías:', err);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

module.exports = router;
