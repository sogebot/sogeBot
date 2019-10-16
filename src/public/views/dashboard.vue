<template lang="pug">
  b-container
    b-row
      b-col
        a(href='#/songrequests')
          b-card(:title="translate('song-requests')").text-center
      b-col
        a(href='#/playlist')
          b-card(:title="translate('menu.playlist')").text-center
      b-col
        a(href='#/quotes')
          b-card(:title="translate('menu.quotes')").text-center
</template>