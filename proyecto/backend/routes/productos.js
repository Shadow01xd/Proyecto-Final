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
