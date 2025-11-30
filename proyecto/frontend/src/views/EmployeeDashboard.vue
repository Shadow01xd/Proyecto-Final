<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'

const router = useRouter()

// Estados globales
const usuario = ref(null)
const loading = ref(false)
const error = ref('')
const success = ref('')
const activeTab = ref('productos')

// Permisos (case-insensitive, soporta variantes de nombres)
const esAdmin = computed(() => {
  const rol = (usuario.value?.nombreRol || '').toUpperCase()
  return rol === 'ADMIN' || rol === 'ADMINISTRADOR'
})

const esEmpleado = computed(() => {
  const rol = (usuario.value?.nombreRol || '').toUpperCase()
  return rol === 'EMPLEADO'
})

// === PRODUCTOS ===
const productos = ref([])
const categorias = ref([])
const searchProducto = ref('')
const filtroCategoriaProducto = ref('')
const proveedores = ref([])
const showProductModal = ref(false)
const editingProduct = ref(null)
const productForm = ref({
  idCategoria: '',
  idProveedor: '',
  nombreProducto: '',
  descripcionProducto: '',
  precioProducto: '',
  stockProducto: '',
  garantiaMeses: '',
  skuProducto: '',
  imgProducto: ''
})

// === USUARIOS ===
const usuarios = ref([])
const roles = ref([])
const showUserModal = ref(false)
const editingUser = ref(null)
const userForm = ref({
  idRol: '',
  nombreUsuario: '',
  apellidoUsuario: '',
  emailUsuario: '',
  password: '',
  telefonoUsuario: '',
  direccionUsuario: ''
})

// Verificar autenticación
onMounted(async () => {
  const usuarioData = localStorage.getItem('usuario')
  if (!usuarioData) {
    router.push('/login')
    return
  }

  usuario.value = JSON.parse(usuarioData)

  const rolesPermitidos = ['EMPLEADO', 'ADMIN', 'Empleado', 'Administrador', 'Admin']
  if (!rolesPermitidos.includes(usuario.value.nombreRol)) {
    error.value = 'Acceso denegado.'
    setTimeout(() => router.push('/'), 2000)
    return
  }

  loading.value = true
  try {
    await cargarDatos()
  } catch (err) {
    error.value = 'Error al cargar datos. Verifica que el backend esté corriendo.'
  } finally {
    loading.value = false
  }
})

const cargarDatos = async () => {
  await Promise.all([
    cargarProductos(),
    cargarCategorias(),
    cargarProveedores(),
    cargarUsuarios(),
    cargarRoles()
  ])
}

// === PRODUCTOS - FUNCIONES ===
const cargarProductos = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/productos')
    if (response.ok) productos.value = await response.json()
  } catch (err) {
    console.error('Error al cargar productos:', err)
  }
}

const productosFiltrados = computed(() => {
  let list = [...productos.value]

  const q = (searchProducto.value || '').trim().toLowerCase()
  if (q) {
    list = list.filter(p => {
      const nombre = (p.nombreProducto || '').toLowerCase()
      const sku = (p.skuProducto || '').toLowerCase()
      return nombre.includes(q) || sku.includes(q)
    })
  }

  if (filtroCategoriaProducto.value) {
    const idCat = parseInt(filtroCategoriaProducto.value)
    list = list.filter(p => Number(p.idCategoria) === idCat)
  }

  return list
})

const cargarCategorias = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/categorias')
    if (response.ok) categorias.value = await response.json()
  } catch (err) {
    console.error('Error al cargar categorías:', err)
  }
}

const cargarProveedores = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/proveedores')
    if (response.ok) proveedores.value = await response.json()
  } catch (err) {
    console.error('Error al cargar proveedores:', err)
  }
}

const abrirProductModal = (producto = null) => {
  editingProduct.value = producto
  if (producto) {
    productForm.value = { ...producto }
  } else {
    resetProductForm()
  }
  showProductModal.value = true
  error.value = ''
  success.value = ''
}

