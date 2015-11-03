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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV2ZW50cy50cyJdLCJuYW1lcyI6WyJFdmVudHMiLCJFdmVudHMuY29uc3RydWN0b3IiLCJFdmVudHMuY2xlYXIiLCJBeE1vdXNlRXZlbnQiLCJBeE1vdXNlRXZlbnQuY29uc3RydWN0b3IiXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBQ0g7SUFBQUE7UUFDSUMsZUFBVUEsR0FBaUJBLEVBQUVBLENBQUNBO1FBQzlCQSxhQUFRQSxHQUFpQkEsRUFBRUEsQ0FBQ0E7SUFTaENBLENBQUNBO0lBUEdEOztPQUVHQTtJQUNIQSxzQkFBS0EsR0FBTEE7UUFDSUUsSUFBSUEsQ0FBQ0EsVUFBVUEsR0FBR0EsRUFBRUEsQ0FBQ0E7UUFDckJBLElBQUlBLENBQUNBLFFBQVFBLEdBQUdBLEVBQUVBLENBQUNBO0lBQ3ZCQSxDQUFDQTtJQUNMRixhQUFDQTtBQUFEQSxDQVhBLEFBV0NBLElBQUE7QUFYWSxjQUFNLFNBV2xCLENBQUE7QUFFRDtJQUFBRztJQUVBQyxDQUFDQTtJQUFERCxtQkFBQ0E7QUFBREEsQ0FGQSxBQUVDQSxJQUFBO0FBRlksb0JBQVksZUFFeEIsQ0FBQSIsImZpbGUiOiJldmVudHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBFdmVudHMge1xuICAgIG1vdXNlZG93bnM6IE1vdXNlRXZlbnRbXSA9IFtdO1xuICAgIG1vdXNldXBzOiBNb3VzZUV2ZW50W10gPSBbXTtcblxuICAgIC8qKlxuICAgICAqIGNsZWFyIGFsbCB0aGUgZXZlbnRzLCBkb25lIGJ5IGFuaW1hdG9yIGF0IHRoZSBlbmQgb2YgYSB0aWNrXG4gICAgICovXG4gICAgY2xlYXIoKSB7XG4gICAgICAgIHRoaXMubW91c2Vkb3ducyA9IFtdO1xuICAgICAgICB0aGlzLm1vdXNldXBzID0gW107XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQXhNb3VzZUV2ZW50IHtcblxufSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
