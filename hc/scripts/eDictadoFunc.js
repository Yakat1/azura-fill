	function clickImage(cText) {
			alert(cText);
	}
	function controlHasFocus() {
			return document.activeElement;
	}

	function getSelectionStart(idCtrl) {
	    var ctrl = document.getElementById(idCtrl);
	    return ctrl.selectionStart;
	}

	function getSelectionEnd(idCtrl) {
	    var ctrl = document.getElementById(idCtrl);
	    return ctrl.selectionEnd;
	}

	function getSelectionLength(idCtrl) {
	    if (getSelectionEnd(idCtrl) > getSelectionStart(idCtrl))
	        return getSelectionEnd(idCtrl) - getSelectionStart(idCtrl);
	    else
	        return 0;
	}

	function getSelection() {
	    var selText = "";
	    if (window.getSelection) {  // all browsers, except IE before version 9
	        if (document.activeElement &&
                    (document.activeElement.tagName.toLowerCase() == "textarea" ||
                     document.activeElement.tagName.toLowerCase() == "input")) {
	            var text = document.activeElement.value;
	            selText = text.substring(document.activeElement.selectionStart,
                                          document.activeElement.selectionEnd);
	        }
	        else {
	            var selRange = window.getSelection();
	            selText = selRange.toString();
	        }
	    }
	    else {
	        if (document.selection.createRange) {       // Internet Explorer
	            var range = document.selection.createRange();
	            selText = range.text;
	        }
	    }
	    return selText;
	}

	function setSelectionStart(idCtrl, selStart) {
	    var ctrl = document.getElementById(idCtrl);
	    ctrl.selectionStart = selStart;
	}

	function linkOfImage(pict) {
	    var Href = "not found", Link, thisImg;
	    var I = document.getElementsByTagName('IMG');
	    for (var i = 0; i < I.length; i++) {
	        //            thisImg = I[i].src.substring(I[i].src.lastIndexOf('/') + 1)
	        thisImg = I[i].src;
	        if (pict == thisImg) {
	            Link = I[i].parentNode;
	            if (Link && Link.tagName.toLowerCase() == 'a')
	                Href = Link.href;
	        }
	    }
	    return Href;
	}
	
	function getLabelAttribute(label) {
	    var cResult = "";
	    var cFor = label.getAttribute("for");
	    if (cFor != null)
	        cResult = cFor;
	    return cResult;
	    }

	    function getObjectName(label) {
	        return label.getAttribute("name");
	    }

	    function getElementByName(cName) {
	        return document.getElementsByName(cName)[1];  // regresa el segundo
	    }

	    function getLabelForObject(id) {
	        var L = document.getElementsByTagName("label");
	    }

    function onSilverlightError(sender, args) {
	    var appSource = "";
	    if (sender != null && sender != 0) {
			    appSource = sender.getHost().Source;
	    }

	    var errorType = args.ErrorType;
	    var iErrorCode = args.ErrorCode;

	    if (errorType == "ImageError" || errorType == "MediaError") {
			    return;
	    }

	    var errMsg = "Unhandled Error in Silverlight Application " + appSource + "\n";

	    errMsg += "Code: " + iErrorCode + "    \n";
	    errMsg += "Category: " + errorType + "       \n";
	    errMsg += "Message: " + args.ErrorMessage + "     \n";

	    if (errorType == "ParserError") {
			    errMsg += "File: " + args.xamlFile + "     \n";
			    errMsg += "Line: " + args.lineNumber + "     \n";
			    errMsg += "Position: " + args.charPosition + "     \n";
	    }
	    else if (errorType == "RuntimeError") {
			    if (args.lineNumber != 0) {
					    errMsg += "Line: " + args.lineNumber + "     \n";
					    errMsg += "Position: " + args.charPosition + "     \n";
			    }
			    errMsg += "MethodName: " + args.methodName + "     \n";
	    }

	    throw new Error(errMsg);
	}
