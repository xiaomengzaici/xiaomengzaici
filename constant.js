// 全量配置,媒体库混合,本地文件 + CD2/rclone挂载的alist文件 + strm文件
// export constant allocation
// 必填项,根据实际情况修改下面的设置
// 这里默认emby/jellyfin的地址是宿主机,要注意iptables给容器放行端口
const embyHost = "http://127.0.0.1:8096";
// rclone 的挂载目录, 例如将od, gd挂载到/mnt目录下: /mnt/onedrive /mnt/gd ,那么这里就填写 /mnt
// 通常配置一个远程挂载根路径就够了,默认非此路径开头文件将转给原始emby处理,不用重复填写至disableRedirectRule
// 如果没有挂载,全部使用strm文件,此项填[""],必须要是数组
const embyMountPath = ["/home/alist"];
// emby/jellyfin api key, 在emby/jellyfin后台设置
const embyApiKey = "ec29fd40a0ed463c98ebc5091be9300e";
// 访问宿主机上5244端口的alist地址, 要注意iptables给容器放行端口
const alistAddr = "http://127.0.0.1:5244";
// alist token, 在alist后台查看
const alistToken = "alist-6a4719ab-bc9a-420e-a03b-ec32ae0841fcyJntcfvEyxfbdRFVO5QCFPok4cAeHqVuIrCXrAPm4AhFSRT1LR18X0rUuSAkxtLJ";

// 选填项,用不到保持默认即可
// alist公网地址, 用于需要alist server代理流量的情况, 按需填写
const alistPublicAddr = "http://xiaomen.japaneast.cloudapp.azure.com:5244";
// 指定客户端自己请求并获取alist直链的规则,特殊情况使用,则此处必须使用域名且公网畅通,用不着请保持默认
// arg0: 0: startsWith(str), 1: endsWith(str), 2: includes(str), 3: match(/ain/g)
// arg1: 匹配的规则,对象为Alist接口返回的链接raw_url
// arg2: 指定转发给客户端的alist的host前缀
const cilentSelfAlistRule = [
  // [2, "xxx", alistPublicAddr],
];
// 路径映射,会在xxxMountPath之后从上到下依次全部替换一遍,不要有重叠
// arg0: 0: 默认做字符串替换, 1: 前插, 2: 尾插
// arg1: 0: 默认只处理/开头的路径且不为strm, 1: 只处理strm内部为/开头的相对路径, 2: 只处理strm内部为远程链接的
// arg2: 来源, arg3: 目标
const embyPathMapping = [
  // [0, 0, "/mnt/aliyun-01", "/mnt/aliyun-02"],
  // [0, 2, "http:", "https:"], 
  // [0, 2, ":5244", "/alist"], 
  // [0, 0, "D:", "F:"],
  // [0, 0, /blue/g, "red"], // 此处正则不要加引号
  // [1, 1, `${alistPublicAddr}/d`],
  // [2, 2, "?xxx"],
];
// 指定是否转发由njs获取strm重定向后直链地址的规则,例如strm内部为局域网ip或链接需要请求头验证
// arg0: 0: startsWith(str), 1: endsWith(str), 2: includes(str), 3: match(/ain/g)
// arg1: 匹配的规则,对象为xxxPathMapping映射后的strm内部链接
// arg2: 请求验证类型,已为直链的不需要此参数,例如.../d
const redirectStrmLastLinkRule = [
  [0, "http://172."], [0, "http://10."], [0, "http://192."], [0, "http://[fd00:"], 
  // [0, alistAddr], 
  // [0, "http:"], 
  // // arg3: 已为直链的不需要此参数, 参数暂无作用, sign属于额外验证
  // [0, "http://otheralist1.com", "FixedToken", alistToken], 
  // // arg4: 已为直链的不需要此参数,额外指定调用登录接口的api地址, 参数暂无作用, sign属于额外验证
  // [0, "http://otheralist2.com", "TempToken", `read:123456`, `http://otheralist2.com:5244/api/auth/login`], 
];
// 禁用直链的规则,将转给原始媒体服务器处理,字幕和图片没有走直链,不用添加
// arg0: 0: startsWith(str), 1: endsWith(str), 2: includes(str), 3: match(/ain/g)
// arg1: 匹配的规则,对象为Item.Path
// arg2: 是否处理alist响应链接
const disableRedirectRule = [
  // [0, "/mnt/sda1"],
  // [1, ".mp3"],
  // [2, "Google"],
  // [2, "/NAS/", true],
  // [3, /private/ig],
];
// !!!实验功能,转码分流,默认false,将按之前逻辑禁止转码处理并移除转码选项参数,与emby配置无关
// 使用条件很苛刻,主库和所有从库给用户开启[播放-如有必要，在媒体播放期间允许视频转码]+[倒数7行-允许媒体转换]
// 转码服务组中的媒体id需要和主媒体库中id一致,自行寻找实现主从同步,完全同步后,embyApiKey也是一致的
const transcodeBalanceConfig = {
  enable: false,
  // method: "least_conn",
  server: [
    {
      host: "http://127.0.0.1:8096",
      apiKey: "ec29fd40a0ed463c98ebc5091be9300e",
      weight: 1
    },
    {
      host: "http://127.0.0.2:8096",
      apiKey: "ec29fd40a0ed463c98ebc5091be9300e",
      weight: 2
    }
  ]
};
// 图片缓存策略,包括主页、详情页、图片库的原图,路由器nginx请手动调小conf中proxy_cache_path的max_size
// 0: 不同尺寸设备共用一份缓存,先访问先缓存,空间占用最小但存在小屏先缓存大屏看的图片模糊问题
// 1: 不同尺寸设备分开缓存,空间占用适中,命中率低下,但契合emby的图片缩放处理
// 2: 不同尺寸设备共用一份缓存,空间占用最大,移除emby的缩放参数,直接原图高清显示
const imageCachePolicy = 0;

