// routes/newsletter.js
const express = require('express')
const router = express.Router()
const nodemailer = require('nodemailer')
const { getPool } = require('../db')

function getTransporter() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) throw new Error('SMTP no configurado (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)')
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
}

function buildNewsletterHtml(email) {
  const safeEmail = email ? String(email) : ''
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0b0b0c;color:#e5e7eb;border-radius:12px;border:1px solid #1f2937;">
    <div style="text-align:center;margin-bottom:16px;">
      <div style="font-size:22px;font-weight:700;color:#60a5fa;">NovaTech</div>
      <div style="font-size:12px;color:#9ca3af;">Suscripción a Newsletter</div>
    </div>
    <p style="font-size:14px;color:#e5e7eb;">¡Gracias por suscribirte!</p>
    <p style="font-size:14px;color:#d1d5db;line-height:1.6;margin:8px 0 16px;">
      La dirección <strong>${safeEmail}</strong> ha sido registrada para recibir novedades, ofertas y actualizaciones.
    </p>
    <div style="text-align:center;margin:20px 0;">
      <a href="#" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#111827;border:1px solid #374151;color:#f3f4f6;font-size:13px;font-weight:700;text-decoration:none;">
        Visita nuestra tienda
      </a>
    </div>
    <p style="font-size:12px;color:#9ca3af;margin-top:12px;">Si no solicitaste esta suscripción, puedes ignorar este correo.</p>
    <hr style="border:none;border-top:1px solid #1f2937;margin:16px 0;"/>
    <p style="font-size:11px;color:#6b7280;text-align:center;">Este es un mensaje automático. No respondas a este correo.</p>
  </div>`
}

function buildOffersHtml(nombreOferta, productos = []) {
  const title = nombreOferta ? `Ofertas: ${nombreOferta}` : '¡Nuevas Ofertas Disponibles!'
  
  // Generar cards de productos
  const cards = (productos || []).map(p => {
    const img = p.imgProducto || 'https://via.placeholder.com/300x300?text=Producto'
    const name = p.nombreProducto || 'Producto'
    const sku = p.skuProducto || ''
    const base = Number(p.precioProducto || 0)
    const offer = Number(p.precioOferta || 0)
    const discount = offer > 0 && base > 0 ? Math.round(((base - offer) / base) * 100) : 0
    
    return `
      <td style="width:33.33%;padding:8px;" valign="top">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#111827;border:1px solid #1f2937;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#0f1115;height:180px;text-align:center;position:relative;">
              ${discount > 0 ? `
                <div style="position:absolute;top:8px;right:8px;background:#3b82f6;color:#fff;font-size:11px;font-weight:700;padding:4px 8px;border-radius:6px;z-index:1;">
                  -${discount}%
                </div>
              ` : ''}
              <img src="${img}" alt="${name}" style="max-height:180px;max-width:100%;object-fit:contain;display:block;margin:0 auto;" />
            </td>
          </tr>
          <tr>
            <td style="padding:16px;">
              <div style="color:#f3f4f6;font-size:15px;font-weight:600;line-height:1.4;min-height:2.8em;margin-bottom:8px;">${name}</div>
              <div style="color:#9ca3af;font-size:12px;margin-bottom:12px;">SKU: ${sku}</div>
              ${offer > 0 ? `
                <div style="margin-bottom:4px;">
                  <span style="color:#60a5fa;font-size:20px;font-weight:800;">$${offer.toFixed(2)}</span>
                  <span style="color:#6b7280;font-size:13px;text-decoration:line-through;margin-left:8px;">$${base.toFixed(2)}</span>
                </div>
              ` : `
                <div style="color:#e5e7eb;font-size:20px;font-weight:800;">$${base.toFixed(2)}</div>
              `}
            </td>
          </tr>
        </table>
      </td>
    `
  }).join('')

  // Dividir en filas de 3 productos
  const rows = []
  const productsPerRow = 3
  for (let i = 0; i < (productos || []).length; i += productsPerRow) {
    const rowProducts = (productos || []).slice(i, i + productsPerRow)
    const rowCards = rowProducts.map(p => {
      const img = p.imgProducto || 'https://via.placeholder.com/300x300?text=Producto'
      const name = p.nombreProducto || 'Producto'
      const sku = p.skuProducto || ''
      const base = Number(p.precioProducto || 0)
      const offer = Number(p.precioOferta || 0)
      const discount = offer > 0 && base > 0 ? Math.round(((base - offer) / base) * 100) : 0
      
      return `
        <td style="width:33.33%;padding:8px;" valign="top">
          <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#111827;border:1px solid #1f2937;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#0f1115;height:180px;text-align:center;position:relative;">
                ${discount > 0 ? `
                  <div style="position:absolute;top:8px;right:8px;background:#3b82f6;color:#fff;font-size:11px;font-weight:700;padding:4px 8px;border-radius:6px;z-index:1;">
                    -${discount}%
                  </div>
                ` : ''}
                <img src="${img}" alt="${name}" style="max-height:180px;max-width:100%;object-fit:contain;display:block;margin:0 auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding:16px;">
                <div style="color:#f3f4f6;font-size:15px;font-weight:600;line-height:1.4;min-height:2.8em;margin-bottom:8px;">${name}</div>
                <div style="color:#9ca3af;font-size:12px;margin-bottom:12px;">SKU: ${sku}</div>
                ${offer > 0 ? `
                  <div>
                    <span style="color:#60a5fa;font-size:20px;font-weight:800;">$${offer.toFixed(2)}</span>
                    <span style="color:#6b7280;font-size:13px;text-decoration:line-through;margin-left:8px;">$${base.toFixed(2)}</span>
                  </div>
                ` : `
                  <div style="color:#e5e7eb;font-size:20px;font-weight:800;">$${base.toFixed(2)}</div>
                `}
              </td>
            </tr>
          </table>
        </td>
      `
    }).join('')
    
    // Rellenar con celdas vacías si es necesario
    const emptyCells = productsPerRow - rowProducts.length
    const emptyHtml = '<td style="width:33.33%;padding:8px;"></td>'.repeat(emptyCells)
    
    rows.push(`<tr>${rowCards}${emptyHtml}</tr>`)
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin:0;padding:0;background:#0b0b0c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:800px;margin:0 auto;background:#0b0b0c;">
        
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);padding:32px 20px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:32px;font-weight:800;">NovaTech</h1>
            <p style="margin:8px 0 0;color:#dbeafe;font-size:16px;">${title}</p>
          </td>
        </tr>

        <!-- Intro -->
        <tr>
          <td style="padding:24px 20px 16px;">
            <p style="margin:0;color:#d1d5db;font-size:16px;text-align:center;line-height:1.5;">
              Aprovecha estas <strong style="color:#60a5fa;">promociones especiales</strong> por tiempo limitado 🔥
            </p>
          </td>
        </tr>

        <!-- Products Grid -->
        <tr>
          <td style="padding:0 12px 24px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              ${rows.join('')}
            </table>
          </td>
        </tr>

        <!-- CTA Button -->
        <tr>
          <td style="padding:0 20px 32px;text-align:center;">
            <a href="http://localhost:5173/ofertas" style="display:inline-block;background:#60a5fa;color:#fff;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">
              Ver Todas las Ofertas
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0f1115;padding:24px 20px;border-top:1px solid #1f2937;">
            <p style="margin:0 0 12px;color:#9ca3af;font-size:13px;text-align:center;line-height:1.5;">
              Si no deseas recibir notificaciones, responde con <strong>BAJA</strong>
            </p>
            <p style="margin:0;color:#6b7280;font-size:12px;text-align:center;">
              © ${new Date().getFullYear()} NovaTech · Mensaje automático
            </p>
          </td>
        </tr>

      </table>

    </body>
    </html>
  `
}

