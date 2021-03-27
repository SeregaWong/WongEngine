import {El} from './El';
import {ElAttrs} from './ElAttrs';
import {ElementData} from './ElementData';
import {StringMap} from './type';

const nameValidReg = /[A-Za-z&_]/,
    separatorReg = /[\s\n]/,
    optionsStartReg = /[{\[]/,
    optionsEndReg = /[}\]]/,
    attrsStartReg = /{/,
    attrsEndReg = /}/,
    innerStartReg = /\[/,
    innerEndReg = /\]/,
    quotesAttrReg = /.*[\s]*"[^"]*"/g;

type RenderString = string;

type RenderData = RenderString | El | RenderData[];

enum ReadElStatus {
    name,
    attrs,
    inner,
}

type ElClass = new (data: ElementData) => El;

namespace WongEngine {
    export namespace RegisterClass {
        export interface OverloadsMap {
            nameAndClass: [name: string, Class: ElClass];
            classOnly: [Class: ElClass];
        }
        export type Overloads = OverloadsMap[keyof OverloadsMap];
    }
}


export class WongEngine {

    private static elInheritors: StringMap<ElClass> = {};

    private static splitElsStrings(s: RenderString) {
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
            let curChar = s[i];

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

    private static parseElementData(s: string, parent: El) {

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
                                attrs = WongEngine.parseAttrs(s.slice(cursor, i + 1).trim().slice(1, -1));
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
 
        return new ElementData(
            name,
            attrs,
            inner,
            parent,
        );
    }

    private static parseAttrs(s: string) {
        if (!s)
            return;
        const result = new ElAttrs();

        s = s.replace(quotesAttrReg, function (line) {
            let arr = line.trim().split(" "),
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

    private static renderFromString(s: RenderString, parent: El) {
        if (!s)
            return [];
        return WongEngine.splitElsStrings(s).map(dataStr => {
            const data = WongEngine.parseElementData(dataStr, parent);
            return new (WongEngine.elInheritors[data.name] || El)(data);
        });
    }

    public static render(renderData: RenderData, parent: El): El[] {

        if (typeof renderData === "string") {
            return WongEngine.renderFromString(renderData, parent);
        } else if (renderData instanceof El) {
            // renderData.parent = parent; // TODO set parent
            return [renderData];
        } else {
            return renderData.map(part => WongEngine.render(part, parent)).flat();
        }
    }

    // static getElById(id) {
    //     return arrayById[id];
    // }

    public static getElInheritor(key: string) {
        return WongEngine.elInheritors[key];
    }

    private static isRegisterClassOverloadClassOnly(args: WongEngine.RegisterClass.Overloads):
        args is WongEngine.RegisterClass.OverloadsMap['classOnly'] {

        return args.length === 1;
    }

    public static registerClass(...args: WongEngine.RegisterClass.OverloadsMap['classOnly']): void;
    public static registerClass(...args: WongEngine.RegisterClass.OverloadsMap['nameAndClass']): void;
    public static registerClass(...args: WongEngine.RegisterClass.Overloads): void {

        if (WongEngine.isRegisterClassOverloadClassOnly(args)) {
            let [Class] = args;
            return WongEngine.registerClass(Class.name, Class);
        } else {
            let [name, Class] = args;

            if (WongEngine.elInheritors[name])
                throw new Error('Class already exist');

            WongEngine.elInheritors[name] = Class;
        }
    }

}
