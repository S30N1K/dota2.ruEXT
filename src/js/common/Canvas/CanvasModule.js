import {Point} from "./Point";

export const CanvasModule = class {
    canvas
    canvasSize = new Point()
    canvasSize2 = new Point()
    contextSettings = {}
    ctx
    iframe
    selector
    loaded

    clear(){}

    event = {
        addEvent(eventName, cb) {
        },
        runEvent(eventName) {
        }
    }

    camera = {
        getFree(){
        },
        setFree(e){
        },
        getPosition() {
        },
        setPosition(point) {
        },
        getStaticBox() {
        },
        getDynamicBox() {
        },
        move(point) {
        },
        moveTime(point, time) {
        },
        moveTimeC(point, time) {
        },
        follow(object) {
        }
    }

    draw = {
        text: (object) => {
        },
        textS: (object) => {
        },
        rect: (object) => {
        },
        rectS: (object) => {
        },
        point: (position, color) => {
        },
        pointS: (position, color) => {
        },
        line: (point1, point2, strokeColor, strokeWidth) => {
        },
        lineS: (point1, point2, strokeColor, strokeWidth) => {
        },
        getPixelColor: (point) => {
        },
        setPixelColor: (point, color) => {
        },
        polygon: (object) => {
        }
    }

    misc = {
        forInt(i, func) {
        },
        forEach(arr, func) {
        },
        forXY(i, j, func) {
        },
        a2r(a) {
        },
        random(min, max, z) {
        },
        randomArrElement(arr) {
        },
        displayInfo() {
        }
    }

    mouse = {
        getPosition() {
        },
        getPositionS() {
        },
        getSpeed() {
        },
        isDown() {
        },
        isInDynamic() {
        },
        isInStatic() {
        },
        isMove() {
        },
        isPress() {
        },
        isUp() {
        },
        isWheel() {
        }
    }
}