// Uso:
// const html = buildOffersHtml('Black Friday', productos)



// POST /api/newsletter/subscribe
router.post('/subscribe', async (req, res) => {
  try {
    let { email, idUsuario } = req.body || {}
    email = (email || '').trim()
    if (!email) return res.status(400).json({ error: 'Email requerido' })

    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!re.test(String(email).toLowerCase())) return res.status(400).json({ error: 'Email inválido' })

    // Persistir en BD
    const pool = await getPool()
    await pool.request()
      .input('email', email)
      .input('idUsuario', idUsuario || null)
      .query(`
        IF EXISTS (SELECT 1 FROM NewsletterSubscribers WHERE email = @email)
        BEGIN
          UPDATE NewsletterSubscribers
          SET estadoSuscripcion = 1,
              fechaRegistro = GETDATE(),
              idUsuario = COALESCE(idUsuario, @idUsuario)
          WHERE email = @email;
        END
        ELSE
        BEGIN
          INSERT INTO NewsletterSubscribers (idUsuario, email)
          VALUES (@idUsuario, @email);
        END
      `)

    const transporter = getTransporter()
    const from = process.env.SMTP_FROM || process.env.SMTP_USER

    await transporter.sendMail({
      from,
      to: email,
      subject: '¡Bienvenido a nuestro Newsletter!',
      text: `Gracias por suscribirte con ${email}. Recibirás nuestras novedades, ofertas y actualizaciones pronto.`,
      html: buildNewsletterHtml(email)
    })

    return res.json({ message: 'Suscripción confirmada. Revisa tu correo.' })
  } catch (err) {
    console.error('Error en /api/newsletter/subscribe:', err)
    return res.status(500).json({ error: 'No se pudo procesar la suscripción' })
  }
})

