function stopEvent(evt) {
	if(evt.preventDefault) {
		evt.preventDefault();
	} else {
		evt.returnValue = false;
	}
	if(evt.stopPropagation) { 
		evt.stopPropagation();
	} else {
		evt.cancelBubble = true;
	}
}

function Annotator(el) {
	this.el = (el && $(el)) || $('body');
	this.annotation = null;
	this.annotations = [];
}

Annotator.prototype._resetDiffPos = function() {
	this.diffX = this.el.offset().left + (this.el.outerWidth() - this.el.innerWidth()) / 2;
	this.diffY = this.el.offset().top + (this.el.outerHeight() - this.el.innerHeight()) / 2;
}

Annotator.prototype._render = function() {
	var self = this;
	var tpl = [
		'<div class="annotation-container">',
			'<div class="border"></div>',
			'<div class="n-annotation"><div class="number"></div></div>',
			'<a href="javascript:;" class="delete"></a>',
			'<div class="corner bottom-left"></div>',
			'<div class="corner bottom-right"></div>',
			'<div class="annotation-body">',
				'<span class="arrow"></span>',
				'<p class="annotation"></p>',
				'<textarea></textarea>',
				'<button disabled>OK</button>',
			'</div>',
		'</div>'
	];
	this.annotation = $(tpl.join(''))
	this.el.append(this.annotation);
	this.annotations.push(this.annotation)
	this.annotation.find('.number').text(this.annotations.length);

	this.annotation.data('num', this.annotations.length - 1);
	this.annotation.data('newer', true);
}

Annotator.prototype._removeAnnotation = function(annotation) {
	var num = annotation.data('num');
	for(var len = this.annotations.length; len--;) {
		if(len === num) {
			this.annotations[len].remove();
			this.annotations.splice(len, 1);
			return;
		}
		this.annotations[len].find('.number').text(len).end().data('num', len - 1);
	}
}

Annotator.prototype._bindAnnotationEvent = function() {
	var self = this;
	this.annotation.find('.delete').on('click', function(evt) {
		var annotation = $(this).closest('.annotation-container'), newer = !!annotation.data('newer');
		self._removeAnnotation(annotation);
		if(newer) {
			self.annotation = null;
		}
		stopEvent(evt);
	}).on('mousedown mouseup', function(evt) {
		stopEvent(evt);
	});

	this.annotation.find('.bottom-right.corner').on('mousedown', function(evt) {
		var  annotation = $(this).closest('.annotation-container'), startX = annotation.position().left, startY = annotation.position().top;
		var handle = function(evt) {
			annotation.css({width: Math.max(evt.pageX - self.diffX - startX, 20), height: Math.max(evt.pageY - self.diffY - startY, 20)});
			var annotationBody = annotation.find('.annotation').hide().closest('.annotation-body');
		}

		$(document).on('mousemove', handle).one('mouseup', function(evt) {
			$(document).off('mousemove', handle);
		});

		stopEvent(evt);
	});
	this.annotation.find('.bottom-left.corner').on('mousedown', function(evt) {
		var annotation = $(this).closest('.annotation-container'),
			startX = annotation.position().left, 
			startY = annotation.position().top,
			startWidth = annotation.width(),
			startHeight = annotation.height(),
			maxX = startX + startWidth - 20;
		var handle = function(evt) {
			annotation.css({left: evt.pageX - self.diffX > maxX ? maxX : evt.pageX - self.diffX , width: Math.max(startWidth + (self.diffX + startX - evt.pageX), 20), height: Math.max(evt.pageY - startY - self.diffY, 20)});
		}

		$(document).on('mousemove', handle).one('mouseup', function(evt) {
			$(document).off('mousemove', handle);
		});
		stopEvent(evt);
	});
	this.annotation.find('.border').on('mousedown', function(evt) {
		var annotation = $(this).closest('.annotation-container');
		if(annotation.hasClass('completed')) return;

		var diffX = annotation.position().left - evt.pageX,
		 	diffY = annotation.position().top - evt.pageY,
		 	maxLeft = self.el.innerWidth() - annotation.outerWidth(),
		 	maxTop = self.el.innerHeight() - annotation.outerHeight();
		var handle = function(evt) {
			annotation.css({left: Math.min(maxLeft, Math.max(0, evt.pageX + diffX)), top: Math.min(maxTop, Math.max(0, evt.pageY + diffY))});
			if(annotation.data('completed')) {
				self._resetAnnotationStatus(annotation)
			}
		}

		$(document).on('mousemove', handle).one('mouseup', function(evt) {
			$(document).off('mousemove', handle);
		});
		stopEvent(evt);
	});
	this.annotation.find('.annotation-body').on('click mousedown', function(evt) {
		if(evt.stopPropagation) { 
		evt.stopPropagation();
		} else {
			evt.cancelBubble = true;
		}
	});
	this.annotation.find('.annotation-body textarea').on('keyup', function(evt) {
		var annotation = $(this).closest('.annotation-container');
		if(evt.keyCode === 13 && this.value) {
			annotation.find('.annotation-body button').trigger('click');
			return;
		}
		if(this.value) {
			annotation.find('.annotation-body button').removeAttr('disabled');
		} else {
			annotation.find('.annotation-body button').attr('disabled', 'disabled');
		}
	});
	this.annotation.find('.annotation-body button').on('click', function(evt) {
		var annotation = $(this).closest('.annotation-container');
		//annotationBody.css('bottom', -(annotationBody.outerHeight() + 15));
		self._resetAnnotationStatus(annotation);
	});
}

