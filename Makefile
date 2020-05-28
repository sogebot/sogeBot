PATH         := node_modules/.bin:$(PATH)
SHELL        := /bin/bash
VERSION      := `node -pe "require('./package.json').version"`
ENV          ?= production

all : info clean dependencies patch css ui bot
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

patch:
	@echo -ne "\n\t ----- Going through node_modules patches\n"
	# How to create node_modules patch: https://opensource.christmas/2019/4
	patch --forward node_modules/twitch-js/types/index.d.ts < patches/twitch-js-types.patch
	patch --forward node_modules/twitch-js/types/index.d.ts < patches/twitch-js-types-2.patch
	patch --forward node_modules/twitch-js/types/index.d.ts < patches/twitch-js-add-highlight-msgId.patch

eslint:
	@echo -ne "\n\t ----- Checking eslint\n"
	npx eslint --ext .ts src --quiet

jsonlint:
	@echo -ne "\n\t ----- Checking jsonlint\n"
	for a in $$(find ./locales -type f -iname "*.json" -print); do /bin/false; jsonlint $$a -q; done

css:
	@echo -ne "\n\t ----- Generating CSS themes\n"
	@npx node-sass --output-style expanded --precision 6 scss/themes/light.scss public/dist/css/light.css
	@npx node-sass --output-style expanded --precision 6 scss/themes/dark.scss public/dist/css/dark.css
	@npx postcss public/dist/css/*.css --use autoprefixer -d public/dist/css/

ui:
	@echo -ne "\n\t ----- Bundling with webpack ($(ENV))\n"
	@NODE_ENV=$(ENV) npx webpack --progress

bot:
	@echo -ne "\n\t ----- Building bot\n"
	@npx tsc -p src/bot

pack:
	@echo -ne "\n\t ----- Packing into sogeBot-$(VERSION).zip\n"
	@cp ./src/bot/data/.env* ./
	@cp ./src/bot/data/.env.sqlite ./.env
	@npx bestzip sogeBot-$(VERSION).zip .npmrc .env* package-lock.json dest/ locales/ public/ LICENSE package.json docs/ AUTHORS tools/ bin/ bat/ fonts.json

prepare:
	@echo -ne "\n\t ----- Cleaning up node_modules\n"
	@rm -rf node_modules

clean:
	@echo -ne "\n\t ----- Cleaning up compiled files\n"
	@rm -rf public/dist/bootstrap* public/dist/carousel/* public/dist/gallery/* public/dist/jquery public/dist/lodash public/dist/velocity-animate public/dist/popper.js public/dist/flv.js public/dist/css/dark.css public/dist/css/light.css
	@rm -rf dest