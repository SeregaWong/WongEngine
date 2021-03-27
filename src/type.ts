import {El} from './El';
import {ElAttrs} from './ElAttrs';

export interface ElClass {
    new (data: ElementData): El;
    getSchema(): SchemaString;
}

export interface BaseElementData {
    name: string,
    attrs?: ElAttrs,
}

export interface ElementData extends BaseElementData {
    childs?: El[];
}

export interface SchemaData extends BaseElementData {
    childs?: SchemaData[];
}

export type SchemaString = string;

export type CreateData = SchemaString | El | SchemaData | CreateData[];

export type StringMap<T = string> = {
    [P in string]: T;
};
