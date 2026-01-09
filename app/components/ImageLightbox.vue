<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  images: string[]
  startIndex: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'update:startIndex', value: number): void
}>()

const activeIndex = ref(0)

watch(
  () => props.startIndex,
  (value) => {
    activeIndex.value = value
  },
  { immediate: true },
)

watch(activeIndex, (value) => {
  emit('update:startIndex', value)
})

const close = () => emit('update:modelValue', false)

const prev = () => {
  if (!props.images.length) return
  activeIndex.value = (activeIndex.value - 1 + props.images.length) % props.images.length
}

const next = () => {
  if (!props.images.length) return
  activeIndex.value = (activeIndex.value + 1) % props.images.length
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    fullscreen
    scrim
    @update:model-value="(value) => emit('update:modelValue', value)"
  >
    <div class="relative flex h-full w-full flex-col justify-center gap-5 bg-transparent px-4 py-6">
      <v-btn icon variant="text" class="absolute right-3 top-3" @click="close">
        <v-icon icon="mdi-close" />
      </v-btn>

      <div class="relative flex w-full items-center justify-center">
        <v-btn icon variant="text" class="absolute left-1 top-1/2 -translate-y-1/2" @click="prev">
          <v-icon icon="mdi-chevron-left" />
        </v-btn>

        <v-window v-model="activeIndex" class="w-[min(960px,92vw)]">
          <v-window-item v-for="(image, idx) in images" :key="image" :value="idx">
            <div class="flex items-center justify-center">
              <v-img :src="image" max-height="70vh" contain class="rounded-lg" />
            </div>
          </v-window-item>
        </v-window>

        <v-btn icon variant="text" class="absolute right-1 top-1/2 -translate-y-1/2" @click="next">
          <v-icon icon="mdi-chevron-right" />
        </v-btn>
      </div>

      <div class="flex flex-wrap justify-center gap-2">
        <div
          v-for="(image, idx) in images"
          :key="image"
          class="h-14 w-14 cursor-pointer overflow-hidden rounded-md border border-[rgba(var(--v-theme-on-surface),0.12)] bg-[rgba(var(--v-theme-surface),0.6)]"
          :class="{ 'border-[rgb(var(--v-theme-primary))]': idx === activeIndex }"
          @click="activeIndex = idx"
        >
          <v-img :src="image" aspect-ratio="1" cover />
        </div>
      </div>
    </div>
  </v-dialog>
</template>
