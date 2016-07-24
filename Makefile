PATH := node_modules/.bin:$(PATH)
SHELL := /bin/bash

.FORCE:

all: .FORCE
	babel src -d lib

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
