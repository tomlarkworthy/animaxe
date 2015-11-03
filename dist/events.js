/**
 *
 */
var Events = (function () {
    function Events() {
        this.mousedowns = [];
        this.mouseups = [];
    }
    /**
     * clear all the events, done by animator at the end of a tick
     */
    Events.prototype.clear = function () {
        this.mousedowns = [];
        this.mouseups = [];
    };
    return Events;
})();
exports.Events = Events;
var AxMouseEvent = (function () {
    function AxMouseEvent() {
    }
    return AxMouseEvent;
})();
exports.AxMouseEvent = AxMouseEvent;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV2ZW50cy50cyJdLCJuYW1lcyI6WyJFdmVudHMiLCJFdmVudHMuY29uc3RydWN0b3IiLCJFdmVudHMuY2xlYXIiLCJBeE1vdXNlRXZlbnQiLCJBeE1vdXNlRXZlbnQuY29uc3RydWN0b3IiXSwibWFwcGluZ3MiOiJBQUVBOztHQUVHO0FBQ0g7SUFBQUE7UUFDSUMsZUFBVUEsR0FBZUEsRUFBRUEsQ0FBQ0E7UUFDNUJBLGFBQVFBLEdBQWVBLEVBQUVBLENBQUNBO0lBUzlCQSxDQUFDQTtJQVBHRDs7T0FFR0E7SUFDSEEsc0JBQUtBLEdBQUxBO1FBQ0lFLElBQUlBLENBQUNBLFVBQVVBLEdBQUdBLEVBQUVBLENBQUNBO1FBQ3JCQSxJQUFJQSxDQUFDQSxRQUFRQSxHQUFHQSxFQUFFQSxDQUFDQTtJQUN2QkEsQ0FBQ0E7SUFDTEYsYUFBQ0E7QUFBREEsQ0FYQSxBQVdDQSxJQUFBO0FBWFksY0FBTSxTQVdsQixDQUFBO0FBRUQ7SUFBQUc7SUFFQUMsQ0FBQ0E7SUFBREQsbUJBQUNBO0FBQURBLENBRkEsQUFFQ0EsSUFBQTtBQUZZLG9CQUFZLGVBRXhCLENBQUEiLCJmaWxlIjoiZXZlbnRzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IEF4ID0gcmVxdWlyZShcIi4vYW5pbWF4ZVwiKTtcblxuLyoqXG4gKlxuICovXG5leHBvcnQgY2xhc3MgRXZlbnRzIHtcbiAgICBtb3VzZWRvd25zOiBBeC5Qb2ludFtdID0gW107XG4gICAgbW91c2V1cHM6IEF4LlBvaW50W10gPSBbXTtcblxuICAgIC8qKlxuICAgICAqIGNsZWFyIGFsbCB0aGUgZXZlbnRzLCBkb25lIGJ5IGFuaW1hdG9yIGF0IHRoZSBlbmQgb2YgYSB0aWNrXG4gICAgICovXG4gICAgY2xlYXIoKSB7XG4gICAgICAgIHRoaXMubW91c2Vkb3ducyA9IFtdO1xuICAgICAgICB0aGlzLm1vdXNldXBzID0gW107XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQXhNb3VzZUV2ZW50IHtcblxufSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
