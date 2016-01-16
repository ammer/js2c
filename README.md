# js2c

## What is js2c
**js2c** is a command line tool to translate javascript to c code. Sure not all syntax is supported, in fact, only a few is supported, you can treat it as enhanced C instead of really a js to c translator.

**WARNING**: It's my practice for learning Javascript. If you want use it in any of your project, thanks for interested in this project, but take care of yourself, it's not ready for production, at least by now.

## How to use
### Install
Install with npm:
```shell
npm install -g js2c
```

### Help
```shell
js2c help
js2c help toc
js2c help exec
```

### Translate js code to c code
#### Translate
```shell
js2c toc you-in.js out.c
```
If omit out.c, it will print output c code to stdout.

#### include file
If external function is used, js2c need their prototype. This is provided as an include file by '-i' option:
```shell
js2c toc -i path/to/include.js in.js out.c
```

Following is an example of include file:
```javascript
{
    "fun1": {
	"returnType": "int",
	"paramTypes": []
    },

    "fun2": {
	"returnType": "char *",
	"paramTypes": []
    },

    "httpGet": {
	"returnType": "void",
	"paramTypes": [
	    "char *",
	    {
		"returnType": "char *",
		"paramTypes": [
		    "char *"
		]
	    },
	    {
		"returnType": "int",
		"paramTypes": [
		    "char *"
		]
	    }
	]
    }
}
```
#### indent
Sorry for the output c file is un-formatted, please use **indent** before you read it :-).
```shell
indent output.c [formatted_output.c]
```

### Run script in js mode (mock)
You can run the js script file as following:
```shell
js2c exec path-to-script-file.js
```

But if it called external functions, you need provide then. With **-m** option, you can specify a mock file. Following is an example of mock file:
```javascript
function httpGet(url, success, fail) {
  console.log(">> httpGet");
  success("hello");
}
```

## Supported js syntax
TBD

## Todo
TBD

## License
**MIT**
