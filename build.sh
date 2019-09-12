#!/bin/bash

rm -rf ./dist/*

build(){
    if [ $1 = "home" ]; then
        parcel build "./$1/index.html" --out-dir dist
    else
        if [ -f "./$1/package.json" ]; then
            cd $1
            yarn
            cd ..
        fi
        parcel build "./$1/index.html" --out-dir "dist/$1" --public-url "/$1"
    fi
}

projectArray=(
    "home"
    "v-dom"
    "react-router-demo"
)

for project in ${projectArray[*]}; do
     build $project
done

cp _redirects dist