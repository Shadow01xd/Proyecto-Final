// routes/productos.js
const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// GET /api/productos
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        p.idProducto,
        p.nombreProducto,
        p.descripcionProducto,
        p.precioProducto,
        p.stockProducto,
        p.garantiaMeses,
        p.skuProducto,
        p.esActivo,
        c.nombreCategoria,
        pr.nombreEmpresa AS nombreProveedor
      FROM Productos p
      INNER JOIN Categorias c ON p.idCategoria = c.idCategoria
      INNER JOIN Proveedores pr ON p.idProveedor = pr.idProveedor
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error al obtener productos:', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

module.exports = router;
