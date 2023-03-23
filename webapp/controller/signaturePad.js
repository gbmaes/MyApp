/*!
 * UI5 Extension mainly based on the Signature Pad v1.5.3 of Szymon Nowak
 * 
 * Following original MIT Licence
 * 
 * Signature Pad v1.5.3
 * https://github.com/szimek/signature_pad
 *
 * Copyright 2016 Szymon Nowak
 * Released under the MIT license
 *
 * The main idea and some parts of the code (e.g. drawing variable width Bézier curve) are taken from:
 * http://corner.squareup.com/2012/07/smoother-signatures.html
 *
 * Implementation of interpolation using cubic Bézier curves is taken from:
 * http://benknowscode.wordpress.com/2012/09/14/path-interpolation-using-cubic-bezier-and-control-point-estimation-in-javascript
 *
 * Algorithm for approximated length of a Bézier curve is taken from:
 * http://www.lemoda.net/maths/bezier-length/index.html
 *
 */

sap.ui.define(['sap/ui/core/mvc/Controller'], function(oControl) {
  
  "use strict";
  
  // define Point
  var point = function(x, y, time) { this.x = x; this.y = y; this.time = time || new Date().getTime(); };
  point.prototype.velocityFrom = function(start) { return (this.time !== start.time) ? this.distanceTo(start) / (this.time - start.time) : 1; };
  point.prototype.distanceTo = function(start) { return Math.sqrt(Math.pow(this.x - start.x, 2) + Math.pow(this.y - start.y, 2)); };  
  
  // define Bezier
  var bezier = function(startPoint, control1, control2, endPoint) { this.startPoint = startPoint; this.control1 = control1; this.control2 = control2; this.endPoint = endPoint; };
  
  bezier.prototype.length = function() {   
	  // approximated length. 
      var steps = 10, length = 0, i, t, cx, cy, px, py, xdiff, ydiff;
      // length calculation
      for (i = 0; i <= steps; i++) 
      {
          t = i / steps;
          cx = this._point(t, this.startPoint.x, this.control1.x, this.control2.x, this.endPoint.x);
          cy = this._point(t, this.startPoint.y, this.control1.y, this.control2.y, this.endPoint.y);
          if (i > 0) { xdiff = cx - px; ydiff = cy - py; length += Math.sqrt(xdiff * xdiff + ydiff * ydiff); }
          px = cx; py = cy;
      }
      // output length
      return length;
  };

  bezier.prototype._point = function(t, start, c1, c2, end) { return start * (1.0 - t) * (1.0 - t)  * (1.0 - t) + 3.0 *  c1 * (1.0 - t) * (1.0 - t)  * t + 3.0 *  c2 * (1.0 - t) * t * t + end * t * t * t; };  
  
  // define signaturePad
  var signaturePad = sap.ui.core.Control.extend('sap.ui.root.webapp.controller.signaturePad', {
    
	metadata: { 
		
    	properties: { 
    		width: { type: "string" },
    		height: { type: "string" },
			dotSize: {type: "float", defaultValue: function () { return (this._minWidth + this._maxWidth) / 2; } },
			penColor: { type: "string", defaultValue: "#000000" },
			penColorSet: { type: "string", defaultValue: "None" },
			backgroundColor: { type: "string", defaultValue: "#ffffff" },
		    clearButton: { type: "boolean", defaultValue: true },
		    clearText: { type: "string", defaultValue: "Entfernen" },	
		    cancelButton: { type: "boolean", defaultValue: false },
		    cancelText: { type: "string", defaultValue: "Cancel" },
		    signature: {type: "string", defaultValue: "" },
		    dottedLine: { type: "boolean", defaultValue: false },
		    margin: { type: "boolean", defaultValue: false },
		    _initPenColor: { type: "string" },
	        _velocityFilterWeight: {type: "float", defaultValue: 0.7},
			_minWidth: {type: "float", defaultValue: 0.5},
			_maxWidth: {type: "float", defaultValue: 2.5}	    
		},
			    
        aggregations: { 
        	colorPick: { singularName: "colorPick", type: "sap.m.ComboBox", multiple: false },
            clearButton: { singularName: "clearButton", type: "sap.m.Button", multiple: false },
            cancelButton: { singularName: "cancelButton", type: "sap.m.Button", multiple: false },
            custPenColor: { singularName: "custPenColor", type: "sap.ui.core.Item", multiple: true },
        },
        
        defaultAggregation: "custPenColor",
        
        events: { strokeBegin: {}, strokeEnd: {} }
    },
    
    init: function() { 
      
      this.signature="";
    	
    },
    
    renderer: function(oRm, oControl) {
      
      // initialize button width
      var cWidth = "100%", sWidth = "100%"; 
      
      // get custom palette
      var oCustPen = oControl.getAggregation("custPenColor");
      
      // palette defined?
      var palette = ((!(oControl.getPenColorSet()=="None")) || (oCustPen));
      
      if (palette)
    	  { if (oControl.getClearButton() && oControl.getCancelButton()) 
    	    { cWidth="30%"; sWidth = "35%"; } 
    	    else if (oControl.getClearButton() || oControl.getCancelButton())
    	    { cWidth="30%"; sWidth = "70%"; }
    	  }
      else
    	  { { if (oControl.getClearButton() && oControl.getCancelButton()) { sWidth = "50%"; } } }
      
      // create color chooser only if a palette has been defined
      if (palette)
      {   
    	  var oItem, oColorPick = new sap.m.ComboBox({width: cWidth,selectedKey:oControl.getPenColor()}); 
    	  
    	  // cancel button has to be rendered only if bound, otherwise no meaning or same as clear
    	  if (oControl.getCancelButton() && (oControl.getBinding("signature")==undefined))
    	  { 
    		  oControl.setCancelButton(false);
    		  oControl.setCancelText("");
    	  }
    		  
    	  // custom palette? (if specified fill color list with supplied colors)
    	  if (oCustPen)	{ for (var i=0;i<oCustPen.length;i++) { oItem=oCustPen[i]; oColorPick.addItem(new sap.ui.core.ListItem({key:oItem.getKey(),text:oItem.getText()})); } }
    	  
    	  // initialize palette (if no custom color list has been supplied)
    	  if (oColorPick.getItems().length <= 0)
    	  {
	    	  switch (oControl.getPenColorSet())
	    	  {
	    	  	case "Small": 
		    	  oColorPick.addItem(new sap.ui.core.ListItem({key:"#000000",text:"schwarz"}));
		    	  oColorPick.addItem(new sap.ui.core.ListItem({key:"#0000ff",text:"blau"}));
		    	  oColorPick.addItem(new sap.ui.core.ListItem({key:"#ff0000",text:"rot"}));
		    	  break;
	    	  	
		  		 
	    	  	default: 
	    	  	  oColorPick.addItem(new sap.ui.core.ListItem({key:oControl.getPenColor(),text:"schwarz"}));
	    	  	  break;
	    	  }
    	  }
    	  
    	  // set start color
    	  
    	  
    	  // attach event handler for on change event
    	  oColorPick.attachSelectionChange(function(oEvent){oControl.penColor=oEvent.getSource().getSelectedItem().getKey();oControl.setProperty("penColor",oControl.penColor,true);});
    	  oColorPick.addStyleClass("sapUiNoContentPadding sapUiNoMarginTop sapUiNoMarginBottom");
    	  oControl.setAggregation("colorPick", oColorPick, true);

      }
      
      // create clear button
	  if (oControl.getClearButton())
		{ var oClearButton = new sap.m.Button({ text: oControl.getClearText(), 
			                                    width: sWidth,
			                                    press: function(oEvent) { oControl.clear(); } 
		                                      });
		  oClearButton.addStyleClass("sapUiNoContentPadding sapUiNoMarginTop sapUiNoMarginBottom");
          oControl.setAggregation("clearButton", oClearButton, true); 
        }
      
	  // create cancel button
	  if (oControl.getCancelButton())
		{ var oCancelButton = new sap.m.Button({ text: oControl.getCancelText(), 
			                                     width: sWidth,
			                                     press: function(oEvent) { if (!(oControl.getBinding("signature")==undefined)) { oControl.signature=oControl.getBinding("signature").oValue; oControl.setSignature(oControl.signature); } }
		                                       });
		  oCancelButton.addStyleClass("sapUiNoContentPadding sapUiNoMarginTop sapUiNoMarginBottom");
          oControl.setAggregation("cancelButton", oCancelButton, true); 
      }
	  
      // move in require -> added n-times
	  if (oControl.getMargin()) { oRm.write("<div class='sapUiTinyMargin m-signature-pad'"); } else { oRm.write("<div class='m-signature-pad'"); } oRm.writeControlData(oControl); oRm.writeClasses(); oRm.write(">");
      oRm.write("<canvas></canvas>"); 
      if (oControl.getDottedLine()) { oRm.write("<span class='dotactions'>"); } else { oRm.write("<span class='actions'>"); }
      oRm.renderControl(oControl.getAggregation("colorPick")); 
      oRm.renderControl(oControl.getAggregation("clearButton"));
      oRm.renderControl(oControl.getAggregation("cancelButton"));
      oRm.write("</span></div>");  

    },
    
    onBeforeRendering: function() {
	  
    },
    
    onAfterRendering: function() {
      
	  // declare self
      var self = this;
      
      // get canvas
      this._pad = document.getElementById(this.getId());
      this._canvas = this._pad.getElementsByTagName("canvas")[0]; 
      this._ctx = this._canvas.getContext("2d");
      
      // we need add these inline so they are available to unbind while still having access to 'self' we could use _.bind but it's not worth adding a dependency
      this._handleMouseDown = function(event) { if (event.which === 1) { self._mouseButtonDown = true; self._strokeBegin(event); } };
      this._handleMouseMove = function(event) { if (self._mouseButtonDown) { self._strokeUpdate(event); } };
      this._handleMouseUp = function(event) { if (event.which === 1 && self._mouseButtonDown) { self._mouseButtonDown = false; self._strokeEnd(event); } };
      this._handleTouchStart = function(event) { if (event.targetTouches.length == 1) { var touch = event.changedTouches[0]; self._strokeBegin(touch); } };
      
      // prevent scrolling
      this._handleTouchMove = function(event) { event.preventDefault(); var touch = event.targetTouches[0]; self._strokeUpdate(touch); };
      this._handleTouchEnd = function(event) { var wasCanvasTouched = event.target === self._canvas; if (wasCanvasTouched) { event.preventDefault(); self._strokeEnd(event); } };
      this._handleMouseEvents(); this._handleTouchEvents();
      
      // margin
      // var margin = 0;
      // if (this.getMargin()==true) { margin = 16; }
      
      // set dim if explicitly defined  
      // if (!(this.getWidth()==""))  { this._pad.style.width=this._canvas.style.width=this.getWidth(); }
      // if (!(this.getHeight()=="")) { this._pad.style.height=this.getHeight(); this._canvas.style.height=this.getHeight(); }
      
      // adjust height
  	  // this._pad.style.height = (this._pad.clientHeight-margin) + "px"; this._canvas.style.height=(this._pad.clientHeight-40) + "px";
  	  // if (margin>0) { this._pad.style.width = (this._pad.clientWidth-margin) + "px"; }
  	  
      var resizeTimer;

      $(window).on('resize', function(oEvent) {

        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {

    		    { 
    		      // get pixel ratio
    		      var ratio=Math.max(window.devicePixelRatio||1,1);
    			  // redraw according to the content
    			  var i,j,startj,x,y,backR,backG,backB,backA,topX,bottomX,leftX,rightX,topY,bottomY,leftY,rightY,realWidth,realHeight,realStartX,realStartY,pad,pads,startWidth,startHeight,startImage,endImage,margin,aspect,startX,startY,endWidth,endHeight;
    			  // get pads
    			  pads = document.querySelectorAll("div.m-signature-pad");
    			  // for each pad
    			  for (i=0;i<pads.length;i++) { if (pads[i].clientWidth>0) {
    				  // get pad
    				  pad=sap.ui.getCore().byId(pads[i].id);
    				  // get initial dimension
    				  startWidth=pad._canvas.width; startHeight=pad._canvas.height;
    				  // get image
    				  startImage=pad._ctx.getImageData(0,0,startWidth,startHeight); endImage=new Image(); endImage.src=pad._canvas.toDataURL();
    				  // get margin
    			      if (pad.getMargin()==true) { margin=16; } else { margin=0; }
    			      // set dim if explicitly defined  
    			      if (!(pad.getWidth()==""))  { pad._pad.style.width=pad._canvas.style.width=pad.getWidth(); }
    			      if (!(pad.getHeight()=="")) { pad._pad.style.height=pad.getHeight(); pad._canvas.style.height=pad.getHeight(); }			      
    				  // adjust margins
    				  pad._pad.style.height = (pad._pad.clientHeight-margin) + "px"; pad._canvas.style.height=(pad._pad.clientHeight-40) + "px";
    			  	  if (margin>0) { pad._pad.style.width=(pad._pad.clientWidth-margin) + "px"; }	
    			  	  // redraw
    				  pad._canvas.width=pad._canvas.offsetWidth*ratio; pad._canvas.height=pad._canvas.offsetHeight*ratio; pad._ctx.scale(ratio,ratio);			
    				  // width and height increase
    				  if ((pad._canvas.width>=startImage.width)&&(pad._canvas.height>=startImage.height))
    				  	{ endWidth=endImage.width; endHeight=endImage.height; startX=(pad._canvas.width-endWidth)/2; startY=(pad._canvas.height-endHeight)/2; 
    					  endImage.onload=function() { pad._ctx.drawImage(endImage,startX,startY,endWidth,endHeight); } }
    				  else
    				    {
        				  // background rgb
        				  // backR=parseInt(pad.backgroundColor.substring(1,3),16); backG=parseInt(pad.backgroundColor.substring(3,5),16); backB=parseInt(pad.backgroundColor.substring(5,7),16); backA=255;
        				  backR=0; backG=0; backB=0; backA=0;
        				  // get top pixel (from top-left pixel to right)
        				  startj=0;
        				  for(j=0;j<startImage.data.length;j+=4) {
        					  if (!((startImage.data[j]==backR) && (startImage.data[j+1]==backG) && (startImage.data[j+2]==backB) && (startImage.data[j+3]==backA))) 
        			            { leftX=rightX=topX=bottomX=x=Math.floor((j+1)/4)%startImage.width; leftY=rightY=topY=bottomY=y=Math.floor(((j+1)/4)/startImage.width); break; }
        				  }
        				  // get left pixel (from top pixel skipping pixel on the right of last left)
        				  startj=(topY+1)*4*startImage.width;
        				  for(j=startj;j<startImage.data.length;j+=4) { 
        					  if (j==startj) { x=Math.floor((j+1)/4)%startImage.width; } else { x=(x+1)%startImage.width; }
        					  if (x>leftX) { j=(Math.floor(((j+1)/4)/startImage.width)+1)*startImage.width*4; x=startj; continue; }
        					  if (!((startImage.data[j]==backR) && (startImage.data[j+1]==backG) && (startImage.data[j+2]==backB) && (startImage.data[j+3]==backA))) 
        			            { if (x<leftX) { leftX=bottomX=x; leftY=bottomY=y=Math.floor(((j+1)/4)/startImage.width); j=(y+1)*startImage.width; } }
        				  }
        				  // get bottom pixel (from bottom-right to left)
        				  startj=startImage.data.length-4;
        				  for(j=startj;j>leftY*startImage.width*4+leftX*4;j-=4) {				  
        					  if (!((startImage.data[j]==backR) && (startImage.data[j+1]==backG) && (startImage.data[j+2]==backB) && (startImage.data[j+3]==backA))) 
        			            { bottomX=x=Math.floor((j+1)/4)%startImage.width;; bottomY=y=Math.floor(((j+1)/4)/startImage.width); if (x>rightX) { rightX=x; rightY=y; } break; }
        				  }  
        				  // get right pixel (from bottom pixel skipping pixel on the left of last right)
        				  startj=(bottomY-1)*startImage.width*4;
        				  for(j=startj;j>topY*startImage.width*4+rightX*4;j-=4) {
        					  if (j==startj) { x=Math.floor((j+1)/4)%startImage.width; } else { x=(x-1)%startImage.width; } 
        					  if (x<rightX) { j=(Math.floor(((j+1)/4)/startImage.width)-1)*startImage.width*4-4; x=startj; continue; }    					  
        					  if (!((startImage.data[j]==backR) && (startImage.data[j+1]==backG) && (startImage.data[j+2]==backB) && (startImage.data[j+3]==backA))) 
        			            { rightX=x; rightY=y=Math.floor(((j+1)/4)/startImage.width); }
        				  }    
        				  // real dimensions
        				  realStartX = leftX; realStartY = topY; realWidth=rightX-leftX+1; realHeight= bottomY-topY+1;
    					  // resize
	    				  if ((pad._canvas.width>=realWidth)&&(pad._canvas.height>=realHeight))
	    					{ endWidth=realWidth; endHeight=realHeight; startX=(pad._canvas.width-endWidth)/2; startY=(pad._canvas.height-endHeight)/2; 
	    					  endImage.onload=function() { pad._ctx.drawImage(endImage,realStartX,realStartY,realWidth,realHeight,startX,startY,endWidth,endHeight); } }  
	    				  else
	    					{ aspect=Math.min(pad._canvas.width/realWidth,pad._canvas.height/realHeight); 
	    					  endWidth=realWidth*aspect; endHeight=realHeight*aspect; startX=(pad._canvas.width-endWidth)/2; startY=(pad._canvas.height-endHeight)/2; 
	    					  endImage.onload=function() { pad._ctx.drawImage(endImage,realStartX,realStartY,realWidth,realHeight,startX,startY,endWidth,endHeight); } 
    					}
    				  }
    				}
    			   //pad.toDataURL();
    			  }	  
    		    }
                  
        },10);

      });
      
  	  // adjust 
      $(window).resize();
  	
  	  // adjust css
  	  if (this.getAggregation("clearButton")) 
  	  {
  		  var ojClearButton = $("#"+(this.getAggregation("clearButton").getId()));
  		  ojClearButton.css("padding-bottom","0px");
  		  ojClearButton.css("padding-top","0px");
  		  ojClearButton.css("height","40px");	  
  	  };

  	  if (this.getAggregation("cancelButton")) 
  	  {
  		  var ojCancelButton = $("#"+(this.getAggregation("cancelButton").getId()));
  		  ojCancelButton.css("padding-bottom","0px");
  		  ojCancelButton.css("padding-top","0px");
  		  ojCancelButton.css("height","40px");	  
  	  };

  	  if (this.getAggregation("colorPick")) 
  	  {
  		  var opick = this.getAggregation("colorPick");
  		  var ojColorPick = $("#"+(this.getAggregation("colorPick").getId()));
  		  ojColorPick.css("padding-bottom","0px");
  		  ojColorPick.css("padding-top","0px");
  		  ojColorPick.css("height","40px");	  
  	  };
      
      // set properties
	  this.penColorSet = this.getPenColorSet();
	  this._pad.style.backgroundColor = this._canvas.style.backgroundColor = this.backgroundColor = this.getBackgroundColor();
	  this.clearButton = this.getClearButton();
	  this.clearText = this.getClearText();    
	  this.width = this.getWidth();
	  this.height = this.getHeight();
	  this.margin = this.getMargin();
	  if (!(this._initPenColor)) { this._initPenColor = this.getPenColor(); }
	  this._velocityFilterWeight = this.getProperty("_velocityFilterWeight"); 
	  this._minWidth = this.getProperty("_minWidth"); 
	  this._maxWidth = this.getProperty("_maxWidth"); 

      // initialize canvas drawn
	  this.dotSize = this.getDotSize();
	  this.penColor = this.getPenColor();
      // this.fromDataURL(this.getSignature(),this._zoom);
      
      // get zoom
      if (screen && screen.deviceXDPI && screen.logicalXDPI) { this._zoom = (screen.deviceYDPI / screen.logicalYDPI); } else { this._zoom = window.outerWidth / window.innerWidth; }
      
    },  
    
  });
  
  signaturePad.prototype.clear = function() {
      this._ctx.fillStyle = this.backgroundColor;
      this._ctx.clearRect(0,0,this._canvas.width,this._canvas.height);
      this._ctx.fillRect(0,0,this._canvas.width,this._canvas.height);
      this.signature=this._canvas.toDataURL();
      this.setSignature(this.signature);
      this._reset();
  };

  signaturePad.prototype.toDataURL = function(imageType, quality) {
	  // declarations
      var imgData,oldCompOp;
      // get image data
      imgData=this._ctx.getImageData(0,0,this._canvas.width,this._canvas.width)
      // set comp. operation
      oldCompOp = this._ctx.globalCompositeOperation = "destination-over";
      // set background color
      this._ctx.fillStyle=this.backgroundColor;
      this._ctx.fillRect(0,0,this._canvas.width,this._canvas.height);
      // get data url
      var dataURL = this._canvas.toDataURL.apply(this._canvas, arguments);
      // reset rectangle
      this._ctx.clearRect(0,0,this._canvas.width,this._canvas.height);
      this._ctx.putImageData(imgData,0,0);
      // reset comp. operation
      this._ctx.globalCompositeOperation = oldCompOp;
      return dataURL;
  };
  
  signaturePad.prototype.fromDataURL = function(dataUrl,zoomLevel) {
  
	  // initialize
      var self = this, image = new Image(), ratio = Math.max(window.devicePixelRatio || 1, 1), startx = 0, starty = 0, width = this._canvas.offsetWidth, height = this._canvas.offsetHeight, zoom;
      this._reset();
      image.src = dataUrl;
      
      // detect zoom
      if (screen && screen.deviceXDPI && screen.logicalXDPI) { zoom = (screen.deviceYDPI / screen.logicalYDPI); } else { zoom = window.outerWidth / window.innerWidth; }
      if (!zoomLevel) { zoomLevel=zoom; }
      
      // keep image ratio & center
      if ((dataUrl)&&(zoom.toFixed(2)==zoomLevel.toFixed(2)))
	  { 
    	if ((image.width/width) > (image.height/height))
	  	  { startx = 0; starty = 1/2 * ( height - image.height * width / image.width ); height = image.height * width / image.width; }
	  	else if ((image.width/width) < (image.height/height))
	  	  { startx = 1/2 * ( width - image.width*height / image.height  );  starty = 0; width = image.width * height / image.height; }
	  	else
  		  { startx = 0; starty = 0; }
	  }
      else
      {   
    	startx=(width-image.width)/2;
    	starty=(height-image.height)/2;
    	width = width*image.width/width;
    	height=height*image.height/height;
      }
           
      // ratio
      if (zoom!=1) {ratio=zoom; }
      if (zoom==zoomLevel) {ratio= 1;}
      
      
      // load image
      image.onload=function () { self._ctx.drawImage(image,startx,starty,width,height); };
      this._isEmpty=false;

  };

  signaturePad.prototype._strokeUpdate = function(event) {
      var point=this._createPoint(event);
      this._addPoint(point);
  };

  signaturePad.prototype._strokeBegin = function(event) {
      this._reset();
      this._strokeUpdate(event);
      this.fireStrokeBegin({});
  };

  signaturePad.prototype._strokeDraw = function(point) {
  	var ctx=this._ctx,dotSize=typeof(this.dotSize)==='function'?this.dotSize():this.dotSize;
      ctx.beginPath();
      this._drawPoint(point.x,point.y,dotSize);
      ctx.closePath();
      ctx.fill();
  };

  signaturePad.prototype._strokeEnd = function(event) {
	  var canDrawCurve=this.points.length>2,point=this.points[0];
      if (!canDrawCurve&&point) { this._strokeDraw(point); }
      this.signature=this.toDataURL(); 
      this.setProperty("signature",this.signature,true);
      this.fireStrokeEnd({});
  };

  signaturePad.prototype._handleMouseEvents = function() {
      this._mouseButtonDown=false;
      this._canvas.addEventListener("mousedown",this._handleMouseDown);
      this._canvas.addEventListener("mousemove",this._handleMouseMove);
      document.addEventListener("mouseup",this._handleMouseUp);
  };

  signaturePad.prototype._handleTouchEvents = function() {
      // Pass touch events to canvas element on mobile IE11 and Edge.
      this._canvas.style.msTouchAction='none';
      this._canvas.style.touchAction='none';
      this._canvas.addEventListener("touchstart",this._handleTouchStart);
      this._canvas.addEventListener("touchmove",this._handleTouchMove);
      this._canvas.addEventListener("touchend",this._handleTouchEnd);
  };

  signaturePad.prototype.on = function() { this._handleMouseEvents(); this._handleTouchEvents(); };

  signaturePad.prototype.off = function() {
      this._canvas.removeEventListener("mousedown",this._handleMouseDown);
      this._canvas.removeEventListener("mousemove",this._handleMouseMove);
      document.removeEventListener("mouseup",this._handleMouseUp);
      this._canvas.removeEventListener("touchstart",this._handleTouchStart);
      this._canvas.removeEventListener("touchmove",this._handleTouchMove);
      this._canvas.removeEventListener("touchend",this._handleTouchEnd);
  };

  signaturePad.prototype.isEmpty = function() { return this._isEmpty; };

  signaturePad.prototype._reset = function() {
      this.points=[];
      this._lastVelocity=0;
      this._lastWidth=(this._minWidth+this._maxWidth)/2;
      this._isEmpty=true;
      this._ctx.fillStyle=this.penColor;
  };
  
  signaturePad.prototype._createPoint = function (event) {
      var rect=this._canvas.getBoundingClientRect();
      return new point(event.clientX-rect.left,event.clientY-rect.top);
  };

  signaturePad.prototype._addPoint = function (point) {
      var points = this.points, c2, c3, curve, tmp;
      points.push(point);
      if (points.length > 2) {
          // To reduce the initial lag make it work with 3 points by copying the first point to the beginning.
          if (points.length === 3) points.unshift(points[0]);
          tmp = this._calculateCurveControlPoints(points[0], points[1], points[2]);
          c2 = tmp.c2;
          tmp = this._calculateCurveControlPoints(points[1], points[2], points[3]);
          c3 = tmp.c1;
          curve = new bezier(points[1], c2, c3, points[2]);
          this._addCurve(curve);
          // remove the first element from the list, so that we always have no more than 4 points in points array.
          points.shift();
      }
  };

  signaturePad.prototype._calculateCurveControlPoints = function(s1, s2, s3) {
      var dx1 = s1.x - s2.x, dy1 = s1.y - s2.y,
          dx2 = s2.x - s3.x, dy2 = s2.y - s3.y,
          m1 = {x: (s1.x + s2.x) / 2.0, y: (s1.y + s2.y) / 2.0},
          m2 = {x: (s2.x + s3.x) / 2.0, y: (s2.y + s3.y) / 2.0},
          l1 = Math.sqrt(dx1*dx1 + dy1*dy1),
          l2 = Math.sqrt(dx2*dx2 + dy2*dy2),
          dxm = (m1.x - m2.x),
          dym = (m1.y - m2.y),
          k = l2 / (l1 + l2),
          cm = {x: m2.x + dxm*k, y: m2.y + dym*k},
          tx = s2.x - cm.x,
          ty = s2.y - cm.y;
      return { c1: new point(m1.x + tx, m1.y + ty), c2: new point(m2.x + tx, m2.y + ty) };
  };

  signaturePad.prototype._addCurve = function(curve) {
      var startPoint = curve.startPoint, endPoint = curve.endPoint, velocity, newWidth;
      velocity = endPoint.velocityFrom(startPoint);
      velocity = this._velocityFilterWeight * velocity + (1 - this._velocityFilterWeight) * this._lastVelocity;
      newWidth = this._strokeWidth(velocity);
      this._drawCurve(curve, this._lastWidth, newWidth);
      this._lastVelocity = velocity;
      this._lastWidth = newWidth;
  };

  signaturePad.prototype._drawPoint = function(x, y, size) {
      var ctx = this._ctx;
      ctx.moveTo(x, y);
      ctx.arc(x, y, size, 0, 2 * Math.PI, false);
      this._isEmpty = false;
  };

  signaturePad.prototype._drawCurve = function(curve, startWidth, endWidth) {
      var ctx = this._ctx, widthDelta = endWidth - startWidth, drawSteps, width, i, t, tt, ttt, u, uu, uuu, x, y;
      drawSteps = Math.floor(curve.length());
      ctx.beginPath();
      for (i = 0; i < drawSteps; i++) {
          // Calculate the Bezier (x, y) coordinate for this step.
          t = i / drawSteps;
          tt = t * t;
          ttt = tt * t;
          u = 1 - t;
          uu = u * u;
          uuu = uu * u;
          x = uuu * curve.startPoint.x;
          x += 3 * uu * t * curve.control1.x;
          x += 3 * u * tt * curve.control2.x;
          x += ttt * curve.endPoint.x;
          y = uuu * curve.startPoint.y;
          y += 3 * uu * t * curve.control1.y;
          y += 3 * u * tt * curve.control2.y;
          y += ttt * curve.endPoint.y;
          width = startWidth + ttt * widthDelta;
          this._drawPoint(x, y, width);
      }
      ctx.closePath();
      ctx.fill();
  };

  signaturePad.prototype._strokeWidth = function(velocity) { return Math.max(this._maxWidth / (velocity + 1), this._minWidth); };
	  
  return signaturePad;
  
});