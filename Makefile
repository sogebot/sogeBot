PATH    := node_modules/.bin:$(PATH)
SHELL   := /bin/bash
VERSION := `node -pe "require('./package.json').version"`
ENV     ?= production

all : clean dependencies css js jsdist bot info
.PHONY : all

docker:
	docker build -t sogebot:${VERSION} .

info:
	@echo -ne "\n\t ----- Build ENV: $(ENV)"
	@echo -ne "\n\t ----- Build commit\n\n"
	@git log --oneline -3 | cat

dependencies:
	@echo -ne "\n\t ----- Installation of dependencies\n"
	@npm ci

eslint:
	@echo -ne "\n\t ----- Checking eslint\n"
	@npx eslint --ext .ts src --quiet

css:
	@echo -ne "\n\t ----- Generating CSS themes\n"
	@npx node-sass --output-style expanded --precision 6 scss/themes/light.scss public/dist/css/light.css
	@npx node-sass --output-style expanded --precision 6 scss/themes/dark.scss public/dist/css/dark.css

js:
	@echo -ne "\n\t ----- Bundling with webpack\n"
	@NODE_ENV=$(ENV) npx webpack

jsdist:
	@echo -ne "\n\t ----- Copying dist files\n"
	@node tools/copy-dist-files.js

bot:
	@echo -ne "\n\t ----- Building bot\n"
	@npx babel src/bot/ -d dest/ --extensions ".js,.ts,.tsx"

release:
	ENV version=${VERSION} node tools/release.js

pack:
	@echo -ne "\n\t ----- Packing into sogeBot-$(VERSION).zip\n"
	@npx bestzip sogeBot-$(VERSION).zip .npmrc npm-shrinkwrap.json config.example.json dest/ locales/ public/ LICENSE package.json docs/ AUTHORS tools/ bin/ bat/ dist/ fonts.json

clean:
	@echo -ne "\n\t ----- Cleaning up compiled files\n"
	@rm -rf public/dist/bootstrap* public/dist/carousel/* public/dist/gallery/* public/dist/jquery public/dist/lodash public/dist/velocity-animate public/dist/popper.js public/dist/flv.js public/dist/css/dark.css public/dist/css/light.css
	@rm -rf dest