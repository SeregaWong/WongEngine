import {StringMap} from './type';

export class ElAttrs {

    public attrs: StringMap = {};

    constructor(options?: StringMap) {
        if (options) {
            for (let key in options)
                this.setAttr(key, options[key]);
        }
    }

    public setAttr(key: string, val: string) {

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

        this.attrs[key] = val;
    }
}
