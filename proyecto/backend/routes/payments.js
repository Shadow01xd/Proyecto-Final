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
            <td style="padding:12px 16px;vertical-align:top;">
              <div style="font-weight:500;color:#60a5fa;">${nombreProducto}</div>
              ${sku ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px;">SKU: ${sku}</div>` : ""}
            </td>
            <td style="padding:12px 16px;text-align:center;color:#e5e7eb;">${cant}</td>
            <td style="padding:12px 16px;text-align:right;color:#e5e7eb;">$${precio.toFixed(2)}</td>
            <td style="padding:12px 16px;text-align:right;color:#6ee7b7;">$${sub}</td>
          </tr>
        `;
      })
      .join("");

    const titulo = "Confirmación de compra";

    // HTML mejorado con diseño premium
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif;max-width:600px;margin:0 auto;background:#0b0b0c;">
        <!-- Header con gradiente -->
        <div style="background:linear-gradient(135deg, #1e3a8a 0%, #60a5fa 100%);padding:32px 24px;text-align:center;border-radius:16px 16px 0 0;">
          <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:0.05em;margin-bottom:8px;">NovaTech</div>
          <div style="font-size:13px;color:#bfdbfe;font-weight:500;">Confirmación de Compra</div>
        </div>

        <!-- Contenido principal -->
        <div style="background:#0b0b0c;padding:32px 24px;border-left:1px solid #1f2937;border-right:1px solid #1f2937;">
          <!-- Mensaje de bienvenida -->
          <div style="background:#111827;border-left:4px solid #60a5fa;padding:16px 20px;border-radius:8px;margin-bottom:24px;">
            <p style="font-size:15px;color:#e5e7eb;margin:0 0 8px;font-weight:600;">¡Hola ${nombre}!</p>
            <p style="font-size:13px;color:#d1d5db;line-height:1.6;margin:0;">
              Gracias por tu compra. Tu pedido ha sido confirmado y procesado exitosamente.
            </p>
          </div>

          <!-- Detalles de la orden en tarjetas -->
          <div style="margin-bottom:24px;">
            <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;font-weight:600;">Detalles del Pedido</div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
              <div style="background:#111827;padding:16px;border-radius:10px;border:1px solid #1f2937;">
                <div style="font-size:11px;color:#9ca3af;margin-bottom:4px;">Número de Orden</div>
                <div style="font-size:16px;font-weight:700;color:#60a5fa;">#${idOrden}</div>
              </div>
              <div style="background:#111827;padding:16px;border-radius:10px;border:1px solid #1f2937;">
                <div style="font-size:11px;color:#9ca3af;margin-bottom:4px;">Total</div>
                <div style="font-size:16px;font-weight:700;color:#6ee7b7;">$${Number(total || 0).toFixed(2)}</div>
              </div>
            </div>

            <div style="background:#111827;padding:16px;border-radius:10px;border:1px solid #1f2937;">
              <div style="font-size:11px;color:#9ca3af;margin-bottom:4px;">Fecha</div>
              <div style="font-size:13px;font-weight:500;color:#e5e7eb;">${new Date().toLocaleString("es-SV")}</div>
            </div>
          </div>

          <!-- Tabla de productos con diseño mejorado -->
          <div style="margin-bottom:24px;">
            <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;font-weight:600;">Productos</div>
            
            <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:13px;border-radius:10px;overflow:hidden;border:1px solid #1f2937;">
              <thead>
                <tr style="background:linear-gradient(180deg, #1f2937 0%, #111827 100%);">
                  <th style="padding:12px 16px;text-align:left;font-weight:600;color:#e5e7eb;font-size:12px;">Producto</th>
                  <th style="padding:12px 16px;text-align:center;font-weight:600;color:#e5e7eb;font-size:12px;">Cant.</th>
                  <th style="padding:12px 16px;text-align:right;font-weight:600;color:#e5e7eb;font-size:12px;">Precio</th>
                  <th style="padding:12px 16px;text-align:right;font-weight:600;color:#e5e7eb;font-size:12px;">Total</th>
                </tr>
              </thead>
              <tbody style="background:#0b0b0c;">
                ${lines || '<tr><td colspan="4" style="padding:16px;text-align:center;color:#9ca3af;">Sin productos</td></tr>'}
              </tbody>
            </table>
          </div>

          

        <!-- Footer -->
        <div style="background:#111827;padding:24px;text-align:center;border-radius:0 0 16px 16px;border:1px solid #1f2937;border-top:none;">
          <div style="font-size:13px;color:#e5e7eb;font-weight:600;margin-bottom:12px;">¿Necesitas ayuda?</div>
          <div style="font-size:12px;color:#9ca3af;margin-bottom:16px;">Contáctanos en <a href="mailto:novatech69xd@gmail.com" style="color:#60a5fa;text-decoration:none;">novatech69xd@gmail.com</a></div>
          <div style="height:1px;background:#1f2937;margin:16px 0;"></div>
          <div style="font-size:11px;color:#6b7280;">Este es un mensaje automático. Por favor no respondas a este correo.</div>
          <div style="font-size:10px;color:#4b5563;margin-top:8px;">© 2025 NovaTech Store. Todos los derechos reservados.</div>
        </div>
      </div>
    `;

    // Generar PDF de factura profesional
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    const pdfPromise = new Promise((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    // --- Colores y Fuentes ---
    const primaryColor = "#2563eb"; // Azul moderno
    const secondaryColor = "#64748b"; // Gris slate
    const tableHeaderColor = "#f1f5f9"; // Gris muy claro
    const black = "#0f172a";

    // --- Encabezado ---
    // Logo (Texto estilizado)
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .fillColor(primaryColor)
      .text("NovaTech", 50, 50);

    // Etiqueta FACTURA
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(secondaryColor)
      .text("FACTURA ELECTRÓNICA", 200, 50, { align: "right" });

    doc.moveDown();

    // --- Información de la Empresa y Cliente ---
    const topInfoY = 90;

    // Columna Izquierda: Emisor
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(black)
      .text("De:", 50, topInfoY)
      .font("Helvetica")
      .fillColor(secondaryColor)
      .text("NovaTech S.A. de C.V.")
      .text("San Miguel, El Salvador")
      .text("novatech69xd@gmail.com");

    // Columna Derecha: Detalles Orden y Cliente
    doc
      .font("Helvetica-Bold")
      .fillColor(black)
      .text("Para:", 300, topInfoY)
      .font("Helvetica")
      .fillColor(secondaryColor)
      .text(nombre)
      .text(email)
      .moveDown(0.5)
      .font("Helvetica-Bold")
      .text(`Orden #: ${idOrden}`)
      .font("Helvetica")
      .text(`Fecha: ${new Date().toLocaleString("es-SV")}`)
      .text(`Estado: ${simulado ? "Simulado" : "Pagado"}`);

    doc.moveDown(2);

    // --- Tabla de Productos ---
    const tableTop = 200;
    const itemCodeX = 50;
    const descriptionX = 150; // Movido más a la derecha para darle más espacio al SKU
    const quantityX = 330;
    const priceX = 380;
    const amountX = 460;

    // Encabezados de Tabla
    doc
      .rect(50, tableTop, 500, 25)
      .fill(tableHeaderColor)
      .stroke();

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(black)
      .text("SKU", itemCodeX + 5, tableTop + 8)
      .text("Producto", descriptionX, tableTop + 8)
      .text("Cant.", quantityX, tableTop + 8, { width: 40, align: "center" })
      .text("Precio", priceX, tableTop + 8, { width: 70, align: "right" })
      .text("Total", amountX, tableTop + 8, { width: 80, align: "right" });

    let y = tableTop + 35;

    doc.font("Helvetica").fontSize(9);

    // Función helper para truncar texto manualmente
    const truncateText = (text, maxLength = 22) => {
      if (!text) return "";
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + "...";
    };

    safeItems.forEach((it, i) => {
      const nombreProducto = it.nombreProducto || it.nombre || "Producto";
      const nombreTruncado = truncateText(nombreProducto, 22); // Truncar a 22 caracteres
      const sku = it.skuProducto || it.sku || "-";
      const cant = Number(it.cantidad) || 1;
      const precio = Number(
        it.precioUnitarioEfectivo ?? it.precioUnitarioSnapshot ?? it.precioUnitario ?? 0
      );
      const sub = cant * precio;

      // Alternar color de fondo fila
      if (i % 2 === 1) {
        doc.rect(50, y - 5, 500, 20).fill("#f8fafc");
      }

      doc.fillColor(black);
      doc.text(sku, itemCodeX + 5, y, { width: 100, ellipsis: true }); // SKU más ancho (100px)
      doc.text(nombreTruncado, descriptionX, y, { width: 160 }); // Nombre truncado manualmente
      doc.text(String(cant), quantityX, y, { width: 40, align: "center" });
      doc.text(`$${precio.toFixed(2)}`, priceX, y, { width: 70, align: "right" });
      doc.text(`$${sub.toFixed(2)}`, amountX, y, { width: 80, align: "right" });

      y += 20;
    });

    // Línea separadora final
    doc
      .moveTo(50, y + 5)
      .lineTo(550, y + 5)
      .strokeColor("#e2e8f0")
      .stroke();

    // --- Totales ---
    y += 20;
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Total a Pagar:", 350, y, { width: 100, align: "right" })
      .fontSize(12)
      .fillColor(primaryColor)
      .text(`$${Number(total || 0).toFixed(2)}`, 460, y - 2, { width: 80, align: "right" });

    // --- Pie de Página ---
    const bottomY = 750;
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(secondaryColor)
      .text("Gracias por su compra.", 50, bottomY, { align: "center", width: 500 })
      .text("Este documento es un comprobante electrónico generado automáticamente.", 50, bottomY + 12, { align: "center", width: 500 });

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
        SELECT
          ci.idProducto,
          ci.cantidad,
          ci.precioUnitario AS precioUnitarioSnapshot,
          dbo.fn_GetPrecioEfectivo(ci.idProducto) AS precioUnitarioEfectivo,
          p.nombreProducto,
          p.skuProducto
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
      } catch { }

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

    // Crear orden completa mediante SP (usa el carrito actual, descuenta stock y registra el pago)
    const spOut = await pool
      .request()
      .input("idUsuario", Number(idUsuario))
      .input("esSimulado", 0)
      .input("direccionEnvio", direccionEnvio || null)
      .input("observaciones", observaciones || "Pago Povy aprobado")
      .input("referenciaPago", String(referencia))
      .output("idOrden", 0)
      .output("total", 0)
      .execute("sp_CrearOrdenDesdeCarrito");

    const idOrden = Number(spOut.output.idOrden || 0);
    const totalFinal = Number(spOut.output.total || 0) || Number(total.toFixed(2));

    if (!idOrden) {
      return res.status(500).json({ error: "No se pudo crear la orden luego del pago" });
    }

    // Guardar método de pago del usuario (fuera del SP)
    if (!savedMethodId && saveMethod) {
      const mpRes = await pool
        .request()
        .query(
          `SELECT TOP 1 idMetodoPago FROM MetodosPago WHERE nombreMetodo LIKE 'Tarjeta%' ORDER BY idMetodoPago DESC`
        );
      const idMetodoPago = mpRes.recordset.length
        ? mpRes.recordset[0].idMetodoPago
        : 1;

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

      await pool
        .request()
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

    // Enviar correo de confirmación (usa los items leídos del carrito antes del SP)
    sendOrderEmail(pool, { idUsuario, idOrden, total: totalFinal, items, simulado: false }).catch(() => { });

    return res.json({
      status: "approved",
      idOrden,
      total: Number(totalFinal.toFixed(2)),
    });
  } catch (err) {
    console.error("Error en checkout:", err);
    return res.status(500).json({ error: "No se pudo procesar el checkout" });
  }
});

