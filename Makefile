PATH  := node_modules/.bin:$(PATH)
SHELL := /bin/bash

all : clean dependencies shrinkwrap ui
.PHONY : all

dependencies:
	@echo "Installation of development dependencies"
	npm install -d --dev

shrinkwrap:
	@echo "Generating shrinkwrap"
	npm shrinkwrap

ui:
	@echo "Generating CSS themes"
	npx node-sass --output-style expanded --precision 6 scss/themes/light.scss public/dist/css/light.css
	npx node-sass --output-style expanded --precision 6 scss/themes/dark.scss public/dist/css/dark.css
	@echo "Bundling with webpack"
	npx webpack
	@echo "Copying dist files"
	node tools/copy-dist-files.js

clean:
	@echo "Cleaning up installation"
	rm -rf node_modules
	rm -rf npm-shrinkwrap.json
	rm -rf public/dist/bootstrap* public/dist/carousel/* public/dist/gallery/* public/dist/jquery public/dist/lodash public/dist/velocity-animate public/dist/popper.js public/dist/flv.js public/dist/css/dark.css public/dist/css/light.css