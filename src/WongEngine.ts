import {El} from './El';
import {ElAttrs} from './ElAttrs';
import {CreateData, ElClass, SchemaData, SchemaString, StringMap} from './type';

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

interface ClassData {
    Class: ElClass;
    schema: SchemaData[];
}

namespace WongEngine {
    export namespace RegisterClass {
        export interface OverloadsMap {
            nameAndClass: [name: string, Class: ElClass];
            classOnly: [Class: ElClass, ...another: ElClass[]];
        }
        export type Overloads = OverloadsMap[keyof OverloadsMap];
    }
}


export class WongEngine {

    private static elClassDatas: StringMap<ClassData> = {};

    public static registerClass(...args: WongEngine.RegisterClass.OverloadsMap['classOnly']): void;
    public static registerClass(...args: WongEngine.RegisterClass.OverloadsMap['nameAndClass']): void;
    public static registerClass(...args: WongEngine.RegisterClass.Overloads): void {

        if (WongEngine.isRegisterClassOverloadClassOnly(args)) {
            const [Class] = args;

            return WongEngine.registerClass(Class.name, Class);
        } else {
            const [name, Class] = args;

            if (WongEngine.elClassDatas[name])
                throw new Error('Class already exist');

            WongEngine.elClassDatas[name] = {
                Class,
                schema: this.parseSchemaDatas(Class.getSchema()),
            };
        }
    }

    public static create(createData: CreateData): El[] {

        if (typeof createData === "string") {
            return WongEngine.create(WongEngine.parseSchemaDatas(createData));
        } else if (createData instanceof El) {
            return [createData];
        } else if (Array.isArray(createData)) {
            return createData.map(part => WongEngine.create(part)).flat();
        } else {
            const {childs: schemaChilds, ...data} = createData;
            const elClassData = WongEngine.elClassDatas[createData.name];
            const childs: El[] = [];

            if (elClassData) {
                childs.push(...WongEngine.create(elClassData.schema));
            }

            if (schemaChilds) {
                childs.push(...WongEngine.create(schemaChilds));
            }

            return [
                new (elClassData?.Class || El)({
                    childs,
                    ...data,
                }),
            ];
        }
    }

    public static getElClassByName(name: string) {
        return WongEngine.elClassDatas[name].Class;
    }

    private static splitElsStrings(s: SchemaString) {
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

    private static parseSchemaDatas(s: SchemaString): SchemaData[] {
        return this.splitElsStrings(s).map(this.parseSchemaData);
    }

    private static parseSchemaData(s: SchemaString): SchemaData {

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

        const res: SchemaData = {
            name,
            attrs,
        };

        if (inner) {
            res.childs = WongEngine.parseSchemaDatas(inner);
        }

        return res;
    }

    private static parseAttrs(s: string) {
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

    private static isRegisterClassOverloadClassOnly(args: WongEngine.RegisterClass.Overloads):
        args is WongEngine.RegisterClass.OverloadsMap['classOnly'] {

        return args.length === 1;
    }

}
