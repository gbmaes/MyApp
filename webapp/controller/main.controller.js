// sap.ui.define(["sap/ui/core/mvc/Controller",
// 	       	   "sap/m/Button",
// 	    	   "sap/m/Dialog",
// 	    	   "opensap/myapp/controller/signaturePad"], 
		
// 	function (Controller,Button,Dialog,signaturePad) {
	
// 		"use strict";
   
// 		return Controller.extend("opensap.myapp.controller.main", {
			
		
// 			onInit: function() {
		
// 			},
			
// 			onEnd: function(oEvent) {
				
// 			},
			
// 			onBegin: function(oEvent) {
				
// 			},
		
// 			onItemPressed: function(oEvent) 
// 			{   
// 				sap.ui.getCore().byId("app").to(oEvent.getSource().getId().substring(6));
// 			},

// 			onSign: function(oEvent) {
// 				var canvas = document.querySelector("canvas");

// 				var signaturePad = new signaturePad(canvas);
// 			}
// 		})
		
// });

jQuery(function() {
	sap.ui.core.Control.extend('SignaturePad', {
	  metadata: {
		properties: {
		  width: {type: 'int', defaultValue: 300},
		  height: {type: 'int', defaultValue: 100},
		  bgcolor: {type: 'string', defaultValue: '#ffa'},
		  lineColor: {type: 'string', defaultValue: '#666'},
		  penColor: {type: 'string', defaultValue: '#333'},
		  signature: 'string'
		}
	  },
	  
	  renderer: function(oRm, oControl) {
		var bgColor = oControl.getBgcolor();
		var lineColor = oControl.getLineColor();
		var pen = oControl.getPenColor();
		var id = oControl.getId();
		var w = oControl.getWidth();
		var h = oControl.getHeight();
		oRm.write("<div");
		oRm.writeControlData(oControl);
		oRm.write(">");
		oRm.write('<svg xmlns="http://www.w3.org/2000/svg" width="' + w +
				  '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">');
		
		oRm.write('<rect id="' + id  + '_r" width="' + w + '" height="' + h + 
				  '" fill="' + bgColor  + '"/>');
		
		var hh = h - 20;
		oRm.write('<line x1="0" y1="' + hh  + '" x2="' + w + '" y2="' + hh + 
				  '" stroke="' + lineColor + 
				  '" stroke-width="1" stroke-dasharray="3" ' + 
				  'shape-rendering="crispEdges" pointer-events="none"/>');
		
		oRm.write('<path id="' + id + '_p" stroke="' + pen + '" stroke-width="2" ' +
				  'fill="none" pointer-events="none"/>');
		oRm.write('</svg>');
		oRm.write("</div>");
	  },
	  
	  clear: function() {
		this.signaturePath = '';
		var p = document.getElementById(this.getId() + '_p');
		p.setAttribute('d', '');
	  },
	  
	  onAfterRendering: function() {
		var that = this;
		this.signaturePath ='';
		isDown = false;
		var elm = this.$()[0];
		var r = document.getElementById(this.getId() + '_r');
		var p = document.getElementById(this.getId() + '_p');
  
		function isTouchEvent(e) {
		  return e.type.match(/^touch/);
		}
  
		function getCoords(e) {
		  if (isTouchEvent(e)) {
			return e.targetTouches[0].clientX + ',' +
			  e.targetTouches[0].clientY;
		  }
		  return e.clientX + ',' + e.clientY;
		}
  
		function down(e) {
		  that.signaturePath += 'M' + getCoords(e) + ' ';
		  p.setAttribute('d', that.signaturePath);
		  isDown = true;
		  if (isTouchEvent(e)) e.preventDefault();
		}
  
		function move(e) {
		  if (isDown) {
			that.signaturePath += 'L' + getCoords(e) + ' ';
			p.setAttribute('d', that.signaturePath);
		  }
		  if (isTouchEvent(e)) e.preventDefault();
		}
  
		function up(e) {
		  isDown = false; 
		  if (isTouchEvent(e)) e.preventDefault();
		}
  
		r.addEventListener('mousedown', down, false);
		r.addEventListener('mousemove', move, false);
		r.addEventListener('mouseup', up, false);
		r.addEventListener('touchstart', down, false);
		r.addEventListener('touchmove', move, false);
		r.addEventListener('touchend', up, false);
		r.addEventListener('mouseout', up, false); 
		
		if (this.getSignature()) {
		  console.log('asdasda');
		  this.signaturePath = this.getSignature();
		  var p = document.getElementById(this.getId() + '_p');
		  if (p) {
			p.setAttribute('d', this.signaturePath);
		  }
		}
		
		this.setSignature = function(s) {
		  this.setProperty('signature', s);
		  this.invalidate();
		}
	  }
	});
  
	var oCtrl = new SignaturePad();
	oCtrl.placeAt('content');
	
	(new sap.m.Button({
	  text: 'Clear',
	  press: function() {
		prevSignature = oCtrl.getSignature();
		if (prevSignature) {
		  undo.setEnabled(true);
		}
		oCtrl.clear();
	  }
	})).placeAt('content');
	
	(new sap.m.Button({
	  text: 'Accept',
	  press: function() {
		sap.m.MessageToast.show(oCtrl.getSignature());
	  }
	})).placeAt('content');
	
	var prevSignature = null;
	
	var undo = new sap.m.Button({
	  text: 'Undo',
	  enabled: false,
	  press: function() {
		oCtrl.setSignature(prevSignature);
	  }
	});
	undo.placeAt('content');
	
	oCtrl.setSignature('M48,46 L47,46 L43,46 L42,46 L40,46 L39,46 L38,46 L37,46 L36,46 L36,47 L35,47 L35,48 L35,49 L35,51 L37,51 L38,51 L39,53 L40,54 L42,55 L43,57 L44,57 L44,59 L44,60 L44,61 L43,61 L41,61 L37,61 L34,61 L31,61 L29,61 L28,61 L27,61 L28,61 M49,47 L49,48 L49,49 L49,51 L49,52 L49,54 L49,55 L50,56 L50,58 L50,57 L50,55 L50,54 L50,53 L50,51 L52,51 L52,51 L52,49 L52,48 L53,48 L53,47 L54,47 L54,47 L55,47 L56,47 L57,49 L58,50 L60,51 L60,53 L62,54 L62,55 L63,56 L63,57 L63,58 L63,59 L63,61 L64,61 L64,61 L64,62 M56,57 L57,56 L60,56 L62,55 L63,55 L64,54 L65,54 M69,47 L69,48 L69,49 L69,51 L69,54 L69,55 L69,57 L69,58 L69,60 L69,60 L69,61 M67,45 L67,44 L68,43 L68,43 L71,41 L73,41 L76,41 L77,40 L78,40 L79,40 L80,41 L80,41 L80,42 L80,43 L80,44 L80,44 L80,45 L78,45 L77,46 L75,47 L74,47 L72,49 L72,49 L71,49 L69,49 L68,49 L67,49 M87,41 L87,42 L87,43 L87,44 L87,46 L87,48 L87,49 L87,51 L87,52 L88,53 L88,53 L89,53 L90,54 L91,55 L92,55 L94,55 L95,57 L96,57 L97,57 L98,56 L98,55 L98,54 L99,53 L99,52 L99,50 L99,49 L99,47 L99,46 L99,45 L99,43 L99,43 L99,42 L99,41 L99,40 M107,40 L107,41 L107,42 L107,44 L107,46 L107,49 L107,50 L107,52 L107,52 M121,36 L121,37 L121,38 L121,39 L120,42 L120,43 L120,45 L120,46 L120,47 L120,48 L120,48 L120,47 L122,47 L122,47 L122,45 L124,45 L125,44 L127,44 L130,44 L133,44 L136,45 L139,46 L141,46 L141,47 L141,47 L141,48 L141,50 L139,51 L138,52 L136,53 L133,55 L129,56 L126,56 L123,57 L120,57 L119,57 L117,57 L117,56 M122,38 L122,37 L123,37 L125,36 L130,36 L133,33 L138,32 L142,30 L145,28 L147,28');
  },);
	
	