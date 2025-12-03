// routes/carrito.js
const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// Asegura que el usuario tenga un carrito y lo retorna
async function ensureCarrito(pool, idUsuario) {
  // Buscar carrito activo por usuario
  const existing = await pool.request()
    .input('idUsuario', idUsuario)
    .query(`SELECT TOP 1 idCarrito FROM Carritos WHERE idUsuario = @idUsuario AND estado = 1 ORDER BY idCarrito DESC`);

  if (existing.recordset.length > 0) {
    return existing.recordset[0].idCarrito;
  }

  // Crear carrito si no existe
  const created = await pool.request()
    .input('idUsuario', idUsuario)
    .query(`
      INSERT INTO Carritos (idUsuario, estado)
      VALUES (@idUsuario, 1);
      SELECT SCOPE_IDENTITY() AS idCarrito;
    `);

  return created.recordset[0].idCarrito;
}

// GET /api/carrito/:idUsuario -> obtiene carrito con items y totales
router.get('/:idUsuario', async (req, res) => {
  const { idUsuario } = req.params;
  try {
    const pool = await getPool();
    const idCarrito = await ensureCarrito(pool, idUsuario);

    const items = await pool.request()
      .input('idCarrito', idCarrito)
      .query(`
        SELECT ci.idCarritoItem,
               ci.idProducto,
               ci.cantidad,
               ci.precioUnitario AS precioUnitarioSnapshot,
               CASE WHEN p.esOferta = 1 AND p.precioOferta IS NOT NULL THEN p.precioOferta ELSE p.precioProducto END AS precioUnitarioEfectivo,
               (ci.cantidad * (CASE WHEN p.esOferta = 1 AND p.precioOferta IS NOT NULL THEN p.precioOferta ELSE p.precioProducto END)) AS subtotal,
               p.nombreProducto,
               p.skuProducto,
               p.stockProducto,
               p.imgProducto
        FROM CarritoItems ci
        INNER JOIN Productos p ON p.idProducto = ci.idProducto
        WHERE ci.idCarrito = @idCarrito
        ORDER BY ci.idCarritoItem DESC
      `);

    const total = items.recordset.reduce((acc, it) => acc + Number(it.subtotal || 0), 0);

    res.json({ idCarrito, items: items.recordset, total });
  } catch (err) {
    console.error('Error al obtener carrito:', err);
    res.status(500).json({ error: 'Error al obtener carrito' });
  }
});

// POST /api/carrito/item -> agrega o incrementa un item del carrito
// body: { idUsuario, idProducto, cantidad }
router.post('/item', async (req, res) => {
  const { idUsuario, idProducto, cantidad } = req.body;
  if (!idUsuario || !idProducto || !cantidad || cantidad <= 0) {
    return res.status(400).json({ error: 'idUsuario, idProducto y cantidad > 0 son requeridos' });
  }

  try {
    const pool = await getPool();
    const idCarrito = await ensureCarrito(pool, idUsuario);

    // Obtener precio actual (respetando oferta) y validar existencia/stock
    const prod = await pool.request()
      .input('idProducto', idProducto)
      .query('SELECT precioProducto, precioOferta, esOferta, stockProducto FROM Productos WHERE idProducto = @idProducto AND esActivo = 1');

    if (prod.recordset.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado o inactivo' });
    }

    const row = prod.recordset[0];
    const stock = Number(row.stockProducto ?? 0);
    if (stock <= 0) {
      return res.status(400).json({ error: 'Producto sin stock disponible' });
    }

    const ofertaActiva = row.esOferta === 1 || row.esOferta === true;
    const precio = row.precioOferta != null && ofertaActiva
      ? Number(row.precioOferta)
      : Number(row.precioProducto);

    // Verificar si ya existe el item
    const existing = await pool.request()
      .input('idCarrito', idCarrito)
      .input('idProducto', idProducto)
      .query('SELECT idCarritoItem, cantidad FROM CarritoItems WHERE idCarrito = @idCarrito AND idProducto = @idProducto');

    if (existing.recordset.length > 0) {
      // Incrementar cantidad respetando stock disponible
      const cantidadActual = Number(existing.recordset[0].cantidad || 0);
      const nuevaCantidad = cantidadActual + Number(cantidad);
      if (nuevaCantidad > stock) {
        return res.status(400).json({ error: 'No hay stock suficiente para agregar esa cantidad' });
      }

      await pool.request()
        .input('idCarritoItem', existing.recordset[0].idCarritoItem)
        .input('cantidad', nuevaCantidad)
        .query('UPDATE CarritoItems SET cantidad = @cantidad, fechaActualizacion = GETDATE() WHERE idCarritoItem = @idCarritoItem');
    } else {
      // Insertar nuevo item con precio unitario snapshot
      await pool.request()
        .input('idCarrito', idCarrito)
        .input('idProducto', idProducto)
        .input('cantidad', cantidad)
        .input('precioUnitario', precio)
        .query(`
          INSERT INTO CarritoItems (idCarrito, idProducto, cantidad, precioUnitario)
          VALUES (@idCarrito, @idProducto, @cantidad, @precioUnitario)
        `);
    }

    res.status(201).json({ message: 'Producto agregado al carrito' });
  } catch (err) {
    console.error('Error al agregar item al carrito:', err);
    res.status(500).json({ error: 'Error al agregar item al carrito' });
  }
});