router.post("/checkout-sim", async (req, res) => {
  const { idUsuario, direccionEnvio, observaciones } = req.body || {};
  if (!idUsuario) {
    return res.status(400).json({ error: "Parametro requerido: idUsuario" });
  }

  try {
    const pool = await getPool();

    // Antes de llamar al SP, obtenemos los items del carrito para poder
    // usarlos en el correo electrónico de confirmación.
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
        SELECT
          ci.idProducto,
          ci.cantidad,
          ci.precioUnitario AS precioUnitarioSnapshot,
          dbo.fn_GetPrecioEfectivo(ci.idProducto) AS precioUnitarioEfectivo,
          p.nombreProducto,
          p.skuProducto
        FROM CarritoItems ci
        INNER JOIN Productos p ON p.idProducto = ci.idProducto
        WHERE ci.idCarrito = @idCarrito
      `);
    const items = itemsRes.recordset;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "El carrito está vacío" });
    }

    // Llamar al procedimiento almacenado para crear Orden + Detalle + Pago y cerrar carrito
    const out = await pool
      .request()
      .input("idUsuario", Number(idUsuario))
      .input("esSimulado", 1)
      .input("direccionEnvio", direccionEnvio || null)
      .input("observaciones", observaciones || null)
      .input("referenciaPago", `SIM-${Date.now()}`)
      .output("idOrden", 0)
      .output("total", 0)
      .execute("sp_CrearOrdenDesdeCarrito");

    const idOrden = Number(out.output.idOrden || 0);
    const total = Number(out.output.total || 0);

    if (!idOrden) {
      return res.status(500).json({ error: "No se pudo crear la orden simulada" });
    }

    // Enviar correo de confirmación para compra simulada
    sendOrderEmail(pool, { idUsuario, idOrden, total, items, simulado: true }).catch(() => { });

    return res.json({
      status: "approved",
      idOrden,
      total: Number(total.toFixed(2)),
    });
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

    // Obtener carrito activo e items (para el correo)
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
        `SELECT ci.idProducto,
                ci.cantidad,
                ci.precioUnitario AS precioUnitarioSnapshot,
                dbo.fn_GetPrecioEfectivo(ci.idProducto) AS precioUnitarioEfectivo,
                p.nombreProducto,
                p.skuProducto
         FROM CarritoItems ci
         INNER JOIN Productos p ON p.idProducto = ci.idProducto
         WHERE ci.idCarrito = @idCarrito`
      );
    const items = itemsRes.recordset;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "El carrito está vacío" });
    }

    // Crear orden completa mediante SP usando la referencia ya aprobada
    const spOut = await pool
      .request()
      .input("idUsuario", Number(idUsuario))
      .input("esSimulado", 0)
      .input("direccionEnvio", direccionEnvio || null)
      .input(
        "observaciones",
        observaciones || "Pago Povy aprobado (finalize)"
      )
      .input("referenciaPago", String(referencia))
      .output("idOrden", 0)
      .output("total", 0)
      .execute("sp_CrearOrdenDesdeCarrito");

    const idOrden = Number(spOut.output.idOrden || 0);
    const total = Number(spOut.output.total || 0);

    if (!idOrden) {
      return res
        .status(500)
        .json({ error: "No se pudo crear la orden (finalize)" });
    }

    // Enviar correo de confirmación para finalize (Povy)
    sendOrderEmail(pool, { idUsuario, idOrden, total, items, simulado: false }).catch(() => { });

    return res.json({
      status: "approved",
      idOrden,
      total: Number(total.toFixed(2)),
    });
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
      } catch { }
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
    const affected = Array.isArray(result.rowsAffected) ? result.rowsAffected.reduce((a, n) => a + n, 0) : 0;
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
