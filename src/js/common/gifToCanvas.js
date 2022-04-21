const Stream = class {

    data
    pos
    len

    constructor(data) {
        this.data = new Uint8ClampedArray(data)
        this.pos = 0
        this.len = this.data.length
    }

    getString = function (count) { // returns a string from current pos of len count
        let s = "";
        while (count--) {
            s += String.fromCharCode(this.data[this.pos++])
        }
        return s;
    }

    readSubBlocks = function () { // reads a set of blocks as a string
        let size, count, data = "";
        do {
            count = size = this.data[this.pos++];
            while (count--) {
                data += String.fromCharCode(this.data[this.pos++])
            }
        } while (size !== 0 && this.pos < this.len)
        return data;

    }

    readSubBlocksB = function () { // reads a set of blocks as binary
        var size, count, data = [];
        do {
            count = size = this.data[this.pos++]
            while (count--) {
                data.push(this.data[this.pos++])
            }
        } while (size !== 0 && this.pos < this.len)
        return data;
    }
}

export const GIFnew = class {
    timerId = null
    st = null
    interlaceOffsets = [0, 4, 2, 1]; // used in de-interlacing.
    interlaceSteps = [8, 8, 4, 2];
    interlacedBufSize = null  // this holds a buffer to de interlace. Created on the first frame and when size changed
    deinterlaceBuf = null
    pixelBufSize = null    // this holds a buffer for pixels. Created on the first frame and when size changed
    pixelBuf = null
    GIF_FILE = { // gif file data headers
        GCExt: 0xF9,
        COMMENT: 0xFE,
        APPExt: 0xFF,
        UNKNOWN: 0x01, // not sure what this is but need to skip it in parser
        IMAGE: 0x2C,
        EOF: 59,   // This is entered as decimal
        EXT: 0x21,
    }
    gif = {                      // the gif image object
        onload: null,       // fire on load. Use waitTillDone = true to have load fire at end or false to fire on first frame
        onerror: null,       // fires on error
        onprogress: null,       // fires a load progress event
        onloadall: null,       // event fires when all frames have loaded and gif is ready
        paused: false,      // true if paused
        playing: false,      // true if playing
        waitTillDone: true,       // If true onload will fire when all frames loaded, if false, onload will fire when first frame has loaded
        loading: false,      // true if still loading
        firstFrameOnly: false,      // if true only load the first frame
        width: null,       // width in pixels
        height: null,       // height in pixels
        frames: [],         // array of frames
        comment: "",         // comments if found in file. Note I remember that some gifs have comments per frame if so this will be all comment concatenated
        length: 0,          // gif length in ms (1/1000 second)
        currentFrame: 0,          // current frame.
        frameCount: 0,          // number of frames
        playSpeed: 1,          // play speed 1 normal, 2 twice 0.5 half, -1 reverse etc...
        lastFrame: null,       // temp hold last frame loaded so you can display the gif as it loads
        image: null,       // the current image at the currentFrame
        playOnLoad: true,       // if true starts playback when loaded
        // functions
    }

    constructor() {
        return this
    }


    // Декодер LZW распаковывает пиксели каждого кадра
    // это необходимо оптимизировать.
    // minSize - это минимальный словарь в виде степеней двойки
    // размер и данные - это сжатые пиксели
    lzwDecode(minSize, data) {
        let i, pixelPos, pos, clear, eod, size, done, dic, code, last, d, len
        pos = pixelPos = 0;
        dic = [];
        clear = 1 << minSize;
        eod = clear + 1;
        size = minSize + 1;
        done = false;
        while (!done) { // Оптимизаторам JavaScript нравится четкий выход, хотя я никогда не использую "готово", кроме как обмануть оптимизатор.
            last = code;
            code = 0;
            for (i = 0; i < size; i++) {
                if (data[pos >> 3] && (1 << (pos & 7))) {
                    code |= 1 << i
                }
                pos++;
            }
            if (code === clear) { // clear and reset the dictionary
                dic = [];
                size = minSize + 1;
                for (i = 0; i < clear; i++) {
                    dic[i] = [i]
                }
                dic[clear] = [];
                dic[eod] = null;
            } else {
                if (code === eod) {
                    done = true;
                    return
                }
                if (code >= dic.length) {
                    dic.push(dic[last].concat(dic[last][0]))
                } else if (last !== clear) {
                    dic.push(dic[last].concat(dic[code][0]))
                }
                d = dic[code];
                len = d.length;
                for (i = 0; i < len; i++) {
                    pixelBuf[pixelPos++] = d[i]
                }
                if (dic.length === (1 << size) && size < 12) {
                    size++
                }
            }
        }
    }

    parseColourTable(count) { // get a colour table of length count  Each entry is 3 bytes, for RGB.
        const colours = [];
        for (var i = 0; i < count; i++) {
            colours.push([this.st.data[this.st.pos++], this.st.data[this.st.pos++], this.st.data[this.st.pos++]])
        }
        return colours;
    }

    parse() {        // read the header. This is the starting point of the decode and async calls parseBlock
        this.st.pos += 6;
        this.gif.width = (this.st.data[this.st.pos++]) + ((this.st.data[this.st.pos++]) << 8);
        this.gif.height = (this.st.data[this.st.pos++]) + ((this.st.data[this.st.pos++]) << 8);
        const bitField = this.st.data[this.st.pos++];
        this.gif.colorRes = (bitField & 0b1110000) >> 4;
        this.gif.globalColourCount = 1 << ((bitField & 0b111) + 1);
        this.gif.bgColourIndex = this.st.data[this.st.pos++];
        this.st.pos++;                    // ignoring pixel aspect ratio. if not 0, aspectRatio = (pixelAspectRatio + 15) / 64
        if (bitField && 0b10000000) {
            this.gif.globalColourTable = this.parseColourTable(this.gif.globalColourCount)
        } // global colour flag
        setTimeout(this.parseBlock, 0)
    }

    parseBlock() { // parsing the blocks
        if (this.cancel !== undefined && this.cancel === true) {
            this.canceled()
            return
        }

        const blockId = this.st.data[this.st.pos++];
        if (blockId === this.GIF_FILE.IMAGE) { // image block
            this.parseImg();
            if (this.gif.firstFrameOnly) {
                this.finnished();
                return
            }
        } else if (blockId === this.GIF_FILE.EOF) {
            this.finnished();
            return
        } else {
            this.parseExt()
        }
        if (typeof this.gif.onprogress === "function") {
            this.gif.onprogress({
                bytesRead: this.st.pos,
                totalBytes: this.st.data.length,
                frame: this.gif.frames.length
            });
        }
        setTimeout(this.parseBlock, 0); // parsing frame async so processes can get some time in.
    }

    cancel(callback) { // cancels the loading. This will cancel the load before the next frame is decoded
        if (this.gif.complete) {
            return false
        }
        this.gif.cancelCallback = callback;
        this.gif.cancel = true;
        return true;
    }

    error(type) {
        if (typeof this.gif.onerror === "function") {
            (this.gif.onerror.bind(this))({type: type, path: [this]})
        }
        this.gif.onload = this.gif.onerror = undefined;
        this.gif.loading = false;
    }

    doOnloadEvent() { // fire onload event if set
        this.gif.currentFrame = 0;
        this.gif.nextFrameAt = this.gif.lastFrameAt = new Date().valueOf(); // just sets the time now
        if (typeof this.gif.onload === "function") {
            (this.gif.onload.bind(this.gif))({type: 'load', path: [this.gif]})
        }
        this.gif.onerror = this.gif.onload = undefined;
    }

    dataLoaded(data) { // Data loaded create stream and parse
        this.st = new Stream(data);
        this.parse();
    }

    load(filename) { // starts the load
        const ajax = new XMLHttpRequest();
        const f = this
        ajax.responseType = "arraybuffer";
        ajax.onload = function(e){
            if (e.target.status === 404) {
                f.error("File not found")
            } else if (e.target.status >= 200 && e.target.status < 300) {
                f.dataLoaded(ajax.response)
            } else {
                f.error("Loading error : " + e.target.status)
            }
        }
        ajax.open('GET', filename, true);
        ajax.send();
        ajax.onerror = () => {
            this.error("File error")
        }
        this.src = filename;
        this.loading = true;
    }

    play() { // starts play if paused
        if (!this.gif.playing) {
            this.gif.paused = false;
            this.gif.playing = true;
            this.playing();
        }
    }

    pause() { // stops play
        this.gif.paused = true;
        this.gif.playing = false;
        clearTimeout(this.timerID)
    }

    togglePlay() {
        if (this.gif.paused || !this.gif.playing) {
            this.gif.play()
        } else {
            this.gif.pause()
        }
    }

    seekFrame(frame) { // seeks to frame number.
        clearTimeout(this.timerID);
        this.gif.currentFrame = frame % this.gif.frames.length;
        if (this.gif.playing) {
            this.playing()
        } else {
            this.gif.image = this.gif.frames[this.gif.currentFrame].image
        }
    }

    seek(time) { // time in Seconds  // seek to frame that would be displayed at time
        clearTimeout(this.timerID);
        if (time < 0) {
            time = 0
        }
        time *= 1000; // in ms
        time %= this.gif.length
        let frame = 0
        while (time > this.gif.frames[frame].time + this.gif.frames[frame].delay && frame < this.gif.frames.length) {
            frame += 1
        }
        this.gif.currentFrame = frame;
        if (this.gif.playing) {
            this.playing()
        } else {
            this.gif.image = this.gif.frames[this.gif.currentFrame].image
        }
    }

    playing() {
        let delay;
        let frame;
        if (this.gif.playSpeed === 0) {
            this.gif.pause();
        } else {
            if (this.gif.playSpeed < 0) {
                this.gif.currentFrame -= 1;
                if (this.gif.currentFrame < 0) {
                    this.gif.currentFrame = this.gif.frames.length - 1
                }
                frame = this.gif.currentFrame;
                frame -= 1;
                if (frame < 0) {
                    frame = this.gif.frames.length - 1
                }
                delay = -this.gif.frames[frame].delay / this.gif.playSpeed;
            } else {
                this.gif.currentFrame += 1;
                this.gif.currentFrame %= this.gif.frames.length;
                delay = this.gif.frames[this.gif.currentFrame].delay * 1 / this.gif.playSpeed;
            }
            this.gif.image = this.gif.frames[this.gif.currentFrame].image;
            this.timerID = setTimeout(this.playing, delay);
        }
    }

    canceled() { // called if the load has been cancelled
        this.finnished();
        if (typeof this.gif.cancelCallback === "function") {
            (this.gif.cancelCallback.bind(this.gif))({type: 'canceled', path: [this.gif]})
        }
    }

    finnished() { // called when the load has completed
        this.gif.loading = false;
        this.gif.frameCount = this.gif.frames.length;
        this.gif.lastFrame = null;
        this.st = undefined;
        this.gif.complete = true;
        this.gif.disposalMethod = undefined;
        this.gif.transparencyGiven = undefined;
        this.gif.delayTime = undefined;
        this.gif.transparencyIndex = undefined;
        this.gif.waitTillDone = undefined;
        this.pixelBuf = undefined; // dereference pixel buffer
        this.deinterlaceBuf = undefined; // dereference interlace buff (may or may not be used);
        this.pixelBufSize = undefined;
        this.deinterlaceBuf = undefined;
        this.gif.currentFrame = 0;
        if (this.gif.frames.length > 0) {
            this.gif.image = this.gif.frames[0].image
        }
        this.doOnloadEvent();
        if (typeof this.gif.onloadall === "function") {
            (this.gif.onloadall.bind(this.gif))({type: 'loadall', path: [this.gif]});
        }
        if (this.gif.playOnLoad) {
            this.gif.play()
        }
    }

    parseExt() {              // parse extended blocks
        const blockID = this.st.data[this.st.pos++];
        if (blockID === this.GIF_FILE.GCExt) {
            this.parseGCExt()
        } else if (blockID === this.GIF_FILE.COMMENT) {
            this.gif.comment += this.st.readSubBlocks()
        } else if (blockID === this.GIF_FILE.APPExt) {
            this.parseAppExt()
        } else {
            if (blockID === this.GIF_FILE.UNKNOWN) {
                this.st.pos += 13;
            } // skip unknow block
            this.st.readSubBlocks();
        }
    }

    parseGCExt() { // get GC data
        let bitField;
        this.st.pos++;
        bitField = this.st.data[this.st.pos++];
        this.gif.disposalMethod = (bitField & 0b11100) >> 2;
        this.gif.transparencyGiven = !!(bitField & 0b1); // ignoring bit two that is marked as  userInput???
        this.gif.delayTime = (this.st.data[this.st.pos++]) + ((this.st.data[this.st.pos++]) << 8);
        this.gif.transparencyIndex = this.st.data[this.st.pos++];
        this.st.pos++;
    }

    parseAppExt() { // get application specific data. Netscape added iterations and terminator. Ignoring that
        this.st.pos += 1;
        if ('NETSCAPE' === this.st.getString(8)) {
            this.st.pos += 8
        }  // ignoring this data. iterations (word) and terminator (byte)
        else {
            this.st.pos += 3;            // 3 bytes of string usually "2.0" when identifier is NETSCAPE
            this.st.readSubBlocks();     // unknown app extension
        }
    }

    parseImg() {                           // decodes image data to create the indexed pixel image
        let frame, bitField;
        const deinterlace = (width) => {                   // de interlace pixel data if needed
            let lines, fromLine, pass, toline;
            lines = this.pixelBufSize / width;
            fromLine = 0;
            if (this.interlacedBufSize !== this.pixelBufSize) {      // create the buffer if size changed or undefined.
                this.deinterlaceBuf = new Uint8Array(this.pixelBufSize);
                this.interlacedBufSize = this.pixelBufSize;
            }
            for (pass = 0; pass < 4; pass++) {
                for (this.toLine = this.interlaceOffsets[pass]; this.toLine < lines; this.toLine += interlaceSteps[pass]) {
                    this.deinterlaceBuf.set(this.pixelBuf.subArray(fromLine, fromLine + width), this.toLine * width);
                    fromLine += width;
                }
            }
        };
        frame = {}
        this.gif.frames.push(frame);
        frame.disposalMethod = this.gif.disposalMethod;
        frame.time = this.gif.length;
        frame.delay = this.gif.delayTime * 10;
        this.gif.length += frame.delay;
        if (this.gif.transparencyGiven) {
            frame.transparencyIndex = this.gif.transparencyIndex
        } else {
            frame.transparencyIndex = undefined
        }
        frame.topPos = frame.leftPos = (this.st.data[this.st.pos++]) + ((this.st.data[this.st.pos++]) << 8)
        frame.width = frame.height = (this.st.data[this.st.pos++]) + ((this.st.data[this.st.pos++]) << 8)
        bitField = this.st.data[this.st.pos++];
        frame.localColourTableFlag = !!(bitField & 0b10000000);
        if (frame.localColourTableFlag) {
            frame.localColourTable = this.parseColourTable(1 << ((bitField & 0b111) + 1))
        }
        if (this.pixelBufSize !== frame.width * frame.height) { // create a pixel buffer if not yet created or if current frame size is different from previous
            this.pixelBuf = new Uint8Array(frame.width * frame.height);
            this.pixelBufSize = frame.width * frame.height;
        }
        this.lzwDecode(this.st.data[this.st.pos++], this.st.readSubBlocksB()); // decode the pixels
        if (bitField && 0b1000000) {                        // de interlace if needed
            frame.interlaced = true;
            deinterlace(frame.width);
        } else {
            frame.interlaced = false
        }
        this.processFrame(frame);                               // convert to canvas image
    }

    processFrame(frame) { // creates a RGBA canvas image from the indexed pixel data.
        var frame
        let ct, cData, dat, pixCount, ind, useT, i, pixel, pDat, col, ti;
        frame.image = document.createElement('canvas');
        frame.image.width = gif.width;
        frame.image.height = gif.height;
        frame.image.ctx = frame.image.getContext("2d");
        ct = frame.localColourTableFlag ? frame.localColourTable : gif.globalColourTable;
        if (this.gif.lastFrame === null) {
            this.gif.lastFrame = frame
        }
        useT = (this.gif.lastFrame.disposalMethod === 2 || this.gif.lastFrame.disposalMethod === 3);
        if (!useT) {
            frame.image.ctx.drawImage(this.gif.lastFrame.image, 0, 0, this.gif.width, this.gif.height)
        }
        cData = frame.image.ctx.getImageData(frame.leftPos, frame.topPos, frame.width, frame.height);
        ti = frame.transparencyIndex;
        dat = cData.data;
        if (frame.interlaced) {
            pDat = this.deinterlaceBuf
        } else {
            pDat = this.pixelBuf
        }
        pixCount = pDat.length;
        ind = 0;
        for (i = 0; i < pixCount; i++) {
            pixel = pDat[i];
            col = ct[pixel];
            if (ti !== pixel) {
                dat[ind++] = col[0];
                dat[ind++] = col[1];
                dat[ind++] = col[2];
                dat[ind++] = 255;      // Opaque.
            } else if (useT) {
                dat[ind + 3] = 0; // Transparent.
                ind += 4;
            } else {
                ind += 4
            }
        }
        frame.image.ctx.putImageData(cData, frame.leftPos, frame.topPos);
        this.gif.lastFrame = frame;
        if (!this.gif.waitTillDone && typeof this.gif.onload === "function") {
            this.doOnloadEvent()
        }// if !waitTillDone the call onload now after first frame is loaded
    }
}

