const express = require("express");
const router = express.Router();
const { getPool, sql } = require("../db");

function safeTablesOrder() {
  return [
    "Roles",
    "Usuarios",
    "Proveedores",
    "Categorias",
    "MetodosPago",
    "Productos",
    "Ordenes",
    "DetalleOrden",
    "Pagos",
    "Carritos",
    "CarritoItems",
    "MetodosPagoUsuario",
    "NewsletterSubscribers",
  ];
}

async function fetchTable(pool, table, schema = 'dbo') {
  try {
    const result = await pool.request().query(`SELECT * FROM [${schema}].[${table}]`);
    return result.recordset || [];
  } catch (e) {
    return [];
  }
}

router.get("/export", async (req, res) => {
  try {
    const pool = await getPool();
    const order = safeTablesOrder();
    const tables = {};
    // Detectar esquema real de cada tabla (fallback dbo)
    const schemas = {};
    for (const t of order) {
      try {
        const r = await pool
          .request()
          .input("t", t)
          .query(
            `SELECT TOP 1 TABLE_SCHEMA FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @t`
          );
        schemas[t] = (r.recordset[0] && r.recordset[0].TABLE_SCHEMA) || "dbo";
      } catch (_) {
        schemas[t] = "dbo";
      }
    }
    for (const t of order) {
      tables[t] = await fetchTable(pool, t, schemas[t] || "dbo");
    }

    // Estructura compatible con /import: { tables: { ... } }
    const json = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        tables,
      },
      null,
      2
    );
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=export_${Date.now()}.json`
    );
    return res.send(json);
  } catch (e) {
    return res.status(500).json({ error: "No se pudo exportar" });
  }
});

// Reporte consolidado (JSON) para generar PDF en frontend
router.get("/report", async (req, res) => {
  try {
    const pool = await getPool();

    // Tablas base
    const tables = safeTablesOrder();
    const report = {};
    for (const t of tables) {
      try {
        const rows = await fetchTable(pool, t);
        report[t] = rows;
      } catch {
        report[t] = [];
      }
    }

    // Agregados
    const [{ totalVentas = 0 }] = (
      await pool.request().query(
        `SELECT ISNULL(SUM(montoPago),0) AS totalVentas FROM Pagos`
      )
    ).recordset;

    const [{ totalOrdenes = 0 }] = (
      await pool.request().query(`SELECT COUNT(1) AS totalOrdenes FROM Ordenes`)
    ).recordset;

    const topUsuarios = (
      await pool
        .request()
        .query(`
          SELECT TOP 5 u.idUsuario, u.nombreUsuario, u.apellidoUsuario, u.emailUsuario,
                 ISNULL(SUM(p.montoPago),0) AS totalGastado,
                 COUNT(DISTINCT o.idOrden) AS ordenes
          FROM Usuarios u
          LEFT JOIN Ordenes o ON o.idUsuarioCliente = u.idUsuario
          LEFT JOIN Pagos p ON p.idOrden = o.idOrden
          GROUP BY u.idUsuario, u.nombreUsuario, u.apellidoUsuario, u.emailUsuario
          ORDER BY totalGastado DESC
        `)
    ).recordset || [];

    // Usar SP sp_ReporteVentasRango para obtener ventas por fecha (últimos 12 meses)
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setMonth(inicio.getMonth() - 11);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(hoy);
    fin.setHours(23, 59, 59, 999);

    const ventasPorMes = (
      await pool
        .request()
        .input("fechaInicio", sql.DateTime, inicio)
        .input("fechaFin", sql.DateTime, fin)
        .query(`EXEC dbo.sp_ReporteVentasRango @fechaInicio, @fechaFin`)
    ).recordset || [];

    return res.json({
      generatedAt: new Date().toISOString(),
      aggregates: {
        totalVentas: Number(totalVentas),
        totalOrdenes: Number(totalOrdenes),
        topUsuarios,
        ventasPorMes,
      },
      data: report,
    });
  } catch (e) {
    return res.status(500).json({ error: "No se pudo generar el reporte" });
  }
});

// Evita 'Cannot GET /api/admin/import' cuando se llama con GET desde el navegador
router.get("/import", (req, res) => {
  return res.status(405).json({
    error: "Método no permitido",
    message: "Usa POST /api/admin/import con body JSON { \"tables\": { ... } }. La importación siempre reemplaza (borra e inserta).",
  });
});

// Endpoint informativo
router.get("/", (req, res) => {
  return res.json({
    message: "Admin data endpoints",
    export: "GET /api/admin/export",
    import: "POST /api/admin/import (reemplaza: borra e inserta)",
  });
});

async function withTransaction(pool, fn) {
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const out = await fn(tx);
    await tx.commit();
    return out;
  } catch (e) {
    try {
      await tx.rollback();
    } catch (_) {}
    throw e;
  }
}

async function setIdentityInsert(tx, table, enabled, schema) {
  try {
    await tx.request().query(`SET IDENTITY_INSERT ${qname(table, schema)} ${enabled ? 'ON' : 'OFF'}`);
  } catch (e) {
    throw new Error(`No se pudo ${enabled ? 'activar' : 'desactivar'} IDENTITY_INSERT en ${table}: ${e.message || e}`);
  }
}

function hasIdentityColumn(table) {
  const guess = {
    Roles: "idRol",
    Usuarios: "idUsuario",
    Proveedores: "idProveedor",
    Categorias: "idCategoria",
    Productos: "idProducto",
    MetodosPago: "idMetodoPago",
    Ordenes: "idOrden",
    DetalleOrden: "idDetalleOrden",
    Pagos: "idPago",
    Carritos: "idCarrito",
    CarritoItems: "idCarritoItem",
    MetodosPagoUsuario: "idMetodoPagoUsuario",
    NewsletterSubscribers: "idSubscriber",
  };
  return guess[table] || null;
}

function qname(table, schema) { return `[${schema || 'dbo'}].[${table}]`; }

async function deleteAll(tx, table, schema) {
  await tx.request().query(`DELETE FROM ${qname(table, schema)}`);
}

async function tableExistsAndSchema(tx, table) {
  const r = await tx.request()
    .input('t', table)
    .query('SELECT TOP 1 TABLE_SCHEMA FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @t');
  if (r.recordset.length > 0) {
    return { exists: true, schema: r.recordset[0].TABLE_SCHEMA };
  }
  return { exists: false, schema: 'dbo' };
}

async function insertRows(tx, table, rows, mode, autoIdFallback, warnings, schema) {
  if (!rows || rows.length === 0) return;
  const idCol = hasIdentityColumn(table);
  const columnsSet = new Set();
  rows.forEach(r => Object.keys(r || {}).forEach(k => columnsSet.add(k)));
  let columns = Array.from(columnsSet);
  const wantsIdentity = idCol && columns.includes(idCol);
  let identityEnabled = false;
  if (wantsIdentity) {
    try {
      await setIdentityInsert(tx, table, true, schema);
      identityEnabled = true;
    } catch (e) {
      if (autoIdFallback) {
        // Quitar la columna identity del INSERT para que SQL la genere automáticamente
        columns = columns.filter(c => c !== idCol);
        warnings && warnings.push(`IDENTITY_INSERT no disponible en ${table}. Se omitió la columna ${idCol} y se generarán nuevos IDs automáticamente.`);
      } else {
        throw e;
      }
    }
  }
  try {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      const cols = columns;
      const placeholders = cols.map((_, idx) => `@p${idx}`);
      // Si no es replace, eliminar previamente por PK para reescribir
      if (mode !== 'replace' && idCol && Object.prototype.hasOwnProperty.call(row, idCol) && cols.includes(idCol)) {
        const delReq = tx.request();
        delReq.input('id_to_replace', row[idCol] == null ? null : row[idCol]);
        try { await delReq.query(`DELETE FROM ${qname(table, schema)} WHERE ${idCol} = @id_to_replace`); } catch (_) {}
      }

      try {
        const request = tx.request();
        cols.forEach((col, idx) => {
          const val = Object.prototype.hasOwnProperty.call(row, col) ? row[col] : null;
          request.input(`p${idx}`, val);
        });
        const sqlIns = `INSERT INTO ${qname(table, schema)} (${cols.join(',')}) VALUES (${placeholders.join(',')})`;
        await request.query(sqlIns);
      } catch (e) {
        // Si falla por IDENTITY_INSERT OFF y queremos identidad, reintentar con batch ON/OFF por fila
        const msg = String(e && e.message || e);
        const wantsIdHere = idCol && Object.prototype.hasOwnProperty.call(row, idCol) && (cols.includes(idCol) || identityEnabled);
        if (msg.includes('IDENTITY_INSERT') && msg.includes('OFF') && wantsIdHere) {
          try {
            const req2 = tx.request();
            cols.forEach((col, idx) => {
              const val = Object.prototype.hasOwnProperty.call(row, col) ? row[col] : null;
              req2.input(`p${idx}`, val);
            });
            const insertSql = `INSERT INTO ${qname(table, schema)} (${cols.join(',')}) VALUES (${placeholders.join(',')})`;
            const batch = `SET IDENTITY_INSERT ${qname(table, schema)} ON; ${insertSql}; SET IDENTITY_INSERT ${qname(table, schema)} OFF;`;
            await req2.query(batch);
            continue;
          } catch (e2) {
            const keys = Object.keys(row || {});
            throw new Error(`Tabla ${table}, fila ${i + 1}: ${e2.message || e2}. Campos: ${keys.join(', ')}`);
          }
        } else {
          const keys = Object.keys(row || {});
          throw new Error(`Tabla ${table}, fila ${i + 1}: ${msg}. Campos: ${keys.join(', ')}`);
        }
      }
    }
  } finally {
    if (identityEnabled) {
      try { await setIdentityInsert(tx, table, false, schema); } catch (e) { warnings && warnings.push(String(e && e.message || e)); }
    }
  }
}

router.post("/import", async (req, res) => {
  try {
    const body = req.body || {};
    const tables = body.tables || {};
    const mode = "replace";
    const order = safeTablesOrder();
    const autoIdFallback = false;
    const pool = await getPool();

    let warnings = [];
    await withTransaction(pool, async (tx) => {
      // Siempre reemplazar: borrar en orden inverso
      for (let i = order.length - 1; i >= 0; i--) {
        const t = order[i];
        if (Array.isArray(tables[t])) {
          try {
            const { exists, schema } = await tableExistsAndSchema(tx, t);
            if (exists) {
              await deleteAll(tx, t, schema);
            } else {
              warnings.push(`Tabla no encontrada (omitida en borrado): ${t}`);
            }
          } catch (e) {
            throw new Error(`Error borrando tabla ${t}: ${e.message || e}`);
          }
        }
      }
      for (const t of order) {
        const rows = Array.isArray(tables[t]) ? tables[t] : [];
        if (rows.length > 0) {
          try {
            const { exists, schema } = await tableExistsAndSchema(tx, t);
            if (exists) {
              await insertRows(tx, t, rows, mode, autoIdFallback, warnings, schema);
            } else {
              warnings.push(`Tabla no encontrada (omitida en inserción): ${t}`);
            }
          } catch (e) {
            throw new Error(`Error importando tabla ${t}: ${e.message || e}`);
          }
        }
      }
    });

    return res.status(200).json({ message: "Importación completada (reemplazo)", mode, warnings });
  } catch (err) {
    return res
      .status(500)
      .json({
        error: "No se pudo importar la base de datos",
        details: String((err && err.message) || err),
      });
  }
});

module.exports = router;
