import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
    meta: { title: 'Home' },
  },
  {
    path: '/tienda',
    name: 'Tienda',
    component: () => import('../views/TiendaView.vue'),
    meta: { title: 'Tienda' },
  },
  {
    path: '/pago/confirmado',
    name: 'PagoConfirmado',
    component: () => import('../views/PagoConfirmadoView.vue'),
    meta: { title: 'Pago Confirmado' },
  },
  {
    path: '/pay-response',
    name: 'PayResponse',
    component: () => import('../views/PagoConfirmadoView.vue'),
    meta: { title: 'Confirmando pago...' },
  },
  {
    path: '/pedido/:token',
    name: 'TrackOrder',
    component: () => import('../views/TrackOrderView.vue'),
    meta: { title: 'Estado de tu pedido' },
  },
  {
    path: '/admin',
    name: 'AdminLogin',
    component: () => import('../views/AdminLoginView.vue'),
    meta: { title: 'Admin · Iniciar sesión' },
  },
  {
    path: '/admin/dashboard',
    name: 'AdminDashboard',
    component: () => import('../views/AdminOrdenesView.vue'),
    meta: { title: 'Admin · Órdenes', requiresAdmin: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { left: 0, top: 0, behavior: 'smooth' }
  },
})

router.beforeEach((to, _from, next) => {
  const hasToken = !!localStorage.getItem('access_token')
  const hasAdminToken = !!localStorage.getItem('admin_token')
  const requiresAuth = to.matched.some((record) => record.meta?.requiresAuth)
  const requiresAdmin = to.matched.some((record) => record.meta?.requiresAdmin)

  if (requiresAuth && !hasToken) {
    return next({ path: '/login', replace: true })
  }

  if (requiresAdmin && !hasAdminToken) {
    return next({ path: '/admin', replace: true })
  }

  if (to.path === '/login' && hasToken) {
    return next({ path: '/', replace: true })
  }

  if (to.path === '/admin' && hasAdminToken) {
    return next({ path: '/admin/dashboard', replace: true })
  }

  next()
})

export default router
