/**
 * @author akrasuski1
 * 
 * @author arctelix 
 * https://github.com/arctelix/drag-resize-snap
 *
 * @author https://github.com/zz85
 * http://codepen.io/zz85/post/resizing-moving-snapping-windows-with-js-css
 *
 * @licence The MIT License (MIT)
 *
 * @Copyright Copyright © 2015 Simplex Studio, LTD
 * @Copyright Copyright © 2015 https://github.com/zz85
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the “Software”), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions
 * of the Software.
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 * TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

var core = core || {};
core.util = core.util || {}
onedgecount=0;
onmovecount=0;
window.onload = function() {
  document.onselectstart = function() {return onedgecount===0&&onmovecount===0;} // ie
  document.onmousedown   = function() {return onedgecount===0&&onmovecount===0;} // mozilla
}
core.util.DRS = function(){
  
var makeDRS = function(pane, handle, options, title, percentageBounds){
	"use strict";

    options = options || {}

	// Minimum resizable area
	var minWidth 			= 60;
	var minHeight			= 40;

	// Thresholds
	var SNAP_MARGINS 		= -(options.snapEdge || 5);
	var RESIZE_MARGIN_INNER = options.resizeOuterM || 5;
	var RESIZE_MARGIN_OUTER = options.resizeOuterM || 5;


	// End of what's configurable.
	var onRightEdge, onBottomEdge, onLeftEdge, onTopEdge;
	var rightScreenEdge, bottomScreenEdge, topScreenEdge, leftScreenEdge;
	var e, b, x, y, inLR, inTB, preSnap;
	var clicked 			= null;
	var redraw 				= false;
	var _usePercent 		= true;
	var destroyed=false;
	var content;
	

	// make sure pane has some required styles
    pane.style.boxSizing = "border-box" // includes border in w&h

  // create ghostpane
	var ghostpane = document.createElement('div')
		ghostpane.id = "DRSghost"
		document.body.appendChild(ghostpane)

	// Setup drag handles
	var handles = handle instanceof Array ?  handle : [handle]
	var onHTMLhandle 		// Holds result of event listeners for HTML handles

	function createHandleObjects() {
		b = b || pane.getBoundingClientRect();

		// Grab handles from dom if none are supplied
		if (!hasHTMLElement(handles))
			handles = handles.concat(
				[].slice.call(
					pane.getElementsByClassName('drag-area')))

		// precess handles
		for (var i in handles){
			// html
			if (handles[i] instanceof HTMLElement) {
				bindEvents(handles[i], 'mousedown touchstart', handleDown)
				bindEvents(handles[i], 'mouseup touchend', handleUp)
				handles[i] = {ele: handles[i], type: 'html'}

			// bounds object
			}else if (handles[i] instanceof Object) {
				handles[i] = {type:'custom', coords:handles[i]}
				drawDragHandle(handles[i])

			// preset strings
			}else{
				handles[i] = {type:handles[i]}
				drawDragHandle(handles[i])
			}
		}
	}
	function createContentDiv(){
		content = document.createElement('div')
			content.className = 'pane-content'
			content.innerHTML="This pane is empty for now..."
			pane.appendChild(content)
		// use docWidth to take scroll bars into account!
		var docWidth = document.documentElement.clientWidth || document.body.clientWidth;
		var pH = window.innerHeight / 100;
		var pW = docWidth / 100;
		setBounds(pane, 
			percentageBounds.x*pW, percentageBounds.y*pH,
			percentageBounds.w*pW, percentageBounds.h*pH)
	}

	window.addEventListener('load', createHandleObjects())
	window.addEventListener('load', createContentDiv())

	function handleDown(){onHTMLhandle = true}

	function handleUp(){onHTMLhandle = false}

	// core functions

	function setBounds(element, x, y, w, h) {
		if (x === undefined) {
			b = b || pane.getBoundingClientRect();
			x = b.left
			y = b.top
			w = b.width
			h = b.height
		}
		var wh = convertUnits(w, h)
		var xy = convertUnits(x, y);
		element.style.left = xy[0];
		element.style.top = xy[1];
		element.style.width = wh[0];
		element.style.height = wh[1];
	}

	function getBounds(){
		var winW = window.innerWidth
	    var winH = window.innerHeight
		var bounds = []
		if (leftScreenEdge) {
		  bounds = [0, 0, winW / 2, winH]
		} else if (rightScreenEdge) {
		  bounds = [winW / 2, 0, winW / 2, winH]
		} else if (topScreenEdge) {
		  bounds = [0, 0, winW, winH / 2]
		} else if (bottomScreenEdge) {
		  bounds = [0, winH / 2, winW, winH / 2]
		}
		return bounds
	}

	function convertUnits(w, h){
		if(!_usePercent)
			return [w + 'px', h + 'px']
		var pH, pW
		// use docWidth to take scroll bars into account!
		var docWidth = document.documentElement.clientWidth || document.body.clientWidth;
		pH = h / window.innerHeight * 100
		pW = w / docWidth * 100

		var r = [pW + '\%', pH + '\%']
		return r
	}

	function togglePercent(state){
		_usePercent = state !== undefined? state : !_usePercent
		setBounds(pane)
	}


	function restorePreSnap() {
		if(!preSnap) return
		var p = preSnap
		setBounds(pane, p.left, p.top, p.width, p.height);
	}

	function hintHide() {
	  setBounds(ghostpane, b.left, b.top, b.width, b.height);
	  ghostpane.style.opacity = 0;
	}

	// Mouse events
	document.addEventListener('mousedown', onMouseDown);
	document.addEventListener('mousemove', onMove);
	document.addEventListener('mouseup', onUp);

	// Touch events
	document.addEventListener('touchstart', onTouchDown);
	document.addEventListener('touchmove', onTouchMove);
	document.addEventListener('touchend', onTouchEnd);

	function onTouchDown(e) {
	  onDown(e.touches[0]);
	}

	function onTouchMove(e) {
	  onMove(e.touches[0]);
	  if (clicked && (clicked.isMoving || clicked.isResizing)) {
		  e.preventDefault()
		  e.stopPropagation()
	  }
	}

	function onTouchEnd(e) {
	  if (e.touches.length ==0) onUp(e.changedTouches[0]);
	}

	function onMouseDown(e) {
	  onDown(e);
	}

	function onDown(e) {

		calc(e);
		var isResizing = onRightEdge || onBottomEdge || onTopEdge || onLeftEdge;

		clicked = {
			x: x,
			y: y,
			cx: e.clientX,
			cy: e.clientY,
			w: b.width,
			h: b.height,
			isResizing: isResizing,
			isMoving: !isResizing && canMove(),
			onTopEdge: onTopEdge,
			onLeftEdge: onLeftEdge,
			onRightEdge: onRightEdge,
			onBottomEdge: onBottomEdge
		};
	}

	function canMove() {
		for (var i in handles) {
			var h = drawDragHandle(handles[i])
			var c = h.coords
			var r = {}
			var yb = b.height - y
			var xr = b.width - x

			// determine bounds of click area coordinates
			if (c.bottom !== null && c.bottom !== undefined)
				r.bottom = yb < c.height || (!c.height && y > c.top) && yb > c.bottom && inLR
			if (c.top !== null && c.top !== undefined)
				r.top = y < c.height || (!c.height && yb > c.bottom) && y > c.top && inLR
			if (c.right !== null && c.right !== undefined)
				r.right = xr < c.width || (!c.width && x > c.left ) && xr > c.right && inTB
			if (c.left !== null && c.left !== undefined)
				r.left = x < c.width || (!c.width && xr > c.right ) && x > c.left && inTB

			var result = ( (r.bottom || r.top  ) && r.left && r.right ) ||
				( (r.left || r.right) && r.bottom && r.top   )

			if (c.invert && !result || onHTMLhandle) return true
			else if( result || onHTMLhandle ) return true
		}
		return false
	}

	function drawDragHandle(h){
		var c = getHandleCoords(h)
		if (h.type == 'html') return h
		if (h.coords.hide) return h
		if (!h.drawn) {
			var e = document.createElement('div')
			e.className = 'drag-area'
			pane.appendChild(e)
			h.drawn = true
			h.ele = e

			var ti = document.createElement('div')
			ti.className = 'pane-title'
			ti.innerHTML=title
			e.appendChild(ti)

			var cl = document.createElement('div')
			cl.className = 'pane-close'
			cl.onclick=destroy
			cl.innerHTML="X"
			e.appendChild(cl)
		}

		if( c.bottom  	!== null )	h.ele.style.bottom 	= 	c.bottom 	+ "px"
		if( c.right		!== null )	h.ele.style.right 	= 	c.right 	+ "px"
		if( c.top		!== null )	h.ele.style.top 	= 	c.top 		+ "px"
		if( c.left 		!== null )	h.ele.style.left 	= 	c.left 		+ "px"
		if( c.height 	!== null )	h.ele.style.height 	= 	c.height	+ "px"
        if( c.width 	!== null )	h.ele.style.width 	= 	c.width		+ "px"
		return h
    }

	function getHandleCoords(h){
	  var DO = 25
	  var types = {
		  top: 		{top:0, 	bottom:null,	left:0, 	right:0, 	width:null, height:DO, 		invert:false},
		  bottom: 	{top:null, 	bottom:0, 		left:0, 	right:0, 	width:null, height:DO, 		invert:false},
		  left: 	{top:0, 	bottom:0, 		left:0, 	right:null, width:DO, 	height:null, 	invert:false},
		  right: 	{top:0, 	bottom:0, 		left:null, 	right:0, 	width:DO, 	height:null, 	invert:false},
		  full: 	{top:0, 	bottom:0, 		left:0, 	right:0, 	width:null, height:null, 	invert:false},
		  20:  		{top:20, 	bottom:20, 		left:20, 	right:20, 	width:null, height:null, 	invert:false},
		  none:		{top:null, 	bottom:null,	left:null, 	right:null, width:null, height:null, 	invert:false}
	  }
	  if (h.type instanceof Array)
		  h.coords = h.type
	  else if(h.type == 'html')
		  h.coords = h.ele.getBoundingClientRect()
	  else if (!h.type)
	  	  h.type = 'full'

	  if (!h.coords){
		  h.coords = types[h.type.split(' ')[0]]
		  h.coords.invert = h.type.indexOf('invert')+1
		  h.coords.hide = h.type.indexOf('hide')+1
	  }
	  return h.coords
	}

	function calc(e) {
		if(canMove()){onmovecount--;}
		if(onRightEdge || onBottomEdge || onTopEdge || onLeftEdge){onedgecount--;}

		b = pane.getBoundingClientRect();
		x = e.clientX - b.left;
		y = e.clientY - b.top;

		// define inner and outer margins
		var dMi = RESIZE_MARGIN_INNER
		var dMo = -RESIZE_MARGIN_OUTER
		var rMi = b.width - RESIZE_MARGIN_INNER
		var rMo = b.width + RESIZE_MARGIN_OUTER
		var bMi = b.height - RESIZE_MARGIN_INNER
		var bMo = b.height + RESIZE_MARGIN_OUTER
		inLR = x > dMo && x < rMo
		inTB = y > dMo && y < bMo

		onTopEdge 		= y <= dMi 	&& y > dMo && inLR;
		onLeftEdge 		= x <= dMi 	&& x > dMo && inTB;
		onBottomEdge 	= y >= bMi 	&& y < bMo && inLR;
		onRightEdge 	= x >= rMi	&& x < rMo && inTB;

		rightScreenEdge 	= e.clientX > window.innerWidth + SNAP_MARGINS;
		bottomScreenEdge 	= e.clientY > window.innerHeight + SNAP_MARGINS;
		topScreenEdge 		= e.clientY < -SNAP_MARGINS;
		leftScreenEdge 		= e.clientX < -SNAP_MARGINS;

		if(onRightEdge || onBottomEdge || onTopEdge || onLeftEdge){onedgecount++;}
		if(canMove()){onmovecount++;}
	}

	function onMove(ee) {
		calc(ee);
		e = ee;
		redraw = true;
	}

	function animate() {
		if(destroyed){return;}

		requestAnimationFrame(animate);

		if (!redraw) return;

		redraw = false;

		// style cursor
		var db = document.body;
		if (onRightEdge && onBottomEdge || onLeftEdge && onTopEdge) {
			db.style.cursor = 'nwse-resize';
		} else if (onRightEdge && onTopEdge || onBottomEdge && onLeftEdge) {
			db.body.style.cursor = 'nesw-resize';
		} else if (onRightEdge || onLeftEdge) {
			db.style.cursor = 'ew-resize';
		} else if (onBottomEdge || onTopEdge) {
			db.style.cursor = 'ns-resize';
		} else if (canMove()) {
			db.style.cursor = 'move';
		} else if (onedgecount===0 && onmovecount===0) {
			db.style.cursor = '';
		}

		// resizeing
		if (clicked && clicked.isResizing) {
			if (clicked.onRightEdge)
				pane.style.width = Math.max(x, minWidth) + "px";
			if (clicked.onBottomEdge)
				pane.style.height = Math.max(y, minHeight) + "px";
			if (clicked.onLeftEdge) {
				var currentWidth = Math.max(clicked.cx - e.clientX + clicked.w, minWidth);
				if (currentWidth > minWidth) {
					pane.style.width = currentWidth + "px";
					pane.style.left = e.clientX + "px";
				}
			}
			if (clicked.onTopEdge) {
				var currentHeight = Math.max(clicked.cy - e.clientY + clicked.h, minHeight);
				if (currentHeight > minHeight) {
					pane.style.height = currentHeight + "px";
					pane.style.top = e.clientY + "px";
				}
			}

			hintHide();
			return;
		}

		if (clicked && clicked.isMoving) {

			var bounds = getBounds()

			// Set bounds of ghost pane
			if (bounds.length) {
				bounds.unshift(ghostpane)
				setBounds.apply(this, bounds);
				ghostpane.style.opacity = 0.2;
			} else {
				hintHide();
			}

			// Unsnap with drag, set bounds to preSnap bounds
			if (preSnap) {
				preSnap.draged = true
				setBounds(pane,
					e.clientX - preSnap.width / 2,
					e.clientY - Math.min(clicked.y, preSnap.height),
					preSnap.width,
					preSnap.height
				);
				return;
			}

			// moving
			pane.style.top = (e.clientY - clicked.y) + 'px';
			pane.style.left = (e.clientX - clicked.x) + 'px';

			return;
		}

		// This code executes when mouse moves without clicking

		
	}

	animate();

	function onUp(e) {
		calc(e);

		if (clicked && clicked.isMoving) {
			// Check for Snap
			var bounds = getBounds()
			// Snap to bounds
			if (bounds.length) {
				// new snap: save preSnap size & bounds then set bounds
				preSnap = {width: b.width, height: b.height};
				bounds.unshift(pane)
				preSnap.to = bounds
				setBounds.apply(this, preSnap.to);

			// Clicked: reduce size and destroy the preSnap state
			} else if (preSnap && !preSnap.draged) {
				var o = RESIZE_MARGIN_INNER
				preSnap.to[1] += o
				preSnap.to[2] += o
				preSnap.to[3] -= o * 2
				preSnap.to[4] -= o * 2
				setBounds.apply(this, preSnap.to);
				preSnap = null;

			// Was dragged: just destroy the preSnap state
			} else {
				preSnap = null;
			}
			hintHide();
		} else if(clicked && clicked.isResizing){
			// set bounds after resize to make sure they are % as required
			setBounds(pane)
		}

		clicked = null;
	}

	function center() {
		var w = window
		var pw = w.innerWidth * .75
		var ph = w.innerHeight * .75
		setBounds(pane, (w.innerWidth / 2) - (pw / 2), (w.innerHeight / 2) - (ph / 2), pw, ph);
	}

	function destroy(){
		pane.parentElement.removeChild(pane);
		ghostpane.parentElement.removeChild(ghostpane);
		destroyed=true;
	}

	// utility functions
	function hasHTMLElement(a) {
		for (var i in a) if (i instanceof HTMLElement) return true
	}

	function bindEvents(ele, events, callback) {
		events = events.split(' ')
		for (var e in events) ele.addEventListener(events[e], callback)
	}

	return {
		togglePercent: togglePercent,
		restorePreSnap:restorePreSnap,
		center: center,
		content: content,
		destroy: destroy
	}
}
return {makeDRS:makeDRS}
}()

function addNewPane(title, contentID, percentageBounds){
	var e = document.createElement('div')
		e.className = 'pane'
		document.body.appendChild(e)
	return core.util.DRS.makeDRS(e, 'top', null, title, contentID, percentageBounds)
}
