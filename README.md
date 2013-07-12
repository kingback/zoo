Zoo
===

> A simple javascript module loader, just like YUI3.

    Zoo.version = '0.0.1~alpha';
    Zoo.author = '虎牙';
    Zoo.weibo = 'http://weibo.com/ningzbruc';

### Why

重复造心仪的轮子

### How to "use"

    Zoo.config({
        modules: {
            'underscore': {
                fullpath: 'http://underscorejs.org/underscore.js'   
            },
            'backbone': {
                fullpath: 'http://backbonejs.org/backbone.js',
                requires: ['underscore'],
                async: false 
            },
            'jquery': {
                fullpath: 'http://code.jquery.com/jquery-1.10.2.js'
            }
        }
    });
    
    Zoo.use('backbone', 'jquery', function(Z) {
        $('h1').html('Hello Zoo!!!');
    });

### Config

    Zoo.config({
        
        debug: true, // 开启调试模式，控制台输出消息
        
        base: 'http://a.tbcdn.cn/project/', // 默认文件根目录
        
        combine: false, // 是否启用combo功能
        comboBase: 'http://a.tbcdn.cn/??', // combo服务的地址
        root: 'project/', // combo文件目录路径
        comboSep: ',', // combo链接的分隔符，如：http://a.tbcdn.cn/??project/a.js,project/b.js,
        maxURLLength: 2048, // combo的url的长度（IE下会有限制）
        maxComboNum: 50, // 最多combo的文件数
        
        core: ['jquery'], // 核心模块，所有模块都依赖到的
        
        modules: { // 模块信息，包括类型路径依赖关系等
            'jquery': { // 模块名称
                fullpath: 'http://a.tbcdn.cn/project/jquery.js', // 绝对路径，fullpath与path只存在一个
                path: 'jquery.js', // 相对路径，combine为true时路径为comboBase + root + path，反之为base + path
                requires: ['a', 'b'], // 依赖a，b模块
                type: 'js', // css or js
                combine: false // 是否可以被combo
            }
        }, 
        groups: { // 模块分组
            'def': {
                comboBase: '',
                combine: true,
                root: '',
                modules: {}
            }
        }
        
    });

### How to write a module
    
    // 注册添加模块
    Zoo.add('module-name', function(Z) {
        // your module code
    });
    
    // 配置模块信息
    Zoo.config({
        modules: {
            'module-name': {}
        } 
    });
    
    // 使用模块
    Zoo.use('module-name');

### Methods
    
    // 使用模块
    Zoo.use(module-a, module-b, module-c, callback);
    
    // 同use，domready后执行callback
    Zoo.ready(modules, callback);
    
    // domready，同jquery的$(fn)
    Zoo.ready(fn);
    
    // 异步加载文件
    Zoo.get('js', 'http://example.com/a.js', opts, callback, parallel);
    Zoo.js([], callback, false); // 同上
    Zoo.css([], callback); // 同上
    
    // 注册模块
    Zoo.add(name, fn);
    
    // 配置信息
    Zoo.config(cfg);

### TodoList

* 时间戳（module，group）
* 兼容性（ready，get）
* 回调处理（success，error）
* 调试模式（debug，filter）
* 依赖关系（config，add）
* 防止冲突（模块名，模块对象）
* 模块返回模式（YUI3? AMD? CMD?）