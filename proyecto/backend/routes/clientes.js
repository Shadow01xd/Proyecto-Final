// routes/clientes.js
const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// GET /api/clientes  -> todos los clientes
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT * FROM Clientes');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error al obtener clientes:', err);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// GET /api/clientes/:id  -> un cliente por id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('idCliente', Number(id))
      .query('SELECT * FROM Clientes WHERE idCliente = @idCliente');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error al obtener cliente:', err);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

// POST /api/clientes  -> crear cliente
router.post('/', async (req, res) => {
  const {
    nombresCliente,
    apellidosCliente,
    emailCliente,
    telefonoCliente,
    direccionCliente
  } = req.body;

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('nombresCliente', nombresCliente)
      .input('apellidosCliente', apellidosCliente)
      .input('emailCliente', emailCliente)
      .input('telefonoCliente', telefonoCliente || null)
      .input('direccionCliente', direccionCliente || null)
      .query(`
        INSERT INTO Clientes (nombresCliente, apellidosCliente, emailCliente, telefonoCliente, direccionCliente)
        VALUES (@nombresCliente, @apellidosCliente, @emailCliente, @telefonoCliente, @direccionCliente);
        SELECT SCOPE_IDENTITY() AS idCliente;
      `);

    const idCliente = result.recordset[0].idCliente;
    res.status(201).json({ idCliente, message: 'Cliente creado correctamente' });
  } catch (err) {
    console.error('Error al crear cliente:', err);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// PUT /api/clientes/:id  -> actualizar cliente
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    nombresCliente,
    apellidosCliente,
    emailCliente,
    telefonoCliente,
    direccionCliente,
    estadoCliente
  } = req.body;

  try {
    const pool = await getPool();
    await pool.request()
      .input('idCliente', Number(id))
      .input('nombresCliente', nombresCliente)
      .input('apellidosCliente', apellidosCliente)
      .input('emailCliente', emailCliente)
      .input('telefonoCliente', telefonoCliente || null)
      .input('direccionCliente', direccionCliente || null)
      .input('estadoCliente', typeof estadoCliente === 'boolean' ? (estadoCliente ? 1 : 0) : 1)
      .query(`
        UPDATE Clientes
        SET
          nombresCliente = @nombresCliente,
          apellidosCliente = @apellidosCliente,
          emailCliente = @emailCliente,
          telefonoCliente = @telefonoCliente,
          direccionCliente = @direccionCliente,
          estadoCliente = @estadoCliente
        WHERE idCliente = @idCliente
      `);

    res.json({ message: 'Cliente actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar cliente:', err);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// DELETE /api/clientes/:id  -> baja lógica (estadoCliente = 0)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();
    await pool.request()
      .input('idCliente', Number(id))
      .query(`
        UPDATE Clientes
        SET estadoCliente = 0
        WHERE idCliente = @idCliente
      `);

    res.json({ message: 'Cliente marcado como inactivo' });
  } catch (err) {
    console.error('Error al eliminar cliente:', err);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

module.exports = router;
