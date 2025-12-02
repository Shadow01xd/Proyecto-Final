IF DB_ID('dbTiendaHardwarePC') IS NOT NULL
    DROP DATABASE dbTiendaHardwarePC;
GO

CREATE DATABASE dbTiendaHardwarePC;
GO

USE dbTiendaHardwarePC;
GO

-- ========================================================
-- TABLA: Roles  (SIN UNIQUE PARA QUE NO DE ERROR)
-- ========================================================
CREATE TABLE Roles (
    idRol INT IDENTITY(1,1) PRIMARY KEY,
    nombreRol      VARCHAR(50) NOT NULL,
    descripcionRol VARCHAR(150)
);
GO

-- ========================================================
-- TABLA: Usuarios (login de la web)
-- ========================================================
CREATE TABLE Usuarios (
    idUsuario INT IDENTITY(1,1) PRIMARY KEY,
    idRol            INT NOT NULL,
    nombreUsuario    VARCHAR(100) NOT NULL,
    apellidoUsuario  VARCHAR(100) NOT NULL,
    emailUsuario     VARCHAR(120) NOT NULL UNIQUE,
    passwordHash     VARCHAR(255) NOT NULL,
    telefonoUsuario  VARCHAR(20),
    direccionUsuario VARCHAR(200),
    fechaRegistro    DATETIME NOT NULL DEFAULT GETDATE(),
    estadoUsuario    BIT NOT NULL DEFAULT 1,
    CONSTRAINT FK_Usuarios_Roles
        FOREIGN KEY (idRol) REFERENCES Roles(idRol)
);
GO

-- ========================================================
-- TABLA: Proveedores
-- ========================================================
CREATE TABLE Proveedores (
    idProveedor INT IDENTITY(1,1) PRIMARY KEY,
    nombreEmpresa       VARCHAR(120) NOT NULL,
    nombreContacto      VARCHAR(100),
    telefonoProveedor   VARCHAR(20),
    emailProveedor      VARCHAR(120),
    direccionProveedor  VARCHAR(200),
    sitioWebProveedor   VARCHAR(150)
);
GO

-- ========================================================
-- TABLA: Categorias
-- ========================================================
CREATE TABLE Categorias (
    idCategoria INT IDENTITY(1,1) PRIMARY KEY,
    nombreCategoria      VARCHAR(80) NOT NULL,
    descripcionCategoria VARCHAR(200)
);
GO

-- ========================================================
-- TABLA: M?todos de Pago (solo tarjetas)
-- ========================================================
CREATE TABLE MetodosPago (
    idMetodoPago INT IDENTITY(1,1) PRIMARY KEY,
    nombreMetodo      VARCHAR(60) NOT NULL,
    descripcionMetodo VARCHAR(200)
);
GO

-- ========================================================
-- TABLA: Productos
-- ========================================================
CREATE TABLE Productos (
    idProducto INT IDENTITY(1,1) PRIMARY KEY,
    idCategoria         INT NOT NULL,
    idProveedor         INT NOT NULL,
    nombreProducto      VARCHAR(120) NOT NULL,
    descripcionProducto VARCHAR(300),
    precioProducto      DECIMAL(10,2) NOT NULL,
    stockProducto       INT NOT NULL,
    garantiaMeses       INT NOT NULL DEFAULT 0,
    skuProducto         VARCHAR(50) NOT NULL UNIQUE,
    esActivo            BIT NOT NULL DEFAULT 1,
    CONSTRAINT FK_Productos_Categorias
        FOREIGN KEY (idCategoria) REFERENCES Categorias(idCategoria),
    CONSTRAINT FK_Productos_Proveedores
        FOREIGN KEY (idProveedor) REFERENCES Proveedores(idProveedor),
    CONSTRAINT CHK_Productos_Precio
        CHECK (precioProducto >= 0),
    CONSTRAINT CHK_Productos_Stock
        CHECK (stockProducto >= 0),
    CONSTRAINT CHK_Productos_Garantia
        CHECK (garantiaMeses >= 0)
);
GO

