# androidApiLog
## 介绍
通过frida监控android api  

## 功能
1.hook android api 将日志信息保存到/sdcard/包名/Logs/下  

2.hook 具体android api   

api|是否实现|备注  
---|---|---  
android.webkit.WebView->loadUrl|是 |无
java.net.URL->$init|是 |无


