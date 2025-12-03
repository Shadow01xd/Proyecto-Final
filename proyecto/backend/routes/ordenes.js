// routes/ordenes.js
const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

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

// POST /api/ordenes/desde-carrito
// Crea una orden desde el carrito activo de un usuario usando sp_CrearOrdenDesdeCarrito
// body: { idUsuario, esSimulado, direccionEnvio?, observaciones?, referenciaPago? }
router.post('/desde-carrito', async (req, res) => {
  const { idUsuario, esSimulado, direccionEnvio, observaciones, referenciaPago } = req.body || {};

  if (!idUsuario) {
    return res.status(400).json({ error: 'idUsuario es requerido' });
  }

  try {
    const pool = await getPool();

    const request = pool.request()
      .input('idUsuario', sql.Int, Number(idUsuario))
      .input('esSimulado', sql.Bit, esSimulado ? 1 : 0)
      .input('direccionEnvio', sql.VarChar(250), direccionEnvio || null)
      .input('observaciones', sql.VarChar(300), observaciones || null)
      .input('referenciaPago', sql.VarChar(100), referenciaPago || null)
      .output('idOrden', sql.Int)
      .output('total', sql.Decimal(10, 2));

    const result = await request.execute('sp_CrearOrdenDesdeCarrito');

    const idOrdenCreada = result.output.idOrden;
    const total = Number(result.output.total || 0);

    // Devolver también la orden desde la vista de resumen, si existe
    let orden = null;
    if (idOrdenCreada) {
      const r2 = await pool.request()
        .input('idOrden', sql.Int, idOrdenCreada)
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
      orden = r2.recordset[0] || null;
    }

    res.status(201).json({
      message: 'Orden creada desde carrito',
      idOrden: idOrdenCreada,
      total,
      orden
    });
  } catch (err) {
    console.error('Error en sp_CrearOrdenDesdeCarrito:', err);
    res.status(500).json({ error: 'Error al crear orden desde carrito', details: String(err && err.message || err) });
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

// PUT /api/ordenes/:id -> actualizar datos básicos de la orden (estado, direccionEnvio, observaciones)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { estadoOrden, direccionEnvio, observaciones } = req.body || {};

  const estadosValidos = ['Pendiente', 'Pagada', 'Enviada', 'Cancelada'];
  if (estadoOrden && !estadosValidos.includes(estadoOrden)) {
    return res.status(400).json({ error: 'estadoOrden inválido' });
  }

  try {
    const pool = await getPool();

    // Verificar que la orden exista
    const check = await pool.request()
      .input('idOrden', Number(id))
      .query('SELECT idOrden FROM Ordenes WHERE idOrden = @idOrden');

    if (!check.recordset.length) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const reqUpdate = pool.request().input('idOrden', Number(id));

    let setClauses = [];
    if (estadoOrden) {
      setClauses.push('estadoOrden = @estadoOrden');
      reqUpdate.input('estadoOrden', estadoOrden);
    }
    if (direccionEnvio !== undefined) {
      setClauses.push('direccionEnvio = @direccionEnvio');
      reqUpdate.input('direccionEnvio', direccionEnvio || null);
    }
    if (observaciones !== undefined) {
      setClauses.push('observaciones = @observaciones');
      reqUpdate.input('observaciones', observaciones || null);
    }

    if (!setClauses.length) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    const sql = `UPDATE Ordenes SET ${setClauses.join(', ')} WHERE idOrden = @idOrden`;
    await reqUpdate.query(sql);

    res.json({ message: 'Orden actualizada correctamente' });
  } catch (err) {
    console.error('Error al actualizar orden:', err);
    res.status(500).json({ error: 'Error al actualizar orden' });
  }
});

// DELETE /api/ordenes/:id/hard -> eliminar orden, su detalle y sus pagos (uso administrativo)
router.delete('/:id/hard', async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();

    // Verificar que la orden exista
    const check = await pool.request()
      .input('idOrden', Number(id))
      .query('SELECT idOrden FROM Ordenes WHERE idOrden = @idOrden');

    if (!check.recordset.length) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    // Eliminar primero pagos y detalle, luego orden
    await pool.request()
      .input('idOrden', Number(id))
      .query('DELETE FROM Pagos WHERE idOrden = @idOrden');

    await pool.request()
      .input('idOrden', Number(id))
      .query('DELETE FROM DetalleOrden WHERE idOrden = @idOrden');

    await pool.request()
      .input('idOrden', Number(id))
      .query('DELETE FROM Ordenes WHERE idOrden = @idOrden');

    res.json({ message: 'Orden eliminada definitivamente' });
  } catch (err) {
    console.error('Error al eliminar orden:', err);
    res.status(500).json({ error: 'Error al eliminar orden' });
  }
});

module.exports = router;
