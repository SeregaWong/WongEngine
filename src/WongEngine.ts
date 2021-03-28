import {El} from './El';
import {WongMarkupParser} from './parsers/WongMarkupParser';
import {XmlParser} from './parsers/XmlParser';
import {CreateData, ElClass, ISchemaParser, SchemaData, SchemaString, StringMap} from './type';

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

    public static schemaParsers: StringMap<ISchemaParser> = {
        wongMarkupParser: new WongMarkupParser(),
        xmlParser: new XmlParser(),
    };

    private static schemaParser: ISchemaParser = WongEngine.schemaParsers.wongMarkupParser;

    private static elClassDatas: StringMap<ClassData> = {};

    public static setSchemaParser(parser: ISchemaParser) {
        WongEngine.schemaParser = parser;
    }

    public static registerClass(...args: WongEngine.RegisterClass.OverloadsMap['classOnly']): void;
    public static registerClass(...args: WongEngine.RegisterClass.OverloadsMap['nameAndClass']): void;
    public static registerClass(...args: WongEngine.RegisterClass.Overloads): void {

        if (WongEngine.isRegisterClassOverloadClassOnly(args)) {

            args.forEach(Class => {
                WongEngine.registerClass(Class.name, Class);
            });
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

    private static parseSchemaDatas(s: SchemaString): SchemaData[] {
        return WongEngine.schemaParser.parse(s);
    }

    private static isRegisterClassOverloadClassOnly(args: WongEngine.RegisterClass.Overloads):
        args is WongEngine.RegisterClass.OverloadsMap['classOnly'] {

        return typeof args[0] !== 'string';
    }

}
