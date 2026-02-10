<script setup>
import { reactive, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { db } from '@/firebase'
import { ref as dbRef, push, serverTimestamp } from 'firebase/database'

const { t } = useI18n()

// --- Form state ---
const form = reactive({ name: '', email: '', message: '', website: '' })
const loading = ref(false)
const status = ref(null) // { type: 'success'|'error', message: string }
const blurred = reactive({ name: false, email: false, message: false })

const emailRe = /^(?!.{255,})([\w.!#$%&'*+/=?`{|}~-]+)@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/

const errors = computed(() => ({
  name: !form.name ? t('contact.errors.nameRequired') : '',
  email: !form.email
    ? t('contact.errors.emailRequired')
    : !emailRe.test(form.email)
      ? t('contact.errors.emailInvalid')
      : '',
  message: !form.message ? t('contact.errors.messageRequired') : '',
}))

function handleBlur(field) {
  blurred[field] = true
}

function resetForm() {
  form.name = ''
  form.email = ''
  form.message = ''
  form.website = ''
  blurred.name = false
  blurred.email = false
  blurred.message = false
}

async function onSubmit() {
  blurred.name = true
  blurred.email = true
  blurred.message = true
  status.value = null
  if (errors.value.name || errors.value.email || errors.value.message) {
    status.value = { type: 'error', message: t('contact.errors.fixErrors') }
    return
  }
  // spam honeypot
  if (form.website) {
    status.value = { type: 'success', message: t('contact.success') }
    resetForm()
    return
  }

  loading.value = true
  try {
    await push(dbRef(db, 'contacts/messages'), {
      name: form.name.slice(0, 200),
      email: form.email.slice(0, 320),
      message: form.message.slice(0, 5000),
      createdAt: serverTimestamp(),
      ua: navigator.userAgent,
    })

    status.value = { type: 'success', message: t('contact.success') }
  } catch (err) {
    console.error(err)
    status.value = { type: 'error', message: t('contact.error') }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="contact">
    <form class="form" @submit.prevent="onSubmit" novalidate>
      <div class="grid-fields">
        <div class="field">
          <label for="name">{{ t('contact.name') }}</label>
          <input
            id="name"
            v-model.trim="form.name"
            type="text"
            required
            autocomplete="name"
            :class="{ error: errors.name && blurred.name }"
            @blur="handleBlur('name')"
          />
          <small v-if="errors.name && blurred.name">{{ errors.name }}</small>
        </div>

        <div class="field">
          <label for="email">{{ t('contact.email') }}</label>
          <input
            id="email"
            v-model.trim="form.email"
            type="email"
            required
            autocomplete="email"
            :class="{ error: errors.email && blurred.email }"
            @blur="handleBlur('email')"
          />
          <small v-if="errors.email && blurred.email">{{ errors.email }}</small>
        </div>
      </div>

      <div class="field">
        <label for="message">{{ t('contact.message') }}</label>
        <textarea
          id="message"
          v-model.trim="form.message"
          rows="6"
          required
          :class="{ error: errors.message && blurred.message }"
          @blur="handleBlur('message')"
        ></textarea>
        <small v-if="errors.message && blurred.message">{{ errors.message }}</small>
      </div>
      <input
        v-model="form.website"
        type="text"
        name="website"
        tabindex="-1"
        autocomplete="off"
        class="hp"
        aria-hidden="true"
      />

      <button type="submit" :disabled="loading">
        {{ loading ? t('contact.sending') : t('contact.send') }}
      </button>

      <p v-if="status" :class="['status', status.type]">{{ status.message }}</p>
    </form>
  </section>
</template>

<style scoped>
.contact {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.form {
  display: grid;
  gap: 1.5rem;
  background: var(--color-background-soft, #0b0b0b);
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border);
}

.grid-fields {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .contact {
    padding: 3rem 1.5rem;
  }

  .form {
    padding: 2rem;
  }

  .grid-fields {
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

label {
  font-weight: 600;
  color: var(--color-text, #e5e7eb);
  font-size: 0.95rem;
  margin-bottom: 0.1rem;
}

input,
textarea {
  width: 100%;
  padding: 1rem;
  border: 1px solid var(--color-border, #334155);
  border-radius: 0.5rem;
  background: var(--color-background-soft, #0b0b0b);
  color: var(--color-text, #e5e7eb);
  transition: border-color 0.2s;
  font-size: 16px; /* Prevents zoom on iOS */
  min-height: 44px;
  resize: vertical;
  max-width: 100%;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px var(--accent-light);
}

input.error,
textarea.error {
  border-color: #ef4444 !important;
}

small {
  color: #ef4444;
  font-size: 0.85rem;
}

.status {
  padding: 0.8rem 1rem;
  border-radius: 0.5rem;
  margin-top: 0.5rem;
  font-weight: 600;
}
.status.success {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid #10b981;
}
.status.error {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  animation: slideIn 0.3s var(--ease-smooth);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

button {
  padding: 1rem 1.5rem;
  border-radius: 0.5rem;
  border: none;
  background: var(--accent-color);
  color: white;
  cursor: pointer;
  font-weight: 700;
  font-size: 1rem;
  transition: all 0.3s var(--ease-smooth);
  justify-self: start;
  min-height: 48px;
  min-width: 120px;
  box-shadow: var(--shadow-sm);
}

button:hover:not([disabled]) {
  background: var(--accent-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

button:active:not([disabled]) {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

button[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--color-text);
  color: var(--color-background);
  transform: none;
  box-shadow: none;
}

.hp {
  position: absolute;
  left: -9999px;
  opacity: 0;
}
</style>
