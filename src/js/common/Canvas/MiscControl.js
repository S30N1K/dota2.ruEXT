import {CanvasControl} from "./CanvasControl";
import {Point} from "./Point";

export const MiscControl = class extends CanvasControl {
    constructor(selector, width, height, context) {
        super(selector, width, height, context)
    }


    misc = {
        getDistance: (point1, point2) => {
            const dx = point1.x - point2.x
            const dy = point2.y - point2.y
            return Math.sqrt(dx * dx + dy * dy)
        },
        getPointMaxDistance: (maxDistance, point1, point2) => {
            const distance = this.getDistance(point1, point2)
            const x = point1.x + (100 / distance) * (point2.x - point1.x)
            const y = point1.y + (100 / distance) * (point2.y - point1.y)
            return new Point(x, y)
        },
        forInt: (i, func) => {
            var _i, res;
            for (_i = 0; _i < i; _i += 1) {
                res = func(_i);
                if (res) {
                    if (res === 'break') break;
                }
            }
        },

        forEach: (arr, func) => {
            var i, res;
            for (i in arr) {
                if (typeof arr[i] == 'undefined') continue;
                res = func(arr[i], i, arr);
                if (res) {
                    if (res === 'break') break;
                }
            }
        },

        forXY: (i, j, func) => {
            var _i, _j, res;
            for (_j = 0; _j < j; _j += 1)
                for (_i = 0; _i < i; _i += 1) {
                    res = func(_i, _j);
                    if (res) {
                        if (res === 'break') break;
                    }
                }
        },

        a2r: (a) => {
            return a * (Math.PI / 180)
        },

        random: (min, max, z) => {
            const rnd = Math.floor(Math.random() * (max - min + 1) + min);
            return (z && rnd === 0) ? this.random(min, max, z) : rnd;
        },

        randomArrElement: (arr) => {
            return arr[this.random(0, arr.length - 1)]
        }
    }
}