-- ========================================================
-- TABLA: Ordenes
-- ========================================================
CREATE TABLE Ordenes (
    idOrden INT IDENTITY(1,1) PRIMARY KEY,
    idUsuarioCliente INT NOT NULL,
    fechaOrden       DATETIME NOT NULL DEFAULT GETDATE(),
    estadoOrden      VARCHAR(20) NOT NULL,
    totalOrden       DECIMAL(10,2) NOT NULL DEFAULT 0,
    direccionEnvio   VARCHAR(250),
    observaciones    VARCHAR(300),
    CONSTRAINT FK_Ordenes_UsuariosCliente
        FOREIGN KEY (idUsuarioCliente) REFERENCES Usuarios(idUsuario),
    CONSTRAINT CHK_Ordenes_Estado
        CHECK (estadoOrden IN ('Pendiente','Pagada','Enviada','Cancelada')),
    CONSTRAINT CHK_Ordenes_Total
        CHECK (totalOrden >= 0)
);
GO

-- ========================================================
-- TABLA: DetalleOrden
-- ========================================================
CREATE TABLE DetalleOrden (
    idDetalleOrden INT IDENTITY(1,1) PRIMARY KEY,
    idOrden        INT NOT NULL,
    idProducto     INT NOT NULL,
    cantidad       INT NOT NULL,
    precioUnitario DECIMAL(10,2) NOT NULL,
    subtotal       DECIMAL(10,2) NOT NULL,
    CONSTRAINT FK_DetalleOrden_Ordenes
        FOREIGN KEY (idOrden) REFERENCES Ordenes(idOrden),
    CONSTRAINT FK_DetalleOrden_Productos
        FOREIGN KEY (idProducto) REFERENCES Productos(idProducto),
    CONSTRAINT CHK_DetalleOrden_Cantidad
        CHECK (cantidad > 0),
    CONSTRAINT CHK_DetalleOrden_Precio
        CHECK (precioUnitario >= 0),
    CONSTRAINT CHK_DetalleOrden_Subtotal
        CHECK (subtotal >= 0)
);
GO

-- ========================================================
-- TABLA: Pagos
-- ========================================================
CREATE TABLE Pagos (
    idPago INT IDENTITY(1,1) PRIMARY KEY,
    idOrden      INT NOT NULL,
    idMetodoPago INT NOT NULL,
    fechaPago    DATETIME NOT NULL DEFAULT GETDATE(),
    montoPago    DECIMAL(10,2) NOT NULL,
    referenciaPago VARCHAR(100),
    CONSTRAINT FK_Pagos_Ordenes
        FOREIGN KEY (idOrden) REFERENCES Ordenes(idOrden),
    CONSTRAINT FK_Pagos_MetodosPago
        FOREIGN KEY (idMetodoPago) REFERENCES MetodosPago(idMetodoPago),
    CONSTRAINT CHK_Pagos_Monto
        CHECK (montoPago > 0)
);
GO

-- ========================================================
-- TABLA: MetodosPagoUsuario
-- ========================================================
CREATE TABLE MetodosPagoUsuario (
    idMetodoPagoUsuario INT IDENTITY(1,1) PRIMARY KEY,
    idUsuario      INT NOT NULL,
    idMetodoPago   INT NOT NULL,
    aliasTarjeta   VARCHAR(50),
    titularTarjeta VARCHAR(120) NOT NULL,
    ultimos4       CHAR(4) NOT NULL,
    mesExpiracion  TINYINT NOT NULL,
    anioExpiracion SMALLINT NOT NULL,
    tokenPasarela  VARCHAR(200),
    esPredeterminado BIT NOT NULL DEFAULT 0,
    fechaRegistro  DATETIME NOT NULL DEFAULT GETDATE(),
    estado         BIT NOT NULL DEFAULT 1,
    CONSTRAINT FK_MetodosPagoUsuario_Usuarios
        FOREIGN KEY (idUsuario) REFERENCES Usuarios(idUsuario),
    CONSTRAINT FK_MetodosPagoUsuario_MetodosPago
        FOREIGN KEY (idMetodoPago) REFERENCES MetodosPago(idMetodoPago),
    CONSTRAINT CHK_MetodosPagoUsuario_Mes
        CHECK (mesExpiracion BETWEEN 1 AND 12),
    CONSTRAINT CHK_MetodosPagoUsuario_Anio
        CHECK (anioExpiracion >= YEAR(GETDATE()))
);
GO

/* =======================================================
    INSERTS
   ======================================================= */

-- ROLES (solo admin, empleado, cliente; repetidos para llegar a 5)
INSERT INTO Roles (nombreRol, descripcionRol)
VALUES
('ADMIN',    'Administrador de la tienda web'),
('EMPLEADO', 'Empleado que gestiona pedidos e inventario'),
('CLIENTE',  'Cliente que realiza compras en la tienda'),
('EMPLEADO', 'Empleado ?rea soporte'),
('CLIENTE',  'Cliente frecuente');
GO

