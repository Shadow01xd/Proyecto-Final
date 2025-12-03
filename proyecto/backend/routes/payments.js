const express = require("express");
const router = express.Router();
const { getPool } = require("../db");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");

function getMailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP no configurado");
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendOrderEmail(pool, { idUsuario, idOrden, total, items, simulado }) {
  try {
    const userRes = await pool
      .request()
      .input("idUsuario", Number(idUsuario))
      .query(
        "SELECT nombreUsuario, apellidoUsuario, emailUsuario FROM Usuarios WHERE idUsuario = @idUsuario"
      );
    if (!userRes.recordset.length) return;
    const u = userRes.recordset[0];
    const email = u.emailUsuario;
    if (!email) return;

    const nombre = `${u.nombreUsuario || ""} ${u.apellidoUsuario || ""}`.trim() || "Cliente";
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const transporter = getMailTransporter();

    const safeItems = Array.isArray(items) ? items : [];
    const lines = safeItems
      .map((it) => {
        const nombreProducto = it.nombreProducto || it.nombre || "Producto";
        const sku = it.skuProducto || it.sku || "";
        const cant = Number(it.cantidad) || 1;
        const precio = Number(
          it.precioUnitarioEfectivo ?? it.precioUnitarioSnapshot ?? it.precioUnitario ?? 0
        );
        const sub = (cant * precio).toFixed(2);
        return `
          <tr>
            <td style="padding:6px 10px;vertical-align:top;">
              <div style="font-weight:500;">${nombreProducto}</div>
              ${sku ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px;">SKU: ${sku}</div>` : ""}
            </td>
            <td style="padding:6px 10px;text-align:right;">${cant}</td>
            <td style="padding:6px 10px;text-align:right;">$${precio.toFixed(2)}</td>
            <td style="padding:6px 10px;text-align:right;">$${sub}</td>
          </tr>
        `;
      })
      .join("");

    const titulo = simulado ? "Confirmación de compra (simulada)" : "Confirmación de compra";

    // HTML mejorado
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#0b0b0c;color:#e5e7eb;border-radius:16px;border:1px solid #1f2937;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
          <div>
            <div style="font-size:22px;font-weight:800;color:#60a5fa;letter-spacing:0.03em;">NovaTech Store</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:4px;">Factura electrónica del pedido #${idOrden}</div>
          </div>
          <div style="padding:6px 12px;border-radius:999px;background:${simulado ? "#f59e0b33" : "#10b98133"};color:${simulado ? "#fbbf24" : "#6ee7b7"};font-size:11px;font-weight:600;">
            ${simulado ? "MODO SIMULADO" : "PAGO CONFIRMADO"}
          </div>
        </div>

        <p style="font-size:14px;color:#e5e7eb;margin:0 0 10px;">Hola <strong>${nombre}</strong>,</p>
        <p style="font-size:13px;color:#d1d5db;line-height:1.6;margin:0 0 18px;">
          Gracias por tu compra en <strong>NovaTech Store</strong>. A continuación encontrarás el resumen de tu pedido <strong>#${idOrden}</strong>.
        </p>

        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:18px;">
          <div style="flex:1 1 180px;padding:10px 12px;border-radius:10px;background:#111827;border:1px solid #1f2937;">
            <div style="font-size:11px;color:#9ca3af;margin-bottom:2px;">Cliente</div>
            <div style="font-size:13px;font-weight:500;">${nombre}</div>
          </div>
          <div style="flex:1 1 180px;padding:10px 12px;border-radius:10px;background:#111827;border:1px solid #1f2937;">
            <div style="font-size:11px;color:#9ca3af;margin-bottom:2px;">Fecha</div>
            <div style="font-size:13px;font-weight:500;">${new Date().toLocaleString("es-SV")}</div>
          </div>
          <div style="flex:1 1 180px;padding:10px 12px;border-radius:10px;background:#111827;border:1px solid #1f2937;">
            <div style="font-size:11px;color:#9ca3af;margin-bottom:2px;">Total</div>
            <div style="font-size:15px;font-weight:700;color:#bfdbfe;">$${Number(total || 0).toFixed(2)}</div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;overflow:hidden;border-radius:10px;border:1px solid #1f2937;">
          <thead>
            <tr style="background:#111827;">
              <th style="padding:8px 10px;text-align:left;font-weight:600;color:#e5e7eb;">Producto</th>
              <th style="padding:8px 10px;text-align:right;font-weight:600;color:#e5e7eb;">Cant.</th>
              <th style="padding:8px 10px;text-align:right;font-weight:600;color:#e5e7eb;">Precio</th>
              <th style="padding:8px 10px;text-align:right;font-weight:600;color:#e5e7eb;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${lines ||
              '<tr><td colspan="4" style="padding:10px 10px;text-align:center;color:#9ca3af;background:#020617;">Sin detalle disponible</td></tr>'}
          </tbody>
        </table>

        <p style="font-size:11px;color:#9ca3af;margin-top:10px;">Este correo incluye tu factura en formato PDF adjunta. Conserva este mensaje para futuros respaldos.</p>
        <p style="font-size:11px;color:#6b7280;margin-top:6px;">Este es un mensaje automático. No respondas a este correo.</p>
      </div>
    `;

    // Generar PDF de factura en memoria
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    const pdfPromise = new Promise((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    doc.fontSize(18).text("NovaTech Store", { align: "left" });
    doc.moveDown(0.2);
    doc.fontSize(11).fillColor("#555555").text("Factura electrónica", { align: "left" });
    doc.moveDown();

    doc.fillColor("#000000").fontSize(11);
    doc.text(`Cliente: ${nombre}`);
    doc.text(`Pedido #: ${idOrden}`);
    doc.text(`Fecha: ${new Date().toLocaleString("es-SV")}`);
    doc.moveDown();

    // Tabla simple
    doc.fontSize(11).text("Detalle de productos:");
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold");
    doc.text("Producto", { continued: true, width: 220 });
    doc.text("Cant.", { continued: true, width: 60, align: "right" });
    doc.text("Precio", { continued: true, width: 80, align: "right" });
    doc.text("Subtotal", { width: 80, align: "right" });
    doc.moveDown(0.2);
    doc.font("Helvetica");

    safeItems.forEach((it) => {
      const nombreProducto = it.nombreProducto || it.nombre || "Producto";
      const sku = it.skuProducto || it.sku || "";
      const cant = Number(it.cantidad) || 1;
      const precio = Number(
        it.precioUnitarioEfectivo ?? it.precioUnitarioSnapshot ?? it.precioUnitario ?? 0
      );
      const sub = cant * precio;
      const lineaTitulo = sku
        ? `${nombreProducto} (SKU: ${sku})`
        : nombreProducto;
      doc.text(lineaTitulo, { continued: true, width: 220 });
      doc.text(String(cant), { continued: true, width: 60, align: "right" });
      doc.text(`$${precio.toFixed(2)}`, { continued: true, width: 80, align: "right" });
      doc.text(`$${sub.toFixed(2)}`, { width: 80, align: "right" });
    });

    doc.moveDown();
    doc.font("Helvetica-Bold").text(`Total: $${Number(total || 0).toFixed(2)}`, { align: "right" });

    doc.end();
    const pdfBuffer = await pdfPromise;

    await transporter.sendMail({
      from,
      to: email,
      subject: `${titulo} - Pedido #${idOrden}`,
      html,
      attachments: [
        {
          filename: `factura-${idOrden}.pdf`,
          content: pdfBuffer,
        },
      ],
    });
  } catch (err) {
    console.error("Error al enviar correo de orden:", err);
  }
}

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
        const precio = Number(
          it.precioUnitarioEfectivo ?? it.precioUnitarioSnapshot
        );
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

      // Enviar correo de confirmación (no bloqueante para la transacción)
      sendOrderEmail(pool, { idUsuario, idOrden, total, items, simulado: false }).catch(() => {});

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

// Checkout simulado: registra orden, detalle y pago sin contactar Povy
router.post("/checkout-sim", async (req, res) => {
  const { idUsuario, currency, direccionEnvio, observaciones } = req.body || {};
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

    const transaction = pool.transaction();
    await transaction.begin();
    try {
      const reqTx = transaction.request();

      // Crear orden simulada
      const ordenIns = await reqTx
        .input("idUsuarioCliente", Number(idUsuario))
        .input("estadoOrden", "Pagada")
        .input("totalOrden", Number(total.toFixed(2)))
        .input("direccionEnvio", direccionEnvio || null)
        .input(
          "observaciones",
          observaciones || "Pago simulado aprobado"
        ).query(`
          INSERT INTO Ordenes (idUsuarioCliente, fechaOrden, estadoOrden, totalOrden, direccionEnvio, observaciones)
          VALUES (@idUsuarioCliente, GETDATE(), @estadoOrden, @totalOrden, @direccionEnvio, @observaciones);
          SELECT SCOPE_IDENTITY() AS idOrden;
        `);
      const idOrden = Number(ordenIns.recordset[0].idOrden);

      // Insert detalle
      for (const it of items) {
        const cantidad = Number(it.cantidad);
        const precio = Number(
          it.precioUnitarioEfectivo ?? it.precioUnitarioSnapshot
        );
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

      // Resolver método de pago simulado (intenta uno con 'simul' en el nombre)
      const mpRes = await reqTx.query(
        `SELECT TOP 1 idMetodoPago FROM MetodosPago WHERE nombreMetodo LIKE '%simul%' ORDER BY idMetodoPago DESC`
      );
      const idMetodoPago = mpRes.recordset.length
        ? mpRes.recordset[0].idMetodoPago
        : 1;

      const referencia = `SIM-${idOrden}`;

      // Registrar pago simulado
      const reqPay = transaction.request();
      await reqPay
        .input("idOrden", idOrden)
        .input("idMetodoPago", idMetodoPago)
        .input("montoPago", Number(total.toFixed(2)))
        .input("referenciaPago", String(referencia)).query(`
          INSERT INTO Pagos (idOrden, idMetodoPago, fechaPago, montoPago, referenciaPago)
          VALUES (@idOrden, @idMetodoPago, GETDATE(), @montoPago, @referenciaPago)
        `);

      // Cerrar carrito y limpiar items
      const reqClose = transaction.request();
      await reqClose.input("idCarrito", Number(idCarrito))
        .query(`UPDATE Carritos SET estado = 0, fechaActualizacion = GETDATE() WHERE idCarrito = @idCarrito;
                DELETE FROM CarritoItems WHERE idCarrito = @idCarrito;`);

      await transaction.commit();

      // Enviar correo de confirmación para compra simulada
      sendOrderEmail(pool, { idUsuario, idOrden, total, items, simulado: true }).catch(() => {});

      return res.json({
        status: "approved",
        idOrden,
        total: Number(total.toFixed(2)),
      });
    } catch (txErr) {
      await transaction.rollback();
      console.error("Error en checkout-sim (tx):", txErr);
      return res.status(500).json({ error: "Error al registrar la compra simulada" });
    }
  } catch (err) {
    console.error("Error en checkout-sim:", err);
    return res.status(500).json({ error: "No se pudo procesar el checkout simulado" });
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

      // Enviar correo de confirmación para finalize (Povy)
      sendOrderEmail(pool, { idUsuario, idOrden, total, items, simulado: false }).catch(() => {});

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

// Listar métodos de pago disponibles (tabla MetodosPago)
router.get("/methods", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .query(
        "SELECT idMetodoPago, nombreMetodo, descripcionMetodo FROM MetodosPago ORDER BY idMetodoPago"
      );
    const methods = Array.isArray(result.recordset) ? result.recordset : [];
    return res.json({ methods });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Error al obtener metodos de pago" });
  }
});

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
    const rows = Array.isArray(result.recordset) ? result.recordset : [];
    const methods = rows.map((r) => {
      let sim = false;
      try {
        const decoded = Buffer.from(String(r.tokenPasarela || ''), 'base64').toString('utf8');
        const json = JSON.parse(decoded);
        sim = !!json.sim;
      } catch {}
      return { ...r, sim };
    });
    res.json({ methods });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener métodos de pago" });
  }
});

// Guardar un método de pago simulado para el usuario
router.post("/methods/sim", async (req, res) => {
  const { idUsuario, cardNumber, expMonth, expYear, cvv, aliasTarjeta, titularTarjeta } = req.body || {};
  if (!idUsuario || !cardNumber || !expMonth || !expYear || !cvv) {
    return res.status(400).json({ error: "Parametros requeridos: idUsuario, cardNumber, expMonth, expYear, cvv" });
  }
  try {
    const pool = await getPool();

    // Resolver método de pago genérico tarjeta
    const mpRes = await pool
      .request()
      .query(`SELECT TOP 1 idMetodoPago FROM MetodosPago WHERE nombreMetodo LIKE 'Tarjeta%' ORDER BY idMetodoPago DESC`);
    const idMetodoPago = mpRes.recordset && mpRes.recordset.length ? mpRes.recordset[0].idMetodoPago : 1;

    const ultimos4 = String(cardNumber).replace(/\D+/g, '').slice(-4);
    const storedJson = Buffer.from(
      JSON.stringify({ cardNumber, expMonth, expYear, cvv, sim: true }),
      'utf8'
    ).toString('base64');

    const reqIns = pool.request();
    reqIns
      .input('idUsuario', Number(idUsuario))
      .input('idMetodoPago', Number(idMetodoPago))
      .input('aliasTarjeta', String(aliasTarjeta || 'Simulada'))
      .input('titularTarjeta', String(titularTarjeta || 'Usuario'))
      .input('ultimos4', String(ultimos4))
      .input('mesExpiracion', Number(expMonth))
      .input('anioExpiracion', String(expYear).length === 2 ? Number('20' + String(expYear)) : Number(expYear))
      .input('tokenPasarela', String(storedJson));

    const insertSql = `
      INSERT INTO MetodosPagoUsuario
      (idUsuario, idMetodoPago, aliasTarjeta, titularTarjeta, ultimos4, mesExpiracion, anioExpiracion, tokenPasarela, esPredeterminado)
      VALUES (@idUsuario, @idMetodoPago, @aliasTarjeta, @titularTarjeta, @ultimos4, @mesExpiracion, @anioExpiracion, @tokenPasarela, 0);
      SELECT SCOPE_IDENTITY() AS idMetodoPagoUsuario;
    `;
    const ins = await reqIns.query(insertSql);
    const newId = Number(ins.recordset && ins.recordset[0] && ins.recordset[0].idMetodoPagoUsuario);
    return res.json({ message: 'Método simulado guardado', idMetodoPagoUsuario: newId });
  } catch (err) {
    return res.status(500).json({ error: 'Error al guardar método simulado' });
  }
});

// Actualizar datos de un método guardado (alias/titular/esPredeterminado)
router.put("/methods/:idMetodoPagoUsuario", async (req, res) => {
  const { idMetodoPagoUsuario } = req.params;
  const { aliasTarjeta, titularTarjeta, esPredeterminado, idUsuario, cardNumber, expMonth, expYear, cvv } = req.body || {};
  if (!idMetodoPagoUsuario) {
    return res.status(400).json({ error: "idMetodoPagoUsuario requerido" });
  }
  try {
    const pool = await getPool();

    // Si se marca como predeterminado, limpiar el actual del usuario
    if (esPredeterminado && idUsuario) {
      await pool
        .request()
        .input("idUsuario", Number(idUsuario))
        .query(`UPDATE MetodosPagoUsuario SET esPredeterminado = 0 WHERE idUsuario = @idUsuario`);
    }

    const reqUpd = pool.request();
    reqUpd.input("idMetodoPagoUsuario", Number(idMetodoPagoUsuario));
    if (typeof aliasTarjeta !== "undefined") reqUpd.input("aliasTarjeta", String(aliasTarjeta));
    if (typeof titularTarjeta !== "undefined") reqUpd.input("titularTarjeta", String(titularTarjeta));
    if (typeof esPredeterminado !== "undefined") reqUpd.input("esPredeterminado", esPredeterminado ? 1 : 0);
    const wantsCardUpdate = cardNumber && expMonth && expYear && cvv;
    if (wantsCardUpdate) {
      const ult4 = String(cardNumber).replace(/\D+/g, '').slice(-4);
      const storedJson = Buffer.from(JSON.stringify({ cardNumber, expMonth, expYear, cvv }), "utf8").toString("base64");
      reqUpd.input("ultimos4", ult4);
      reqUpd.input("mesExpiracion", Number(expMonth));
      const anioFull = String(expYear).length === 2 ? Number("20" + String(expYear)) : Number(expYear);
      reqUpd.input("anioExpiracion", anioFull);
      reqUpd.input("tokenPasarela", storedJson);
    }

    const setClauses = [];
    if (typeof aliasTarjeta !== "undefined") setClauses.push("aliasTarjeta = @aliasTarjeta");
    if (typeof titularTarjeta !== "undefined") setClauses.push("titularTarjeta = @titularTarjeta");
    if (typeof esPredeterminado !== "undefined") setClauses.push("esPredeterminado = @esPredeterminado");
    if (wantsCardUpdate) {
      setClauses.push("ultimos4 = @ultimos4");
      setClauses.push("mesExpiracion = @mesExpiracion");
      setClauses.push("anioExpiracion = @anioExpiracion");
      setClauses.push("tokenPasarela = @tokenPasarela");
    }
    if (!setClauses.length) {
      return res.status(400).json({ error: "Nada para actualizar" });
    }

    const sqlUpdate = `UPDATE MetodosPagoUsuario SET ${setClauses.join(", ")} WHERE idMetodoPagoUsuario = @idMetodoPagoUsuario`;
    await reqUpd.query(sqlUpdate);

    return res.json({ message: "Método actualizado" });
  } catch (err) {
    return res.status(500).json({ error: "Error al actualizar método" });
  }
});

// Eliminar (soft delete) un método guardado
router.delete("/methods/:idMetodoPagoUsuario", async (req, res) => {
  const { idMetodoPagoUsuario } = req.params;
  const id = Number(idMetodoPagoUsuario);
  if (!idMetodoPagoUsuario || Number.isNaN(id)) {
    return res.status(400).json({ error: "idMetodoPagoUsuario numérico requerido" });
  }
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("idMetodoPagoUsuario", id)
      .query(`DELETE FROM MetodosPagoUsuario WHERE idMetodoPagoUsuario = @idMetodoPagoUsuario`);
    const affected = Array.isArray(result.rowsAffected) ? result.rowsAffected.reduce((a,n)=>a+n,0) : 0;
    if (!affected) {
      return res.status(404).json({ error: "Método no encontrado" });
    }
    // Verificar eliminación
    const check = await pool
      .request()
      .input("idMetodoPagoUsuario", id)
      .query(`SELECT idMetodoPagoUsuario FROM MetodosPagoUsuario WHERE idMetodoPagoUsuario = @idMetodoPagoUsuario`);
    const exists = Array.isArray(check.recordset) && check.recordset.length > 0;
    return res.json({ message: "Método eliminado", idMetodoPagoUsuario: id, existsAfterDelete: exists });
  } catch (err) {
    return res.status(500).json({ error: "Error al eliminar método" });
  }
});

module.exports = router;
