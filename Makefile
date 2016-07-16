PATH := node_modules/.bin:$(PATH)
SHELL := /bin/bash

.FORCE:

all: .FORCE
	babel src -d lib

test: .FORCE
	mocha test/unit

integration: .FORCE
	docker-compose up -d
	mocha test/integration
	docker-compose down

lint: .FORCE
	eslint src
	eslint test

publish:
	echo -e "${NPM_USERNAME}\n${NPM_PASSWORD}\n${NPM_EMAIL}" | npm login
	npm publish
	npm logout
