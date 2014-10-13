var EDITING = 0,
	SAVED = 1,
	COMPLETED = 2;

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

function toPercentageString(num) {
	return keepPrecision(num * 100) + '%';
}

function keepPrecision(num, precision) {
	precision = precision || 2;
	if(!num) {
		return 0;
	}
	return Math.round(num *  Math.pow(10, 2)) / Math.pow(10, 2);
}

/**Note Class**/
function Note(container) {
	this.$el = this._new();
	this.container = container;
	this._status = EDITING;//0 editing 1 saved 2 completed
}

Note.prototype._new = function() {
	var tpl = [
		'<div class="note">',
			'<div class="border"></div>',
			'<div class="n-note"><div class="number"></div></div>',
			'<a href="javascript:;" class="delete"></a>',
			'<div class="corner bottom-left"></div>',
			'<div class="corner bottom-right"></div>',
			'<div class="note-body">',
				'<span class="arrow"></span>',
				'<p class="text"></p>',
				'<textarea></textarea>',
				'<button disabled>OK</button>',
			'</div>',
		'</div>'
	], $el;
	$el = $(tpl.join(''));
	return $el;
}

Note.prototype.resetUI = function(setting, numOnly) {
	if(setting.num || typeof setting.num !== 'undefined') {
		this.$el.find('.number').text(setting.num);
		if(numOnly) return this;
	}
	if(setting.text) {
		this.$el.find('.note-body textarea')[0].value = setting.text;
	}
	this.$el.css({left: setting.left || 0, top: setting.top || 0, width: setting.width || 0, height: setting.height || 0});
	return this;
}

Note.prototype.resetNotePos = function() {
	var noteBody = this.$el.find('.note-body');
	noteBody.css('bottom', -(noteBody.outerHeight() + 15));
	return this;
}

Note.prototype.show = function() {
	this.$el.show();
	return this;
}

Note.prototype.hide = function() {
	this.$el.hide();
	return this;
}

Note.prototype.showNote = function(animate) {
	if(animate) {
		this.$el.find('.note-body').fadeIn(300);		
	} else {
		this.$el.find('.note-body').show();
	}
	return this;
}

Note.prototype.hideNote = function(animate) {
	if(animate) {
		this.$el.find('.note-body').fadeOut(300);
	} else {
		this.$el.find('.note-body').hide();
	}
	return this;
}

Note.prototype.bindEvent = function() {
	var self = this;
	this.$el.find('.delete').on('click', function(evt) {
		self.destroy();
		self.container._removeNote(self);
		stopEvent(evt);
	}).on('mousedown mouseup', function(evt) {
		stopEvent(evt);
	});

	this.$el.find('.bottom-right.corner').on('mousedown', function(evt) {
		var pos = self.$el.position(),
			startX = pos.left, 
			startY = pos.top,
			maxWidth = self.container.$el.innerWidth() - startX,
			maxHeight = self.container.$el.innerHeight() - startY;
		var handle = function(evt) {
			self.$el.css({width: Math.min(Math.max(evt.pageX - self.container.elOffsetX - startX, 20), maxWidth), height: Math.min(Math.max(evt.pageY - self.container.elOffsetY - startY, 20), maxHeight)});
		}
		$(document).on('mousemove', handle).one('mouseup', function(evt) {
			$(document).off('mousemove', handle);
		});
		stopEvent(evt);
	});
	this.$el.find('.bottom-left.corner').on('mousedown', function(evt) {
		var pos = self.$el.position(),
			startX = pos.left, 
			startY = pos.top,
			startWidth = self.$el.width(),
			startHeight = self.$el.height(),
			maxX = startX + startWidth - 20,
			maxWidth = startWidth + startX,
			maxHeight = self.container.$el.innerHeight() - startY;

		var handle = function(evt) {
			self.$el.css({left: Math.min(Math.max(evt.pageX - self.container.elOffsetX, 0), maxX), width: Math.min(Math.max(startWidth + (self.container.elOffsetX + startX - evt.pageX), 20), maxWidth), height: Math.min(Math.max(evt.pageY - startY - self.container.elOffsetY, 20), maxHeight)});
		}
		$(document).on('mousemove', handle).one('mouseup', function(evt) {
			$(document).off('mousemove', handle);
		});
		stopEvent(evt);
	});

	this.$el.find('.border').on('mousedown', function(evt) {
		var note = $(this).closest('.note'),
			cel = self.container.$el;
		if(note.hasClass('completed')) return;

		var diffX = note.position().left - evt.pageX,
		 	diffY = note.position().top - evt.pageY,
		 	maxLeft = cel.innerWidth() - note.outerWidth(),
		 	maxTop = cel.innerHeight() - note.outerHeight();

		var handle = function(evt) {
			self.$el.css({left: Math.min(maxLeft, Math.max(0, evt.pageX + diffX)), top: Math.min(maxTop, Math.max(0, evt.pageY + diffY))});
			self.edit();
		}

		$(document).on('mousemove', handle).one('mouseup', function(evt) {
			$(document).off('mousemove', handle);
		});
		stopEvent(evt);
	});
	this.$el.find('.note-body').on('click mousedown', function(evt) {
		if(evt.stopPropagation) { 
			evt.stopPropagation();
		} else {
			evt.cancelBubble = true;
		}
	});
	this.$el.find('.note-body textarea').on('keyup', function(evt) {
		if(evt.keyCode === 13 && this.value) {
			self.$el.find('.note-body button').trigger('click');
			return;
		}
		if(this.value) {
			self.$el.find('.note-body button').removeAttr('disabled');
		} else {
			self.$el.find('.note-body button').attr('disabled', 'disabled');
		}
	});
	this.$el.find('.note-body button').on('click', function(evt) {
		self.save(false);
	});
	return this;
}

