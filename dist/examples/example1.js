var Ax = require("../src/animaxe");
var helper = require("../src/helper");
var animator = helper.getExampleAnimator();
Ax.DEBUG = true;
//2 frame animated glow
function spark(color) {
    return Ax.create()
        .take(1)
        .fillRect([-5, -5], [10, 10])
        .then(Ax.create().take(1).fillRect([-2, -2], [5, 5]));
}
// move the drawing context frame of reference to the center (50,50) and then move it by a +ve x velocity,
// so the frame of reference moves over time.
// then draw our 2 frame spark animation in a loop so it draws forever
animator.play(Ax.create()
    .pipe(spark("#FF00FF")));
// move the draw context to a coordinate determined by trig (i.e. in a circle)
/*
animator.play(Ax.create()
    .loop(Ax.create()
        .translate(Parameter.point(bigSin, bigCos))
        .pipe(
            spark(Parameter.rgba(red, green, 0, 1))
        )
    )
);*/
// tween between the center (50,50) and a point on a circle. This has the effect of moving the inner spark animation
// in a archimedes spiral.
/*
animator.play(Ax.create()
    .tween_linear([50,50], Parameter.point(bigSin, bigCos), 1)
    .loop(
        spark("red")
    )
);*/
// the helper function pipes injects the context, either from a web canvas or a fake node.js one.
helper.playExample("@name", 20, animator, 100, 100);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4YW1wbGVzL2V4YW1wbGUxLnRzIl0sIm5hbWVzIjpbInNwYXJrIl0sIm1hcHBpbmdzIjoiQUFDQSxJQUFZLEVBQUUsV0FBTSxnQkFBZ0IsQ0FBQyxDQUFBO0FBQ3JDLElBQVksTUFBTSxXQUFNLGVBQWUsQ0FBQyxDQUFBO0FBSXhDLElBQUksUUFBUSxHQUFnQixNQUFNLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztBQUV4RCxFQUFFLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztBQUNoQix1QkFBdUI7QUFDdkIsZUFBZSxLQUFrQjtJQUM3QkEsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsTUFBTUEsRUFBRUE7U0FDYkEsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7U0FDUEEsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsRUFBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7U0FDM0JBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUFBO0FBQzdEQSxDQUFDQTtBQUVELDBHQUEwRztBQUMxRyw2Q0FBNkM7QUFDN0Msc0VBQXNFO0FBQ3RFLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRTtLQUNwQixJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQzFCLENBQUM7QUFDRiw4RUFBOEU7QUFDOUU7Ozs7Ozs7O0lBUUk7QUFFSixvSEFBb0g7QUFDcEgsMEJBQTBCO0FBQzFCOzs7Ozs7SUFNSTtBQUVKLGlHQUFpRztBQUNqRyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyIsImZpbGUiOiJleGFtcGxlcy9leGFtcGxlMS5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
