 function httpPost(url, data, success, fail) {
     console.log(">> httpPost");
     success("11");
 }

function httpGet(url, success, fail) {
    console.log(">> httpGet");
    success("hello");
}

function numBetween() {
    console.log(">> numBetween");
    return 1;
}

function messageBox(msg) {
    console.log(">> messageBox: " + msg);
}

function finish() {
    console.log(">> finish");
}

function failed() {
    console.log(">> failed");
}

function hasString() {
    console.log(">> hasString");
    return true;
}
