// routes/productos.js
const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// GET /api/productos - Obtener todos los productos
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        p.idProducto,
        p.idCategoria,
        p.idProveedor,
        p.nombreProducto,
        p.descripcionProducto,
        p.precioProducto,
        p.stockProducto,
        p.garantiaMeses,
        p.skuProducto,
        p.imgProducto,
        p.esActivo,
        p.esOferta,
        p.nombreOferta,
        p.porcentajeDescuento,
        p.precioOferta,
        c.nombreCategoria,
        pr.nombreEmpresa AS nombreProveedor
      FROM Productos p
      INNER JOIN Categorias c ON p.idCategoria = c.idCategoria
      INNER JOIN Proveedores pr ON p.idProveedor = pr.idProveedor
      WHERE p.esActivo = 1
      ORDER BY p.idProducto DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error al obtener productos:', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/productos/ofertas - Obtener productos en oferta
router.get('/ofertas', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        p.idProducto,
        p.nombreProducto,
        p.descripcionProducto,
        p.precioProducto,
        p.precioOferta,
        p.porcentajeDescuento,
        p.nombreOferta,
        p.imgProducto,
        p.skuProducto,
        p.esOferta,
        c.nombreCategoria
      FROM Productos p
      INNER JOIN Categorias c ON p.idCategoria = c.idCategoria
      WHERE p.esActivo = 1 AND p.esOferta = 1
      ORDER BY p.idProducto DESC
    `);
    res.json({ productos: result.recordset });
  } catch (err) {
    console.error('Error al obtener ofertas:', err);
    res.status(500).json({ error: 'Error al obtener ofertas' });
  }
});

// GET /api/productos/:id - Obtener un producto por id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('idProducto', id)
      .query(`
        SELECT
          p.idProducto,
          p.idCategoria,
          p.idProveedor,
          p.nombreProducto,
          p.descripcionProducto,
          p.precioProducto,
          p.stockProducto,
          p.garantiaMeses,
          p.skuProducto,
          p.imgProducto,
          p.esActivo,
          p.esOferta,
          p.nombreOferta,
          p.porcentajeDescuento,
          p.precioOferta,
          c.nombreCategoria,
          pr.nombreEmpresa AS nombreProveedor
        FROM Productos p
        INNER JOIN Categorias c ON p.idCategoria = c.idCategoria
        INNER JOIN Proveedores pr ON p.idProveedor = pr.idProveedor
        WHERE p.idProducto = @idProducto AND p.esActivo = 1
      `);
    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error al obtener producto por id:', err);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

 

// POST /api/productos - Agregar nuevo producto (solo empleados)
router.post('/', async (req, res) => {
  const {
    idCategoria,
    idProveedor,
    nombreProducto,
    descripcionProducto,
    precioProducto,
    stockProducto,
    garantiaMeses,
    skuProducto,
    imgProducto
  } = req.body;

  // Validaciones básicas
  if (!idCategoria || !idProveedor || !nombreProducto || !precioProducto || !stockProducto || !skuProducto) {
    return res.status(400).json({
      error: 'Todos los campos requeridos deben ser completados (categoría, proveedor, nombre, precio, stock, SKU)'
    });
  }

  if (precioProducto < 0) {
    return res.status(400).json({ error: 'El precio no puede ser negativo' });
  }

  if (stockProducto < 0) {
    return res.status(400).json({ error: 'El stock no puede ser negativo' });
  }

  try {
    const pool = await getPool();

    // Verificar si el SKU ya existe
    const checkSku = await pool.request()
      .input('skuProducto', skuProducto)
      .query('SELECT idProducto FROM Productos WHERE skuProducto = @skuProducto');

    if (checkSku.recordset.length > 0) {
      return res.status(409).json({ error: 'El SKU ya está registrado' });
    }

    // Insertar nuevo producto
    const result = await pool.request()
      .input('idCategoria', idCategoria)
      .input('idProveedor', idProveedor)
      .input('nombreProducto', nombreProducto)
      .input('descripcionProducto', descripcionProducto || null)
      .input('precioProducto', precioProducto)
      .input('stockProducto', stockProducto)
      .input('garantiaMeses', garantiaMeses || 0)
      .input('skuProducto', skuProducto)
      .input('imgProducto', imgProducto || null)
      .query(`
        INSERT INTO Productos
        (idCategoria, idProveedor, nombreProducto, descripcionProducto, precioProducto, stockProducto, garantiaMeses, skuProducto, imgProducto, esActivo)
        VALUES
        (@idCategoria, @idProveedor, @nombreProducto, @descripcionProducto, @precioProducto, @stockProducto, @garantiaMeses, @skuProducto, @imgProducto, 1);
        SELECT SCOPE_IDENTITY() AS idProducto;
      `);

    const idProducto = result.recordset[0].idProducto;

    res.status(201).json({
      message: 'Producto agregado correctamente',
      producto: {
        idProducto,
        nombreProducto,
        skuProducto
      }
    });
  } catch (err) {
    console.error('Error al agregar producto:', err);
    res.status(500).json({ error: 'Error al agregar producto' });
  }
});

// PUT /api/productos/:id - Actualizar producto
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    idCategoria,
    idProveedor,
    nombreProducto,
    descripcionProducto,
    precioProducto,
    stockProducto,
    garantiaMeses,
    esActivo,
    imgProducto
  } = req.body;

  try {
    const pool = await getPool();

    // Verificar que el producto existe
    const checkProduct = await pool.request()
      .input('idProducto', id)
      .query('SELECT idProducto FROM Productos WHERE idProducto = @idProducto');

    if (checkProduct.recordset.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Actualizar producto
    await pool.request()
      .input('idProducto', id)
      .input('idCategoria', idCategoria)
      .input('idProveedor', idProveedor)
      .input('nombreProducto', nombreProducto)
      .input('descripcionProducto', descripcionProducto || null)
      .input('precioProducto', precioProducto)
      .input('stockProducto', stockProducto)
      .input('garantiaMeses', garantiaMeses || 0)
      .input('esActivo', esActivo !== undefined ? esActivo : 1)
      .input('imgProducto', imgProducto || null)
      .query(`
        UPDATE Productos
        SET idCategoria = @idCategoria,
            idProveedor = @idProveedor,
            nombreProducto = @nombreProducto,
            descripcionProducto = @descripcionProducto,
            precioProducto = @precioProducto,
            stockProducto = @stockProducto,
            garantiaMeses = @garantiaMeses,
            imgProducto = @imgProducto,
            esActivo = @esActivo
        WHERE idProducto = @idProducto
      `);

    res.json({ message: 'Producto actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar producto:', err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// PUT /api/productos/:id/oferta - Agregar oferta a producto
router.put('/:id/oferta', async (req, res) => {
  const { id } = req.params;
  const { porcentajeDescuento, precioOferta, nombreOferta, idUsuario } = req.body || {};

  if (!idUsuario) {
    return res.status(401).json({ error: 'idUsuario requerido' });
  }

  try {
    const pool = await getPool();

    // Verificar rol del usuario
    const rolRes = await pool.request()
      .input('idUsuario', Number(idUsuario))
      .query(`SELECT UPPER(R.nombreRol) AS rol FROM Usuarios u INNER JOIN Roles r ON r.idRol = u.idRol WHERE u.idUsuario = @idUsuario`);
    const rol = rolRes.recordset[0]?.rol || '';
    if (!['ADMIN', 'ADMINISTRADOR', 'EMPLEADO'].includes(rol)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Verificar que el producto existe y obtener precio base
    const checkProduct = await pool.request()
      .input('idProducto', id)
      .query('SELECT idProducto, precioProducto FROM Productos WHERE idProducto = @idProducto');

    if (checkProduct.recordset.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Calcular precio de oferta si solo se envía porcentaje
    let precioOf = precioOferta
    if (porcentajeDescuento != null && (precioOf == null || Number(precioOf) <= 0)) {
      const base = Number(checkProduct.recordset[0].precioProducto)
      const pct = Math.max(1, Math.min(99, Number(porcentajeDescuento)))
      precioOf = Number((base * (1 - pct / 100)).toFixed(2))
    }

    // Agregar/actualizar oferta a producto
    await pool.request()
      .input('idProducto', id)
      .input('porcentajeDescuento', porcentajeDescuento != null ? Number(porcentajeDescuento) : null)
      .input('precioOferta', precioOf != null ? Number(precioOf) : null)
      .input('nombreOferta', nombreOferta != null && String(nombreOferta).trim() ? String(nombreOferta).trim() : null)
      .query(`
        UPDATE Productos
        SET porcentajeDescuento = @porcentajeDescuento,
            precioOferta = @precioOferta,
            nombreOferta = @nombreOferta,
            esOferta = 1
        WHERE idProducto = @idProducto
      `);

    res.json({ message: 'Oferta agregada correctamente', precioOferta: precioOf, nombreOferta: nombreOferta || null });
  } catch (err) {
    console.error('Error al agregar oferta:', err);
    res.status(500).json({ error: 'Error al agregar oferta' });
  }
});

// PUT /api/productos/:id/oferta/remove - Eliminar oferta de producto
router.put('/:id/oferta/remove', async (req, res) => {
  const { id } = req.params;
  const { idUsuario } = req.body || {};
  if (!idUsuario) {
    return res.status(401).json({ error: 'idUsuario requerido' });
  }
  try {
    const pool = await getPool();

    // Verificar rol del usuario
    const rolRes = await pool.request()
      .input('idUsuario', Number(idUsuario))
      .query(`SELECT UPPER(R.nombreRol) AS rol FROM Usuarios u INNER JOIN Roles r ON r.idRol = u.idRol WHERE u.idUsuario = @idUsuario`);
    const rol = rolRes.recordset[0]?.rol || '';
    if (!['ADMIN', 'ADMINISTRADOR', 'EMPLEADO'].includes(rol)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Verificar que el producto existe
    const checkProduct = await pool.request()
      .input('idProducto', id)
      .query('SELECT idProducto FROM Productos WHERE idProducto = @idProducto');

    if (checkProduct.recordset.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Eliminar oferta de producto
    await pool.request()
      .input('idProducto', id)
      .query(`
        UPDATE Productos
        SET porcentajeDescuento = NULL,
            precioOferta = NULL,
            nombreOferta = NULL,
            esOferta = 0
        WHERE idProducto = @idProducto
      `);

    res.json({ message: 'Oferta eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar oferta:', err);
    res.status(500).json({ error: 'Error al eliminar oferta' });
  }
});

// DELETE /api/productos/:id - Desactivar producto (soft delete)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();

    // Verificar que el producto existe
    const checkProduct = await pool.request()
      .input('idProducto', id)
      .query('SELECT idProducto FROM Productos WHERE idProducto = @idProducto');

    if (checkProduct.recordset.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Desactivar producto
    await pool.request()
      .input('idProducto', id)
      .query('UPDATE Productos SET esActivo = 0 WHERE idProducto = @idProducto');

    res.json({ message: 'Producto desactivado correctamente' });
  } catch (err) {
    console.error('Error al desactivar producto:', err);
    res.status(500).json({ error: 'Error al desactivar producto' });
  }
});

// DELETE /api/productos/:id/hard - Eliminar producto (borrado físico definitivo)
router.delete('/:id/hard', async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();

    // Verificar que el producto existe
    const checkProduct = await pool.request()
      .input('idProducto', id)
      .query('SELECT idProducto FROM Productos WHERE idProducto = @idProducto');

    if (checkProduct.recordset.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Eliminar referencias en CarritoItems
    await pool.request()
      .input('idProducto', id)
      .query('DELETE FROM CarritoItems WHERE idProducto = @idProducto');

    // Eliminar referencias en DetalleOrden
    await pool.request()
      .input('idProducto', id)
      .query('DELETE FROM DetalleOrden WHERE idProducto = @idProducto');

    // Finalmente eliminar el producto
    await pool.request()
      .input('idProducto', id)
      .query('DELETE FROM Productos WHERE idProducto = @idProducto');

    res.json({ message: 'Producto eliminado definitivamente' });
  } catch (err) {
    console.error('Error al eliminar producto definitivamente:', err);
    res.status(500).json({ error: 'Error al eliminar producto definitivamente' });
  }
});

module.exports = router;
