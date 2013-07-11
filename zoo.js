/**
 * a simple js module loader
 * @author ningzbruc@gmail.com
 * @date 2013-07-11
 * @version 0.0.1~alpha
 */

;(function(window) {
    
    var doc = window.document,
        head = doc.getElementsByTagName('head')[0],
    
    Z = {
        version: '0.0.1~alpha',
        Config : {
            debug: false,
            modules: {},
            groups: {}
        },
        Env: {
            host: window,
            loaded: {},
            attached: {},
            pending: {},
            waiting: {},
            fns: {}
        }
    };
    
    function toArray(obj, index) {
        return Array.prototype.slice.call(obj, index || 0);
    }
    
    function isFunction(obj) {
        return typeof obj === 'function';
    }
    
    function isArray(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    }
    
    function isString(obj) {
        return Object.prototype.toString.call(obj) === '[object String]';
    }
    
    function each(obj, func, context) {
        if (isArray(obj)) {
            for (var i = 0, l = obj.length; i < l; i++) {
                func.call(context, obj[i], i, obj);
            }
        } else if (obj) {
            for (var k in obj) {
                if (obj.hasOwnProperty(k)) {
                    func.call(context, obj[k], k, obj);
                }
            }
        }
    }
    
    function map(array, func, context) {
        var result = [];
        
        each(array, function(item, index) {
            if (func.call(this, item, index, array)) {
                result.push(item);
            }
        }, context);
        
        return result;
    }
    
    function dedupe(array) {
        var hash    = {},
            results = [],
            i = 0,
            l = array.length,
            item;
    
        for (; i < l; i++) {
            item = array[i];
            if (!hash.hasOwnProperty(item)) {
                hash[item] = 1;
                results.push(item);
            }
        }
     
        return results;
    }
    
    function mix(r, s, o) {
        r = r || {};
        
        if (s) {
            for (var k in s) {
                if (s.hasOwnProperty(k) && (!r[k] || o)) {
                    r[k] = s[k];
                }
            }
        }
        
        return r;
    }
    
    function merge() {
        var args = toArray(arguments),
            override = args[args.length - 1] === false ? args.pop() : true,
            obj = {};
        
        each(args, function(o) {
            mix(obj, o, override);
        });
        
        return obj;
    }
    
    function createNode(tag, attrs) {
        var node = document.createElement(tag);
        each(attrs, function(attr, name) {
            node.setAttribute(name, attr);
        });
        return node;
    }
    
    mix(Z, {
        
        log: function(msg, method, src) {
            if (this.Config.debug) {
                if (src) {
                    msg = src + ': ' + msg;
                }
                method = method || 'log';
                if (window['console']) {
                    console && console[method] && console[method](msg);
                }
            }
        },
       
        config: function(cfg) {
            var config = this.Config,
                c = cfg || {},
                k, v;
            
            for (k in cfg) {
                if (c.hasOwnProperty(k)) {
                    v = c[k];
                    switch (k) {
                        case 'modules':
                            this.addModule(v);
                            break;
                        case 'groups':
                            this.addGroup(v);
                            break;
                        default:
                            config[k] = v;
                    }
                }
            }
            
            return this;
        },

        addModule: function(name, module, group) {
            var config = this.Config,
                modules = config.modules;
                
            if (!isString(name)) {
                group = module;
                module = name;
                each(module, function(m, n) {
                    this.addModule(n, m, group);
                }, this);
            } else {
                if (modules[name]) {
                    this.log('module ' + n + ' already exist.', 'warn', 'addModule');
                } else {
                    module.group = group;
                    module.name = name;
                    modules[name] = module;
                }
            }
            
            return this;
        },
        
        addGroup: function(name, group) {
            var config = this.Config,
                groups = config.groups;
            
            if (!isString(group)) {
                group = name;
                each(group, function(g, n) {
                    this.addGroup(n, g);
                }, this);
            } else {
                group.name = name;
                mix(groups[name], group);
                if (group.modules) {
                    this.addModule(group.modules, name);
                    mix(groups[name].modules, group.modules);
                }
            }
            
            return this;
        },
        
        js: function() {
            this.get.apply(this, toArray(arguments).unshift('js'));
        },
        
        css: function() {
            this.get.apply(this, toArray(arguments).unshift('css'));
        },
        
        get: function(type, url, opts, callback, parallel) {
            var self = this,
                attrs = merge(opts && opts.attrs),
                isCSS = type === 'css',
                tag = isCSS ? 'link' : 'script',
                node;
            
            if (isCSS) {
                mix(attrs, {
                    href: url.url,
                    rel: 'stylesheet' 
                });
            } else {
                mix(attrs, {
                    src: url.url,
                    charset: 'utf-8',
                    type: 'text/javascript'
                });
            }
            
            node = createNode(tag, attrs);
            
            if (!isCSS) {
                node.async = true;
            }
            
            node.onload = node.onerror = function() {
                node.onload = node.onerror = null;
                callback && callback.call(self);
            };
            
            head.appendChild(node);
            
            return this;
        },
        
        calculate: function(use) {
            var config = this.Config,
                modules = config.modules,
                mods = use || [],
                i = 0,
                l = mods.length,
                calculated = [],
                temp = [],
                n, m;
            
            for (; i < l; i++) {
                n = mods[i];
                m = modules[n];
                
                if (!m) {
                    this.log('module ' + n + ' not found.', 'warn', 'resolve');
                    continue;
                }
                
                if (m.requires) {
                    calculated.push.apply(calculated, this.calculate(m.requires));
                }
                
                calculated.push(n);
            }
            
            return dedupe(calculated);
        },
        
        resolve: function(use) {
            var config = this.Config,
                env = this.Env,
                loaded = env.loaded,
                pending = env.pending,
                modules = config.modules,
                groups = config.groups,
                calculated = this.calculate(use),
                resolved = {
                    urls: [],
                    mods: [],
                    calculated: calculated
                },
                type, module, group;
            
            each(calculated, function(m) {
                module = modules[m];
                group = groups[module.group];
                if (!loaded[m] && !pending[m]) {
                    resolved.urls.push({
                        url: module.fullpath,
                        opts: {}
                    });
                    resolved.mods.push(m);
                }
            }, this);
            
            return resolved;
        },
        
        load: function(resolved) {
            each(resolved.mods, function(mod, i) {
                this.insert(resolved.urls[i], mod);
            }, this);
            
            return this;
        },
        
        insert: function(url, mod) {
            var self = this,
                config = this.Config,
                env = this.Env,
                modules = config.modules,
                groups = config.groups,
                loaded = env.loaded,
                pending = env.pending,
                module = modules[mod],
                type, requires;
            
            if (module) {
                if (!loaded[mod] && !pending[mod]) {
                    function insert() {
                        pending[mod] = true;
                        self.get(module.type, url, null, function() {
                            self.done(mod);
                        });
                    }
                    if (module.async !== false || module.type === 'css' || (!module.requires || !module.requires.length)) {
                        insert();
                    } else {
                        this.wait(module.requires, function() {
                            insert();
                        });
                    }
                }
            } else {
                this.log('module ' + mod + ' not found.', 'warn', 'insert');
            }
            
            return this;
        },
        
        wait: function(mod, callback) {
            var self = this,
                config = this.Config,
                env = this.Env,
                loaded = env.loaded,
                waiting = env.waiting,
                modules = config.modules,
                done = 0,
                len, cb;
                
            if (isArray(mod)) {
                len = mod.length;
                cb = function() {
                    if (++done >= len) {
                        callback.call(self, mod);
                    }
                };
                each(mod, function(m) {
                    this.wait(m, cb);
                }, this);
            } else {
                if (loaded[mod] || !modules[mod]) {
                    callback.call(self, [mod]);
                } else {
                    waiting[mod] = waiting[mod] || [];
                    waiting[mod].push(callback);
                }
            }
            
            return this;
        },
        
        done: function(mod) {
            var self = this,
                env = this.Env,
                loaded = env.loaded,
                pending = env.pending,
                waiting = env.waiting;
                
            if (isArray(mod)) {
                each(mod, function(m) {
                    this.done(m);
                }, this);
            } else {
                delete pending[mod];
                loaded[mod] = true;
                if (waiting[mod]) {
                    each(waiting[mod], function(cb) {
                        cb.call(this, [mod]);
                    }, this);
                    delete waiting[mod];
                }
            }
            
            return this;
        },
        
        attach: function(mod) {
            var env = this.Env,
                config = this.Config,
                modules = config.modules,
                loaded = env.loaded,
                attached = env.attached,
                fns = env.fns,
                fn;
            
            if (isArray(mod)) {
                each(mod, function(m) {
                    this.attach(m);
                }, this);
            } else {
                if (loaded[mod] && !attached[mod] && (fn = fns[mod])) {
                    fn.call(this, this);
                    attached[mod] = true;
                }
            }
            
            return this;
        },
        
        add: function(name, fn, config) {
            var config = this.Config,
                env = this.Env,
                attached = env.attached,
                fns = env.fns;
                
            this.done(name);
            delete attached[name];
            
            if (fns[name]) {
                this.log('module ' + name + ' already exists.', 'warn', 'add');
            } else {
                fns[name] = fn;
            }
            
            return this;
        },
        
        use: function() {
            var use = toArray(arguments),
                callback = isFunction(use[use.length - 1]) ? use.pop() : null,
                resolved = this.resolve(use);
            
            this.wait(resolved.calculated, function() {
                this.attach(resolved.calculated);
                callback && callback.call(this, this, resolved.calculated);
            });
            
            this.load(resolved);
            
            return this;
        },
        
        set: function(name, obj, override) {
            if (typeof this[name] !== 'undefined' && !override) {
                this.log('Z.' + name + ' already exist, but you can override it by setting last param to true.', 'error', 'set');
                return;
            }
            return (this[name] = obj);
        }
        
    });
    
    window.Zoo = window.ZOO = Z;
    
})(this);