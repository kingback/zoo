/**
 * a simple js module loader
 * @author ningzbruc@gmail.com
 * @date 2013-07-11
 * @version 0.0.1~alpha
 */

;(function(window) {
    
    var doc = window.document,
        head = doc.getElementsByTagName('head')[0],
    
        //TODO 常用对象定义为变量
        Config = {},
        Modules = Config.modules = {},
        Groups = Config.groups = {},
        
        Env = {},
        Loaded = Env.loaded = {},
        Attached = Env.attached = {},
        Pending = Env.pending = {},
        Waiting = Env.waiting = {},
        ModuleFns = Env.moduleFns = {},
        
    Z = {
        version: '0.0.1~alpha',
        Config : {
            debug: false,
            modules: {},
            groups: {},
            maxURLLength: 2048,
            maxComboNum: 50,
            combine: false,
            comboSep: ','
        },
        Env: {
            host: window,
            loaded: {},
            attached: {},
            pending: {},
            waiting: {},
            moduleFns: {}
        }
    };
    
    function toArray(obj, index) {
        return Array.prototype.slice.call(obj, index || 0);
    }
    
    function isFunction(obj) {
        return typeof obj === 'function';
    }
    
    function isUndefined(obj) {
        return typeof obj === 'undefined';
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
        
        init: function() {
            return this;
        },
        
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
                    o = {};
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
            
            if (!isString(name)) {
                group = name;
                each(group, function(g, n) {
                    this.addGroup(n, g);
                }, this);
            } else {
                group.name = name;
                groups[name] = mix(groups[name], group);
                if (group.modules) {
                    this.addModule(group.modules, name);
                    groups[name].modules = mix(groups[name].modules, group.modules);
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
                isCSS = type === 'css',
                tag = isCSS ? 'link' : 'script',
                node, attrs, cb, next, done, len, finish;
            
            if (isFunction(opts)) {
                parallel = callback;
                callback = opts;
                opts = null;
            }
            
            if (isArray(url)) {
                done = 0;
                len = url.length;
                parallel = parallel === false ? false : true;
                
                cb = function() {
                    if (++done >= len) {
                        callback && callback.call(self);
                    } else if (!parallel) {
                        next();
                    }
                };
                
                next = function() {
                    self.get(type, url[done], opts, cb, parallel);    
                };
                
                if (parallel) {
                    each(url, function() {
                        next();
                    });
                } else {
                    next();
                }
                
                return this;
            }
            
            //TODO 区分success和error
            
            if (!isString(url)) {
                finish = url.callback;
                attr = url.opts && url.opts.attrs;
                url = url.url;
            }
            
            //TODO override?
            attrs = merge(opts && opts.attrs);
            
            if (isCSS) {
                attrs = mix(attrs, {
                    href: url,
                    rel: 'stylesheet' 
                });
            } else {
                attrs = mix(attrs, {
                    src: url,
                    charset: 'utf-8',
                    type: 'text/javascript'
                });
            }
            
            node = createNode(tag, attrs);
            
            if (!isCSS) {
                node.async = true;
            }
            
            //TODO 区分success和error
            node.onload = node.onerror = function() {
                node.onload = node.onerror = null;
                finish && finish.call(self);
                callback && callback.call(self);
            };
            
            head.appendChild(node);
            
            return this;
        },
        
        /**
         * 获取组的配置
         * @param {String|Object} group 组或组名
         * @param {String} key 参数名
         * @param {Any} def 如果都没有时的默认值
         */
        getGroupConfig: function(group, key, def) {
            var config = this.Config,
                groups = config.groups;
            
            if (isString(group)) {
                group = groups[group];
            }
            
            if (group && !isUndefined(group[key])) {
                return group[key];
            } else if (!isUndefined(config[key])) {
                return config[key];
            } else {
                return def;
            }
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
         * 排除已经下载或者是下载中的或者无效的模块
         * @method exclude
         * @param {Array} 模块数组
         */
        exclude: function(use) {
            var config = this.Config,
                env = this.Env,
                modules = config.modules,
                pending = env.pending,
                loaded = env.loaded;
            
            return map(use, function(m) {
                if (!loaded[m] && !pending[m] && modules[m]) {
                    return true;
                }
            });
        },
        
        /**
         * 按comboBase分类
         * @method assort
         * @param {Array} 模块数组
         */
        assort: function(use) {
            var config = this.Config,
                modules = config.modules,
                assorted = {},
                comboBase, module;
            
            each(use, function(m) {
                module = modules[m];
                if (module) {
                    comboBase = this.getGroupConfig(module.group, 'comboBase', '');
                    assorted[comboBase] = assorted[comboBase] || [];
                    assorted[comboBase].push(m);
                }   
            }, this);
            
            return assorted;
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
                maxLen = config.maxURLLength,
                maxNum = config.maxComboNum,
                comboSep = config.comboSep,
                comboSepLen = comboSep.length,
                calculated = this.calculate(use),
                excluded = this.exclude(calculated),
                assorted = this.assort(excluded),
                urls = { js: [], css: [] },
                mods = { js: [], css: [] },
                end, type, css, module, group,
                base, root, comboBase, combine,
                path, comboTemp, modsTemp;
            
            function addSingle(mod, url, type) {
                urls[type].push(url);
                mods[type].push(mod);
            }
            
            //TODO 时间戳
            each(assorted, function(array, source) {
                
                comboTemp = { js: source, css: source };
                modsTemp = { js: [], css: [] };
                end = array.length - 1;
                
                each(array, function(m, i) {
                    module = modules[m];
                    group = groups[module.group];
                    type = module.type || 'js';
                    css = type === 'css';
                    
                    base = this.getGroupConfig(group, 'base', '');
                    root = this.getGroupConfig(group, 'root', '');
                    timeStamp = module.timeStamp || this.getGroupConfig(group, 'timeStamp', '');
                    combine = isUndefined(module.combine) ? this.getGroupConfig(group, 'combine') : module.combine;
                    path = module.path || (module.name + '.' + type);
                    async = module.async !== false || (!module.requires || !module.requires.length)
                    
                    if (!combine || module.fullpath || !async) {
                        addSingle(m, module.fullpath || (combine ? (source + root) : base) + path, type);
                    } else {
                        if (modsTemp[type].length == maxNum || comboTemp[type] + root + path + comboSepLen > maxLen) {
                            urls[type].push(comboTemp[type].substring(0, comboTemp[type].length - comboSepLen));
                            mods[type].push(modsTemp[type]);
                            comboTemp[type] = source;
                            modsTemp[type] = [];
                        }
                        comboTemp[type] += (root + path + comboSep);
                        modsTemp[type].push(m);
                        if (i === end) {
                            urls[type].push(comboTemp[type].substring(0, comboTemp[type].length - comboSepLen));
                            mods[type].push(modsTemp[type]);
                        }
                    }
                }, this);
            }, this);
            
            return {
                urls: urls,
                mods: mods,
                calculated: calculated,
                excluded: excluded
            };
        },
        
        /**
         * 下载模块
         * @method load
         * @param {Object} resolved 分析过后的数组对象
         */
        load: function(resolved) {
            each(resolved.mods.css, function(mod, i) {
                this.insert(resolved.urls.css[i], mod, 'css');
            }, this);
            each(resolved.mods.js, function(mod, i) {
                this.insert(resolved.urls.js[i], mod, 'js');
            }, this);
            
            return this;
        },
        
        /**
         * 下载模块文件
         * @method load
         * @param {String} url 文件地址
         * @param {String} mod 模块名称
         */
        insert: function(url, mod, type) {
            var self = this,
                config = this.Config,
                env = this.Env,
                modules = config.modules,
                pending = env.pending,
                module, requires, async;
            
            function insert() {
                self.get(type, url, null, function() {
                    self.done(mod);
                });
            }
            
            if (isArray(mod)) {
                //combo
                each(mod, function(m) {
                    pending[m] = true;  
                });
                insert();
            } else {
                //not combo
                module = modules[mod];
                requires = module.requires;
                async = module.async !== false || (!requires || !requires.length);
                if (async) {
                    pending[mod] = true; 
                    insert();
                } else {
                    this.wait(requires, function() {
                        pending[mod] = true;
                        insert();
                    });
                }
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
                moduleFns = env.moduleFns,
                fn;
            
            //TODO add requires
            if (isArray(mod)) {
                each(mod, function(m) {
                    this.attach(m);
                }, this);
            } else {
                if (loaded[mod] && !attached[mod] && (fn = moduleFns[mod])) {
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
                loaded = env.loaded,
                moduleFns = env.moduleFns;
            
            if (!loaded[name]) {
                this.done(name);
            }    
            delete attached[name];
            
            if (moduleFns[name]) {
                this.log('module ' + name + ' already exists.', 'warn', 'add');
            } else {
                moduleFns[name] = fn;
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
    
    window.Zoo = window.ZOO = Z.init();
    
})(this);