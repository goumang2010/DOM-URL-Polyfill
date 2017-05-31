var testarray = [];
var len = 1000;
for (var i = 0; i < len; i++) {
    testarray.push(['p' + Math.ceil(Math.random() * 200), Math.ceil(Math.random() * 2000)]);
}
var testurl = 'http://aaaa?bbbb&ccc=2#hhhhh';


if (typeof window.URL === 'function') {
    var start = Date.now();
    var urlobj = new URL(testurl);
    for (var i = 0; i < len; i++) {
        urlobj.searchParams.set(testarray[i][0], testarray[i][1])
    }
    var res = urlobj.toString()
    console.log(res);
    var end = Date.now();
    console.log('native url parser: ' + (end - start) + ',length: ' + res.length);
}


var start = Date.now();
var urlobj = new _aURL(testurl);
for (var i = 0; i < len; i++) {
    urlobj.searchParams.set(testarray[i][0], testarray[i][1])
}
var res = urlobj.toString()
console.log(res);
var end = Date.now();
console.log('anchor url parser: ' + (end - start) + ',length: ' + res.length);

var start = Date.now();
var urlobj = new _nodeURL(testurl);
for (var i = 0; i < len; i++) {
    urlobj.searchParams.set(testarray[i][0], testarray[i][1])
}
var res = urlobj.toString()
console.log(res);
var end = Date.now();
console.log('node url parser: ' + (end - start) + ',length: ' + res.length);