-- USUARIOS
INSERT INTO Usuarios (idRol, nombreUsuario, apellidoUsuario, emailUsuario, passwordHash, telefonoUsuario, direccionUsuario)
VALUES
(1, 'Miguel ?ngel', 'Hern?ndez Hern?ndez', 'admin@tiendapc.com',    'admin123',   '7777-0001', 'San Miguel, Col. 15 de Septiembre'),
(2, 'Andrea',       'Zelaya L?pez',        'empleado1@tiendapc.com','HASH_EMPLEADO_1', '7777-0002', 'San Miguel, Centro'),
(2, 'Jorge',        'Mendoza D?az',        'empleado2@tiendapc.com','HASH_EMPLEADO_2', '7777-0003', 'San Salvador, Col. Miramonte'),
(3, 'Carlos',       'L?pez Ram?rez',       'carlos@correo.com',     'HASH_CLIENTE_1',  '7777-0004', 'San Salvador, Col. Escal?n'),
(3, 'Kenneth',      'Granados Claros',     'kenneth@correo.com',    'HASH_CLIENTE_2',  '7777-0005', 'San Miguel, Reparto Los H?roes');
GO

-- PROVEEDORES (MSI, GIGABYTE, ASUS + 2 extra)
INSERT INTO Proveedores (nombreEmpresa, nombreContacto, telefonoProveedor, emailProveedor, direccionProveedor, sitioWebProveedor)
VALUES
('MSI',       'Contacto MSI',      '2200-1001', 'ventas@msi.com',       'Taiw?n, oficinas regionales', 'https://www.msi.com'),
('GIGABYTE',  'Contacto Gigabyte', '2200-1002', 'sales@gigabyte.com',   'Taiw?n, oficinas regionales', 'https://www.gigabyte.com'),
('ASUS',      'Contacto Asus',     '2200-1003', 'channel@asus.com',     'Taiw?n, oficinas regionales', 'https://www.asus.com'),
('Corsair',   'Contacto Corsair',  '2200-1004', 'partners@corsair.com', 'USA, oficinas regionales',    'https://www.corsair.com'),
('Seagate',   'Contacto Seagate',  '2200-1005', 'sales@seagate.com',    'USA, oficinas regionales',    'https://www.seagate.com');
GO

-- CATEGOR?AS
INSERT INTO Categorias (nombreCategoria, descripcionCategoria)
VALUES
('Procesadores',     'CPUs para equipos de escritorio y gaming'),
('Tarjetas de Video','GPUs dedicadas para gaming y dise?o'),
('Memoria RAM',      'M?dulos DDR4 y DDR5'),
('Almacenamiento',   'Unidades SSD, NVMe y HDD'),
('Perif?ricos',      'Teclados, mouse, headsets y otros accesorios');
GO

-- M?TODOS DE PAGO (solo tarjetas)
INSERT INTO MetodosPago (nombreMetodo, descripcionMetodo)
VALUES
('Tarjeta Cr?dito Visa',       'Pago con tarjeta de cr?dito Visa'),
('Tarjeta Cr?dito MasterCard', 'Pago con tarjeta de cr?dito MasterCard'),
('Tarjeta D?bito Visa',        'Pago con tarjeta de d?bito Visa'),
('Tarjeta D?bito MasterCard',  'Pago con tarjeta de d?bito MasterCard'),
('Tarjeta Cr?dito/D?bito',     'Tarjetas internacionales de cr?dito o d?bito');
GO

-- PRODUCTOS
INSERT INTO Productos (idCategoria, idProveedor, nombreProducto, descripcionProducto, precioProducto, stockProducto, garantiaMeses, skuProducto)
VALUES
(1, 1, 'MSI MAG X570 Tomahawk',       'Placa madre gaming para Ryzen, chipset X570',           250.00, 10, 24, 'MB-MSI-X570-TOMA'),
(2, 2, 'GIGABYTE RTX 4070 Ti',        'Tarjeta gr?fica gaming RTX 4070 Ti 12GB GDDR6X',        799.99, 8, 36,  'GPU-GIGA-4070TI'),
(3, 4, 'Corsair Vengeance 32GB DDR5', 'Kit 2x16GB DDR5 5600MHz',                               189.99, 20, 24, 'RAM-COR-32GB-DDR5'),
(4, 5, 'Seagate FireCuda 530 1TB',    'SSD NVMe PCIe Gen4 1TB alta velocidad',                 179.90, 15, 36, 'SSD-SEA-FC530-1TB'),
(5, 3, 'ASUS ROG Gladius III',        'Mouse gamer ROG con sensor ?ptico de alta precisi?n',   89.99, 25, 12,  'MOU-ASUS-GLADIUS3');
GO

