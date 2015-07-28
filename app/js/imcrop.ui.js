(function() {
    this.IMCropUI = function(){};

    IMCropUI.Toggle = function(id, onClick) {
        var _id = id;
        var _on = false;
        var _element;
        var _onClick = onClick;
        var _this = this;

        _element = document.getElementById(_id);
        if (!_element) {
            console.log('Element not found: ' + _id);
            return;
        }

        if (_element.classList.contains('on')) {
            _on = true;
        }

        Object.defineProperty(
            this,
            'on',
            {
                get: function() {
                    return _on;
                },
                set: function(value) {
                    _on = value;
                    if (value && !_element.classList.contains('on')) {
                        _element.classList.add('on');
                    }
                    else if (!value && _element.classList.contains('on')) {
                        _element.classList.remove('on');
                    }

                }
            }
        );

        _element.addEventListener(
            'click',
            function(event) {
                this.classList.toggle('on');
                event.preventDefault();
                event.stopPropagation();

                _on = this.classList.contains('on');

                if (typeof _onClick == 'function') {
                    _onClick.call(_this, event);
                }

                return false;
            }
        );
    };

    IMCropUI.Button = function(id, onClick) {
        var _id = id;
        var _element;
        var _onClick = onClick;
        var _this = this;

        _element = document.getElementById(_id);
        if (!_element) {
            console.log('Element not found: ' + _id);
            return;
        }

        _element.addEventListener(
            'click',
            function(event) {
                event.preventDefault();
                event.stopPropagation();

                if (typeof _onClick == 'function') {
                    _onClick.call(_this, event);
                }

                return false;
            }
        );
    };
})();

