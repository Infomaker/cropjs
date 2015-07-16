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
})();

