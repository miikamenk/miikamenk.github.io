import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

// Define the supported locales
const defaultLocale = 'en'
const supportedLocales = ['en', 'zh', 'fi']

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    // Routes with locale prefix
    {
      path: '/:locale',
      children: [
        {
          path: '',
          name: 'home',
          component: HomeView,
        },
        {
          path: 'projects',
          name: 'projects',
          component: () => import('../views/ProjectsView.vue'),
        },
        {
          path: 'contact',
          name: 'contact',
          component: () => import('../views/ContactView.vue'),
        },
        {
          path: 'about',
          name: 'about',
          component: () => import('../views/AboutView.vue'),
        },
        {
          path: 'projects/:slug',
          name: 'project-detail',
          component: () => import('../views/ProjectDetailView.vue'),
        },
      ],
    },
    // Fallback routes without locale (redirect to default locale)
    {
      path: '/',
      redirect: `/${defaultLocale}`,
    },
    {
      path: '/projects',
      redirect: `/${defaultLocale}/projects`,
    },
    {
      path: '/contact',
      redirect: `/${defaultLocale}/contact`,
    },
    {
      path: '/about',
      redirect: `/${defaultLocale}/about`,
    },
    // Catch all for invalid locales
    {
      path: '/:pathMatch(.*)*',
      redirect: (to) => {
        const firstSegment = to.path.split('/')[1]
        if (firstSegment && !supportedLocales.includes(firstSegment)) {
          return `/${defaultLocale}${to.path}`
        }
        return `/${defaultLocale}`
      },
    },
  ],
})

// Navigation guard to handle locale
router.beforeEach((to, from, next) => {
  const locale = to.params.locale as string

  // Check if locale is supported
  if (locale && supportedLocales.includes(locale)) {
    // Store locale preference
    localStorage.setItem('locale', locale)
    next()
  } else if (!locale) {
    // No locale in path, redirect to default locale
    next({ name: to.name || 'home', params: { locale: defaultLocale } })
  } else {
    // Invalid locale, redirect to default locale
    next({ name: to.name || 'home', params: { locale: defaultLocale } })
  }
})

export default router
