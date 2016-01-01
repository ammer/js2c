
httpPost("http://localhost:8999/startchage", '{"name": "2333"}',
	 function(data) {
	     var num1 = numBetween("price", ";");
	     httpGet("http://localhost:8999/fee?price=$num",
		     function(data) {
			 if(hasString(data, "result: successful")) {
			     messageBox("计费成功");
			     finish();
			 } else {
			     failed();
			 }
		     },
		     function(status, data) {
		     }
		    );
	 },
	 function(status, data) {
	     failed();
	 }
	);
