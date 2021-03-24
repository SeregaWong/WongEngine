module.exports = function (El) {

    class ElementData {
        name;
        attrs;
        inner;
        parent;

        constructor(name, attrs, inner, parent) {
            if (!(parent instanceof El) && parent !== undefined)
                throw new Error('wrong parent');
            this.name = name;
            this.attrs = attrs;
            this.inner = inner;
            this.parent = parent;
        }
    }

    return ElementData;
};