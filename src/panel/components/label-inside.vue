<template>
  <div>
    <label class="inside">
      <span>
        <slot></slot>
      </span>
    </label>
  </div>
</template>

<style scoped>
div {
  padding-top: 10px;
}
label.inside {
  position:absolute;
  background-color: inherit;
  height: 5px;
  z-index: 9;
  transform: translate(5px, -4px);
  padding: 0 5px;
  -moz-user-select: none;
  -webkit-user-select: none;
  user-select: none;
}
label.inside span {
  position: relative;
  background-color: transparent;
  top: -11px;
}
</style>