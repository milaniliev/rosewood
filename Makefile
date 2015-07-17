build: rosewood.js

rosewood.js: src/*.js
	node_modules/.bin/browserify --transform babelify --standalone Rosewood --outfile rosewood.js src/rosewood.js