-- ORDENES (clientes = usuarios 4 y 5)
INSERT INTO Ordenes (idUsuarioCliente, fechaOrden, estadoOrden, totalOrden, direccionEnvio, observaciones)
VALUES
(4, '2025-11-01 10:30:00', 'Pagada',   979.89, 'San Salvador, Col. Escal?n',     'Compra de GPU y mouse'),
(5, '2025-11-02 15:45:00', 'Pendiente', 439.89, 'San Miguel, Reparto Los H?roes', 'Pendiente de pago con tarjeta'),
(4, '2025-11-03 09:10:00', 'Enviada',   250.00, 'San Salvador, Col. Escal?n',     'Solo placa madre MSI'),
(5, '2025-11-04 18:20:00', 'Pagada',    189.99, 'San Miguel, Reparto Los H?roes', 'Compra de RAM DDR5'),
(4, '2025-11-05 11:05:00', 'Cancelada', 179.90, 'San Salvador, Col. Escal?n',     'Orden cancelada por el cliente');
GO

-- DETALLE ORDEN
INSERT INTO DetalleOrden (idOrden, idProducto, cantidad, precioUnitario, subtotal)
VALUES
(1, 2, 1, 799.99, 799.99),
(1, 5, 2, 89.99, 179.98),
(2, 1, 1, 250.00, 250.00),
(2, 5, 1, 89.99, 89.99),
(4, 3, 1, 189.99, 189.99);
GO

-- PAGOS
INSERT INTO Pagos (idOrden, idMetodoPago, fechaPago, montoPago, referenciaPago)
VALUES
(1, 1, '2025-11-01 10:45:00', 979.89, 'VISA-CR-0001'),
(4, 2, '2025-11-04 18:30:00', 189.99, 'MC-CR-0002'),
(3, 3, '2025-11-03 09:20:00', 250.00, 'VISA-DB-0003'),
(2, 5, '2025-11-06 16:00:00', 439.89, 'CARD-MIX-0004'),
(5, 4, '2025-11-05 11:30:00', 179.90, 'MC-DB-0005');
GO

-- M?TODOS DE PAGO GUARDADOS
INSERT INTO MetodosPagoUsuario
(idUsuario, idMetodoPago, aliasTarjeta, titularTarjeta, ultimos4, mesExpiracion, anioExpiracion, tokenPasarela, esPredeterminado)
VALUES
(4, 1, 'Visa personal',       'Carlos L?pez Ram?rez',  '1234', 12, 2028, 'TOK_VISA_1234', 1),
(4, 2, 'MasterCard trabajo',  'Carlos L?pez Ram?rez',  '5678', 11, 2027, 'TOK_MC_5678',   0),
(5, 3, 'D?bito ahorro',       'Kenneth Granados',      '4321', 10, 2029, 'TOK_VISA_4321', 1),
(5, 5, 'Tarjeta internacional','Kenneth Granados',     '9999',  9, 2030, 'TOK_INT_9999',  0),
(4, 4, 'D?bito secundaria',   'Carlos L?pez Ram?rez',  '2468',  8, 2028, 'TOK_MCDB_2468',0);
GO

-- ========================================================
-- TABLAS: Carritos y CarritoItems
-- ========================================================

-- Carritos: 1 activo por usuario (estado = 1)
CREATE TABLE Carritos (
    idCarrito INT IDENTITY(1,1) PRIMARY KEY,
    idUsuario INT NOT NULL,
    estado BIT NOT NULL DEFAULT 1,                -- 1 = activo, 0 = cerrado/inactivo
    fechaCreacion DATETIME NOT NULL DEFAULT GETDATE(),
    fechaActualizacion DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Carritos_Usuarios
        FOREIGN KEY (idUsuario) REFERENCES Usuarios(idUsuario)
);
GO

-- Único carrito activo por usuario (índice único filtrado)
CREATE UNIQUE INDEX UX_Carritos_UsuarioActivo
ON Carritos (idUsuario)
WHERE estado = 1;
GO

