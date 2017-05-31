import './polyfill';
import { parse, stringify } from './querystring';
import { urlParse, Url } from './url'
export function _aURL(url) {
    const ae: any = document.createElement('a');
    ae.href = url;
    ae.query = parse(ae.search.slice(1));
    ae.searchParams = {
        get: function (key) {
            return ae.query[key];
        },
        set: function (key, val) {
            ae.query[key] = val;
        }
    };
    ae.toString = () => {
        ae.search = '?' + stringify(ae.query);
        return ae.href
    };
    return ae;
}


Url.prototype.toString = function() {
    this.search = '?' + stringify(this.query);
    return this.format();
};
export function _nodeURL(url) {
    var obj = urlParse(url, true);
    obj.searchParams = {
        get: function (key) {
            return obj.query[key];
        },
        set: function (key, val) {
            obj.query[key] = val;
        }
    }
    return obj;
}

window._aURL = _aURL;
window._nodeURL = _nodeURL;