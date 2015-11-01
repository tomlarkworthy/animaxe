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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV2ZW50cy50cyJdLCJuYW1lcyI6WyJFdmVudHMiLCJFdmVudHMuY29uc3RydWN0b3IiLCJFdmVudHMuY2xlYXIiXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBQ0g7SUFBQUE7UUFDSUMsZUFBVUEsR0FBaUJBLEVBQUVBLENBQUNBO1FBQzlCQSxhQUFRQSxHQUFpQkEsRUFBRUEsQ0FBQ0E7SUFTaENBLENBQUNBO0lBUEdEOztPQUVHQTtJQUNIQSxzQkFBS0EsR0FBTEE7UUFDSUUsSUFBSUEsQ0FBQ0EsVUFBVUEsR0FBR0EsRUFBRUEsQ0FBQ0E7UUFDckJBLElBQUlBLENBQUNBLFFBQVFBLEdBQUdBLEVBQUVBLENBQUNBO0lBQ3ZCQSxDQUFDQTtJQUNMRixhQUFDQTtBQUFEQSxDQVhBLEFBV0NBLElBQUE7QUFYWSxjQUFNLFNBV2xCLENBQUEiLCJmaWxlIjoiZXZlbnRzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKlxuICovXG5leHBvcnQgY2xhc3MgRXZlbnRzIHtcbiAgICBtb3VzZWRvd25zOiBNb3VzZUV2ZW50W10gPSBbXTtcbiAgICBtb3VzZXVwczogTW91c2VFdmVudFtdID0gW107XG5cbiAgICAvKipcbiAgICAgKiBjbGVhciBhbGwgdGhlIGV2ZW50cywgZG9uZSBieSBhbmltYXRvciBhdCB0aGUgZW5kIG9mIGEgdGlja1xuICAgICAqL1xuICAgIGNsZWFyKCkge1xuICAgICAgICB0aGlzLm1vdXNlZG93bnMgPSBbXTtcbiAgICAgICAgdGhpcy5tb3VzZXVwcyA9IFtdO1xuICAgIH1cbn0iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
