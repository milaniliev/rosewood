build: rosewood.js

rosewood.js: src/*.js
	node_modules/.bin/browserify --transform babelify --standalone Rosewood --outfile rosewood.tmp.js src/rosewood.js
	node_modules/.bin/derequire rosewood.tmp.js > rosewood.js
	rm rosewood.tmp.js
