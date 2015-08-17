ifeq ($(OS),Windows_NT)
  # fix an odd crashing bug in Make for MinGW on Win 7+
  SHELL=C:/Windows/System32/cmd.exe
endif

build: rosewood.js test/test.js

rosewood.js: src/*.js
	node_modules/.bin/browserify --transform babelify --standalone Rosewood --outfile rosewood.tmp.js src/rosewood.js
	node_modules/.bin/derequire rosewood.tmp.js > rosewood.js
	rm rosewood.tmp.js

test/test.js: rosewood.js test/src/sample_app.js test/src/unit_tests.js
	node_modules/.bin/browserify --transform babelify --outfile test/test.js test/src/sample_app.js test/src/unit_tests.js

test: build
	cd test && node api_server.js

.PHONY: build test
