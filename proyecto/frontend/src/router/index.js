import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import Login from '@/views/Login.vue'
import Register from '@/views/Register.vue'
import Profile from '@/views/Profile.vue'
import MyOrders from '@/views/MyOrders.vue'
import EmployeeDashboard from '@/views/EmployeeDashboard.vue'
import Carrito from '@/views/Carrito.vue'
import HardwareCatalog from '@/views/HardwareCatalog.vue'
import AboutView from '@/views/AboutView.vue'
import PcBuilder from '@/views/PcBuilder.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/login', name: 'login', component: Login },
  { path: '/register', name: 'register', component: Register },
  { path: '/profile', name: 'profile', component: Profile },
  { path: '/my-orders', name: 'my-orders', component: MyOrders },
  { path: '/dashboard', name: 'dashboard', component: EmployeeDashboard },
  { path: '/employee', redirect: '/dashboard' },
  { path: '/carrito', name: 'carrito', component: Carrito },
  { path: '/hardware', name: 'hardware', component: HardwareCatalog },
  { path: '/about', name: 'about', component: AboutView },
  { path: '/builder', name: 'builder', component: PcBuilder }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
