const express = require("express");
const router = express.Router();
const { getPool } = require("../db");

router.post("/card", async (req, res) => {
  try {
    const {
      cardNumber,
      expMonth,
      expYear,
      cvv,
      amount,
      currency,
      description,
      merchantName,
    } = req.body || {};

    if (!cardNumber || !expMonth || !expYear || !cvv || !amount) {
      return res.status(400).json({
        error:
          "Parametros requeridos: cardNumber, expMonth, expYear, cvv, amount",
      });
    }

    const baseUrl =
      process.env.POVY_BASE_URL || "https://backend-povy.onrender.com";
    const payload = {
      cardNumber,
      expMonth,
      expYear,
      cvv,
      amount: Number(amount),
      currency: currency || undefined,
      description: description || undefined,
      merchantName:
        merchantName || process.env.POVY_MERCHANT_NAME || "Povy Test",
    };

    const resp = await fetch(`${baseUrl}/api/payments/card`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return res.status(resp.status || 502).json({
        error: data.message || "Error al procesar el pago con Povy",
        details: data,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({
      error: "No se pudo contactar con Povy",
      details: String((err && err.message) || err),
    });
  }
});

// Checkout completo: Pagar con Povy, crear orden, detalle, pago y cerrar carrito
router.post("/checkout", async (req, res) => {
  const {
    idUsuario,
    cardNumber,
    expMonth,
    expYear,
    cvv,
    saveMethod, // boolean
    savedMethodId, // opcional: usar tarjeta guardada
    currency, // opcional, default de cuenta
    direccionEnvio, // opcional
    observaciones, // opcional
  } = req.body || {};

  if (!idUsuario) {
    return res.status(400).json({ error: "Parametro requerido: idUsuario" });
  }

  try {
    const pool = await getPool();

    // Obtener carrito activo y sus items
    const carritoRes = await pool
      .request()
      .input("idUsuario", Number(idUsuario))
      .query(
        `SELECT TOP 1 idCarrito FROM Carritos WHERE idUsuario = @idUsuario AND estado = 1 ORDER BY idCarrito DESC`
      );
    if (carritoRes.recordset.length === 0) {
      return res
        .status(400)
        .json({ error: "No hay carrito activo para el usuario" });
    }
    const idCarrito = carritoRes.recordset[0].idCarrito;

    const itemsRes = await pool.request().input("idCarrito", Number(idCarrito))
      .query(`
        SELECT ci.idProducto,
               ci.cantidad,
               ci.precioUnitario AS precioUnitarioSnapshot,
               CASE WHEN p.esOferta = 1 AND p.precioOferta IS NOT NULL THEN p.precioOferta ELSE p.precioProducto END AS precioUnitarioEfectivo
        FROM CarritoItems ci
        INNER JOIN Productos p ON p.idProducto = ci.idProducto
        WHERE ci.idCarrito = @idCarrito
      `);
    const items = itemsRes.recordset;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "El carrito está vacío" });
    }

    const total = items.reduce(
      (a, it) => a + Number(it.cantidad) * Number(it.precioUnitarioEfectivo ?? it.precioUnitarioSnapshot),
      0
    );

    // Pagar con Povy online (dos modos)
    const baseUrl =
      process.env.POVY_BASE_URL || "https://backend-povy.onrender.com";
    let povy, referencia;
    if (savedMethodId) {
      // Modo 1-clic: usar datos guardados en tokenPasarela (JSON base64) o token legacy
      const methodRes = await pool
        .request()
        .input("idUsuario", Number(idUsuario))
        .input("idMetodoPagoUsuario", Number(savedMethodId))
        .query(
          `SELECT TOP 1 tokenPasarela, mesExpiracion, anioExpiracion FROM MetodosPagoUsuario WHERE idMetodoPagoUsuario = @idMetodoPagoUsuario AND idUsuario = @idUsuario AND estado = 1`
        );
      if (!methodRes.recordset.length) {
        return res.status(400).json({ error: "Método de pago no válido" });
      }
      const stored = methodRes.recordset[0].tokenPasarela || "";
      let parsed = null;
      try {
        const maybe = Buffer.from(String(stored), "base64").toString("utf8");
        parsed = JSON.parse(maybe);
      } catch {}

      if (
        parsed &&
        parsed.cardNumber &&
        parsed.expMonth &&
        parsed.expYear &&
        parsed.cvv
      ) {
        // Cobrar a Povy con los datos guardados para que la transacción aparezca en Povy
        const resp = await fetch(`${baseUrl}/api/payments/card`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardNumber: parsed.cardNumber,
            expMonth: parsed.expMonth,
            expYear: parsed.expYear,
            cvv: parsed.cvv,
            amount: Number(total.toFixed(2)),
            currency: currency || undefined,
            description: `Pedido carrito ${idCarrito} usuario ${idUsuario}`,
            merchantName: process.env.POVY_MERCHANT_NAME || "Povy Test",
          }),
        });
        povy = await resp.json().catch(() => ({}));
        if (!resp.ok || povy.status !== "approved") {
          return res
            .status(resp.status || 402)
            .json({ error: povy.message || "Pago rechazado", details: povy });
        }
        referencia = povy.reference || povy.id || povy.tx || "POVY";
      } else {
        // Legacy token flow (si algún día se habilita): requiere POVY_TOKEN_URL
        const token = stored;
        const tokenUrl =
          process.env.POVY_TOKEN_URL || `${baseUrl}/api/payments/token`;
        if (!token) {
          return res
            .status(400)
            .json({ error: "Método guardado sin datos utilizables" });
        }
        try {
          const resp = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              amount: Number(total.toFixed(2)),
              currency: currency || undefined,
              description: `Pedido carrito ${idCarrito} usuario ${idUsuario}`,
              merchantName: process.env.POVY_MERCHANT_NAME || "Povy Test",
            }),
          });
          povy = await resp.json().catch(() => ({}));
          if (!resp.ok || povy.status !== "approved") {
            return res
              .status(resp.status || 402)
              .json({ error: povy.message || "Pago rechazado", details: povy });
          }
          referencia = povy.reference || povy.id || povy.tx || "POVY";
        } catch (e) {
          return res
            .status(502)
            .json({ error: "No se pudo contactar al endpoint de token" });
        }
      }
    } else {
      // Modo tarjeta directa: requiere datos de tarjeta
      if (!cardNumber || !expMonth || !expYear || !cvv) {
        return res.status(400).json({
          error: "Parametros requeridos: cardNumber, expMonth, expYear, cvv",
        });
      }
      const resp = await fetch(`${baseUrl}/api/payments/card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardNumber,
          expMonth,
          expYear,
          cvv,
          amount: Number(total.toFixed(2)),
          currency: currency || undefined,
          description: `Pedido carrito ${idCarrito} usuario ${idUsuario}`,
          merchantName: process.env.POVY_MERCHANT_NAME || "Povy Test",
        }),
      });
      povy = await resp.json().catch(() => ({}));
      if (!resp.ok || povy.status !== "approved") {
        return res
          .status(resp.status || 402)
          .json({ error: povy.message || "Pago rechazado", details: povy });
      }
      referencia = povy.reference || povy.id || povy.tx || "POVY";
    }

    // Registrar orden + detalle + pago en transacción
    const transaction = pool.transaction();
    await transaction.begin();
    try {
      const reqTx = transaction.request();

      // Crear orden
      const ordenIns = await reqTx
        .input("idUsuarioCliente", Number(idUsuario))
        .input("estadoOrden", "Pagada")
        .input("totalOrden", Number(total.toFixed(2)))
        .input("direccionEnvio", direccionEnvio || null)
        .input("observaciones", observaciones || "Pago Povy aprobado").query(`
          INSERT INTO Ordenes (idUsuarioCliente, fechaOrden, estadoOrden, totalOrden, direccionEnvio, observaciones)
          VALUES (@idUsuarioCliente, GETDATE(), @estadoOrden, @totalOrden, @direccionEnvio, @observaciones);
          SELECT SCOPE_IDENTITY() AS idOrden;
        `);
      const idOrden = Number(ordenIns.recordset[0].idOrden);

      // Insert detalle
      for (const it of items) {
        const cantidad = Number(it.cantidad);
        const precio = Number(it.precioUnitario);
        const subtotal = Number((cantidad * precio).toFixed(2));
        const reqItem = transaction.request();
        await reqItem
          .input("idOrden", idOrden)
          .input("idProducto", Number(it.idProducto))
          .input("cantidad", cantidad)
          .input("precioUnitario", precio)
          .input("subtotal", subtotal).query(`
            INSERT INTO DetalleOrden (idOrden, idProducto, cantidad, precioUnitario, subtotal)
            VALUES (@idOrden, @idProducto, @cantidad, @precioUnitario, @subtotal)
          `);
      }

      // Resolver método de pago (escoger genérico crédito/débito si existe)
      const mpRes = await reqTx.query(
        `SELECT TOP 1 idMetodoPago FROM MetodosPago WHERE nombreMetodo LIKE 'Tarjeta%' ORDER BY idMetodoPago DESC`
      );
      const idMetodoPago = mpRes.recordset.length
        ? mpRes.recordset[0].idMetodoPago
        : 1;

      // Referencia de Povy

      // Registrar pago
      const reqPay = transaction.request();
      await reqPay
        .input("idOrden", idOrden)
        .input("idMetodoPago", idMetodoPago)
        .input("montoPago", Number(total.toFixed(2)))
        .input("referenciaPago", String(referencia)).query(`
          INSERT INTO Pagos (idOrden, idMetodoPago, fechaPago, montoPago, referenciaPago)
          VALUES (@idOrden, @idMetodoPago, GETDATE(), @montoPago, @referenciaPago)
        `);

      // Guardar método de pago del usuario (opcional)
      if (!savedMethodId && saveMethod) {
        const ultimos4 = String(cardNumber).slice(-4);
        const storedJson = Buffer.from(
          JSON.stringify({
            cardNumber,
            expMonth,
            expYear,
            cvv,
          }),
          "utf8"
        ).toString("base64");
        const reqSave = transaction.request();
        await reqSave
          .input("idUsuario", Number(idUsuario))
          .input("idMetodoPago", idMetodoPago)
          .input("aliasTarjeta", "Povy Card")
          .input("titularTarjeta", "Usuario")
          .input("ultimos4", ultimos4)
          .input("mesExpiracion", Number(expMonth))
          .input("anioExpiracion", Number("20" + String(expYear)))
          .input("tokenPasarela", storedJson).query(`
            INSERT INTO MetodosPagoUsuario
            (idUsuario, idMetodoPago, aliasTarjeta, titularTarjeta, ultimos4, mesExpiracion, anioExpiracion, tokenPasarela, esPredeterminado)
            VALUES (@idUsuario, @idMetodoPago, @aliasTarjeta, @titularTarjeta, @ultimos4, @mesExpiracion, @anioExpiracion, @tokenPasarela, 0)
          `);
      }

      // Cerrar carrito y limpiar items
      const reqClose = transaction.request();
      await reqClose.input("idCarrito", Number(idCarrito))
        .query(`UPDATE Carritos SET estado = 0, fechaActualizacion = GETDATE() WHERE idCarrito = @idCarrito;
                DELETE FROM CarritoItems WHERE idCarrito = @idCarrito;`);

      await transaction.commit();

      return res.json({
        status: "approved",
        idOrden,
        total: Number(total.toFixed(2)),
      });
    } catch (txErr) {
      await transaction.rollback();
      console.error("Error en checkout (tx):", txErr);
      // Devolver referencia de Povy para permitir /finalize sin volver a cobrar
      const referencia = povy?.reference || povy?.id || povy?.tx || "POVY";
      return res.status(500).json({
        error: "Error al registrar la compra",
        canFinalize: true,
        referencia,
      });
    }
  } catch (err) {
    console.error("Error en checkout:", err);
    return res.status(500).json({ error: "No se pudo procesar el checkout" });
  }
});

// Finalizar compra ya aprobada (fallback): registra orden, detalle y pago usando una referencia aprobada de Povy
router.post("/finalize", async (req, res) => {
  const { idUsuario, referencia, currency, direccionEnvio, observaciones } =
    req.body || {};
  if (!idUsuario || !referencia) {
    return res
      .status(400)
      .json({ error: "Parametros requeridos: idUsuario, referencia" });
  }

  try {
    const pool = await getPool();

    // Obtener carrito activo e items
    const carritoRes = await pool
      .request()
      .input("idUsuario", Number(idUsuario))
      .query(
        `SELECT TOP 1 idCarrito FROM Carritos WHERE idUsuario = @idUsuario AND estado = 1 ORDER BY idCarrito DESC`
      );
    if (carritoRes.recordset.length === 0) {
      return res
        .status(400)
        .json({ error: "No hay carrito activo para el usuario" });
    }
    const idCarrito = carritoRes.recordset[0].idCarrito;

    const itemsRes = await pool
      .request()
      .input("idCarrito", Number(idCarrito))
      .query(
        `SELECT idProducto, cantidad, precioUnitario FROM CarritoItems WHERE idCarrito = @idCarrito`
      );
    const items = itemsRes.recordset;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "El carrito está vacío" });
    }
    const total = items.reduce(
      (a, it) => a + Number(it.cantidad) * Number(it.precioUnitario),
      0
    );

    // Transacción para registrar orden, detalle y pago
    const transaction = pool.transaction();
    await transaction.begin();
    try {
      const reqTx = transaction.request();

      const ordenIns = await reqTx
        .input("idUsuarioCliente", Number(idUsuario))
        .input("estadoOrden", "Pagada")
        .input("totalOrden", Number(total.toFixed(2)))
        .input("direccionEnvio", direccionEnvio || null)
        .input(
          "observaciones",
          observaciones || "Pago Povy aprobado (finalize)"
        ).query(`
          INSERT INTO Ordenes (idUsuarioCliente, fechaOrden, estadoOrden, totalOrden, direccionEnvio, observaciones)
          VALUES (@idUsuarioCliente, GETDATE(), @estadoOrden, @totalOrden, @direccionEnvio, @observaciones);
          SELECT SCOPE_IDENTITY() AS idOrden;
        `);
      const idOrden = Number(ordenIns.recordset[0].idOrden);

      for (const it of items) {
        const cantidad = Number(it.cantidad);
        const precio = Number(it.precioUnitario);
        const subtotal = Number((cantidad * precio).toFixed(2));
        const reqItem = transaction.request();
        await reqItem
          .input("idOrden", idOrden)
          .input("idProducto", Number(it.idProducto))
          .input("cantidad", cantidad)
          .input("precioUnitario", precio)
          .input("subtotal", subtotal).query(`
            INSERT INTO DetalleOrden (idOrden, idProducto, cantidad, precioUnitario, subtotal)
            VALUES (@idOrden, @idProducto, @cantidad, @precioUnitario, @subtotal)
          `);
      }

      const mpRes = await reqTx.query(
        `SELECT TOP 1 idMetodoPago FROM MetodosPago WHERE nombreMetodo LIKE 'Tarjeta%' ORDER BY idMetodoPago DESC`
      );
      const idMetodoPago = mpRes.recordset.length
        ? mpRes.recordset[0].idMetodoPago
        : 1;

      const reqPay = transaction.request();
      await reqPay
        .input("idOrden", idOrden)
        .input("idMetodoPago", idMetodoPago)
        .input("montoPago", Number(total.toFixed(2)))
        .input("referenciaPago", String(referencia)).query(`
          INSERT INTO Pagos (idOrden, idMetodoPago, fechaPago, montoPago, referenciaPago)
          VALUES (@idOrden, @idMetodoPago, GETDATE(), @montoPago, @referenciaPago)
        `);

      const reqClose = transaction.request();
      await reqClose.input("idCarrito", Number(idCarrito))
        .query(`UPDATE Carritos SET estado = 0, fechaActualizacion = GETDATE() WHERE idCarrito = @idCarrito;
                DELETE FROM CarritoItems WHERE idCarrito = @idCarrito;`);

      await transaction.commit();
      return res.json({
        status: "approved",
        idOrden,
        total: Number(total.toFixed(2)),
      });
    } catch (txErr) {
      await transaction.rollback();
      console.error("Error en finalize (tx):", txErr);
      return res
        .status(500)
        .json({ error: "Error al registrar la compra (finalize)" });
    }
  } catch (err) {
    console.error("Error en finalize:", err);
    return res.status(500).json({ error: "No se pudo finalizar la compra" });
  }
});

module.exports = router;

// Listar métodos de pago guardados por usuario
router.get("/methods/user/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const result = await pool.request().input("idUsuario", Number(id)).query(`
        SELECT mpu.idMetodoPagoUsuario,
               mpu.aliasTarjeta,
               mpu.titularTarjeta,
               mpu.ultimos4,
               mpu.mesExpiracion,
               mpu.anioExpiracion,
               mpu.tokenPasarela,
               mpu.esPredeterminado,
               mp.nombreMetodo
        FROM MetodosPagoUsuario mpu
        INNER JOIN MetodosPago mp ON mp.idMetodoPago = mpu.idMetodoPago
        WHERE mpu.idUsuario = @idUsuario AND mpu.estado = 1
        ORDER BY mpu.esPredeterminado DESC, mpu.fechaRegistro DESC
      `);
    res.json({ methods: result.recordset });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener métodos de pago" });
  }
});
