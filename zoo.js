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
        
        /**
         * 控制台输出
         * @method log
         * @param {String} msg 消息
         * @param {String} method 消息输出类型，log/warn/error
         * @param {String} src 消息源
         * @public
         */
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
        
        /**
         * 配置参数
         * @method config
         * @param {Object} cfg 参数对象
         * @public
         */
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
        
        /**
         * 添加模块
         * @method addModule
         * @param {String} name 模块名
         * @param {Object} module 模块对象
         * @param {String} group 模块所属的组
         * @public
         */
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
        
        /**
         * 添加组
         * @method addGroup
         * @param {String} name 组名称
         * @param {Object} group 组对象
         */
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
        
        /**
         * 异步加载js
         * @method js
         */
        js: function() {
            return this.get.apply(this, toArray(arguments).unshift('js'));
        },
        
        /**
         * 异步加载css
         * @method css
         */
        css: function() {
            return this.get.apply(this, toArray(arguments).unshift('css'));
        },
        
        /**
         * 异步加载文件
         * @method get
         * @param {String} type 文件类型 js/css
         * @param {String} url 文件地址
         * @param {Object} opts 文件参数
         * @param {Function} callback 回调函数
         * @param {Boolean} parallel 是否并行下载
         */
        get: function(type, url, opts, callback, parallel) {
            var self = this,
                attrs = merge(opts && opts.attrs),
                isCSS = type === 'css',
                tag = isCSS ? 'link' : 'script',
                node;
            
            if (isCSS) {
                mix(attrs, {
                    href: url,
                    rel: 'stylesheet' 
                });
            } else {
                mix(attrs, {
                    src: url,
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
        
        /**
         * 计算模块依赖关系
         * @method calculate
         * @param {Object} use 使用的模块
         * @return {Array} calculated 模块数组
         */
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
        
        /**
         * 处理模块依赖关系，返回未下载模块数组
         * @method resolve
         * @param {Object} use 使用的模块
         * @return {Object} resolved 模块组对象
         */
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
            
            //TODO 处理combo链接
            each(calculated, function(m) {
                module = modules[m];
                group = groups[module.group];
                if (!loaded[m] && !pending[m]) {
                    resolved.urls.push(module.fullpath);
                    resolved.mods.push(m);
                }
            }, this);
            
            return resolved;
        },
        
        /**
         * 下载模块
         * @method load
         * @param {Object} resolved 分析过后的数组对象
         */
        load: function(resolved) {
            each(resolved.mods, function(mod, i) {
                this.insert(resolved.urls[i], mod);
            }, this);
            
            return this;
        },
        
        /**
         * 下载模块文件
         * @method load
         * @param {String} url 文件地址
         * @param {String} mod 模块名称
         */
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
            
            //TODO 处理combo链接
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
        
        /**
         * 等待模块下载完成，执行回调
         * @param {String} mod 模块名
         * @param {Function} callback 回调函数
         */
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
        
        /**
         * 设置模块状态为下载完成，执行wait的回调函数
         * @method done
         * @param {String} mod 模块名
         */
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
        
        /**
         * 执行模块的注册函数
         * @method attach
         * @param {String} mod 模块名
         */
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
        
        /**
         * 注册模块
         * @method add
         * @param {String} name 模块名
         * @param {Function} fn 模块函数
         * @param {Object} config 模块配置
         */
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
        
        /**
         * 使用模块
         * @method use
         * @param {String} * 多个模块名称，逗号分开
         * @param {Function} callback 回调函数
         */
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
        
        /**
         * 给Z添加对象，防止冲突 WTF API
         * @method set
         * @param {String} name 对象名
         * @param {Object} obj 对象
         * @param {Boolean} override 覆盖
         */
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