Note.prototype.status = function() {
	return this._status;
}

Note.prototype.get = function() {
	var pos = this.$el.position(), cw = this.container.elWidth, ch = this.container.elHeight;
	return {
		top: keepPrecision(pos.top / ch),
		left: keepPrecision(pos.left / cw),
		width: keepPrecision(this.$el.width() / cw),
		height: keepPrecision(this.$el.height() / ch),
		text: this.$el.find('.note-body textarea').val()
	};
}

Note.prototype.save = function(isCompleted) {
	var noteBody = this.$el.find('.note-body');
	this._status = SAVED;
	if(isCompleted) {
		this._status = COMPLETED;
		this.$el.addClass('completed');
	}
	this.$el.find('.text').text(noteBody.find('textarea')[0].value).show();
	noteBody.find('textarea, button').hide();
	this.$el.find('.border').on('mouseenter', function() {
		noteBody.stop(true, false).fadeIn(300);
	}).on('mouseleave', function() {
		noteBody.fadeOut(500);
	});
	setTimeout(function() {
		noteBody.fadeOut(600);
	}, 200);
	this.$el.find('.corner').hide();
	this.resetNotePos();
	return this;
}

Note.prototype.edit = function() {
	var noteBody = this.$el.find('.note-body');
	this.$el.removeClass('completed');
	noteBody.stop(true, false).fadeIn(0).find('textarea, button').show().end().find('.text').hide();
	noteBody.find('textarea').focus().val('').show();
	noteBody.find('button').attr('disabled', 'disabled').show();
	this.$el.find('.border').off('mouseenter mouseleave');
	this.$el.find('.corner').show();
	this.resetNotePos();
	return this;
}

Note.prototype.destroy = function() {
	this.$el.remove();
	return this;
}

/**Notor Class**/
function Notor(el) {
	this.$el = (el && $(el)) || $('body');
	this.notes = [];
	this.elWidth = this.$el.width();
	this.elHeight = this.$el.height();
	this.elOffsetX = 0;
	this.elOffsetY = 0;
}

