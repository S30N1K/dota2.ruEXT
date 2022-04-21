export const Point = class {
    x = 0
    y = 0

    constructor(x = 0, y = 0) {
        if (Number.isInteger(x)) {
            this.x = x
            this.y = y
        } else {
            this.x = x.x
            this.y = x.y
        }
    }

    invert() {
        this.x *= -1
        this.y *= -1
        return this
    }

    plus(point) {
        this.x += point.x
        this.y += point.y
        return this
    }

    plusS(point){
        return new Point(this.x + point.x, this.y + point.y)
    }

    minus(point) {
        this.x -= point.x
        this.y -= point.y
        return this
    }
    minusS(point) {
        return new Point(this.x - point.x, this.y - point.y)
    }
}