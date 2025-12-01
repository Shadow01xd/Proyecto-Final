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

// POST /api/categorias - Crear nueva categoría
router.post('/', async (req, res) => {
  const { nombreCategoria, descripcionCategoria } = req.body || {};

  if (!nombreCategoria || !String(nombreCategoria).trim()) {
    return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('nombreCategoria', String(nombreCategoria).trim())
      .input('descripcionCategoria', descripcionCategoria ? String(descripcionCategoria).trim() : null)
      .query(`
        INSERT INTO Categorias (nombreCategoria, descripcionCategoria)
        VALUES (@nombreCategoria, @descripcionCategoria);
        SELECT SCOPE_IDENTITY() AS idCategoria;
      `);

    const idCategoria = result.recordset[0].idCategoria;

    res.status(201).json({
      message: 'Categoría creada correctamente',
      categoria: { idCategoria, nombreCategoria, descripcionCategoria: descripcionCategoria || null }
    });
  } catch (err) {
    console.error('Error al crear categoría:', err);
    res.status(500).json({ error: 'Error al crear categoría' });
  }
});

// PUT /api/categorias/:id - Actualizar categoría existente
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombreCategoria, descripcionCategoria } = req.body || {};

  if (!nombreCategoria || !String(nombreCategoria).trim()) {
    return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('idCategoria', Number(id))
      .input('nombreCategoria', String(nombreCategoria).trim())
      .input('descripcionCategoria', descripcionCategoria ? String(descripcionCategoria).trim() : null)
      .query(`
        UPDATE Categorias
        SET nombreCategoria = @nombreCategoria,
            descripcionCategoria = @descripcionCategoria
        WHERE idCategoria = @idCategoria;

        SELECT @@ROWCOUNT AS rowsAffected;
      `);

    const rows = result.recordset[0].rowsAffected;

    if (!rows) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({
      message: 'Categoría actualizada correctamente',
      categoria: { idCategoria: Number(id), nombreCategoria, descripcionCategoria: descripcionCategoria || null }
    });
  } catch (err) {
    console.error('Error al actualizar categoría:', err);
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
});

// DELETE /api/categorias/:id - Eliminar categoría
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('idCategoria', Number(id))
      .query(`
        DELETE FROM Categorias WHERE idCategoria = @idCategoria;
        SELECT @@ROWCOUNT AS rowsAffected;
      `);

    const rows = result.recordset[0].rowsAffected;

    if (!rows) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar categoría:', err);
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
});

module.exports = router;
