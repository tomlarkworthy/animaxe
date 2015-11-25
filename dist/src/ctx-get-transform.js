/*
This code was ported from https://github.com/tmpvar/ctx-get-transform
in order to get it to work with ES6 properly

The MIT License (MIT)
Copyright © 2014 Elijah Insua <tmpvar@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
var mat3 = require('gl-mat3');
function monkeyPatchCtxToAddGetTransform(ctx) {
    var mat = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    var stack = [];
    var v2scratch = [0, 0, 0];
    var m3scratch = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    ctx.getTransform = function tGetTransform() {
        return mat;
    };
    (function (save) {
        ctx.save = function tSave() {
            stack.push(mat3.clone(mat));
            return save.call(ctx);
        };
    })(ctx.save);
    (function (restore) {
        ctx.restore = function tRestore() {
            mat = stack.pop();
            return restore.call(ctx);
        };
    })(ctx.restore);
    (function (scale) {
        ctx.scale = function tScale(sx, sy) {
            v2scratch[0] = sx;
            v2scratch[1] = sy;
            mat3.scale(mat, mat, v2scratch);
            return scale.call(ctx, sx, sy);
        };
    })(ctx.scale);
    (function (rotate) {
        ctx.rotate = function tRotate(radians) {
            mat3.rotate(mat, mat, radians);
            return rotate.call(ctx, radians);
        };
    })(ctx.rotate);
    (function (translate) {
        ctx.translate = function tTranslate(dx, dy) {
            v2scratch[0] = dx;
            v2scratch[1] = dy;
            mat3.translate(mat, mat, v2scratch);
            return translate.call(ctx, dx, dy);
        };
    })(ctx.translate);
    (function (transform) {
        ctx.transform = function tTransform(a, b, c, d, e, f) {
            m3scratch[0] = a;
            m3scratch[1] = c;
            m3scratch[2] = e;
            m3scratch[3] = b;
            m3scratch[4] = d;
            m3scratch[5] = f;
            mat3.multiply(mat, mat, m3scratch);
            return transform.call(ctx, a, b, c, d, e, f);
        };
    })(ctx.transform);
    (function (setTransform) {
        ctx.setTransform = function tSetTransform(a, b, c, d, e, f) {
            mat[0] = a;
            mat[1] = c;
            mat[2] = e;
            mat[3] = b;
            mat[4] = d;
            mat[5] = f;
            return setTransform.call(ctx, a, b, c, d, e, f);
        };
    })(ctx.setTransform);
    return ctx;
}
exports.monkeyPatchCtxToAddGetTransform = monkeyPatchCtxToAddGetTransform;
