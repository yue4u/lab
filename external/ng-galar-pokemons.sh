#!/bin/bash

git clone https://github.com/rainy-me/ng-galar-pokemons.git
cd ./ng-galar-pokemons

yarn
yarn global add @angular/cli
ng build --prod --deploy-url /ng-galar-pokemons/

cd ..
[ ! -d "./dist/ng-galar-pokemons" ] && mkdir ./dist/ng-galar-pokemons
rm -rf ./dist/ng-galar-pokemons/*
cp -r ./ng-galar-pokemons/dist/ng-galar-pokemons/* ./dist/ng-galar-pokemons