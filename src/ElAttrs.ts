
class ElAttrs {

    constructor(options) {
        if (typeof options === "object") {
            for (let key in options)
                this.setAttr(key, options[key]);
        }
    }

    setAttr(key, val) {

        switch (key) {
            case 'c':
            case 'class':
            case 'Class':
                key = 'className';
                break;
            case 'i':
                key = 'id';
                break;
            case 'k':
                key = 'key';
                break;
            case 't':
            case 'txt':
            case 'text':
            case 'Text':
                key = 'innerText';
                break;
        }
        this[key] = val;
    }
}

module.exports = ElAttrs;