Annotator.prototype._resetAnnotationBodyPos = function(annotation) {
	var annotationBody = annotation.find('.annotation-body');
	return annotationBody.css('bottom', -(annotationBody.outerHeight() + 15));
}

Annotator.prototype._resetAnnotationStatus = function(annotation) {
	var completed = !annotation.data('completed'), annotationBody = annotation.find('.annotation-body'), newer = annotation.data('newer');
	if(completed) {
		annotation.find('.annotation').text(annotation.find('.annotation-body textarea')[0].value).show();
		annotationBody.find('textarea, button').hide();
		this._resetAnnotationBodyPos(annotation);
		annotation.find('.border').hover(function() {
			annotationBody.fadeIn(300);
		}, function() {
			annotationBody.fadeOut(500);
		});
		setTimeout(function() {
			annotationBody.fadeOut(600);
		}, 200);
		annotation.find('.corner').hide();
		if(newer) {
			this.annotation = null
		}
		annotation.data('newer', false)
	} else {
		annotation.find('.corner').show();
		annotationBody.stop().fadeIn(0).find('textarea, button').show().end().find('.annotation').hide();
		annotationBody.find('textarea').focus()[0].value = '';
		annotationBody.find('button').attr('disabled', 'disabled');
		annotation.find('.border').off('mouseenter mouseleave');
		this._resetAnnotationBodyPos(annotation);
	}
	annotation.data('completed', completed);
}

Annotator.prototype._bindEvent = function() {
	var self = this;
	this.el.on('mousedown', function(evt) {
		var start = +new Date(), moved = false, startX = evt.pageX, startY = evt.pageY;
		var handle = function(evt) {
			if(Math.abs(evt.pageX - startX) > 10 || Math.abs(evt.pageY - startY) > 10) {
				moved = true;
				if(!self.annotation) {
					self._render();
					self._bindAnnotationEvent();
				}
				self.annotation.css({top: startY - self.diffY, left: startX - self.diffX + 8, width: Math.max(evt.pageX - startX, 20), height: Math.max(evt.pageY - startY, 20), display: 'block'});
				self._resetAnnotationBodyPos(self.annotation).fadeIn(300);
				self.el.css('cursor', 'auto');
			} else {
				moved = false;
			}
		}
		$(document).on('mousemove', handle);

		$(document).one('mouseup', function(evt) {
			$(document).off('mousemove', handle);
			// if(Math.abs(evt.pageX - startX) < 20 && Math.abs(evt.pageY - startY) < 20) {
			// 	self.annotation.remove();
			// 	self.annotation = null;
			// }
			if(!moved && +(new Date()) - start > 200) {
				self._render();
				self._bindAnnotationEvent();
				self.annotation.css({top: evt.pageY - self.diffY - 50 , left: evt.pageX - self.diffX - 50, width: 100, height: 100, display: 'block'});
				self._resetAnnotationBodyPos(self.annotation).fadeIn(300);
			}
			self.el.css('cursor', 'crosshair');
		});	
		stopEvent(evt);
	});
}

Annotator.prototype._draw = function(annotations) {
	var toString = Object.prototype.toString;
	if(toString.call(annotations) === '[object Object]') {
		annotations = [annotations];
	}
	if(toString.call(annotations) === '[object Array]') {
		for(var i = 0, len = annotations.length; i < len; i++) {
			var annotation = annotations[i];
			this._render();
			this.annotation.css({top: annotation.top, left: annotation.left, width: annotation.width, height: annotation.height, display: 'block'}).addClass('completed');
			this.annotation.find('.annotation-body textarea')[0].value = annotation.text;
			this.annotation.find('.number').text(i + 1);
			this._resetAnnotationStatus(this.annotation);
		}
	}
}

Annotator.prototype._init = function(annotations) {
	var self = this;
	if(this.el.css('position') === 'static') {
		this.el.css('position', 'relative');
	}
	this.el.css('cursor', 'crosshair');
	this._resetDiffPos();
	$(window).resize(function() {
		self._resetDiffPos();
	});
	if(annotations) {
		this._draw(annotations);
	}
}

Annotator.prototype.all = function() {
	var data = [];
	for(var i = 0, len = this.annotations.length; i < len; i++) {
		var annotation = this.annotations[i];
		if(annotation.data('completed')) {
			data.push({top: annotation.position().top, left: annotation.position().left, width: annotation.width(), heigth: annotation.height(), text: annotation.find('.annotation-body textarea')[0].value});
		}
	}
	return data;
}

Annotator.prototype.save = function() {
	this.el.children('.annotation-container').each(function() {
		var annotation = $(this);
		if(annotation.data('completed')) annotation.addClass('completed');
	});
}

Annotator.prototype.clear = function() {
	this.el.find('.annotation-container').remove();
	this.annotations = [];
}

Annotator.prototype.init = function(annotations) {
	this._init(annotations);
	this._bindEvent();
}


