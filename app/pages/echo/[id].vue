<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string

onMounted(() => {
  navigateTo({ path: '/', query: { moment: id } })
})
</script>

<template>
  <div />
</template>
