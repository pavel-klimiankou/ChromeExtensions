FBCaseViewer = {
	onCaseLoad: (function () {
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
	})(),
	getCases: function () {
		return Array.prototype.slice.call(document.querySelectorAll("article.event")).filter(function (issue) {
			return !(issue.classList.contains("borrowed") || issue.classList.contains("brief"));
		});
	},
	getCaseBody: function (issue) {
		return issue.querySelector(".body .bodycontent");
	},
	getCaseHeader: function (issue) {
		return issue.querySelector("header");
	},
	parsers: []
};

console.log("FB Viewer loaded.");

FBCaseViewer.onCaseLoad(function () {
	console.log("Case detected.", FBCaseViewer.getCases().length);
});
