;(function () {
	var onCaseLoad = (function () {
		var handlers = [],
			postpone = function (handler) {
				handlers.push(handler);
			},
			exec = function (func) {
				func();
			},
			wait = function () {
				setTimeout(function () {
					if (document.querySelector("article.event")) {
						onCaseLoad = exec;
						handlers.forEach(exec);
						handlers.length = 0;
					} else {
						wait();
					}
				}, 200);
			};

		wait();

		return postpone;
	})();
	
	console.log("FB Viewer loaded.");
	onCaseLoad(function () {
		console.log("Case detected.");
	});
})();