// POST /api/newsletter/unsubscribe
router.post('/unsubscribe', async (req, res) => {
  try {
    let { email, idUsuario } = req.body || {}
    email = (email || '').trim()

    if (!email && !idUsuario) {
      return res.status(400).json({ error: 'Se requiere email o idUsuario' })
    }

    const pool = await getPool()
    const request = pool.request()
    if (email) request.input('email', email)
    if (idUsuario) request.input('idUsuario', idUsuario)

    const result = await request.query(`
      UPDATE NewsletterSubscribers
      SET estadoSuscripcion = 0
      WHERE (${email ? 'email = @email' : '1 = 0'})
         OR (${idUsuario ? 'idUsuario = @idUsuario' : '1 = 0'})
    `)

    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      return res.json({ message: 'Suscripción cancelada. Ya no recibirás notificaciones.' })
    }

    return res.status(404).json({ error: 'No se encontró una suscripción activa para este usuario/email' })
  } catch (err) {
    console.error('Error en /api/newsletter/unsubscribe:', err)
    return res.status(500).json({ error: 'No se pudo cancelar la suscripción' })
  }
})

// POST /api/newsletter/status - Obtener si un usuario/email está suscrito (estadoSuscripcion = 1)
router.post('/status', async (req, res) => {
  try {
    let { email, idUsuario } = req.body || {}
    email = (email || '').trim()

    if (!email && !idUsuario) {
      return res.status(400).json({ error: 'Se requiere email o idUsuario' })
    }

    const pool = await getPool()
    const request = pool.request()
    if (email) request.input('email', email)
    if (idUsuario) request.input('idUsuario', idUsuario)

    const result = await request.query(`
      SELECT TOP 1 estadoSuscripcion
      FROM NewsletterSubscribers
      WHERE (${email ? 'email = @email' : '1 = 0'})
         OR (${idUsuario ? 'idUsuario = @idUsuario' : '1 = 0'})
      ORDER BY idSubscriber DESC
    `)

    const row = result.recordset[0]
    const subscribed = !!(row && row.estadoSuscripcion === 1)
    return res.json({ subscribed })
  } catch (err) {
    console.error('Error en /api/newsletter/status:', err)
    return res.status(500).json({ error: 'No se pudo obtener el estado de suscripción' })
  }
})

// POST /api/newsletter/notify-offer
router.post('/notify-offer', async (req, res) => {
  try {
    const { nombreOferta } = req.body || {}

    const pool = await getPool()
    // Obtener suscriptores activos
    const subs = await pool.request().query('SELECT email FROM NewsletterSubscribers WHERE estadoSuscripcion = 1')
    const emails = subs.recordset.map(r => r.email).filter(Boolean)
    if (!emails.length) return res.status(400).json({ error: 'No hay suscriptores activos' })

    // Obtener productos en oferta
    const prods = await pool.request().query(`
      SELECT TOP 12 idProducto, nombreProducto, skuProducto, imgProducto, precioProducto, precioOferta, porcentajeDescuento, nombreOferta
      FROM Productos
      WHERE esOferta = 1 OR precioOferta IS NOT NULL OR porcentajeDescuento IS NOT NULL
      ORDER BY nombreProducto ASC
    `)

    const transporter = getTransporter()
    const from = process.env.SMTP_FROM || process.env.SMTP_USER
    const subject = nombreOferta ? `Nueva oferta: ${nombreOferta}` : 'Tenemos nuevas ofertas para ti'
    const html = buildOffersHtml(nombreOferta, prods.recordset || [])

    await transporter.sendMail({
      from,
      to: from, // destinatario principal ficticio
      bcc: emails,
      subject,
      html,
      text: 'Tenemos nuevas ofertas disponibles en la tienda.'
    })

    return res.json({ message: `Notificación enviada a ${emails.length} suscriptores.` })
  } catch (err) {
    console.error('Error en /api/newsletter/notify-offer:', err)
    return res.status(500).json({ error: 'No se pudieron enviar las notificaciones' })
  }
})

module.exports = router
