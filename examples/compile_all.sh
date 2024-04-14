#!/bin/bash

if [ ! -f "compile_all.sh" ]; then
    echo "Please run this script from the examples directory"
    exit 1
fi

if ! command -v ifc -h &> /dev/null; then
    echo "ifc is not installed"
    exit 1
fi

for dir in */; do
    dir=${dir%*/}
    echo "[Compiling $dir]"
    cd $dir
    ifc
    cd ..
    echo "====================="
done
