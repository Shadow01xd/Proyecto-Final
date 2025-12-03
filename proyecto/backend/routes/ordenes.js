// routes/ordenes.js
const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// GET /api/ordenes/usuario/:id  -> lista de órdenes de un usuario
router.get('/usuario/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('idUsuario', id)
      .query(`
        SELECT
          o.idOrden,
          o.fechaOrden,
          o.estadoOrden,
          o.totalOrden,
          o.direccionEnvio,
          o.observaciones,
          pay.nombreMetodo AS metodoPagoNombre,
          pay.referenciaPago AS referenciaPago
        FROM Ordenes o
        OUTER APPLY (
          SELECT TOP 1
            mp.nombreMetodo,
            p.referenciaPago
          FROM Pagos p
          INNER JOIN MetodosPago mp ON mp.idMetodoPago = p.idMetodoPago
          WHERE p.idOrden = o.idOrden
          ORDER BY p.fechaPago DESC, p.idOrden DESC
        ) AS pay
        WHERE o.idUsuarioCliente = @idUsuario
        ORDER BY o.fechaOrden DESC
      `);

    res.json({ ordenes: result.recordset });
  } catch (err) {
    console.error('Error al obtener órdenes del usuario:', err);
    res.status(500).json({ error: 'Error al obtener órdenes del usuario' });
  }
});

// GET /api/ordenes  -> lista de órdenes con cliente
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        o.idOrden,
        o.fechaOrden,
        o.estadoOrden,
        o.totalOrden,
        o.observaciones,
        u.nombreUsuario,
        u.apellidoUsuario
      FROM Ordenes o
      INNER JOIN Usuarios u ON o.idUsuarioCliente = u.idUsuario
      ORDER BY o.fechaOrden DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error al obtener órdenes:', err);
    res.status(500).json({ error: 'Error al obtener órdenes' });
  }
});

// GET /api/ordenes/:id  -> detalle de una orden (con productos)
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();

    // Datos de la orden
    const ordenResult = await pool.request()
      .input('idOrden', Number(id))
      .query(`
        SELECT
          o.idOrden,
          o.fechaOrden,
          o.estadoOrden,
          o.totalOrden,
          o.direccionEnvio,
          o.observaciones,
          u.nombreUsuario,
          u.apellidoUsuario
        FROM Ordenes o
        INNER JOIN Usuarios u ON o.idUsuarioCliente = u.idUsuario
        WHERE o.idOrden = @idOrden
      `);

    if (ordenResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    // Detalle de la orden
    const detalleResult = await pool.request()
      .input('idOrden', Number(id))
      .query(`
        SELECT
          d.idDetalleOrden,
          d.cantidad,
          d.precioUnitario,
          d.subtotal,
          p.idProducto,
          p.nombreProducto,
          p.skuProducto
        FROM DetalleOrden d
        INNER JOIN Productos p ON d.idProducto = p.idProducto
        WHERE d.idOrden = @idOrden
      `);

    res.json({
      orden: ordenResult.recordset[0],
      detalle: detalleResult.recordset
    });
  } catch (err) {
    console.error('Error al obtener detalle de orden:', err);
    res.status(500).json({ error: 'Error al obtener detalle de orden' });
  }
});

module.exports = router;
