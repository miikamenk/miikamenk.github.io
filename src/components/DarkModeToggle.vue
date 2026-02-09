<template>
  <button
    @click="toggleTheme"
    class="theme-toggle"
    :class="{ 'dark-mode': isDark }"
    :title="$t('theme.toggle')"
    aria-label="Toggle dark mode"
  >
    <div class="toggle-track">
      <div class="toggle-thumb">
        <span class="icon">{{ isDark ? '☀️' : '🌙' }}</span>
      </div>
    </div>
    <span class="sr-only">{{ $t('theme.toggle') }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useI18n } from 'vue-i18n'

const { toggleTheme, isDark } = useTheme()
const { t } = useI18n()
</script>

<style scoped>
.theme-toggle {
  position: relative;
  width: 60px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.toggle-track {
  position: absolute;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  transition: all 0.3s ease;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.theme-toggle.dark-mode .toggle-track {
  background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.toggle-thumb {
  position: absolute;
  top: 5px;
  left: 2px;
  width: 34px;
  height: 34px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.theme-toggle.dark-mode .toggle-thumb {
  left: 24px;
  background: #2d3748;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.icon {
  font-size: 12px;
  line-height: 1;
  transition: all 0.3s ease;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.theme-toggle.dark-mode .icon {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.theme-toggle:hover .toggle-track {
  transform: scale(1.05);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15);
}

.theme-toggle.dark-mode:hover .toggle-track {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4);
}

.theme-toggle:active .toggle-thumb {
  transform: scale(0.95);
}

.theme-toggle:focus-visible {
  outline: 2px solid var(--color-border-hover);
  outline-offset: 2px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (min-width: 768px) {
  .theme-toggle {
    width: 68px;
    height: 36px;
  }

  .toggle-thumb {
    width: 36px;
    height: 36px;
    top: 4px;
    left: 2px;
  }

  .theme-toggle.dark-mode .toggle-thumb {
    left: 30px;
  }

  .icon {
    font-size: 14px;
  }
}
</style>
