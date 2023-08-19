#!/bin/sh

PACKAGE_VERSION=$(node -p "require('./package.json').version")
PACKAGE_NAME=$(node -p "require('./package.json').name.replace('@','')")

docker build . -t "ghcr.io/$PACKAGE_NAME:v$PACKAGE_VERSION" -t "$PACKAGE_NAME:v$PACKAGE_VERSION" -t "$PACKAGE_NAME:latest"