// 对接emby通知管理员设置,目前只发送是否直链成功,依赖emby/jellyfin的webhook配置并勾选外部通知
const embyNotificationsAdmin = {
  enable: false,
  includeUrl: false, // 链接太长,默认关闭
  name: "【emby2Alist】",
};
// 对接emby设备控制推送通知消息,目前只发送是否直链成功,此处为统一开关,范围为所有的客户端,通知目标只为当前播放的设备
const embyRedirectSendMessage = {
  enable: false,
  header: "【emby2Alist】",
  timeoutMs: 0, // 消息通知弹窗持续毫秒值
};

// 按路径匹配规则隐藏部分接口返回的items
// arg0: 0: startsWith(str), 1: endsWith(str), 2: includes(str), 3: match(/ain/g)
// arg1: 匹配的规则,对象为Item.Path
// arg2: 默认同时隐藏[搜索建议(不会过滤搜索接口)]和[更多类似(若当前浏览项目位于规则中,将跳过隐藏)]接口 
// 0: 默认, 1: 只隐藏[搜索建议]接口, 2: 只隐藏[更多类似]接口
const itemHiddenRule = [
  // [0, "/mnt/sda1"],
  // [1, ".mp3", 1],
  // [2, "Google", 2],
  // [3, /private/ig],
];

// for js_set
function getEmbyHost(r) {
  return embyHost;
}
function getEnableTranscodeBalance(r) {
  return transcodeBalanceConfig.enable;
}
function getImageCachePolicy(r) {
  return imageCachePolicy;
}

export default {
  embyHost,
  embyMountPath,
  embyApiKey,
  disableRedirectRule,
  alistAddr,
  alistToken,
  alistPublicAddr,
  cilentSelfAlistRule,
  embyPathMapping,
  redirectStrmLastLinkRule,
  embyNotificationsAdmin,
  embyRedirectSendMessage,
  itemHiddenRule,
  transcodeBalanceConfig,
  getEmbyHost,
  getEnableTranscodeBalance,
  getImageCachePolicy
}