 #!/usr/bin/env bash
ZIP=8puzzle.zip
DIR=`basename $ZIP .zip`
[ -f "$ZIP" ] || curl https://coursera.cs.princeton.edu/algs4/assignments/8puzzle/8puzzle.zip > "$ZIP"
[ -d "$DIR" ] || unzip -o $ZIP -d $DIR; 
