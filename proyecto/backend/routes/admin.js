const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

function safeTablesOrder() {
  return [
    'Roles',
    'Usuarios',
    'Proveedores',
    'Categorias',
    'Productos',
    'Carritos',
    'CarritoItems',
    'Ordenes',
    'DetalleOrden',
    'Pagos',
    'MetodosPagoUsuario',
    'NewsletterSubscribers',
  ];
}

async function fetchTable(pool, table) {
  try {
    const result = await pool.request().query(`SELECT * FROM ${table}`);
    return result.recordset || [];
  } catch (e) {
    return [];
  }
}

router.get('/export', async (req, res) => {
  try {
    const pool = await getPool();
    const tables = safeTablesOrder();
    const data = {};
    for (const t of tables) {
      data[t] = await fetchTable(pool, t);
    }
    const json = JSON.stringify({
      exportedAt: new Date().toISOString(),
      tables: data,
    }, null, 2);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="backup-${Date.now()}.json"`);
    return res.status(200).send(json);
  } catch (err) {
    return res.status(500).json({ error: 'No se pudo exportar la base de datos', details: String(err && err.message || err) });
  }
});

// GET /api/admin/reportes/ventas-rango
// Usa sp_ReporteVentasRango para devolver ventas por día entre dos fechas
// Query params opcionales: fechaInicio, fechaFin (YYYY-MM-DD)
router.get('/reportes/ventas-rango', async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query || {};
    const pool = await getPool();
    const request = pool.request();

    if (fechaInicio) {
      request.input('fechaInicio', new Date(fechaInicio));
    } else {
      request.input('fechaInicio', new Date('2000-01-01'));
    }

    if (fechaFin) {
      request.input('fechaFin', new Date(fechaFin));
    } else {
      request.input('fechaFin', null);
    }

    const result = await request.execute('sp_ReporteVentasRango');
    return res.status(200).json({ ventas: result.recordset });
  } catch (err) {
    return res.status(500).json({ error: 'No se pudo obtener el reporte de ventas por rango', details: String((err && err.message) || err) });
  }
});

async function withTransaction(pool, fn) {
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const out = await fn(tx);
    await tx.commit();
    return out;
  } catch (e) {
    try { await tx.rollback(); } catch (_) {}
    throw e;
  }
}

async function setIdentityInsert(tx, table, enabled) {
  try {
    await tx.request().query(`SET IDENTITY_INSERT ${table} ${enabled ? 'ON' : 'OFF'}`);
  } catch (_) {}
}

function hasIdentityColumn(table) {
  const guess = {
    Roles: 'idRol',
    Usuarios: 'idUsuario',
    Proveedores: 'idProveedor',
    Categorias: 'idCategoria',
    Productos: 'idProducto',
    Carritos: 'idCarrito',
    CarritoItems: 'idCarritoItem',
    Ordenes: 'idOrden',
    DetalleOrden: 'idDetalleOrden',
    Pagos: 'idPago',
    MetodosPagoUsuario: 'idMetodo',
    NewsletterSubscribers: 'idSubscriber',
  };
  return guess[table] || null;
}

async function deleteAll(tx, table) {
  await tx.request().query(`DELETE FROM ${table}`);
}

async function insertRows(tx, table, rows, mode) {
  if (!rows || rows.length === 0) return;
  const idCol = hasIdentityColumn(table);
  const columnsSet = new Set();
  rows.forEach(r => Object.keys(r || {}).forEach(k => columnsSet.add(k)));
  const columns = Array.from(columnsSet);
  const useIdentity = idCol && columns.includes(idCol);
  if (useIdentity) await setIdentityInsert(tx, table, true);
  try {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      const cols = columns;
      const placeholders = cols.map((_, idx) => `@p${idx}`);
      // Si no es replace, eliminar previamente por PK para reescribir
      if (mode !== 'replace' && idCol && Object.prototype.hasOwnProperty.call(row, idCol)) {
        const delReq = tx.request();
        delReq.input('id_to_replace', row[idCol] == null ? null : row[idCol]);
        try { await delReq.query(`DELETE FROM ${table} WHERE ${idCol} = @id_to_replace`); } catch (_) {}
      }

      const request = tx.request();
      cols.forEach((col, idx) => {
        const val = Object.prototype.hasOwnProperty.call(row, col) ? row[col] : null;
        request.input(`p${idx}`, val);
      });
      const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders.join(',')})`;
      await request.query(sql);
    }
  } finally {
    if (useIdentity) await setIdentityInsert(tx, table, false);
  }
}

router.post('/import', async (req, res) => {
  try {
    const body = req.body || {};
    const tables = body.tables || {};
    const mode = (req.query.mode || body.mode || 'append').toLowerCase();
    const order = safeTablesOrder();
    const pool = await getPool();

    await withTransaction(pool, async (tx) => {
      if (mode === 'replace') {
        for (let i = order.length - 1; i >= 0; i--) {
          const t = order[i];
          if (Array.isArray(tables[t])) {
            try { await deleteAll(tx, t); } catch (_) {}
          }
        }
      }
      for (const t of order) {
        const rows = Array.isArray(tables[t]) ? tables[t] : [];
        if (rows.length > 0) {
          try { await insertRows(tx, t, rows, mode); } catch (e) { throw new Error(`Error importando tabla ${t}: ${e.message || e}`); }
        }
      }
    });

    return res.status(200).json({ message: 'Importación completada', mode });
  } catch (err) {
    return res.status(500).json({ error: 'No se pudo importar la base de datos', details: String((err && err.message) || err) });
  }
});

router.get('/reportes/productos-mas-vendidos', async (req, res) => {
  try {
    const { fechaInicio, fechaFin, topN } = req.query || {};
    const pool = await getPool();
    const request = pool.request();

    // fechaInicio obligatorio lógico, pero si no viene usamos un valor amplio
    if (fechaInicio) {
      request.input('fechaInicio', new Date(fechaInicio));
    } else {
      request.input('fechaInicio', new Date('2000-01-01'));
    }

    // fechaFin puede ser null para que el SP use GETDATE()+1
    if (fechaFin) {
      request.input('fechaFin', new Date(fechaFin));
    } else {
      request.input('fechaFin', null);
    }

    let top = 10;
    if (topN) {
      const parsed = parseInt(topN, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        top = parsed;
      }
    }
    request.input('topN', top);

    const result = await request.execute('sp_ReporteProductosMasVendidos');
    return res.status(200).json({ productos: result.recordset });
  } catch (err) {
    return res.status(500).json({ error: 'No se pudo obtener el reporte de productos más vendidos', details: String((err && err.message) || err) });
  }
});

module.exports = router;
