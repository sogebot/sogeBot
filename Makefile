PATH             := node_modules/.bin:$(PATH)
SHELL            := /bin/bash
VERSION          := `node -pe "require('./package.json').version"`
ENV              ?= production
NODE_MODULES_DIR ?= ../node_modules


all : info clean dependencies bot
.PHONY : all

info:
	@echo -ne "\n\t ----- Build ENV: $(ENV)"
	@echo -ne "\n\t ----- Build commit\n\n"
	@git log --oneline -3 | cat

dependencies:
	@echo -ne "\n\t ----- Cleaning up dependencies\n"
	@rm -rf node_modules
	@rm -rf ${NODE_MODULES_DIR}
	@echo -ne "\n\t ----- Installation of dependencies\n"
ifeq ($(ENV),production)
	npm ci --include=dev
else
	npm cache clean --force
	npm install --include=dev
endif
	@echo -ne "\n\t ----- Installation of husky\n"
	npx --yes husky install

eslint:
	@echo -ne "\n\t ----- Checking eslint\n"
	npx eslint --ext .ts src --quiet

jsonlint:
	@echo -ne "\n\t ----- Checking jsonlint\n"
	for a in $$(find ./locales -type f -iname "*.json" -print); do /bin/false; jsonlint $$a -q; done

bot:
	@rm -rf dest
ifeq ($(ENV),production)
	@echo -ne "\n\t ----- Building bot (strip comments)\n"
	@npx tsc --removeComments true
else
	@echo -ne "\n\t ----- Building bot\n"
	@npx tsc --removeComments false
endif
	@npx tsc-alias

pack:
	@echo -ne "\n\t ----- Packing into sogeBot-$(VERSION).zip\n"
	@cp ./src/data/.env* ./
	@cp ./src/data/.env.sqlite ./.env
	@npx --yes bestzip sogeBot-$(VERSION).zip .npmrc .env* package-lock.json patches/ dest/ locales/ LICENSE package.json docs/ AUTHORS tools/ bin/ bat/ fonts.json assets/ favicon.ico

prepare:
	@echo -ne "\n\t ----- Cleaning up node_modules\n"
	@rm -rf node_modules

clean:
	@echo -ne "\n\t ----- Cleaning up compiled files\n"
	@rm -rf public/dist/bootstrap* public/dist/carousel/* public/dist/gallery/* public/dist/jquery public/dist/lodash public/dist/velocity-animate public/dist/popper.js public/dist/flv.js
	@rm -rf dest