// PUT /api/carrito/item -> actualiza cantidad de un item
// body: { idUsuario, idProducto, cantidad }
router.put('/item', async (req, res) => {
  const { idUsuario, idProducto, cantidad } = req.body;
  if (!idUsuario || !idProducto || cantidad === undefined || cantidad < 0) {
    return res.status(400).json({ error: 'idUsuario, idProducto y cantidad >= 0 son requeridos' });
  }

  try {
    const pool = await getPool();
    const idCarrito = await ensureCarrito(pool, idUsuario);

    if (cantidad === 0) {
      await pool.request()
        .input('idCarrito', idCarrito)
        .input('idProducto', idProducto)
        .query('DELETE FROM CarritoItems WHERE idCarrito = @idCarrito AND idProducto = @idProducto');
      return res.json({ message: 'Item eliminado del carrito' });
    }

    // Obtener precio actual (respetando oferta) para resincronizar el item
    const prod = await pool.request()
      .input('idProducto', idProducto)
      .query('SELECT precioProducto, precioOferta, esOferta FROM Productos WHERE idProducto = @idProducto AND esActivo = 1');

    const prow = prod.recordset[0] || {};
    const ofertaActiva2 = prow?.esOferta === 1 || prow?.esOferta === true;
    const precioSnap = (prow && prow.precioOferta != null && ofertaActiva2)
      ? Number(prow.precioOferta)
      : Number(prow?.precioProducto || 0);

    const result = await pool.request()
      .input('idCarrito', idCarrito)
      .input('idProducto', idProducto)
      .input('cantidad', cantidad)
      .input('precioUnitario', precioSnap)
      .query('UPDATE CarritoItems SET cantidad = @cantidad, precioUnitario = @precioUnitario, fechaActualizacion = GETDATE() WHERE idCarrito = @idCarrito AND idProducto = @idProducto');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Item no encontrado en el carrito' });
    }

    res.json({ message: 'Cantidad actualizada' });
  } catch (err) {
    console.error('Error al actualizar item del carrito:', err);
    res.status(500).json({ error: 'Error al actualizar item del carrito' });
  }
});

// DELETE /api/carrito/item -> elimina un producto del carrito
// body: { idUsuario, idProducto }
router.delete('/item', async (req, res) => {
  const { idUsuario, idProducto } = req.body;
  if (!idUsuario || !idProducto) {
    return res.status(400).json({ error: 'idUsuario e idProducto son requeridos' });
  }
  try {
    const pool = await getPool();
    const idCarrito = await ensureCarrito(pool, idUsuario);

    await pool.request()
      .input('idCarrito', idCarrito)
      .input('idProducto', idProducto)
      .query('DELETE FROM CarritoItems WHERE idCarrito = @idCarrito AND idProducto = @idProducto');

    res.json({ message: 'Item eliminado' });
  } catch (err) {
    console.error('Error al eliminar item del carrito:', err);
    res.status(500).json({ error: 'Error al eliminar item del carrito' });
  }
});

// DELETE /api/carrito/clear/:idUsuario -> limpia carrito
router.delete('/clear/:idUsuario', async (req, res) => {
  const { idUsuario } = req.params;
  try {
    const pool = await getPool();
    const idCarrito = await ensureCarrito(pool, idUsuario);

    await pool.request()
      .input('idCarrito', idCarrito)
      .query('DELETE FROM CarritoItems WHERE idCarrito = @idCarrito');

    res.json({ message: 'Carrito limpiado' });
  } catch (err) {
    console.error('Error al limpiar carrito:', err);
    res.status(500).json({ error: 'Error al limpiar carrito' });
  }
});

module.exports = router;
