// ==UserScript==
// @name       Pretty FogBugz Issue formatter
// @namespace  
// @version    0.1
// @description  Formats raw issue
// @match      https://checkmate.fogbugz.com/default.asp?*
// @copyright  2013+, Me
// ==/UserScript==

;(function () {
    var getIssues = function () {
       return Array.prototype.slice.call(document.querySelectorAll(".body"));
    };
    
    var baseFormatter = function (parent, name, renderer) {
        var readyToLeave = false,
            content = [],
            firstNode,
            startsWithKnownSection = function (node) {
                var nodeText = node.textContent.trim(),
                    foundIndex = -1;
                
                if (!!nodeText) {
                	knownSections.forEach(function (item, itemIndex) {
                        if (typeof item === "string" && nodeText.indexOf(item) === 0) {
                        	foundIndex = itemIndex;
                        }
                	});
                }
                
                return foundIndex;
            };
              
        return {
            feed: function (node) {
                var knownSectionIndex;
                
                if (renderer) {
                    if (!firstNode) {
                        firstNode = node.previousSibling;
                    }
                        
                	node.parentNode.removeChild(node);
                }
                
                if (node.nodeName === "BR" || (readyToLeave && !node.textContent.trim())) {
                    if (readyToLeave) {
                    	return parent || null;
                    } else {
                    	readytoLeave = true;
                    }
                } else if (((knownSectionIndex = startsWithKnownSection(node)) !== -1)) {
                    return baseFormatter(parent, knownSections[knownSectionIndex], typeof knownSections[knownSectionIndex + 1] === "function" ? knownSections[knownSectionIndex + 1] : null);
                } else {
                	readyToLeave = false;
                    content.push(node.nodeValue || node.textContent);
                }
                
            	return null;
            },
            getContent: function () {
            	return content;
            },
            getName: function () {
            	return name;
            },
            startNode: function () {
            	return firstNode;
            },
            render: function (context) {
                if (renderer) {
               		return renderer(this.getContent(), context);
				} else {
               		return null;
                }
            },
            populate: function (context) {
                //try {
                //    context[name] = JSON.parse(this.getContent().join(""));
                //} catch (e) {
                	context[name] = this.getContent().join("").trim();
                //}
                if (name === aliveSinceSection) {
                	context[name] = new Date(context[name]);
                }
            	
            }
        };
	};
    
    var historySection = "//======History=======",
        aliveSinceSection = "//======AliveSince=======";
    
    var historyRenderer = function (arrContent, context) {
        try{
            var history = JSON.parse(arrContent.join("")),
                formatOffset,
                zeroPad = function (str, target) {
                    while (str.length < target) {
                    	str = "0" + str;
                    }
                    return str;
                },
                aliveSince = context[aliveSinceSection];
            
            if (aliveSince) {
                formatOffset = function (offset) {
                    var resDate = new Date((new Date(aliveSince)).valueOf() + offset);
                    
                    return zeroPad(resDate.getHours().toString(), 2) + ":" + zeroPad(resDate.getMinutes().toString(), 2) + ":" + zeroPad(resDate.getSeconds().toString(), 2) + "." + zeroPad(resDate.getMilliseconds().toString(), 3);
                };
            } else {
                formatOffset = function (offset) {
                	return offset;
                };
            }
            
            return history.navigationHistory.reduce(function (container, item) {
            	var element = document.createElement("LI");
                container.appendChild(element);
                
                element.innerHTML = "<span style='color:#ccc'>[" + formatOffset(item.offset) + "]</span> " + item.url.replace(/(#\w+)(,.*$)?/, "<span style=''>$1</span><span style='color:#ccc'>$2</span>")
                
                element.style.cssText = "list-style-type: none";
                
                return container;
            }, (function (container) {
                return container;
            })(document.createElement("UL")));
        } catch(e) {
        	console.error("historyRenderer failed", e);
        }
   		return null;
    };
    
    var tasksRenderer = function (arrContent) {
        return arrContent.map(function (line) {
        	return line.trim();
        }).filter(function (line) {
            return line;
        }).reduce(function (container, line) {
            line = line.replace(/id\d+\:\s/ig, "");
            
            var color = line.indexOf("succeeded:") !== -1 ? "#CCC" : (line.indexOf("failed:") !== -1 ? "#F00" : "#000");
            
            var li = document.createElement("li");
            li.textContent = line;
            li.style.color = color;
            container.appendChild(li);
            
            return container;
            
        }, document.createElement("UL"));
    };
    
    var stackTraceSectionName = "Stack Trace:",
        sourcesSubSectionName = "//======Sources=======",
        stackTraceSubSectionName = "//======StackTrace=======",
        errorSourceSubSectionName = "ErrorSource:",
        previousErrorsSubSectionName = "Previous Errors:",
    	stackTraceRenderer = function (arrContent, context) {
    		var contentStr = arrContent.join("").trim(),
                sourcesStart = contentStr.indexOf(sourcesSubSectionName),
                stackTraceStart = contentStr.indexOf(stackTraceSubSectionName),
                errorSourceStart = contentStr.indexOf(errorSourceSubSectionName),
                previousErrorsStart = contentStr.indexOf(previousErrorsSubSectionName),
                previousErrors,
                errorSource,
                stackTrace,
                sources;

            var container = document.createDocumentFragment();
            
            if (previousErrorsStart !== -1) {
            	previousErrors = contentStr.slice(previousErrorsStart + previousErrorsSubSectionName.length).trim();
                contentStr = contentStr.slice(0, previousErrorsStart);
                if (previousErrors) {
                    var pe = document.createElement("P");
                	pe.textContent = previousErrors;
                    container.appendChild(pe);
                }
            }
            if (errorSourceStart !== -1) {
            	errorSource = contentStr.slice(errorSourceStart + errorSourceSubSectionName.length).trim();
                contentStr = contentStr.slice(0, errorSourceStart);
                if (errorSource) {
                    var es = document.createElement("P");
                	es.textContent = errorSource;
                    container.appendChild(es);
                }
            }
            if (stackTraceStart !== -1) {
            	stackTrace = contentStr.slice(stackTraceStart + stackTraceSubSectionName.length).trim();
                contentStr = contentStr.slice(0, stackTraceStart)
                try {
                	stackTrace = JSON.parse(stackTrace);
                	var stackList = document.createElement("UL");
                    var toNum = function (val) {
                        return typeof val === "number" ? val : -1;
                    };
              
                    stackTrace.forEach(function (stackTraceItem) {
                		var li = document.createElement("LI");
                        li.innerHTML = (stackTraceItem.at || "&lt;unknown source&gt;") + " " 
                        	+ "<span style='color:#ccc'>" + (stackTraceItem.source || "&lt;unknown location&gt;").slice(0, 80) + " " + toNum(stackTraceItem.lineNumber) + ":" + toNum(stackTraceItem.column) + "</span>";
                        stackList.appendChild(li);
        	        });
                    
                    if (stackList.childNodes.length !== 0) {
                    	container.appendChild(stackList);
                    }

                } catch (e) {
            		console.error(e);
                }
                
            }
            if (sourcesStart !== -1) {
            	sources = JSON.parse(contentStr.slice(sourcesStart + sourcesSubSectionName.length).trim());
                contentStr = contentStr.slice(0, sourcesStart)
            }
            
            return container;
        };
    
    var aliceSinceRenderer = function () {
    	return document.createTextNode("");
    };
    
    var clientRenderer = function (arrContent) {
        try {
            var content = JSON.parse(arrContent.join(""));
            delete content.mimeTypes;
            delete content.plugins;
            var result = document.createElement("pre");
            result.textContent = JSON.stringify(content, null, "\n");
            return result;
        } catch(e) {
            console.error("client section renderer has failed: ", e);
        	return null;
        }
    };
    
    var knownSections = [
    	"Comments from user:",
        "Ajax call:",
        "Tasks:", tasksRenderer,
        "Other details:",
        aliveSinceSection, aliceSinceRenderer,
        historySection, historyRenderer,
        "Previous Errors:",
        "Client settings",
        "Client:", //clientRenderer,
        "Server:",
        "Stack Trace:", stackTraceRenderer
    ];
    
    var rootFormatter = function () {
        var self = {};
        var proto = baseFormatter(self, "Unallocated stuff");
        
        Object.keys(proto).filter(function (propName) {
        	return typeof proto[propName] === "function";
        }).forEach(function (propName) {
        	self[propName] = proto[propName];
        });
        
        return self;
    };
    
    var toFormattersArray = function (formatters, currentNode) {
        var currentFormatter = formatters[formatters.length - 1],
        	newFormatter = currentFormatter.feed(currentNode);
    	
        if (newFormatter) {
        	formatters.push(newFormatter);
        }
    	return formatters;
    };
    
    var formatIssue = function (issue) {
        //debugger;
        var formatters = Array.prototype.slice.call(issue.childNodes).reduce(toFormattersArray, [rootFormatter()]);
        var context = formatters.reduce(function (context, currentFormatter) {
        	currentFormatter.populate(context);
            return context;
        }, {});
        
        formatters.forEach(function (formatter) {
            console.warn("Formatter: ", formatter.getName());
            console.log("Content: ", formatter.getContent().join(""));
            var renderedContent = formatter.render(context);
            if (renderedContent) {
                var startNode = formatter.startNode();
                if (startNode) {
                    //startNode.parentNode.replaceChild(renderedContent, startNode);
                    if (startNode.nextSibling) {
                        startNode.parentNode.insertBefore(renderedContent, startNode.nextSibling);
                    } else {
                        startNode.parentNode.appendChild(renderedContent);
                    }
                } else {
	                issue.appendChild(renderedContent);
                }
            }
        });
    };
    
    getIssues().forEach(formatIssue);

})();
