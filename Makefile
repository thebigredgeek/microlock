PATH := node_modules/.bin:$(PATH)
SHELL := /bin/bash
NODE ?= $(shell which node)
YARN ?= $(shell which yarn)
PKG ?= $(if $(YARN),$(YARN),$(NODE) $(shell which npm))
.FORCE:

all: .FORCE
	babel src -d lib

install: .FORCE
	$(PKG) install

unit: .FORCE
	mocha test/unit

integration: .FORCE
	PREFIX=$(etcd_command_prefix) VERSION=$(etcd_image_version) docker-compose up -d
	mocha test/integration
	PREFIX=$(etcd_command_prefix) VERSION=$(etcd_image_version) docker-compose stop || echo 'failed to bring down containers'
	PREFIX=$(etcd_command_prefix) VERSION=$(etcd_image_version) docker-compose rm -f || echo 'failed to remove containers'

lint: .FORCE
	eslint src
	eslint test

publish:
	echo -e "${NPM_USERNAME}\n${NPM_PASSWORD}\n${NPM_EMAIL}" | npm login
	npm publish
	npm logout

clean: lib
	rimraf lib
