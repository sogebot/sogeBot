PATH    := node_modules/.bin:$(PATH)
SHELL   := /bin/bash
VERSION := `node -pe "require('./package.json').version"`
ENV     ?= production

all : clean prepare yarn dependencies shrinkwrap ui bot info
.PHONY : all

# detect what shell is used
ifeq ($(findstring cmd.exe,$(SHELL)),cmd.exe)
DEVNUL := NUL
WHICH := where
else
DEVNUL := /dev/null
WHICH := which
endif

info:
	@echo -ne "\n\t ----- Build ENV: $(ENV)"
	@echo -ne "\n\t ----- Build commit\n\n"
	@git log --oneline -3 | cat

yarn:
	@echo -ne "\n\t ----- Checking yarn installation"
ifeq ($(shell ${WHICH} yarn 2>${DEVNUL}),)
	@echo -ne "\n\t ----- Installing yarn"
	@npm install --global yarn
else
	@echo -ne "\n\t ----- OK \n"
endif

shrinkwrap:
	@echo -ne "\n\t ----- Generating shrinkwrap\n"
	@npm shrinkwrap

dependencies:
	@echo -ne "\n\t ----- Using yarn for dependencies install\n"
	@yarn install --ignore-engines

eslint:
	@echo -ne "\n\t ----- Checking eslint\n"
	@npx eslint --ext .ts src --quiet

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
	@npx babel src/bot/ -d dest/ --extensions ".ts,.tsx"

release:
	ENV version=${VERSION} node tools/release.js

pack:
	@echo -ne "\n\t ----- Packing into sogeBot-$(VERSION).zip\n"
	@npx bestzip sogeBot-$(VERSION).zip .npmrc npm-shrinkwrap.json config.example.json dest/ locales/ public/ LICENSE package.json docs/ AUTHORS tools/ bin/ bat/ dist/ fonts.json

prepare:
	@echo -ne "\n\t ----- Cleaning up node_modules\n"
	@rm -rf node_modules

clean:
	@echo -ne "\n\t ----- Cleaning up compiled files\n"
	@rm -rf public/dist/bootstrap* public/dist/carousel/* public/dist/gallery/* public/dist/jquery public/dist/lodash public/dist/velocity-animate public/dist/popper.js public/dist/flv.js public/dist/css/dark.css public/dist/css/light.css
	@rm -rf dest