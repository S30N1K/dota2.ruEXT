import {MouseControl} from "./MouseControl";
import {Point} from "./Point";
import {Size} from "./Size";

export const DrawControl = class extends MouseControl {

    constructor(selector, width, height, context) {
        super(selector, width, height, context)
    }

    #drawText(p, text, color, size, font, style, align, strokeColor, strokeWidth) {

        this.ctx.textAlign = align
        this.ctx.lineWidth = strokeWidth
        this.ctx.font = (style ? (style + ' ') : '') + size + 'px ' + font

        const offset = new Point(this.camera.getPosition()).invert()

        const drawText = (text) => {
            if (color) {
                this.ctx.fillStyle = color
                this.ctx.fillText(text, offset.x + p.x, offset.y + p.y);
            }

            if (strokeColor) {
                this.ctx.strokeStyle = strokeColor
                this.ctx.strokeText(text, offset.x + p.x, offset.y + p.y);
            }
        }

        if (typeof text === "string") {
            drawText(text)
        } else if (typeof text === "object") {
            for (const str of text) {
                drawText(str)
                offset.y += size
            }
        }
    }

    fillRect(position, size, fillColor, strokeWidth) {
        const strokeSize = new Size((strokeWidth ? strokeWidth / 2 : 0), (strokeWidth ? strokeWidth / 2 : 0))
        this.ctx.fillStyle = fillColor
        this.ctx.fillRect(position.x + strokeSize.w, position.y + strokeSize.h, size.w, size.h)
    }

    strokeRect(position, size, strokeColor, strokeWidth) {
        const strokeSize = new Size((strokeWidth ? strokeWidth / 2 : 0), (strokeWidth ? strokeWidth / 2 : 0))
        this.ctx.strokeStyle = strokeColor
        this.ctx.strokeRect(position.x + strokeSize.w, position.y + strokeSize.h, size.w, size.h)
    }

    #drawRect(position, size, fillColor, strokeColor, strokeWidth) {
        this.ctx.lineWidth = strokeWidth
        fillColor && this.fillRect(position, size, fillColor, strokeWidth)
        strokeColor && this.strokeRect(position, size, strokeColor, strokeWidth)
    }

    #drawPoint(position, fillColor) {
        this.fillRect(position, new Size(2, 2), fillColor)
    }

    #drawLine(p1, p2, strokeColor, strokeWidth) {
        this.ctx.strokeStyle = strokeColor
        this.ctx.lineWidth = strokeWidth

        const offset = new Point(this.camera.getPosition()).invert()

        this.ctx.beginPath()
        this.ctx.moveTo(offset.x + p1.x, offset.y + p1.y)
        this.ctx.lineTo(offset.x + p2.x, offset.y + p2.y)
        this.ctx.closePath()
        this.ctx.stroke()
    }

    #getPixelColor(x, y) {
        const pixel = this.ctx.getImageData(x, y, 1, 1).data;
        return 'rgb(' + pixel[0] + ', ' + pixel[1] + ', ' + pixel[2] + ')';
    }

    #setPixelColor(x,y,color){
        const data = this.ctx.createImageData(1, 1)
        data.data[0] = color.r || data.data[0]
        data.data[1] = color.g || data.data[1]
        data.data[2] = color.b || data.data[2]
        data.data[3] = color.a || 255
        this.ctx.putImageData(data, x, y)
    }


    #drawPoly(points, fillColor) {
        if (points.length < 3) return;

        this.ctx.fillStyle = fillColor

        const offset = new Point(this.camera.getPosition()).invert()

        this.ctx.beginPath();
        this.ctx.moveTo(offset.x + points[0].x, offset.y + points[0].y)
        for (let i = 1; i < points.length; i+= 1) {
            this.ctx.lineTo(offset.x + points[i].x, offset.y + points[i].y)
        }
        this.ctx.closePath()
        this.ctx.fill()
    }

    #drawPolyXY(x, y, points, fillColor) {
        if (points.length < 3) return;

        this.ctx.fillStyle = fillColor

        const offset = new Point(this.camera.getPosition()).plus(new Point(x, y)).invert()

        this.ctx.beginPath();
        this.ctx.moveTo(offset.x + points[0].x, offset.y + points[0].y);
        for (let i = 1; i < points.length; i+= 1) {
            this.ctx.lineTo(offset.x + points[i].x, offset.y + points[i].y);
        }
        this.ctx.closePath();
        this.ctx.fill();
    }

    #drawPolygonXY(x, y, points, fillColor, strokeColor, strokeWidth, pointColor) {
        if (points.length < 3) return
        let i, j

        if (fillColor) {
            this.#drawPolyXY(x, y, points, fillColor)
        }

        for (i = 0; i < points.length; i+= 1) {
            j = (i + 1) < points.length ? (i + 1) : 0
            if (strokeColor) {
                this.#drawLine(new Point(x, y).plus(points[i]), new Point(x, y).plus(points[j]), strokeColor, strokeWidth)
            }
            if (pointColor) {
                this.#drawPoly(new Point(x, y).plus(points[i]), pointColor)
            }
        }
    }

    #drawPolygon(points, fillColor, strokeColor, strokeWidth, pointColor) {

        if (points.length < 3) return

        let i, j

        if (fillColor) {
            this.#drawPoly(points, fillColor)
        }

        for (i = 0; i < points.length; i+= 1) {
            j = (i + 1) < points.length ? (i + 1) : 0
            if (strokeColor) {
                this.#drawLine(points[i], points[j], strokeColor, strokeWidth)
            }
            if (pointColor) {
                this.#drawLine(points[i], pointColor)
            }
        }
    }

    draw = {
        text: (object) => {
            this.#drawText(
                object.position || new Point(),
                object.text || "textObject",
                object.color || "#000000",
                object.size || this.contextSettings.size,
                object.font || this.contextSettings.font,
                object.style || this.contextSettings.style,
                object.align || this.contextSettings.align,
                object.strokeColor || false,
                object.strokeWidth || 2)
        },
        textS: (object) => {
            this.#drawText(
                object.position.plus(this.camera.getPosition()),
                object.text || "textObject",
                object.color || "#000000",
                object.size || this.contextSettings.size,
                object.font || this.contextSettings.font,
                object.style || this.contextSettings.style,
                object.align || this.contextSettings.align,
                object.strokeColor || false,
                object.strokeWidth || 2)
        },
        rect: (object) => {
            this.#drawRect(
                object.position.minus(this.camera.getPosition()),
                object.size,
                object.fillColor || false,
                object.strokeColor || this.contextSettings.strokeStyle,
                object.strokeWidth || false
            )
        },
        rectS: (object) => {
            this.#drawRect(
                object.position,
                object.size,
                object.fillColor || false,
                object.strokeColor || this.contextSettings.strokeStyle,
                object.strokeWidth || false
            )
        },
        point: (position, color) => {
            this.#drawPoint(new Point(position).minus(this.camera.getPosition()), color)
            // this.#drawPoint(position.plusS(this.camera.getPosition()).minusS(new Point(1, 1)), color)
        },
        pointS: (position, color) => {
            this.#drawPoint(position, color)
        },
        line: (point1, point2, strokeColor, strokeWidth) => {
            this.#drawLine(point1, point2, strokeColor, strokeWidth)
        },
        lineS: (point1, point2, strokeColor, strokeWidth) => {
            const cp = this.camera.getPosition()
            this.#drawLine(point1.plus(cp), point2.plus(cp), strokeColor, strokeWidth)
        },
        getPixelColor: (point) => {
            return this.#getPixelColor(point.x, point.y)
        },
        setPixelColor: (point, color) => {
            this.#setPixelColor(point.x, point.y, color)
        },
        polygon: (object) => {
            this.#drawPolygon(
                object.points || [],
                object.fillColor || false,
                object.strokeColor || false,
                object.strokeWidth || 1,
                object.pointColor || false
            )
        }
    }

}