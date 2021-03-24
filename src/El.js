module.exports = function (buildContext) {
    let {Wong, arrayById} = buildContext,
        _elid = 0,
        ElementData,
        _els = {};
    const ElAttrs = require('./ElAttrs');

    class El {
        #el;
        #key;
        #id;
        #parent;
        #attrs;
        #childs = {};
        #childsArr = [];
        #searchDescendantCache = {};
        #renderFlag = false;

        constructor(data) {
            if (!(data instanceof ElementData))
                throw new Error('wrong data');

            let {
                name,
                attrs,
                inner,
                parent
            } = data;
            inner = inner || '';

            this.#el = document.createElement(this.__proto__.constructor.extendElName || name);
            this.#parent = parent;

            this.setAttrs(attrs);

            this.render(inner);

            this.onCreate();

            _els[_elid++] = this;
        }

        setAttrs(attrs) {
            if (!attrs)
                return;
            let el = this.#el,
                _attrs;
            if (!this.#attrs) {
                if (attrs instanceof ElAttrs)
                    this.#attrs = _attrs = attrs;
                else
                    this.#attrs = _attrs = new ElAttrs(attrs);
            }

            for (let key in _attrs) {
                let val = _attrs[key];
                switch (key) {
                    case 'key':
                        if (this.#key !== undefined)
                            throw new Error('cannot redefine key');
                        this.#key = val;
                        break;
                    case 'id':
                        if (!arrayById[val]) {
                            if (this.#id)
                                delete arrayById[this.#id];
                            this.#id = val;
                            arrayById[val] = this;
                        }
                    default:
                        el[key] = val;
                        break;
                }
            }
        }

        render(inner) {

            let addition = this.onRender(this.#attrs);
            if (typeof addition === "string")
                inner = [addition, inner];
            else if (Array.isArray(addition)) {
                inner = [addition, inner].flat();
            }
            if (!inner)
                return;

            if (this.#renderFlag)
                this.removeChilds('all');

            this.#renderFlag = true;
            Wong.renderArr(inner, this).forEach(el => this.append(el));
        }

        append(el) {
            if (typeof el === "string")
                return this.append(Wong.render(el, this));

            if (el instanceof El) {
                this.addChild(el);
                this.#el.appendChild(el.el);
            } else if (Array.isArray(el))
                el.forEach(item => this.append(item));
        }

        insertBefore(el1, el2) {
            if (el1 instanceof El && el2 instanceof El) {
                this.addChild(el1);
                this.#el.insertBefore(el1.el, el2.el);
            }
        }

        addChild(el) {
            if (el instanceof El) {
                let {key} = el;
                if (key !== undefined)
                    this.#childs[key] = el;
                this.#childsArr.push(el);
                el.parent = this;
            }
        }

        remove() {
            this.#el.remove();
            let id = this.#id;
            if (arrayById[id])
                delete arrayById[id];
            for (let key in _els) {
                _els[key].removeChild(this);
            }
        }

        removeChild(el) {
            if (el instanceof El) {
                let deleteFlag = false,
                    {key} = el;

                this.#childsArr = this.#childsArr.filter(child => {
                    if (child === el) {
                        el.el.remove();
                        if (this.#childs[key]) {
                            delete this.#childs[key];
                        }
                    } else
                        return true;
                });
            }
        }

        removeChilds(childs) {
            if (Array.isArray(childs))
                childs.forEach(el => this.removeChild(el));
            else if (childs === 'all')
                this.removeChilds(this.#childsArr);
        }

        searchDescendant(key) {
            let searchDescendantCache = this.#searchDescendantCache;
            if (searchDescendantCache[key])
                return searchDescendantCache[key];
            let childs = this.#childs,
                childsArr = this.#childsArr;
            if (childs[key])
                return childs[key];

            for (let i = 0; i < childsArr.length; i++) {
                let result = childsArr[i].searchDescendant(key);
                if (result) {
                    searchDescendantCache[key] = result;
                    return result;
                }
            }
        }

        searchDescendants(...arr) {
            if (Array.isArray(arr[0])) {
                arr = arr[0];
            }
            return arr.map(key => this.searchDescendant(key));
        }

        addClass(addition) {
            let el = this.#el,
                {className} = el;
            if (className) {
                if (className.indexOf(addition) === -1)
                    el.className += ' ' + addition;
            } else
                el.className = addition;
        }

        removeClass(rmClassName) {
            let el = this.#el,
                {className} = el,
                index = className.indexOf(rmClassName);
            if (index === -1)
                return;
            if (index !== 0)
                rmClassName = ' ' + rmClassName;

            el.className = className.replace(rmClassName, '');
        }

        onRender() {

        }

        onCreate() {
        }

        get el() {
            return this.#el;
        }

        get innerText() {
            return this.#el.innerText;
        }

        set innerText(v) {
            this.#el.innerText = v;
        }

        get key() {
            return this.#key;
        }

        get parent() {
            return this.#parent;
        }

        set parent(v) {
            if (v instanceof El)
                this.#parent = v;
        }

        get childs() {
            return this.#childs;
        }

        get childsArr() {
            return this.#childsArr;
        }
    }

    El.ElementData = ElementData = require('./ElementData')(El);
    El.ElAttrs = ElAttrs;

    return El;
}