Notor.prototype._removeNote = function(note) {
	for(var len = this.notes.length; len--;) {
		if(this.notes[len] === note) {
			this.notes.splice(len, 1);
			return;
		}
		this.notes[len].resetUI({num: len}, true);
	}
}
/**
*	todo: Under IE8 pageX, pageY ingore body's border 
*/
Notor.prototype._resetDiffPos = function() {
	this.elOffsetX = this.$el.offset().left + (this.$el.outerWidth() - this.$el.innerWidth()) / 2;
	this.elOffsetY = this.$el.offset().top + (this.$el.outerHeight() - this.$el.innerHeight()) / 2;
}

Notor.prototype._draw = function(initialNotes) {
	var note;
	if(!initialNotes) {
		note = new Note(this).resetUI({num: this.notes.length + 1}, true);
		this.notes.push(note);
		this.$el.append(note.$el);
		return note;
	} else {
		var toString = Object.prototype.toString;
		if(toString.call(initialNotes) === '[object Object]') {
			initialNotes = [initialNotes];
		}
		if(toString.call(initialNotes) === '[object Array]') {
			for(var i = 0, len = initialNotes.length; i < len; i++) {
				var initial = initialNotes[i];
				initial.num = i + 1;
				initial.top = toPercentageString(initial.top);
				initial.left = toPercentageString(initial.left);
				initial.width = toPercentageString(initial.width);
				initial.height = toPercentageString(initial.height);
				note = new Note(this).resetUI(initial).save(true).show();
				this.$el.append(note.$el);
				note.resetNotePos();
				this.notes.push(note);
			}
		}
	}
}

Notor.prototype._bindEvent = function() {
	var self = this;
	this.$el.on('mousedown', function(evt) {
		var start = +new Date(), moved = false, startX = evt.pageX, startY = evt.pageY;
		var _handle = function(evt) {
			if(Math.abs(evt.pageX - startX) > 10 || Math.abs(evt.pageY - startY) > 10) {
				moved = true;
				var len = self.notes.length, 
					note = self.notes[len - 1];
				if(!(note && note.status() === EDITING)) {
					note = self._draw().bindEvent();
				}
				var top = startY - self.elOffsetY,
					left = startX - self.elOffsetX + 8,
					maxWidth = self.$el.innerWidth() - left,
					maxHeight = self.$el.innerHeight() - top;
				_handle = function(evt) {
					note.resetUI({top: top, left: left, width: Math.min(Math.max(evt.pageX - startX, 20), maxWidth), height: Math.min(Math.max(evt.pageY - startY, 20), maxHeight)}).show().resetNotePos().showNote();
					stopEvent(evt);
				}
				self.$el.css('cursor', 'auto');
			} else {
				moved = false;
			}
			stopEvent(evt);
		};
		var handle = function(evt) {
			_handle(evt);
		};
		$(document).on('mousemove', handle).one('mouseup', function(evt) {
			$(document).off('mousemove', handle);
			if(!moved && +(new Date()) - start > 200) {
				self._draw().bindEvent().resetUI({top: evt.pageY - self.elOffsetY - 50 , left: evt.pageX - self.elOffsetX - 50, width: 100, height: 100}).show().resetNotePos().showNote(true);
			}
			self.$el.css('cursor', 'crosshair');
		});	
		stopEvent(evt);
	});

	$(window).resize(function() {
		self._resetDiffPos();
	});
}

Notor.prototype._init = function(initialNotes) {
	var self = this;
	if(this.$el.css('position') === 'static') {
		this.$el.css('position', 'relative');
	}
	this.$el.css('cursor', 'crosshair');
	this._resetDiffPos();
	if(initialNotes) {
		this._draw(initialNotes);
	}
}

Notor.prototype.save = function() {
	for(var i = 0, len = this.notes.length; i < len; i++) {
		this.notes[i].save(true);
	}
}

Notor.prototype.all = function() {
	var data = [], len = this.notes.length, note = this.notes[len - 1];
	if(note && note.status() === EDITING) {
		len--;
	}
	for(var i = 0; i < len; i++) {
		data.push(this.notes[i].get());
	}
	return data;
}

Notor.prototype.readonly = function() {
	this.$el.off('mousedown');
}

Notor.prototype.edit = function() {
	this._bindEvent();
}

Notor.prototype.init = function(initialNotes) {
	this._init(initialNotes);
	this._bindEvent();
}