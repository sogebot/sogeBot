PATH         := node_modules/.bin:$(PATH)
SHELL        := /bin/bash
VERSION      := `node -pe "require('./package.json').version"`
ENV          ?= production

all : info clean dependencies bot
.PHONY : all

info:
	@echo -ne "\n\t ----- Build ENV: $(ENV)"
	@echo -ne "\n\t ----- Build commit\n\n"
	@git log --oneline -3 | cat

dependencies:
	@echo -ne "\n\t ----- Cleaning up dependencies\n"
	@rm -rf node_modules
	@echo -ne "\n\t ----- Installation of dependencies\n"
ifeq ($(ENV),production)
	npm ci --also=dev
else
	npm cache clean --force
	rm package-lock.json || true
	npm install --also=dev
	sed -i 's/git+ssh/git+https/g' package-lock.json
endif
	@echo -ne "\n\t ----- Installation of simple-git-hooks\n"
	git config core.hooksPath .git/hooks/
	npx simple-git-hooks
	@echo -ne "\n\t ----- Going through node_modules patches\n"
	# How to create node_modules patch: https://opensource.christmas/2019/4
	patch --forward node_modules/twitch-js/types/index.d.ts < patches/twitch-js-types-2.patch
	patch --forward node_modules/twitch-js/types/index.d.ts < patches/twitch-js-add-highlight-msgId.patch
	patch --forward node_modules/obs-websocket-js/types/index.d.ts < patches/obswebsocketTypeExpose.patch

eslint:
	@echo -ne "\n\t ----- Checking eslint\n"
	npx eslint --ext .ts src --quiet

jsonlint:
	@echo -ne "\n\t ----- Checking jsonlint\n"
	for a in $$(find ./locales -type f -iname "*.json" -print); do /bin/false; jsonlint $$a -q; done

bot:
	@rm -rf dest
	@echo -ne "\n\t ----- Generating swagger.json \n"
	@npx tsoa spec
	@echo -ne "\n\t ----- Generating swagger routes \n"
	@npx tsoa routes
ifeq ($(ENV),production)
	@echo -ne "\n\t ----- Building bot (strip comments)\n"
	@npx tsc --removeComments true
else
	@echo -ne "\n\t ----- Building bot\n"
	@npx tsc --removeComments false
endif

pack:
	@echo -ne "\n\t ----- Packing into sogeBot-$(VERSION).zip\n"
	@cp ./src/data/.env* ./
	@cp ./src/data/.env.sqlite ./.env
	@npx bestzip sogeBot-$(VERSION).zip .npmrc .env* package-lock.json patches/ dest/ locales/ LICENSE package.json docs/ AUTHORS tools/ bin/ bat/ fonts.json assets/ favicon.ico

prepare:
	@echo -ne "\n\t ----- Cleaning up node_modules\n"
	@rm -rf node_modules

clean:
	@echo -ne "\n\t ----- Cleaning up compiled files\n"
	@rm -rf public/dist/bootstrap* public/dist/carousel/* public/dist/gallery/* public/dist/jquery public/dist/lodash public/dist/velocity-animate public/dist/popper.js public/dist/flv.js
	@rm -rf dest