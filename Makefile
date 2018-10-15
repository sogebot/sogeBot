PATH    := node_modules/.bin:$(PATH)
SHELL   := /bin/bash
VERSION := `node -pe "require('./package.json').version"`
ENV     ?= production

all : prepare dependencies shrinkwrap ui bot info
.PHONY : all

info:
	@echo -ne "\n\t ----- Build ENV: $(ENV)"
	@echo -ne "\n\t ----- Build commit\n\n"
	@git log --oneline -3 | cat

dependencies:
	@echo -ne "\n\t ----- Installation of production dependencies\n"
	@npm install --production
	@echo -ne "\n\t ----- Installation of development dependencies\n"
	@npm install --only=dev
	@echo -ne "\n\t ----- Installation of flow types\n"
	@npx flow-typed install --ignoreDeps dev bundle peer
	@npx flow-typed create-stub empty

shrinkwrap:
	@echo -ne "\n\t ----- Generating shrinkwrap\n"
	@npm shrinkwrap

ui:
	@echo -ne "\n\t ----- Generating CSS themes\n"
	@npx node-sass --output-style expanded --precision 6 scss/themes/light.scss public/dist/css/light.css
	@npx node-sass --output-style expanded --precision 6 scss/themes/dark.scss public/dist/css/dark.css
	@echo -ne "\n\t ----- Bundling with webpack\n"
	@NODE_ENV=$(ENV) npx webpack
	@echo -ne "\n\t ----- Copying dist files\n"
	@node tools/copy-dist-files.js

bot:
	@echo -ne "\n\t ----- Building bot\n"
	@npx babel src/bot/ -d dest/

pack:
	@echo -ne "\n\t ----- Packing into sogeBot-$(VERSION).zip\n"
	@npx bestzip sogeBot-$(VERSION).zip .npmrc npm-shrinkwrap.json config.example.json dest/ locales/ public/ LICENSE package.json docs/ AUTHORS tools/ bin/ bat/ dist/

prepare:
	@echo -ne "\n\t ----- Cleaning up node_modules and shrinkwrap\n"
	@rm -rf node_modules
	@rm -rf npm-shrinkwrap.json

clean:
	@echo -ne "\n\t ----- Cleaning up compiled files\n"
	@rm -rf public/dist/bootstrap* public/dist/carousel/* public/dist/gallery/* public/dist/jquery public/dist/lodash public/dist/velocity-animate public/dist/popper.js public/dist/flv.js public/dist/css/dark.css public/dist/css/light.css
	@rm -rf dest