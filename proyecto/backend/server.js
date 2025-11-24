// server.js
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const clientesRoutes = require('./routes/clientes');
const productosRoutes = require('./routes/productos');
const ordenesRoutes = require('./routes/ordenes');
const categoriasRoutes = require('./routes/categorias');
const proveedoresRoutes = require('./routes/proveedores');
const usuariosRoutes = require('./routes/usuarios');

const app = express();

app.use(cors());
app.use(express.json());

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/ordenes', ordenesRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/usuarios', usuariosRoutes);

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`🚀 Backend TiendaPC escuchando en http://localhost:${PORT}`);
});
