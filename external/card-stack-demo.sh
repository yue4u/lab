#!/bin/bash

git clone https://github.com/rainy-me/card-stack-demo.git
cd ./card-stack-demo

yarn
yarn build

cd ..
[ ! -d "./dist/card-stack-demo" ] && mkdir ./dist/card-stack-demo
rm -rf ./dist/card-stack-demo/*
cp -r ./card-stack-demo/build/* ./dist/card-stack-demo