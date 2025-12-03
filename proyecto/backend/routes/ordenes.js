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
          v.idOrden,
          v.fechaOrden,
          v.estadoOrden,
          v.totalOrden,
          v.direccionEnvio,
          v.observaciones,
          v.metodoPagoNombre,
          v.referenciaPago
        FROM vw_OrdenesResumen v
        WHERE v.idUsuarioCliente = @idUsuario
        ORDER BY v.fechaOrden DESC
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
        v.idOrden,
        v.fechaOrden,
        v.estadoOrden,
        v.totalOrden,
        v.observaciones,
        v.nombreUsuario,
        v.apellidoUsuario,
        v.metodoPagoNombre,
        v.referenciaPago
      FROM vw_OrdenesResumen v
      ORDER BY v.fechaOrden DESC
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

    // Datos de la orden (usando vista)
    const ordenResult = await pool.request()
      .input('idOrden', Number(id))
      .query(`
        SELECT
          v.idOrden,
          v.fechaOrden,
          v.estadoOrden,
          v.totalOrden,
          v.direccionEnvio,
          v.observaciones,
          v.nombreUsuario,
          v.apellidoUsuario,
          v.metodoPagoNombre,
          v.referenciaPago
        FROM vw_OrdenesResumen v
        WHERE v.idOrden = @idOrden
      `);

    if (ordenResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    // Detalle de la orden
    const detalleResult = await pool.request()
      .input('idOrden', Number(id))
      .query(`
        SELECT
          v.idDetalleOrden,
          v.idProducto,
          v.cantidad,
          v.precioUnitario,
          v.subtotal,
          v.nombreProducto,
          v.skuProducto,
          v.imgProducto
        FROM vw_DetalleOrdenCompleto v
        WHERE v.idOrden = @idOrden
      `);

    // Total calculado usando la función fn_GetTotalOrden
    const totalFnResult = await pool.request()
      .input('idOrden', Number(id))
      .query(`SELECT dbo.fn_GetTotalOrden(@idOrden) AS totalCalculado`);

    const orden = ordenResult.recordset[0];
    const totalCalculado =
      totalFnResult.recordset.length > 0
        ? Number(totalFnResult.recordset[0].totalCalculado || 0)
        : null;

    res.json({
      orden: {
        ...orden,
        totalCalculado,
      },
      detalle: detalleResult.recordset
    });
  } catch (err) {
    console.error('Error al obtener detalle de orden:', err);
    res.status(500).json({ error: 'Error al obtener detalle de orden' });
  }
});

module.exports = router;
