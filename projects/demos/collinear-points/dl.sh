 #!/usr/bin/env bash
ZIP=collinear.zip
DIR=`basename $ZIP .zip`
[ -f "$ZIP" ] || curl https://coursera.cs.princeton.edu/algs4/assignments/collinear/collinear.zip > "$ZIP"
[ -d "$DIR" ] || unzip -o $ZIP -d $DIR; 
