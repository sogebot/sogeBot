PATH    := node_modules/.bin:$(PATH)
SHELL   := /bin/bash
VERSION := `node -pe "require('./package.json').version"`
ENV     := production

all : prepare dependencies shrinkwrap ui commit
.PHONY : all

commit:
	@echo -ne "\n\t ----- Build commit\n\n"
	@git log --oneline -3 | cat

dependencies:
	@echo -ne "\n\t ----- Installation of production dependencies\n"
	@npm install --production
	@echo -ne "\n\t ----- Installation of development dependencies\n"
	@npm install --only=dev

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

pack:
	@echo -ne "\n\t ----- Packing into sogeBot-$(VERSION).zip\n"
	@npx cross-var bestzip sogeBot-$(VERSION).zip npm-shrinkwrap.json config.example.json src/bot locales/ main.js cluster.js public/ LICENSE package.json docs/ AUTHORS tools/ bin/ bat/ scss/ dist/

prepare:
	@echo -ne "\n\t ----- Cleaning up installation\n"
	@rm -rf node_modules
	@rm -rf npm-shrinkwrap.json

clean:
	@rm -rf public/dist/bootstrap* public/dist/carousel/* public/dist/gallery/* public/dist/jquery public/dist/lodash public/dist/velocity-animate public/dist/popper.js public/dist/flv.js public/dist/css/dark.css public/dist/css/light.css