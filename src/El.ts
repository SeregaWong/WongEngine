import {ElAttrs} from './ElAttrs';
import {CreateData, ElementData, StringMap} from './type';
import {WongEngine} from './WongEngine';

export class El {

    get el() {
        return this._el;
    }

    get innerText() {
        return this._el.innerText;
    }

    set innerText(v) {
        this._el.innerText = v;
    }

    get key() {
        return this._key;
    }

    get parents() {
        return [...this._parents];
    }

    get childs() {
        return {...this._childs};
    }

    get childsArr() {
        return [...this._childsArr];
    }

    private _el: HTMLElement;
    private _key?: string;
    private id?: string;
    private _parents: El[] = [];
    private _childs: StringMap<El> = {};
    private _childsArr: El[] = [];
    private searchDescendantCache: StringMap<El> = {};

    public static readonly ElAttrs = ElAttrs;

    private static _elId = 0;
    private static _els: StringMap<El> = {};
    private static arrayById: StringMap<El> = {};

    constructor(data: ElementData) {
        const {
            name,
            attrs,
        } = data;
        const childs = data.childs || [];

        this._el = document.createElement(this.getExtendElementTag() || name);

        if (attrs)
            this.setAttrs(attrs.attrs);

        this.create(childs);

        El._els[(El._elId++).toString()] = this;
    }

    public append(el: El): void;
    public append(els: El[]): void;
    public append(elOrEls: El | El[]) {

        if (Array.isArray(elOrEls))
            elOrEls.forEach(el => this.append(el));
        else
            this.appendOne(elOrEls);
    }

    public appendOne(el: El) {
        this.addChild(el);
        this._el.appendChild(el._el);
    }

    public insertBefore(el1: El, el2: El) {
        this.addChild(el1);
        this._el.insertBefore(el1._el, el2._el);
    }

    public remove() {
        this._el.remove();
        const id = this.id;
        const {_els, arrayById} = El;
        if (id) {
            delete arrayById[id];
        }
        for (const key in _els) {
            _els[key].removeChild(this);
        }
    }

    public removeChild(el: El) {

        this._childsArr = this._childsArr.filter(child => {
            if (child === el) {
                const {_key} = el;
                if (_key) {
                    delete this._childs[_key];
                }

                return false;
            } else {
                return true;
            }
        });

        el.remove();
    }

    public removeChilds(childs: El[] | 'all') {
        if (Array.isArray(childs))
            childs.forEach(el => this.removeChild(el));
        else
            this.removeChilds(this._childsArr);
    }

    public searchDescendant(key: string): El | undefined {
        const {searchDescendantCache} = this;
        if (searchDescendantCache[key])
            return searchDescendantCache[key];

        const {_childs: childs} = this;
        if (childs[key])
            return childs[key];

        const {_childsArr: childsArr} = this;

        for (let i = 0; i < childsArr.length; i++) {
            const result = childsArr[i].searchDescendant(key);
            if (result) {
                searchDescendantCache[key] = result;

                return result;
            }
        }
    }


    public searchDescendants(arr: string[]): El[];
    public searchDescendants(...arr: string[]): El[];
    public searchDescendants(...arr: string[] | [keys: string[]]) {
        const [first] = arr;
        const keys = Array.isArray(first) ? first : arr as string[];

        return keys.map(key => this.searchDescendant(key));
    }

    /**
     * @deprecated use classList
     */
    public addClass(addition: string) {
        this._el.classList.add(addition);
    }

    /**
     * @deprecated use classList
     */
    public removeClass(rmClassName: string) {
        this._el.classList.remove(rmClassName);
    }

    public dynamicCreateChilds(): CreateData {
        return '';
    }

    public onCreate() {
    }

    protected getExtendElementTag() {
        return '';
    }

    private addParent(el: El) {
        this._parents.push(el);
    }

    private setAttrs(attrs: StringMap) {
        const el = this._el;

        for (const key in attrs) {
            const val = attrs[key];
            switch (key) {
                case 'key':
                    this._key = val;
                    break;
                case 'id':
                    const {arrayById} = El;

                    if (!arrayById[val]) {
                        if (this.id)
                            delete arrayById[this.id];
                        this.id = val;
                        arrayById[val] = this;
                    }
                default:
                    el.setAttribute(key, val);
                    break;
            }
        }
    }

    private create(childs: El[]) {

        const addition = this.dynamicCreateChilds();

        childs.concat(WongEngine.create(addition))
            .forEach(el => this.append(el));

        this.onCreate();
    }

    private addChild(el: El) {
        const {_key} = el;
        if (!!_key)
            this._childs[_key] = el;
        this._childsArr.push(el);
        el.addParent(this);
    }

    public static getElById(id: string) {
        return El.arrayById[id];
    }

}
