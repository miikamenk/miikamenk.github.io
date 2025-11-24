<script setup>
import { reactive, ref, computed } from 'vue'
import { db } from '@/firebase'
import { ref as dbRef, push, serverTimestamp } from 'firebase/database'

// --- Form state ---
const form = reactive({ name: '', email: '', message: '', website: '' })
const loading = ref(false)
const status = ref(null) // { type: 'success'|'error', message: string }
const blurred = reactive({ name: false, email: false, message: false })

const emailRe = /^(?!.{255,})([\w.!#$%&'*+/=?`{|}~-]+)@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/

const errors = computed(() => ({
  name: !form.name ? 'Please enter your name' : '',
  email: !form.email
    ? 'Please enter your email'
    : !emailRe.test(form.email)
      ? 'Enter a valid email'
      : '',
  message: !form.message ? 'Please enter a message' : '',
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
    status.value = { type: 'error', message: 'Please fix the errors above.' }
    return
  }
  // spam honeypot
  if (form.website) {
    status.value = { type: 'success', message: 'Thanks!' }
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

    status.value = { type: 'success', message: 'Thanks! Your message was sent.' }
    resetForm()
  } catch (err) {
    console.error(err)
    status.value = { type: 'error', message: 'Something went wrong. Please try again.' }
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
          <label for="name">Name</label>
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
          <label for="email">Email</label>
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
        <label for="message">Message</label>
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

      <button type="submit" :disabled="loading">{{ loading ? 'Sending…' : 'Send' }}</button>

      <p v-if="status" :class="['status', status.type]">{{ status.message }}</p>
    </form>
  </section>
</template>

<style scoped>
.contact {
  max-width: 720px;
  margin: 0 auto;
  padding: 3rem 1.5rem;
}

.form {
  display: grid;
  gap: 1.5rem;
  background: var(--color-background-soft, #0b0b0b);
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.grid-fields {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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
  padding: 0.8rem 1rem;
  border: 1px solid var(--color-border, #334155);
  border-radius: 0.5rem;
  background: var(--color-background-soft, #0b0b0b);
  color: var(--color-text, #e5e7eb);
  transition: border-color 0.2s;
  font-size: 1rem;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: #55b4ff;
  box-shadow: 0 0 0 2px rgba(85, 180, 255, 0.2);
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
}

button {
  padding: 0.8rem 1.5rem;
  border-radius: 0.5rem;
  border: none;
  background: #007bff;
  color: white;
  cursor: pointer;
  font-weight: 700;
  font-size: 1rem;
  transition:
    background-color 0.2s,
    opacity 0.2s;
  justify-self: start;
}

button:hover:not([disabled]) {
  background: #0056b3;
}

button[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
  background: #1f2937;
  color: #e5e7eb;
}

.hp {
  position: absolute;
  left: -9999px;
  opacity: 0;
}
</style>
