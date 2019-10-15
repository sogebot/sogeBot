workflow "New workflow" {
  on = "push"
  resolves = ["ESLint"]
}

action "ESLint" {
  uses = "stefanoeb/eslint-action@master"
  args = "index.js src/bot/**.ts"
}