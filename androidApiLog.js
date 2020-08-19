/**
 * Created by y0n on 2020/8/17 13:35.
 * 用于对于一个未知的样本时，快速定位敏感api调用点
 * usage：frida -FU --no-pause -f pkgname -l *.js
 */

/**
 * 获得当前应用进程名
 * @returns {string}
 */
function get_self_process_name() {
    var openPtr = Module.getExportByName('libc.so', 'open');
    var open = new NativeFunction(openPtr, 'int', ['pointer', 'int']);

    var readPtr = Module.getExportByName("libc.so", "read");
    var read = new NativeFunction(readPtr, "int", ["int", "pointer", "int"]);

    var closePtr = Module.getExportByName('libc.so', 'close');
    var close = new NativeFunction(closePtr, 'int', ['int']);

    var path = Memory.allocUtf8String("/proc/self/cmdline");
    var fd = open(path, 0);
    if (fd != -1) {
        var buffer = Memory.alloc(0x1000);

        var result = read(fd, buffer, 0x1000);
        close(fd);
        result = ptr(buffer).readCString();
        return result;
    }
    return "-1";
}

/**
 * 打印栈信息
 * @param name 名称
 */
function printStack(name) {
    Java.perform(function () {
        var Exception = Java.use("java.lang.Exception");
        var ins = Exception.$new("Exception");
        var straces = ins.getStackTrace();
        if (straces != undefined && straces != null) {
            var strace = straces.toString();
            var replaceStr = strace.replace(/,/g, "\n");
            console.log("=============================" + name + " Stack strat=======================");
            file_write2SDCard(name, "=============================" + name + " Stack strat=======================");
            console.log(replaceStr);
            file_write2SDCard(name, replaceStr);
            console.log("=============================" + name + " Stack end=======================\r\n");
            file_write2SDCard(name, "=============================" + name + " Stack end=======================");
            Exception.$dispose();
        }
    });
}

/**
 * 文件操作
 * FileUtil
 */
/**
 * 创建目录
 */
function file_createdir() {
    var pname = get_self_process_name();
    var mkdirPtr = Module.getExportByName('libc.so', 'mkdir');
    var mkdir = new NativeFunction(mkdirPtr, 'int', ['pointer', 'int']);
    if (!mkdir(Memory.allocUtf8String("/sdcard/" + pname), 0x0777)){
        if (!mkdir(Memory.allocUtf8String("/sdcard/" + pname + "/Logs/"), 0x0777)){
            console.log("[+] 初始化日志目录：/sdcard/" + pname + "/Logs/");
        }
    }
}
/**
 * 写入内容到文件保存到sdcard下
 * @param file_name
 * @param file_str
 */
function file_write2SDCard(file_name, file_str) {
    var process_name = get_self_process_name();
    if (process_name != "-1"){
        var file_path = "/sdcard/" + process_name + "/Logs/" + file_name + ".log";
        var fd = new File(file_path, "a");
        if (fd && fd != null) {
            fd.write(file_str + "\r\n");
            fd.flush();
            fd.close();
            console.log("[write "+file_name+" done]:", file_path);
        }
    }
}

/**
 * hook webview
 */
function hook_webview() {
    Java.perform(function () {

        var WebView = Java.use("android.webkit.WebView");
        WebView.loadUrl.overload("java.lang.String").implementation = function (s) {
            console.log("[+] android.webkit.WebView->loadUrl("+s.toString()+")");
            file_write2SDCard("loadUrl", "[+] android.webkit.WebView->loadUrl("+s.toString()+")\r\n");
            printStack("loadUrl");
            var ret = this.loadUrl.overload("java.lang.String").call(this, s);
            return ret;
        };
    });
}

/**
 * hook URL请求
 */
function hook_URL() {
    Java.perform(function () {
        var URL = Java.use("java.net.URL");
        URL.$init.overload("java.lang.String").implementation = function (s) {
            console.log("[+] java.net.URL->$init("+s.toString()+")");
            file_write2SDCard("URL$init", "[+] java.net.URL->$init("+s.toString()+")\r\n");
            printStack("URL$init");
            var ret = this.$init.overload("java.lang.String").call(this, s);
            return ret;
        };
    });
}

/**
 * hook java
 */
function hook_java() {
    Java.perform(function () {
        file_createdir();
        hook_webview();
        hook_URL();
        console.log("[+] 初始化hook android api done...");
    });
}

/**
 * hook 入口
 * */
function hook_all() {
    hook_java();
}

setImmediate(hook_all);