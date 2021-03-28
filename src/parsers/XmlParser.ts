import {ElAttrs} from '../ElAttrs';
import {ISchemaParser, SchemaData, SchemaString} from '../type';

export class XmlParser implements ISchemaParser {

    private static attrReg = /[A-Za-z$_-]*="(\\"|[^"])*"/g;

    private static instance?: XmlParser;

    constructor() {
        if (XmlParser.instance) return XmlParser.instance;

        XmlParser.instance = this;
    }

    public parseDom(xmlStr: string) {
        const parser = new DOMParser();
        const doc: XMLDocument = parser.parseFromString('<xml>' + xmlStr + '</xml>', "text/xml");

        const parsererror = doc.documentElement.getElementsByTagName('parsererror')[0];
        if (parsererror) {
            throw doc;
        }

        return doc;
    }

    public parse(xmlStr: string) {
        const doc = this.parseDom(xmlStr);
        const xml = doc.documentElement;

        return this.parseSchemaDatas(Array.from(xml.children));
    }

    private parseSchemaData(el: Element): SchemaData {
        let childs: SchemaData['childs'];

        const {children} = el;
        if (children.length) {
            childs = this.parseSchemaDatas(Array.from(children));
        }

        return {
            name: el.tagName,
            attrs: this.parseAttrs(el),
            childs,
        };
    }

    private parseSchemaDatas(els: Element[]): SchemaData[] {
        return els.map(el => this.parseSchemaData(el));
    }

    private parseAttrs(s: string): ElAttrs | undefined;
    private parseAttrs(el: Element): ElAttrs | undefined;
    private parseAttrs(src: string | Element): ElAttrs | undefined {
        if (typeof src === 'string') {
            return this.parseAttrsFromString(src);
        }
        const el = src;
        const attrsArr = Array.from(el.attributes);

        if (!attrsArr.length) return;

        const res = new ElAttrs();

        attrsArr.forEach(attr => {
            res.setAttr(attr.name, attr.value);
        });

        return res;
    }

    private parseAttrsFromString(s: string) {
        const attrsStrs = s.match(XmlParser.attrReg);

        if (!attrsStrs || !attrsStrs.length) return;

        const res = new ElAttrs();

        attrsStrs.forEach(attrStr => {
            const [key, val] = attrStr.split('=');

            res.setAttr(key, val.slice(1, -1));
        });

        return res;
    }

}
