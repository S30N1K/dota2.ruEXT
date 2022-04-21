export const Box = class {

    x
    y
    w
    h

    constructor(position, size) {
        this.x = position.x
        this.y = position.y
        this.w = size.w
        this.h = size.h
    }
}