export const GIF = function () {
    // **NOT** for commercial use.
    var timerID;                          // timer handle for set time out usage
    var st;                               // holds the stream object when loading.
    var interlaceOffsets = [0, 4, 2, 1]; // used in de-interlacing.
    var interlaceSteps = [8, 8, 4, 2];
    var interlacedBufSize;  // this holds a buffer to de interlace. Created on the first frame and when size changed
    var deinterlaceBuf;
    var pixelBufSize;    // this holds a buffer for pixels. Created on the first frame and when size changed
    var pixelBuf;
    const GIF_FILE = { // gif file data headers
        GCExt: 0xF9,
        COMMENT: 0xFE,
        APPExt: 0xFF,
        UNKNOWN: 0x01, // not sure what this is but need to skip it in parser
        IMAGE: 0x2C,
        EOF: 59,   // This is entered as decimal
        EXT: 0x21,
    };
    // simple buffered stream used to read from the file
    var Stream = function (data) {
        this.data = new Uint8ClampedArray(data);
        this.pos = 0;
        var len = this.data.length;
        this.getString = function (count) { // returns a string from current pos of len count
            var s = "";
            while (count--) {
                s += String.fromCharCode(this.data[this.pos++])
            }
            return s;
        };
        this.readSubBlocks = function () { // reads a set of blocks as a string
            var size, count, data = "";
            do {
                count = size = this.data[this.pos++];
                while (count--) {
                    data += String.fromCharCode(this.data[this.pos++])
                }
            } while (size !== 0 && this.pos < len);
            return data;

        }
        this.readSubBlocksB = function () { // reads a set of blocks as binary
            var size, count, data = [];
            do {
                count = size = this.data[this.pos++];
                while (count--) {
                    data.push(this.data[this.pos++]);
                }
            } while (size !== 0 && this.pos < len);
            return data;
        }
    };
    // LZW decoder uncompressed each frames pixels
    // this needs to be optimised.
    // minSize is the min dictionary as powers of two
    // size and data is the compressed pixels
    function lzwDecode(minSize, data) {
        var i, pixelPos, pos, clear, eod, size, done, dic, code, last, d, len;
        pos = pixelPos = 0;
        dic = [];
        clear = 1 << minSize;
        eod = clear + 1;
        size = minSize + 1;
        done = false;
        while (!done) { // JavaScript optimisers like a clear exit though I never use 'done' apart from fooling the optimiser
            last = code;
            code = 0;
            for (i = 0; i < size; i++) {
                if (data[pos >> 3] & (1 << (pos & 7))) {
                    code |= 1 << i
                }
                pos++;
            }
            if (code === clear) { // clear and reset the dictionary
                dic = [];
                size = minSize + 1;
                for (i = 0; i < clear; i++) {
                    dic[i] = [i]
                }
                dic[clear] = [];
                dic[eod] = null;
            } else {
                if (code === eod) {
                    done = true;
                    return
                }
                if (code >= dic.length) {
                    dic.push(dic[last].concat(dic[last][0]))
                } else if (last !== clear) {
                    dic.push(dic[last].concat(dic[code][0]))
                }
                d = dic[code];
                len = d.length;
                for (i = 0; i < len; i++) {
                    pixelBuf[pixelPos++] = d[i]
                }
                if (dic.length === (1 << size) && size < 12) {
                    size++
                }
            }
        }
    };

    function parseColourTable(count) { // get a colour table of length count  Each entry is 3 bytes, for RGB.
        var colours = [];
        for (var i = 0; i < count; i++) {
            colours.push([st.data[st.pos++], st.data[st.pos++], st.data[st.pos++]])
        }
        return colours;
    }

    function parse() {        // read the header. This is the starting point of the decode and async calls parseBlock
        var bitField;
        st.pos += 6;
        gif.width = (st.data[st.pos++]) + ((st.data[st.pos++]) << 8);
        gif.height = (st.data[st.pos++]) + ((st.data[st.pos++]) << 8);
        bitField = st.data[st.pos++];
        gif.colorRes = (bitField & 0b1110000) >> 4;
        gif.globalColourCount = 1 << ((bitField & 0b111) + 1);
        gif.bgColourIndex = st.data[st.pos++];
        st.pos++;                    // ignoring pixel aspect ratio. if not 0, aspectRatio = (pixelAspectRatio + 15) / 64
        if (bitField & 0b10000000) {
            gif.globalColourTable = parseColourTable(gif.globalColourCount)
        } // global colour flag
        setTimeout(parseBlock, 0);
    }

    function parseAppExt() { // get application specific data. Netscape added iterations and terminator. Ignoring that
        st.pos += 1;
        if ('NETSCAPE' === st.getString(8)) {
            st.pos += 8
        }  // ignoring this data. iterations (word) and terminator (byte)
        else {
            st.pos += 3;            // 3 bytes of string usually "2.0" when identifier is NETSCAPE
            st.readSubBlocks();     // unknown app extension
        }
    };

    function parseGCExt() { // get GC data
        var bitField;
        st.pos++;
        bitField = st.data[st.pos++];
        gif.disposalMethod = (bitField & 0b11100) >> 2;
        gif.transparencyGiven = bitField & 0b1 ? true : false; // ignoring bit two that is marked as  userInput???
        gif.delayTime = (st.data[st.pos++]) + ((st.data[st.pos++]) << 8);
        gif.transparencyIndex = st.data[st.pos++];
        st.pos++;
    };

    function parseImg() {                           // decodes image data to create the indexed pixel image
        var deinterlace, frame, bitField;
        deinterlace = function (width) {                   // de interlace pixel data if needed
            var lines, fromLine, pass, toline;
            lines = pixelBufSize / width;
            fromLine = 0;
            if (interlacedBufSize !== pixelBufSize) {      // create the buffer if size changed or undefined.
                deinterlaceBuf = new Uint8Array(pixelBufSize);
                interlacedBufSize = pixelBufSize;
            }
            for (pass = 0; pass < 4; pass++) {
                for (toLine = interlaceOffsets[pass]; toLine < lines; toLine += interlaceSteps[pass]) {
                    deinterlaceBuf.set(pixelBuf.subArray(fromLine, fromLine + width), toLine * width);
                    fromLine += width;
                }
            }
        };
        frame = {}
        gif.frames.push(frame);
        frame.disposalMethod = gif.disposalMethod;
        frame.time = gif.length;
        frame.delay = gif.delayTime * 10;
        gif.length += frame.delay;
        if (gif.transparencyGiven) {
            frame.transparencyIndex = gif.transparencyIndex
        } else {
            frame.transparencyIndex = undefined
        }
        frame.leftPos = (st.data[st.pos++]) + ((st.data[st.pos++]) << 8);
        frame.topPos = (st.data[st.pos++]) + ((st.data[st.pos++]) << 8);
        frame.width = (st.data[st.pos++]) + ((st.data[st.pos++]) << 8);
        frame.height = (st.data[st.pos++]) + ((st.data[st.pos++]) << 8);
        bitField = st.data[st.pos++];
        frame.localColourTableFlag = bitField & 0b10000000 ? true : false;
        if (frame.localColourTableFlag) {
            frame.localColourTable = parseColourTable(1 << ((bitField & 0b111) + 1))
        }
        if (pixelBufSize !== frame.width * frame.height) { // create a pixel buffer if not yet created or if current frame size is different from previous
            pixelBuf = new Uint8Array(frame.width * frame.height);
            pixelBufSize = frame.width * frame.height;
        }
        lzwDecode(st.data[st.pos++], st.readSubBlocksB()); // decode the pixels
        if (bitField & 0b1000000) {                        // de interlace if needed
            frame.interlaced = true;
            deinterlace(frame.width);
        } else {
            frame.interlaced = false
        }
        processFrame(frame);                               // convert to canvas image
    };

    function processFrame(frame) { // creates a RGBA canvas image from the indexed pixel data.
        var ct, cData, dat, pixCount, ind, useT, i, pixel, pDat, col, frame, ti;
        frame.image = document.createElement('canvas');
        frame.image.width = gif.width;
        frame.image.height = gif.height;
        frame.image.ctx = frame.image.getContext("2d");
        ct = frame.localColourTableFlag ? frame.localColourTable : gif.globalColourTable;
        if (gif.lastFrame === null) {
            gif.lastFrame = frame
        }
        useT = (gif.lastFrame.disposalMethod === 2 || gif.lastFrame.disposalMethod === 3) ? true : false;
        if (!useT) {
            frame.image.ctx.drawImage(gif.lastFrame.image, 0, 0, gif.width, gif.height)
        }
        cData = frame.image.ctx.getImageData(frame.leftPos, frame.topPos, frame.width, frame.height);
        ti = frame.transparencyIndex;
        dat = cData.data;
        if (frame.interlaced) {
            pDat = deinterlaceBuf
        } else {
            pDat = pixelBuf
        }
        pixCount = pDat.length;
        ind = 0;
        for (i = 0; i < pixCount; i++) {
            pixel = pDat[i];
            col = ct[pixel];
            if (ti !== pixel) {
                dat[ind++] = col[0];
                dat[ind++] = col[1];
                dat[ind++] = col[2];
                dat[ind++] = 255;      // Opaque.
            } else if (useT) {
                dat[ind + 3] = 0; // Transparent.
                ind += 4;
            } else {
                ind += 4
            }
        }
        frame.image.ctx.putImageData(cData, frame.leftPos, frame.topPos);
        gif.lastFrame = frame;
        if (!gif.waitTillDone && typeof gif.onload === "function") {
            doOnloadEvent()
        }// if !waitTillDone the call onload now after first frame is loaded
    };

    // **NOT** for commercial use.
    function finnished() { // called when the load has completed
        gif.loading = false;
        gif.frameCount = gif.frames.length;
        gif.lastFrame = null;
        st = undefined;
        gif.complete = true;
        gif.disposalMethod = undefined;
        gif.transparencyGiven = undefined;
        gif.delayTime = undefined;
        gif.transparencyIndex = undefined;
        gif.waitTillDone = undefined;
        pixelBuf = undefined; // dereference pixel buffer
        deinterlaceBuf = undefined; // dereference interlace buff (may or may not be used);
        pixelBufSize = undefined;
        deinterlaceBuf = undefined;
        gif.currentFrame = 0;
        if (gif.frames.length > 0) {
            gif.image = gif.frames[0].image
        }
        doOnloadEvent();
        if (typeof gif.onloadall === "function") {
            (gif.onloadall.bind(gif))({type: 'loadall', path: [gif]});
        }
        if (gif.playOnLoad) {
            gif.play()
        }
    }

    function canceled() { // called if the load has been cancelled
        finnished();
        if (typeof gif.cancelCallback === "function") {
            (gif.cancelCallback.bind(gif))({type: 'canceled', path: [gif]})
        }
    }

    function parseExt() {              // parse extended blocks
        const blockID = st.data[st.pos++];
        if (blockID === GIF_FILE.GCExt) {
            parseGCExt()
        } else if (blockID === GIF_FILE.COMMENT) {
            gif.comment += st.readSubBlocks()
        } else if (blockID === GIF_FILE.APPExt) {
            parseAppExt()
        } else {
            if (blockID === GIF_FILE.UNKNOWN) {
                st.pos += 13;
            } // skip unknow block
            st.readSubBlocks();
        }

    }

    function parseBlock() { // parsing the blocks
        if (gif.cancel !== undefined && gif.cancel === true) {
            canceled();
            return
        }

        const blockId = st.data[st.pos++];
        if (blockId === GIF_FILE.IMAGE) { // image block
            parseImg();
            if (gif.firstFrameOnly) {
                finnished();
                return
            }
        } else if (blockId === GIF_FILE.EOF) {
            finnished();
            return
        } else {
            parseExt()
        }
        if (typeof gif.onprogress === "function") {
            gif.onprogress({bytesRead: st.pos, totalBytes: st.data.length, frame: gif.frames.length});
        }
        setTimeout(parseBlock, 0); // parsing frame async so processes can get some time in.
    };

    function cancelLoad(callback) { // cancels the loading. This will cancel the load before the next frame is decoded
        if (gif.complete) {
            return false
        }
        gif.cancelCallback = callback;
        gif.cancel = true;
        return true;
    }

    function error(type) {
        if (typeof gif.onerror === "function") {
            (gif.onerror.bind(this))({type: type, path: [this]})
        }
        gif.onload = gif.onerror = undefined;
        gif.loading = false;
    }

    function doOnloadEvent() { // fire onload event if set
        gif.currentFrame = 0;
        gif.nextFrameAt = gif.lastFrameAt = new Date().valueOf(); // just sets the time now
        if (typeof gif.onload === "function") {
            (gif.onload.bind(gif))({type: 'load', path: [gif]})
        }
        gif.onerror = gif.onload = undefined;
    }

    function dataLoaded(data) { // Data loaded create stream and parse
        st = new Stream(data);
        parse();
    }

    function loadGif(filename) { // starts the load
        console.log(filename)
        dataLoaded(filename)
        return
        var ajax = new XMLHttpRequest();
        ajax.responseType = "arraybuffer";
        ajax.onload = function (e) {
            if (e.target.status === 404) {
                error("File not found")
            } else if (e.target.status >= 200 && e.target.status < 300) {
                console.log(ajax.response)
                dataLoaded(ajax.response)
            } else {
                error("Loading error : " + e.target.status)
            }
        };
        ajax.open('GET', filename, true);
        ajax.send();
        ajax.onerror = function (e) {
            error("File error")
        };
        this.src = filename;
        this.loading = true;
    }

    function play() { // starts play if paused
        if (!gif.playing) {
            gif.paused = false;
            gif.playing = true;
            playing();
        }
    }

    function pause() { // stops play
        gif.paused = true;
        gif.playing = false;
        clearTimeout(timerID);
    }

    function togglePlay() {
        if (gif.paused || !gif.playing) {
            gif.play()
        } else {
            gif.pause()
        }
    }

    function seekFrame(frame) { // seeks to frame number.
        clearTimeout(timerID);
        gif.currentFrame = frame % gif.frames.length;
        if (gif.playing) {
            playing()
        } else {
            gif.image = gif.frames[gif.currentFrame].image
        }
    }

    function seek(time) { // time in Seconds  // seek to frame that would be displayed at time
        clearTimeout(timerID);
        if (time < 0) {
            time = 0
        }
        time *= 1000; // in ms
        time %= gif.length;
        var frame = 0;
        while (time > gif.frames[frame].time + gif.frames[frame].delay && frame < gif.frames.length) {
            frame += 1
        }
        gif.currentFrame = frame;
        if (gif.playing) {
            playing()
        } else {
            gif.image = gif.frames[gif.currentFrame].image
        }
    }

    function playing() {
        var delay;
        var frame;
        if (gif.playSpeed === 0) {
            gif.pause();
            return;
        } else {
            if (gif.playSpeed < 0) {
                gif.currentFrame -= 1;
                if (gif.currentFrame < 0) {
                    gif.currentFrame = gif.frames.length - 1
                }
                frame = gif.currentFrame;
                frame -= 1;
                if (frame < 0) {
                    frame = gif.frames.length - 1
                }
                delay = -gif.frames[frame].delay * 1 / gif.playSpeed;
            } else {
                gif.currentFrame += 1;
                gif.currentFrame %= gif.frames.length;
                delay = gif.frames[gif.currentFrame].delay * 1 / gif.playSpeed;
            }
            gif.image = gif.frames[gif.currentFrame].image;
            timerID = setTimeout(playing, delay);
        }
    }

    var gif = {                      // the gif image object
        onload: null,       // fire on load. Use waitTillDone = true to have load fire at end or false to fire on first frame
        onerror: null,       // fires on error
        onprogress: null,       // fires a load progress event
        onloadall: null,       // event fires when all frames have loaded and gif is ready
        paused: false,      // true if paused
        playing: false,      // true if playing
        waitTillDone: true,       // If true onload will fire when all frames loaded, if false, onload will fire when first frame has loaded
        loading: false,      // true if still loading
        firstFrameOnly: false,      // if true only load the first frame
        width: null,       // width in pixels
        height: null,       // height in pixels
        frames: [],         // array of frames
        comment: "",         // comments if found in file. Note I remember that some gifs have comments per frame if so this will be all comment concatenated
        length: 0,          // gif length in ms (1/1000 second)
        currentFrame: 0,          // current frame.
        frameCount: 0,          // number of frames
        playSpeed: 1,          // play speed 1 normal, 2 twice 0.5 half, -1 reverse etc...
        lastFrame: null,       // temp hold last frame loaded so you can display the gif as it loads
        image: null,       // the current image at the currentFrame
        playOnLoad: true,       // if true starts playback when loaded
        // functions
        load: loadGif,    // call this to load a file
        cancel: cancelLoad, // call to stop loading
        play: play,       // call to start play
        pause: pause,      // call to pause
        seek: seek,       // call to seek to time
        seekFrame: seekFrame,  // call to seek to frame
        togglePlay: togglePlay, // call to toggle play and pause state
    };
    return gif;
}