const resetProductForm = () => {
  productForm.value = {
    idCategoria: '',
    idProveedor: '',
    nombreProducto: '',
    descripcionProducto: '',
    precioProducto: '',
    stockProducto: '',
    garantiaMeses: '',
    skuProducto: '',
    imgProducto: ''
  }
}

const guardarProducto = async () => {
  error.value = ''
  success.value = ''
  loading.value = true

  try {
    const url = editingProduct.value
      ? `http://localhost:3000/api/productos/${editingProduct.value.idProducto}`
      : 'http://localhost:3000/api/productos'

    const method = editingProduct.value ? 'PUT' : 'POST'

    const data = {
      ...productForm.value,
      idCategoria: parseInt(productForm.value.idCategoria),
      idProveedor: parseInt(productForm.value.idProveedor),
      precioProducto: parseFloat(productForm.value.precioProducto),
      stockProducto: parseInt(productForm.value.stockProducto),
      garantiaMeses: parseInt(productForm.value.garantiaMeses) || 0,
      imgProducto: productForm.value.imgProducto || null
    }

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    const result = await response.json()

    if (!response.ok) throw new Error(result.error)

    success.value = editingProduct.value ? 'Producto actualizado' : 'Producto agregado'
    await cargarProductos()

    setTimeout(() => {
      showProductModal.value = false
    }, 1500)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const eliminarProducto = async (id) => {
  if (!confirm('¿Estás seguro de desactivar este producto?')) return

  try {
    const response = await fetch(`http://localhost:3000/api/productos/${id}`, {
      method: 'DELETE'
    })

    if (response.ok) {
      success.value = 'Producto desactivado'
      await cargarProductos()
      setTimeout(() => (success.value = ''), 3000)
    }
  } catch (err) {
    error.value = 'Error al eliminar producto'
  }
}

// === USUARIOS - FUNCIONES ===
const cargarUsuarios = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/usuarios')
    if (response.ok) usuarios.value = await response.json()
  } catch (err) {
    console.error('Error al cargar usuarios:', err)
  }
}

const cargarRoles = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/usuarios/roles/list')
    if (response.ok) roles.value = await response.json()
  } catch (err) {
    console.error('Error al cargar roles:', err)
  }
}

const abrirUserModal = (user = null) => {
  editingUser.value = user
  if (user) {
    userForm.value = { ...user, password: '' }
  } else {
    resetUserForm()
  }
  showUserModal.value = true
  error.value = ''
  success.value = ''
}

// Abrir modal para crear específicamente un EMPLEADO desde la pestaña de Empleados
const abrirEmpleadoModal = () => {
  editingUser.value = null
  resetUserForm()

  // Buscar el rol EMPLEADO en la lista de roles y preseleccionarlo
  const rolEmpleado = roles.value.find(r => (r.nombreRol || '').toUpperCase() === 'EMPLEADO')
  if (rolEmpleado) {
    userForm.value.idRol = rolEmpleado.idRol
  }

  showUserModal.value = true
  error.value = ''
  success.value = ''
}

const resetUserForm = () => {
  userForm.value = {
    idRol: '',
    nombreUsuario: '',
    apellidoUsuario: '',
    emailUsuario: '',
    password: '',
    telefonoUsuario: '',
    direccionUsuario: ''
  }
}

