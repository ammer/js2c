
httpGet("http://remote.site.com/path?p1=v1",
	function success(data) {
	    if(strContain(data, "success")) {
		return 0;
	    } else {
		return -1;
	    }
	},
	function error(status, data) {
	    return status + 0;
	});

