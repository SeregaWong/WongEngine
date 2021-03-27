import {ElAttrs} from '../ElAttrs';
import {ISchemaParser, SchemaData, SchemaString} from '../type';

const nameValidReg = /[A-Za-z&_]/,
    separatorReg = /[\s\n]/,
    optionsStartReg = /[{\[]/,
    optionsEndReg = /[}\]]/,
    attrsStartReg = /{/,
    attrsEndReg = /}/,
    innerStartReg = /\[/,
    innerEndReg = /\]/,
    quotesAttrReg = /.*[\s]*"[^"]*"/g;

enum ReadElStatus {
    name,
    attrs,
    inner,
}

export class WongMarkupParser implements ISchemaParser {

    private static instance?: WongMarkupParser;

    constructor() {
        if (WongMarkupParser.instance) return WongMarkupParser.instance;

        WongMarkupParser.instance = this;
    }

    parse(s: SchemaString) {
        return this.splitElsStrings(s).map(this.parseSchemaData);
    }

    private splitElsStrings(s: SchemaString) {
        if (!s)
            return [];
        s = s.trim();

        const elsStrings: string[] = [];
        let wasSeparator = false,
            wasEndBracket = false,
            elStrStartCursor = 0,
            bracketCount = 0,
            status = ReadElStatus.name; // 1 - attrs, 2 - inner

        for (let i = 0; i < s.length; i++) {
            const curChar = s[i];

            if (bracketCount) {
                if (status === ReadElStatus.attrs) {
                    if (attrsStartReg.test(curChar)) {
                        bracketCount++;
                    }
                    if (attrsEndReg.test(curChar)) {
                        bracketCount--;
                        wasEndBracket = true;
                    }
                } else if (status === ReadElStatus.inner) {
                    if (innerStartReg.test(curChar)) {
                        bracketCount++;
                    }
                    if (innerEndReg.test(curChar)) {
                        bracketCount--;
                        wasEndBracket = true;
                    }
                }
            } else {
                status = ReadElStatus.name;

                if (nameValidReg.test(curChar) && (wasSeparator || wasEndBracket)) {
                    elsStrings.push(s.slice(elStrStartCursor, i));
                    elStrStartCursor = i;
                }
                if (optionsStartReg.test(curChar)) {
                    bracketCount++;
                    status = attrsStartReg.test(curChar) ? ReadElStatus.attrs : ReadElStatus.inner;
                }
                if (separatorReg.test(curChar)) {
                    wasSeparator = true;
                } else {
                    wasSeparator = false;
                }
                wasEndBracket = false;

            }
        }
        elsStrings.push(s.slice(elStrStartCursor));

        return elsStrings;
    }

    private parseSchemaData(s: SchemaString): SchemaData {

        let name: string | undefined,
            attrs: ElAttrs | undefined,
            inner: string | undefined,
            step = ReadElStatus.name,
            bracketCount = 0,
            cursor = 0;

        for (let i = 0; i < s.length; i++) {
            const curChar = s[i];
            switch (step) {
                case ReadElStatus.name:
                    if (optionsStartReg.test(curChar)) {
                        name = s.slice(cursor, i);
                        cursor = i;
                        step = attrsStartReg.test(curChar) ? ReadElStatus.attrs : ReadElStatus.inner;
                        bracketCount++;
                    }
                    break;
                case ReadElStatus.attrs:
                case ReadElStatus.inner:
                    let startReg: RegExp, endReg: RegExp;

                    if (step === ReadElStatus.attrs) {
                        startReg = attrsStartReg;
                        endReg = attrsEndReg;
                    } else {
                        startReg = innerStartReg;
                        endReg = innerEndReg;
                    }

                    if (startReg.test(curChar)) {
                        bracketCount++;
                    } else if (endReg.test(curChar)) {
                        bracketCount--;
                        if (bracketCount === 0) {
                            if (step === ReadElStatus.attrs) {
                                attrs = this.parseAttrs(s.slice(cursor, i + 1).trim().slice(1, -1));
                                cursor = i + 1;
                            } else {
                                inner = s.slice(cursor, i + 1).trim().slice(1, -1);
                            }
                            step++;
                        }
                    }
                    break;
            }
        }
        if (!step)
            name = s.slice(cursor, s.length);

        name = (name || '').trim();

        if (!name) throw new Error('FATAL ERROR: cannot parse name');

        const res: SchemaData = {
            name,
            attrs,
        };

        if (inner) {
            res.childs = this.parse(inner);
        }

        return res;
    }

    private parseAttrs(s: string) {
        if (!s)
            return;
        const result = new ElAttrs();

        s = s.replace(quotesAttrReg, function (line) {
            const arr = line.trim().split(" "),
                key = arr[0].trim();
            arr[0] = '';
            result.setAttr(key, arr.join(" ").trim().slice(1, -1));

            return "";
        });

        s.split('\n').forEach(line => {
            line = line.trim();
            if (line) {
                const keyAndVal = line.split('\s').filter(item => !!item);
                if (keyAndVal.length !== 2)
                    throw new Error('syntax attr exception: ' + line);
                result.setAttr(keyAndVal[0], keyAndVal[1]);
            }
        });


        return result;
    }
}