const guardarUsuario = async () => {
  error.value = ''
  success.value = ''
  loading.value = true

  try {
    const url = editingUser.value
      ? `http://localhost:3000/api/usuarios/${editingUser.value.idUsuario}`
      : 'http://localhost:3000/api/usuarios'

    const method = editingUser.value ? 'PUT' : 'POST'

    const data = { ...userForm.value }
    if (editingUser.value && !data.password) delete data.password

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    const result = await response.json()

    if (!response.ok) throw new Error(result.error)

    success.value = editingUser.value ? 'Usuario actualizado' : 'Usuario creado'
    await cargarUsuarios()

    setTimeout(() => {
      showUserModal.value = false
    }, 1500)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const eliminarUsuario = async (id) => {
  if (!confirm('¿Estás seguro de desactivar este usuario?')) return

  try {
    const response = await fetch(`http://localhost:3000/api/usuarios/${id}`, {
      method: 'DELETE'
    })

    if (response.ok) {
      success.value = 'Usuario desactivado'
      await cargarUsuarios()
      setTimeout(() => (success.value = ''), 3000)
    }
  } catch (err) {
    error.value = 'Error al eliminar usuario'
  }
}

// Eliminar usuario definitivamente
const eliminarUsuarioDefinitivo = async (id) => {
  if (!confirm('Esta acción BORRARÁ definitivamente al usuario. ¿Continuar?')) return

  try {
    const response = await fetch(`http://localhost:3000/api/usuarios/${id}/hard`, {
      method: 'DELETE'
    })

    const result = await response.json()

    if (response.ok) {
      success.value = result.message || 'Usuario eliminado definitivamente'
      await cargarUsuarios()
      setTimeout(() => (success.value = ''), 3000)
    } else {
      throw new Error(result.error || 'No se pudo eliminar el usuario definitivamente')
    }
  } catch (err) {
    error.value = err.message || 'Error al eliminar usuario definitivamente'
  }
}

// Activar usuario (pasar de inactivo a activo)
const activarUsuario = async (id) => {
  try {
    const response = await fetch(`http://localhost:3000/api/usuarios/${id}/activar`, {
      method: 'PUT'
    })

    if (response.ok) {
      success.value = 'Usuario activado correctamente'
      await cargarUsuarios()
      setTimeout(() => (success.value = ''), 3000)
    }
  } catch (err) {
    error.value = 'Error al activar usuario'
  }
}

// Filtrar usuarios según rol (case-insensitive)
const usuariosFiltrados = computed(() => {
  const normalizarRol = (rol) => (rol || '').toUpperCase()

  // En la pestaña "Usuarios" queremos ver solo CLIENTES
  return usuarios.value.filter(u => normalizarRol(u.nombreRol) === 'CLIENTE')
})

const cerrarSesion = () => {
  localStorage.removeItem('usuario')
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <Header />

    <!-- Tabs/Header dentro del contenido principal -->
    <div class="container mx-auto px-6 py-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-foreground">
            {{ esAdmin ? '🔧 Panel de Administración' : '👔 Panel de Empleado' }}
          </h1>
          <p class="text-sm text-muted-foreground" v-if="usuario">
            {{ usuario.nombreUsuario }} {{ usuario.apellidoUsuario }} • {{ usuario.nombreRol }}
          </p>
        </div>
        
        <button
          @click="cerrarSesion"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
        >
          Cerrar Sesión
        </button>
      </div>

      <div class="flex gap-4 mt-6 border-b border-border">
        <button
          @click="activeTab = 'productos'"
          :class="[
            'px-4 py-2 font-medium transition -mb-px',
            activeTab === 'productos'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-muted-foreground hover:text-foreground'
          ]"
        >
          📦 Productos
        </button>
        <button
          v-if="esAdmin"
          @click="activeTab = 'usuarios'"
          :class="[
            'px-4 py-2 font-medium transition -mb-px',
            activeTab === 'usuarios'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-muted-foreground hover:text-foreground'
          ]"
        >
          👥 Usuarios
        </button>
        <button
          v-if="esAdmin"
          @click="activeTab = 'empleados'"
          :class="[
            'px-4 py-2 font-medium transition -mb-px',
            activeTab === 'empleados'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-muted-foreground hover:text-foreground'
          ]"
        >
          👨‍💼 Empleados
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <main class="container mx-auto px-6 py-8">
      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p class="mt-4 text-muted-foreground">Cargando...</p>
      </div>

      <!-- Messages -->
      <div v-if="error" class="mb-6 bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
        {{ error }}
      </div>
      <div v-if="success" class="mb-6 bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg">
        {{ success }}
      </div>

      <!-- TAB: PRODUCTOS -->
      <div v-if="activeTab === 'productos' && !loading" class="bg-card rounded-xl shadow-sm overflow-hidden border border-border">
        <!-- Filtros para Productos -->
        <div class="px-6 py-4 border-b border-border bg-secondary/20">
          <div class="flex flex-col sm:flex-row gap-4 mb-4">
            <!-- Buscador -->
            <div class="flex-1">
              <label for="searchProducto" class="block text-sm font-medium text-muted-foreground mb-1">Buscar</label>
              <input
                id="searchProducto"
                v-model="searchProducto"
                type="text"
                placeholder="Buscar por nombre o SKU..."
                class="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <!-- Filtro por categoría -->
            <div class="sm:w-64">
              <label for="filtroCategoria" class="block text-sm font-medium text-muted-foreground mb-1">Categoría</label>
              <select
                id="filtroCategoria"
                v-model="filtroCategoria"
                class="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option :value="-1">Todas las categorías</option>
                <option v-for="c in categorias" :key="c.idCategoria" :value="c.idCategoria">
                  {{ c.nombreCategoria }}
                </option>
              </select>
            </div>
            
            <div class="flex items-end">
              <button
                @click="searchProducto = ''; filtroCategoria = -1"
                class="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                :disabled="!searchProducto && filtroCategoria === -1"
                :class="{ 'opacity-50 cursor-not-allowed': !searchProducto && filtroCategoria === -1 }"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold">Gestión de Productos</h2>
            <p class="text-sm text-muted-foreground">
              Mostrando {{ productosFiltrados.length }} de {{ productos.length }} productos
              <span v-if="searchProducto || filtroCategoria !== -1" class="text-blue-600">
                (filtrados)
              </span>
            </p>
          </div>
          <button
            @click="abrirProductModal()"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            + Agregar Producto
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-secondary/50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Imagen</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SKU</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Categoría</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Precio</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Stock</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="p in productosFiltrados" :key="p.idProducto" class="hover:bg-secondary/40">
                <td class="px-4 py-3 text-sm">
                  <img v-if="p.imgProducto" :src="p.imgProducto" alt="img" class="w-12 h-12 object-cover rounded" />
                  <div v-else class="w-12 h-12 bg-secondary rounded flex items-center justify-center text-xs text-muted-foreground">No img</div>
                </td>
                <td class="px-4 py-3 text-sm font-mono">{{ p.skuProducto }}</td>
                <td class="px-4 py-3 text-sm font-medium">{{ p.nombreProducto }}</td>
                <td class="px-4 py-3 text-sm text-muted-foreground">{{ p.nombreCategoria }}</td>
                <td class="px-4 py-3 text-sm font-semibold text-blue-600">
                  ${{ Number(p.precioProducto || 0).toFixed(2) }}
                </td>
                <td class="px-4 py-3 text-sm">
                  <span :class="Number(p.stockProducto || 0) > 10 ? 'text-green-600' : 'text-red-600'">
                    {{ p.stockProducto ?? 0 }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm">
                  <div class="flex items-center gap-2">
                    <button
                      @click="abrirProductModal(p)"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-full text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 transition-colors"
                      title="Editar producto"
                    >
                      ✏️
                    </button>
                    <button
                      @click="eliminarProducto(p.idProducto)"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-800 transition-colors"
                      title="Desactivar producto"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="productos.length === 0">
                <td colspan="6" class="px-4 py-6 text-center text-sm text-muted-foreground">
                  No hay productos registrados aún.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB: USUARIOS / CLIENTES -->
      <div v-if="activeTab === 'usuarios' && !loading" class="bg-card rounded-xl shadow-sm overflow-hidden border border-border">
        <div class="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold">Gestión de Usuarios</h2>
            <p class="text-sm text-muted-foreground">Total: {{ usuariosFiltrados.length }}</p>
          </div>
          <button
            v-if="esAdmin"
            @click="abrirUserModal()"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            + Agregar Usuario
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-secondary/50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rol</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                <th v-if="esAdmin" class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="u in usuariosFiltrados" :key="u.idUsuario" class="hover:bg-secondary/40">
                <td class="px-4 py-3 text-sm font-medium">{{ u.nombreUsuario }} {{ u.apellidoUsuario }}</td>
                <td class="px-4 py-3 text-sm text-muted-foreground">{{ u.emailUsuario }}</td>
                <td class="px-4 py-3 text-sm">
                  <span class="px-2 py-1 text-xs font-medium rounded-full" :class="{
                    'bg-purple-100 text-purple-700': u.nombreRol === 'ADMIN',
                    'bg-blue-100 text-blue-700': u.nombreRol === 'EMPLEADO',
                    'bg-gray-100 text-gray-700': u.nombreRol === 'CLIENTE'
                  }">
                    {{ u.nombreRol }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm">
                  <span :class="u.estadoUsuario ? 'text-green-600' : 'text-red-600'">
                    {{ u.estadoUsuario ? '✓ Activo' : '✗ Inactivo' }}
                  </span>
                </td>
                <td v-if="esAdmin" class="px-4 py-3 text-sm space-x-2">
                  <button @click="abrirUserModal(u)" class="text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                  <button
                    v-if="u.estadoUsuario"
                    @click="eliminarUsuario(u.idUsuario)"
                    class="text-yellow-700 hover:text-yellow-900 font-medium"
                  >
                    Inactivar
                  </button>
                  <button
                    v-else
                    @click="activarUsuario(u.idUsuario)"
                    class="text-green-700 hover:text-green-900 font-medium"
                  >
                    Activar
                  </button>
                  <button
                    @click="eliminarUsuarioDefinitivo(u.idUsuario)"
                    class="text-red-600 hover:text-red-800 font-medium"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
              <tr v-if="usuariosFiltrados.length === 0">
                <td colspan="5" class="px-4 py-6 text-center text-sm text-muted-foreground">
                  No hay {{ esAdmin ? 'usuarios' : 'clientes' }} registrados aún.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB: EMPLEADOS (Solo Admin) -->
      <div v-if="activeTab === 'empleados' && esAdmin && !loading" class="bg-card rounded-xl shadow-sm overflow-hidden border border-border">
        <div class="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold">Gestión de Empleados</h2>
            <p class="text-sm text-muted-foreground">
              Total: {{ usuarios.filter(u => {
                const rol = (u.nombreRol || '').toUpperCase()
                return rol === 'EMPLEADO' || rol === 'ADMIN'
              }).length }}
            </p>
          </div>
          <button
            v-if="esAdmin"
            @click="abrirEmpleadoModal()"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            + Agregar Empleado
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-secondary/50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rol</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Teléfono</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                <th v-if="esAdmin" class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="u in usuarios.filter(u => {
                  const rol = (u.nombreRol || '').toUpperCase()
                  return rol === 'EMPLEADO' || rol === 'ADMIN'
                })"
                :key="u.idUsuario"
                class="hover:bg-secondary/40"
              >
                <td class="px-4 py-3 text-sm font-medium">{{ u.nombreUsuario }} {{ u.apellidoUsuario }}</td>
                <td class="px-4 py-3 text-sm text-muted-foreground">{{ u.emailUsuario }}</td>
                <td class="px-4 py-3 text-sm">
                  <span class="px-2 py-1 text-xs font-medium rounded-full" :class="{
                    'bg-purple-100 text-purple-700': u.nombreRol === 'ADMIN',
                    'bg-blue-100 text-blue-700': u.nombreRol === 'EMPLEADO'
                  }">
                    {{ u.nombreRol }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">{{ u.telefonoUsuario || 'N/A' }}</td>
                <td class="px-4 py-3 text-sm">
                  <span :class="u.estadoUsuario ? 'text-green-600' : 'text-red-600'">
                    {{ u.estadoUsuario ? '✓ Activo' : '✗ Inactivo' }}
                  </span>
                </td>
                <td v-if="esAdmin" class="px-4 py-3 text-sm space-x-2">
                  <button @click="abrirUserModal(u)" class="text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                  <button
                    v-if="u.estadoUsuario"
                    @click="eliminarUsuario(u.idUsuario)"
                    class="text-yellow-700 hover:text-yellow-900 font-medium"
                  >
                    Inactivar
                  </button>
                  <button
                    v-else
                    @click="activarUsuario(u.idUsuario)"
                    class="text-green-700 hover:text-green-900 font-medium"
                  >
                    Activar
                  </button>
                  <button
                    @click="eliminarUsuarioDefinitivo(u.idUsuario)"
                    class="text-red-600 hover:text-red-800 font-medium"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
              <tr v-if="usuarios.filter(u => {
                const rol = (u.nombreRol || '').toUpperCase()
                return rol === 'EMPLEADO' || rol === 'ADMIN'
              }).length === 0">
                <td colspan="5" class="px-4 py-6 text-center text-sm text-muted-foreground">
                  No hay empleados registrados aún.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- MODAL: PRODUCTO -->
    <div v-if="showProductModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" @click.self="showProductModal = false">
      <div class="bg-card text-foreground rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border">
        <div class="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <h2 class="text-xl font-bold">{{ editingProduct ? '✏️ Editar Producto' : '➕ Nuevo Producto' }}</h2>
          <button @click="showProductModal = false" class="text-muted-foreground hover:text-foreground text-2xl transition-colors">
            &times;
          </button>
        </div>

        <form @submit.prevent="guardarProducto" class="p-6 space-y-5">
          <div v-if="error" class="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded-lg text-sm">
            {{ error }}
          </div>
          <div v-if="success" class="bg-green-500/10 border border-green-500/30 text-green-500 px-4 py-3 rounded-lg text-sm">
            {{ success }}
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-muted-foreground mb-1.5">Nombre *</label>
              <input 
                v-model="productForm.nombreProducto" 
                required 
                class="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                placeholder="Ej: Tarjeta de Video NVIDIA RTX 4080"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1.5">SKU *</label>
              <input 
                v-model="productForm.skuProducto" 
                required 
                :disabled="editingProduct" 
                class="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="Ej: RTX-4080-16G"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1.5">Categoría *</label>
              <select 
                v-model="productForm.idCategoria" 
                required 
                class="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition appearance-none"
              >
                <option value="" disabled>Seleccionar categoría...</option>
                <option v-for="c in categorias" :key="c.idCategoria" :value="c.idCategoria">
                  {{ c.nombreCategoria }}
                </option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1.5">Proveedor *</label>
              <select 
                v-model="productForm.idProveedor" 
                required 
                class="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition appearance-none"
              >
                <option value="" disabled>Seleccionar proveedor...</option>
                <option v-for="p in proveedores" :key="p.idProveedor" :value="p.idProveedor">
                  {{ p.nombreEmpresa }}
                </option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1.5">Precio (MXN) *</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <input 
                  v-model="productForm.precioProducto" 
                  type="number" 
                  step="0.01" 
                  min="0"
                  required 
                  class="w-full bg-background border border-border rounded-lg pl-8 pr-4 py-2.5 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1.5">Stock *</label>
              <input 
                v-model="productForm.stockProducto" 
                type="number" 
                min="0"
                required 
                class="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                placeholder="0"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1.5">Garantía (meses)</label>
              <input 
                v-model="productForm.garantiaMeses" 
                type="number" 
                min="0"
                class="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                placeholder="Opcional"
              />
            </div>
            
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-muted-foreground mb-1.5">URL de la imagen</label>
              <input 
                v-model="productForm.imgProducto" 
                type="url"
                class="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition font-mono text-sm"
                placeholder="https://ejemplo.com/imagen-producto.jpg"
              />
              <p class="text-xs text-muted-foreground mt-1.5">Asegúrate de que la URL sea accesible desde internet.</p>
            </div>
            
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-muted-foreground mb-1.5">Descripción</label>
              <textarea 
                v-model="productForm.descripcionProducto" 
                rows="3" 
                class="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition resize-none"
                placeholder="Descripción detallada del producto..."
              ></textarea>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 pt-6">
            <button 
              type="submit" 
              :disabled="loading" 
              class="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg py-2.5 px-4 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span v-if="loading" class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              {{ loading ? 'Guardando...' : 'Guardar Producto' }}
            </button>
            <button 
              type="button" 
              @click="showProductModal = false" 
              class="px-6 py-2.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: USUARIO -->
    <div v-if="showUserModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" @click.self="showUserModal = false">
      <div class="bg-card text-foreground rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border">
        <div class="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <h2 class="text-xl font-bold">{{ editingUser ? '✏️ Editar Usuario' : '👤 Nuevo Usuario' }}</h2>
          <button @click="showUserModal = false" class="text-muted-foreground hover:text-foreground text-2xl transition-colors">
            &times;
          </button>
        </div>

        <form @submit.prevent="guardarUsuario" class="p-6 space-y-5">
          <div v-if="error" class="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded-lg text-sm">
            {{ error }}
          </div>
          <div v-if="success" class="bg-green-500/10 border border-green-500/30 text-green-500 px-4 py-3 rounded-lg text-sm">
            {{ success }}
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1.5">Nombre *</label>
              <input 
                v-model="userForm.nombreUsuario" 
                required 
                class="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                placeholder="Ej: Juan"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1.5">Apellido *</label>
              <input 
                v-model="userForm.apellidoUsuario" 
                required 
                class="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                placeholder="Ej: Pérez"
              />
            </div>
            
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-muted-foreground mb-1.5">Correo electrónico *</label>
              <input 
                v-model="userForm.correoUsuario" 
                type="email" 
                required 
                class="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                placeholder="usuario@ejemplo.com"
                :disabled="editingUser"
                :class="{ 'opacity-70 cursor-not-allowed': editingUser }"
              />
              <p v-if="editingUser" class="text-xs text-muted-foreground mt-1">El correo no puede ser modificado</p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1.5">Teléfono</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+52</span>
                <input 
                  v-model="userForm.telefonoUsuario" 
                  type="tel" 
                  class="w-full bg-background border border-border rounded-lg pl-12 pr-4 py-2.5 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                  placeholder="55 1234 5678"
                />
              </div>
            </div>
            
            <div v-if="esAdmin">
              <label class="block text-sm font-medium text-muted-foreground mb-1.5">Rol *</label>
              <select 
                v-model="userForm.idRol" 
                required 
                class="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition appearance-none"
              >
                <option value="" disabled>Seleccionar rol...</option>
                <option v-for="r in roles" :key="r.idRol" :value="r.idRol">
                  {{ r.nombreRol }}
                </option>
              </select>
            </div>
            
            <div v-if="!editingUser" class="md:col-span-2">
              <label class="block text-sm font-medium text-muted-foreground mb-1.5">Contraseña *</label>
              <div class="relative">
                <input 
                  v-model="userForm.contrasenaUsuario" 
                  :type="showPassword ? 'text' : 'password'" 
                  required 
                  class="w-full bg-background border border-border rounded-lg px-4 py-2.5 pr-10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                  placeholder="••••••••"
                />
                <button 
                  type="button" 
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  :title="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                >
                  <span v-if="showPassword">👁️</span>
                  <span v-else>👁️‍🗨️</span>
                </button>
              </div>
              <p class="text-xs text-muted-foreground mt-1.5">Mínimo 8 caracteres, con mayúsculas, minúsculas y números</p>
            </div>
            
            <div v-else class="md:col-span-2">
              <label class="block text-sm font-medium text-muted-foreground mb-1.5">Nueva contraseña</label>
              <div class="relative">
                <input 
                  v-model="userForm.contrasenaUsuario" 
                  :type="showPassword ? 'text' : 'password'" 
                  class="w-full bg-background border border-border rounded-lg px-4 py-2.5 pr-10 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                  placeholder="Dejar en blanco para no cambiar"
                />
                <button 
                  type="button" 
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  :title="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                >
                  <span v-if="showPassword">👁️</span>
                  <span v-else>👁️‍🗨️</span>
                </button>
              </div>
              <p class="text-xs text-muted-foreground mt-1.5">Solo completa si deseas cambiar la contraseña</p>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 pt-6">
            <button 
              type="submit" 
              :disabled="loading" 
              class="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg py-2.5 px-4 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span v-if="loading" class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              {{ loading ? 'Guardando...' : (editingUser ? 'Actualizar Usuario' : 'Crear Usuario') }}
            </button>
            <button 
              type="button" 
              @click="showUserModal = false" 
              class="px-6 py-2.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>

    <Footer />
  </div>
</template>
