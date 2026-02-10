<template>
  <div class="language-switcher">
    <select
      v-model="currentLocale"
      @change="changeLocale"
      class="lang-select"
      :title="$t('language.switch')"
      aria-label="Select language"
    >
      <option v-for="lang in languages" :key="lang.code" :value="lang.code" :data-flag="lang.flag">
        {{ lang.flag }}
      </option>
    </select>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'

const { locale } = useI18n()
const router = useRouter()
const route = useRoute()

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
]

const currentLocale = ref(locale.value)

const changeLocale = () => {
  const newLocale = currentLocale.value

  // Save preference
  localStorage.setItem('locale', newLocale)

  // Update i18n locale
  locale.value = newLocale

  // Get current route path without locale prefix
  const currentPath = route.path

  // Remove any existing locale prefix from the path
  let cleanPath = currentPath
  languages.forEach((lang) => {
    if (currentPath.startsWith(`/${lang.code}/`)) {
      cleanPath = currentPath.substring(`/${lang.code}`.length)
    } else if (currentPath === `/${lang.code}`) {
      cleanPath = '/'
    }
  })

  // Ensure cleanPath starts with /
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath
  }

  // Navigate to new path with locale
  const newPath = `/${newLocale}${cleanPath}`

  // Use router to navigate (better than manipulating window.location.hash)
  if (route.path !== newPath) {
    router.push(newPath)
  }

  // Update the select display to show only flag
  nextTick(() => {
    menuOpen.value = false
  })
}

// Initialize from localStorage or default
onMounted(() => {
  const savedLocale = localStorage.getItem('locale')
  if (savedLocale && languages.some((lang) => lang.code === savedLocale)) {
    currentLocale.value = savedLocale
    locale.value = savedLocale
  }
})
</script>

<style scoped>
.language-switcher {
  position: relative;
}

.lang-select {
  appearance: none;
  background: transparent;
  border: none;
  padding: 0.5rem 1.5rem 0.5rem 0.5rem;
  font-size: 1.2rem;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
  min-height: 44px;
  font-family: inherit;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23777777' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-position: right 0.25rem center;
  background-repeat: no-repeat;
  background-size: 1rem;
  width: auto;
  max-width: 2.5rem;
}

.lang-select {
  outline: none;
  max-width: 200px;
}

.lang-select option {
  font-size: 1rem;
  padding: 0.5rem;
}

/* Remove default arrow in IE */
.lang-select::-ms-expand {
  display: none;
}

/* Remove default arrow in Firefox */
.lang-select {
  -moz-appearance: none;
}

[data-theme='dark'] .lang-select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23CCCCCC' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
}

@media (max-width: 767px) {
  .lang-select {
    font-size: 1.1rem;
    padding: 0.5rem 1.25rem 0.5rem 0.5rem;
  }
}
</style>
