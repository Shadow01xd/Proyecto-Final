<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

const handleSubmit = async () => {
  error.value = ''
  success.value = ''
  loading.value = true

  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        emailUsuario: email.value,
        passwordHash: password.value
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al iniciar sesión')
    }

    // Guardar información del usuario en localStorage
    localStorage.setItem('usuario', JSON.stringify(data.usuario))

    success.value = '¡Inicio de sesión exitoso!'

    // Redirigir según el rol del usuario
    setTimeout(() => {
      const rolesAdmin = ['EMPLEADO', 'ADMIN', 'Empleado', 'Administrador', 'Admin']
      if (rolesAdmin.includes(data.usuario.nombreRol)) {
        router.push('/employee')
      } else {
        router.push('/')
      }
    }, 1000)

  } catch (err) {
    error.value = err.message || 'Error al iniciar sesión. Por favor, intenta de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
    <div class="w-full max-w-md bg-card border border-border rounded-xl shadow-lg p-8 space-y-6">
      <h1 class="text-2xl font-bold text-center">Iniciar sesión</h1>
      <p class="text-sm text-muted-foreground text-center">Accede a tu cuenta para continuar</p>

      <!-- Mensajes de error y éxito -->
      <div v-if="error" class="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-md text-sm">
        {{ error }}
      </div>
      <div v-if="success" class="bg-green-500/10 border border-green-500 text-green-500 px-4 py-2 rounded-md text-sm">
        {{ success }}
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="space-y-1">
          <label class="block text-sm font-medium">Correo electrónico</label>
          <input
            v-model="email"
            type="email"
            required
            :disabled="loading"
            class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
        </div>

        <div class="space-y-1">
          <label class="block text-sm font-medium">Contraseña</label>
          <input
            v-model="password"
            type="password"
            required
            :disabled="loading"
            class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-md bg-primary text-primary-foreground font-semibold py-2 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? 'Iniciando sesión...' : 'Entrar' }}
        </button>
      </form>

      <p class="text-xs text-center text-muted-foreground">
        ¿No tienes cuenta?
        <RouterLink to="/register" class="text-primary hover:underline">Regístrate</RouterLink>
      </p>
    </div>
  </div>
</template>