-- CarritoItems: productos dentro de un carrito
CREATE TABLE CarritoItems (
    idCarritoItem INT IDENTITY(1,1) PRIMARY KEY,
    idCarrito     INT NOT NULL,
    idProducto    INT NOT NULL,
    cantidad      INT NOT NULL,
    precioUnitario DECIMAL(10,2) NOT NULL,       -- snapshot del precio del momento
    fechaCreacion DATETIME NOT NULL DEFAULT GETDATE(),
    fechaActualizacion DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_CarritoItems_Carritos
        FOREIGN KEY (idCarrito) REFERENCES Carritos(idCarrito),
    CONSTRAINT FK_CarritoItems_Productos
        FOREIGN KEY (idProducto) REFERENCES Productos(idProducto),
    CONSTRAINT CHK_CarritoItems_Cantidad
        CHECK (cantidad > 0),
    CONSTRAINT CHK_CarritoItems_PrecioUnitario
        CHECK (precioUnitario >= 0)
);
GO

-- No permitir productos duplicados en el mismo carrito
CREATE UNIQUE INDEX UX_CarritoItems_CarritoProducto
ON CarritoItems (idCarrito, idProducto);
GO

-- Índices de apoyo
CREATE INDEX IX_CarritoItems_IdCarrito ON CarritoItems (idCarrito);
CREATE INDEX IX_CarritoItems_IdProducto ON CarritoItems (idProducto);
GO

--updates
ALTER TABLE Productos
ADD imgProducto VARCHAR(300);


UPDATE Productos SET imgProducto =
    'https://asset.msi.com/resize/image/global/product/product_8_20200326101839_5e7c10ff8509c.png62405b38c58fe0f07fcef2367d8a9ba1/1024.png'
WHERE skuProducto = 'MB-MSI-X570-TOMA';

UPDATE Productos SET imgProducto =
    'https://static.gigabyte.com/StaticFile/Image/Global/a251c4a029e27ad0398af9c3799e4495/Product/33432/Png'
WHERE skuProducto = 'GPU-GIGA-4070TI';

UPDATE Productos SET imgProducto =
    'https://assets.corsair.com/image/upload/c_pad,q_auto,h_1024,w_1024,f_auto/products/Memory/vengeance-rgb-ddr5-blk-config/Gallery/Vengeance-RGB-DDR5-2UP-BLACK_01.webp'
WHERE skuProducto = 'RAM-COR-32GB-DDR5';

UPDATE Productos SET imgProducto =
    'https://paragongaming.co.uk/wp-content/uploads/2022/10/seagate-firecuda-530-heatsink-left-lo-res_l.png'
WHERE skuProducto = 'SSD-SEA-FC530-1TB';

UPDATE Productos SET imgProducto =
    'https://www.gigahertz.com.ph/cdn/shop/files/asus-rog-gladius-ii-rgb-aura-gaming-mouse-asus-gigahertz-126585_1024x.webp?v=1721109724'
WHERE skuProducto = 'MOU-ASUS-GLADIUS3';


ALTER TABLE Productos
ADD 
    esOferta BIT NOT NULL DEFAULT 0,
    nombreOferta VARCHAR(120) NULL,
    porcentajeDescuento TINYINT NULL,
    precioOferta DECIMAL(10,2) NULL;
GO

ALTER TABLE Productos
ADD CONSTRAINT CHK_Productos_Descuento
    CHECK (
        porcentajeDescuento IS NULL 
        OR (porcentajeDescuento > 0 AND porcentajeDescuento < 100)
    );
GO

ALTER TABLE Productos
ADD CONSTRAINT CHK_Productos_PrecioOferta
    CHECK (precioOferta IS NULL OR precioOferta >= 0);
GO


USE dbTiendaHardwarePC;
GO

CREATE TABLE NewsletterSubscribers (
    idSubscriber INT IDENTITY(1,1) PRIMARY KEY,
    idUsuario    INT NULL,
    email        VARCHAR(150) NOT NULL,
    fechaRegistro DATETIME NOT NULL DEFAULT GETDATE(),
    estadoSuscripcion BIT NOT NULL DEFAULT 1, 

    CONSTRAINT FK_NewsletterSubscribers_Usuarios
        FOREIGN KEY (idUsuario) REFERENCES Usuarios(idUsuario),

    CONSTRAINT UQ_NewsletterSubscribers_Email UNIQUE (email)
);
GO


Select * from Usuarios

SELECT * FROM Roles;