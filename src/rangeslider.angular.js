(function(RangeSlider) {
  RangeSlider.directive('mfRangeSlider', function($document, $window, $timeout) {
    return {
      restrict: 'E',
      require: 'ngModel',
      replace: true,
      scope: {
        'onInit': '&',
        'onSlide': '&',
        'onSlideEnd': '&',
        'step': '@',
        'min': '@',
        'max': '@'
      },
      template: '<div class="rangeslider">' +
        '<div class="rangeslider__fill"></div>' +
        '<div class="rangeslider__handle"></div>' +
        '</div>',
      link: function link(scope, iElement, iAttrs, ngModel) {
        var $element   = angular.element(iElement),
            elementID  = 'js-mf-range-slider-' + (+new Date()),
            startEvent = ['mousedown.rangeslider', 'touchstart.rangeslider', 'pointerdown.rangeslider'].join(' '),
            moveEvent  = ['mousemove.rangeslider', 'touchmove.rangeslider', 'pointermove.rangeslider'].join(' '),
            endEvent   = ['mouseup.rangeslider', 'touchend.rangeslider', 'pointerup.rangeslider'].join(' '),
            $fill      = $element.children()[0],
            $handle    = $element.children()[1],
            handleWidth,
            rangeWidth,
            maxHandleX,
            grabX,
            position;

        scope.min = parseFloat(scope.min)   || 0;
        scope.max = parseFloat(scope.max)   || 100;
        scope.step = parseFloat(scope.step) || 1;

        $element.attr('id', elementID);
        $element = $element[0];

        // Set initial state
        update();
        
        if (scope.onInit && angular.isFunction(scope.onInit)) {
          scope.onInit();
        }

        /**
         * Returns a debounced function that will make sure the given
         * function is not triggered too much.
         *
         * @param  {Function} fn Function to debounce.
         * @param  {Number}   debounceDuration OPTIONAL. The amount of time in milliseconds for which we will debounce the function. (defaults to 100ms)
         * @return {Function}
         */
        function debounce(fn, debounceDuration) {
          debounceDuration = debounceDuration || 100;

          return function() {
            if (!fn.debouncing) {
              var args = Array.prototype.slice.apply(arguments);
              fn.lastReturnVal = fn.apply(window, args);
              fn.debouncing = true;
            }
            clearTimeout(fn.debounceTimeout);
            fn.debounceTimeout = setTimeout(function(){
              fn.debouncing = false;
            }, debounceDuration);

            return fn.lastReturnVal;
          };
        }

        function update() {

          // Update control-wide variables
          handleWidth  = $handle.offsetWidth;
          rangeWidth   = $element.offsetWidth;
          maxHandleX   = rangeWidth - handleWidth;
          grabX        = handleWidth / 2;
          position     = getPositionFromValue(ngModel.$modelValue);

          setPosition(position);
        };

        function handleDown(e) {
          e.preventDefault();
          $document.on(moveEvent, handleMove);
          $document.on(endEvent, handleEnd);

          // If we click on the handle don't set the new position
          if ((' ' + e.target.className + ' ').replace(/[\n\t]/g, ' ').indexOf('rangeslider__handle') > -1) {
            return;
          }

          // We have clicked on the actual range
          var posX = getRelativePosition($element, e),
              handleX = getPositionFromNode($handle) - getPositionFromNode($element);

          setPosition(posX - grabX);

          if (posX >= handleX && posX < handleX + handleWidth) {
            grabX = posX - handleX;
          }
        };

        function handleMove(e) {
          e.preventDefault();

          var posX = getRelativePosition($element, e);
          setPosition(posX - grabX);
        };

        function handleEnd(e) {
          e.preventDefault();

          $document.off(moveEvent, handleMove);
          $document.off(endEvent, handleEnd);

          var posX = getRelativePosition($element, e);
          if (scope.onSlideEnd && angular.isFunction(scope.onSlideEnd)) {
            scope.onSlideEnd({
              left: posX - grabX,
              value: ngModel.$modelValue
            });
          }
        };

        function cap(pos, min, max) {
          if (pos < min) { return min; }
          if (pos > max) { return max; }
          return pos;
        };

        function setPosition(pos) {
          var value, left;

          // Snapping steps
          value = (
            getValueFromPosition(cap(pos, 0, maxHandleX)) /
            scope.step
          ) * scope.step;

          left = getPositionFromValue(value);

          // Update ui
          $fill.style.width = (left + grabX)  + 'px';
          $handle.style.left = left + 'px';

          // Update globals
          position = left;

          // Update model
          ngModel.$modelValue = value;

          if (scope.onSlide && angular.isFunction(scope.onSlide)) {
            scope.onSlide({
              left: left, 
              value: value
            });
          }
        };

        function getPositionFromNode(node) {
          var i = 0;
          while (node) {
            i += node.offsetLeft;
            node = node.offsetParent;
          }
          return i;
        };

        function getRelativePosition(node, e) {
          return (
            e.pageX ||
            e.originalEvent.clientX ||
            e.originalEvent.touches[0].clientX ||
            e.currentPoint.x
          ) - getPositionFromNode(node);
        };

        function getPositionFromValue(value) {
          var percentage, pos;
          percentage = (value - scope.min) / (scope.max - scope.min);
          pos = percentage * maxHandleX;
          return pos;
        };

        function getValueFromPosition(pos) {
          var percentage,
              value;
          
          percentage = (pos) / (maxHandleX);
          value = scope.step * Math.ceil(
            (
              (
                (percentage) * (scope.max - scope.min)
              ) + scope.min
            ) / scope.step
          );
          
          return Number((value).toFixed(2));
        };

        // Bind events
        $document.on(startEvent, '#' + elementID, handleDown);
        angular.element($window).on('resize.' + elementID, debounce(function() {
          // Simulate resizeEnd event.
          $timeout(update, 300);
        }, 20));

        scope.$watch(function() {
          return ngModel.$modelValue;
        }, function(newVal, oldVal) {
          if (newVal !== oldVal) {
            var pos = getPositionFromValue(newVal);
            setPosition(pos);
          }
        });

        scope.$destroy(function() {
          $document.off(startEvent, '#' + elementID, handleDown);
          angular.element($window).off('resize.' + elementID);
        });

      } // End Link
    }; // End Directive
  });
})(angular.module('mfRangeSlider', []));