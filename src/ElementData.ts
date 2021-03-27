import {El} from './El';
import {ElAttrs} from './ElAttrs';

export class ElementData {

    constructor(
        public name: string,
        public attrs?: ElAttrs,
        public inner?: string,
        public parent?: El,
    ) {}
}
