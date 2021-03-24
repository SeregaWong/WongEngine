const nameValidReg = /[A-Za-z&_]/,
    separatorReg = /[\s\n]/,
    optionsStartReg = /[{\[]/,
    optionsEndReg = /[}\]]/,
    attrsStartReg = /{/,
    attrsEndReg = /}/,
    innerStartReg = /\[/,
    innerEndReg = /\]/,
    quotesAttrReg = /.*[\s]*"[^"]*"/g,
    elInheritors = {},
    arrayById = {};
let ElementData, ElAttrs, El;


class Wong {

    static splitElsStrings(s) {
        if (!s)
            return;
        s = s.trim();

        let elsStrings = [],
            waeSeparator = false,
            waeEndBracket = false,
            elStrStartPoint = 0,
            bracketCount = 0,
            status = 0; // 1 - attrs, 2 - inner

        for (let i = 0; i < s.length; i++) {
            let l = s[i];

            if (bracketCount) {
                if (status === 1) {
                    if (attrsStartReg.test(l)) {
                        bracketCount++;
                    }
                    if (attrsEndReg.test(l)) {
                        bracketCount--;
                        waeEndBracket = true;
                    }
                } else if (status === 2) {
                    if (innerStartReg.test(l)) {
                        bracketCount++;
                    }
                    if (innerEndReg.test(l)) {
                        bracketCount--;
                        waeEndBracket = true;
                    }
                }
            } else {
                status = 0;

                if (nameValidReg.test(l) && (waeSeparator || waeEndBracket)) {
                    elsStrings.push(s.slice(elStrStartPoint, i));
                    elStrStartPoint = i;
                }
                if (optionsStartReg.test(l)) {
                    bracketCount++;
                    status = attrsStartReg.test(l) ? 1 : 2;
                }
                if (separatorReg.test(l)) {
                    waeSeparator = true;
                } else
                    waeSeparator = false;
                waeEndBracket = false;

            }
        }
        elsStrings.push(s.slice(elStrStartPoint));

        return elsStrings;
    }

    static parseElementData(s, parent) {
        if (!s)
            return;
        let name,
            attrs,
            inner,
            step = 0,
            bracketCount = 0,
            point = 0;

        for (let i = 0; i < s.length; i++) {
            let l = s[i];
            switch (step) {
                case 0:
                    if (optionsStartReg.test(l)) {
                        name = s.slice(point, i);
                        point = i;
                        step = attrsStartReg.test(l) ? 1 : 2;
                        bracketCount++;
                    }
                    break;
                case 1:
                case 2:
                    if ((step === 1 ? attrsStartReg : innerStartReg).test(l)) {
                        bracketCount++;
                    } else if ((step === 1 ? attrsEndReg : innerEndReg).test(l)) {
                        bracketCount--;
                        if (bracketCount === 0) {
                            if (step === 1) {
                                attrs = Wong.parseAttrs(s.slice(point, i + 1).trim().slice(1, -1));
                                point = i + 1;
                            } else
                                inner = s.slice(point, i + 1).trim().slice(1, -1);
                            step++;
                        }
                    }
                    break;
            }
        }
        if (!step)
            name = s.slice(point, s.length);
        name = name.trim();

        return new ElementData(
            name,
            attrs,
            inner,
            parent
        );
    }

    static parseAttrs(s) {
        if (!s)
            return;
        let result = new ElAttrs();

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
                let arr = line.split(' ').filter(item => !!item);
                if (arr.length !== 2)
                    throw new Error('syntax attr exception: ' + line);
                result.setAttr(...arr)
            }
        });


        return result;
    }

    static renderArr(o, parent) {
        if (typeof o === "string") {
            return Wong.renderFromString(o, parent);
        } else if (Array.isArray(o)) {
            return o.map(part => {
                if (typeof part === "string") {
                    return Wong.renderFromString(part, parent);
                } else if (part instanceof El) {
                    part.parent = parent;
                    return part;
                } else if (Array.isArray(part))
                    return Wong.renderArr(part, parent);
            }).flat();
        }
    }

    static renderFromString(s, parent) {
        if (!s)
            return;
        return Wong.splitElsStrings(s).map(dataStr => {
            let data = Wong.parseElementData(dataStr, parent);
            return new (elInheritors[data.name] || El)(data);
        });
    }

    static render(o, parent) {
        if (!o)
            return;
        let result = Wong.renderArr(o, parent);
        return result.length === 1 ? result[0] : result;
    }

    static registerClass(ClassOrName, Class) {
        let name;
        if (typeof ClassOrName === "string")
            name = ClassOrName;
        else {
            Class = ClassOrName;
            name = Class.name;
        }
        if (elInheritors[name])
            throw new Error('Class already exist');
        if (Class.prototype instanceof El)
            elInheritors[name] = Class;
    }

    static getElById(id) {
        return arrayById[id];
    }

    static getElInheritor(key) {
        return elInheritors[key];
    }
}

El = require('./El')({Wong, arrayById});
ElementData = El.ElementData;
ElAttrs = El.ElAttrs;
Wong.El = El;

module.exports = Wong;

