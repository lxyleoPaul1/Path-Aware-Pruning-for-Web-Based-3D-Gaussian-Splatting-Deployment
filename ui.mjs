import { Asset, Script, platform, Vec3, Entity } from 'playcanvas';

class UI extends Script {
    static scriptName = 'ui';

    /** @attribute {Asset} */
    cssAsset;
    /** @attribute {Asset} */
    htmlAsset;

    // 后端地址
    API_BASE_URL = "https://api.sjtu.tech"; 
    
    // ============================================================
    // 【配置】视频悬浮窗列表 (已包含 MP4 和 缩放配置)
    // 纯本地化，脱离 OSS
    // ============================================================
    videoConfig = {
        'scene-minhang-0': [
            { pos: [711, 110, -324], url: 'https://3d.sjtu.cn/assets/video/2/index.m3u8', dist: 150, scale: [48,27] },
            { pos: [-295, 110, -235], url: 'https://3d.sjtu.cn/assets/video/1/jiaodasiji/index.m3u8', dist: 150, scale: [64, 36] }
        ],
        'scene-minhang-1': [
            { pos: [25, 3, -27], url: 'https://3d.sjtu.cn/assets/video/14/index.m3u8' },
            { pos: [0, 3, -52], url: 'https://3d.sjtu.cn/assets/video/1/1.mp4' },
            { pos: [4, 3, 10], url: 'https://3d.sjtu.cn/assets/video/1/lunhuashe/index.m3u8' }
        ],
        'scene-minhang-2': [
            { pos: [-11, 3, 26], url: 'https://3d.sjtu.cn/assets/video/6/index.m3u8' },
            { pos: [73, 3, 130], url: 'https://3d.sjtu.cn/assets/video/1/WFA/index.m3u8' },
            { pos: [100, 3, 202], url: 'https://3d.sjtu.cn/assets/video/9/index.m3u8' }
        ],
        'scene-minhang-3': [
            { pos: [10, 1, 26], url: 'https://3d.sjtu.cn/assets/video/1/2.mp4' },
            { pos: [33, 1, 11], url: 'https://3d.sjtu.cn/assets/video/11/index.m3u8' }
        ],
        'scene-minhang-5': [
            { pos: [-43, 1, -6], url: 'https://3d.sjtu.cn/assets/video/1/henanxiaoyou/index.m3u8' },
            { pos: [-26, 1, 8], url: 'https://3d.sjtu.cn/assets/video/1/3.mp4' }
        ],
        'scene-minhang-6': [
            { pos: [-104, 1, -51], url: 'https://3d.sjtu.cn/assets/video/8/index.m3u8' }
        ],
        'scene-minhang-7': [
            { pos: [-11, 2, 20], url: 'https://3d.sjtu.cn/assets/video/15/index.m3u8' },
            { pos: [1, 2, 42], url: 'https://3d.sjtu.cn/assets/video/19/index.m3u8' }
        ],
        'scene-minhang-8': [
            { pos: [-62, 2, 109], url: 'https://3d.sjtu.cn/assets/video/16/index.m3u8' },
            { pos: [-2, 2, 3], url: 'https://3d.sjtu.cn/assets/video/18/index.m3u8' },
            { pos: [7, 2, 20], url: 'https://3d.sjtu.cn/assets/video/7/index.m3u8' },
            { pos: [-9, 2, 97], url: 'https://3d.sjtu.cn/assets/video/17/index.m3u8' }
        ],
        'scene-minhang-9': [
            { pos: [7, 2, 73], url: 'https://3d.sjtu.cn/assets/video/1/index.m3u8' },
            { pos: [-26, 2, 80], url: 'https://3d.sjtu.cn/assets/video/3/index.m3u8' },
            { pos: [-114, 2, 72], url: 'https://3d.sjtu.cn/assets/video/4/index.m3u8' },
            { pos: [-115, 2, 23], url: 'https://3d.sjtu.cn/assets/video/10/index.m3u8' },
            { pos: [-130, 2, -25], url: 'https://3d.sjtu.cn/assets/video/12/index.m3u8' }
        ],
        'scene-xuhui-0': [
            { pos: [-9, 0, -9], url: 'https://3d.sjtu.cn/assets/video/1/jiaodasiji/index.m3u8', dist: 150, scale: [12.8, 7.2]}
        ],
        'scene-xuhui-1': [
            { pos: [69, 3, 21], url: 'https://3d.sjtu.cn/assets/video/2/index.m3u8' }
        ],
        'scene-xuhui-2': [
            { pos: [51, 2, -26], url: 'https://3d.sjtu.cn/assets/video/13/index.m3u8' },
            { pos: [107, 2, -41], url: 'https://3d.sjtu.cn/assets/video/16/index.m3u8' }
        ],
        'scene-xuhui-3': [
            { pos: [6, 2, 11], url: 'https://3d.sjtu.cn/assets/video/20/index.m3u8' }
        ]
    };

    // ============================================================
    // 【配置】场景列表
    // ============================================================
    scenesConfig = [
        // ----------- 第一篇章：【归乡·初见】 -----------
        {
            id: 'scene-minhang-0',
            campus: 'minhang',
            name: '交大闵行校区航拍全景', 
            chapter: '第一篇章 · 归乡',
            tourSpeed: 70.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodsjtuout/lod-meta.json",
            environmentUrl: '', 
            thumbName: 'scene0.png',
            hotspotRootName: 'Hotspots_Scene0', 
            collisionRootName: 'Collision_Scene0',
            tourPathRootName: 'TourPath_Minhang_0',
            starRootName: 'minhangStars_Scene0', 
            initPos: [1038,200,-213.99],   
            initRot: [-34.66,79.61,0],
            initTarget: [0, 0, 0], 
            introLines: [
                "俯瞰五千亩校园的壮丽画卷，",
                "思源湖水波光粼粼，辉映着百卅学府的深厚底蕴。",
                "这里不仅是地理格局的延伸，更是无数交大人，",
                "跨越世纪、魂牵梦绕的精神家园。"
            ],
            danmakuList: ["130岁生日快乐！", "上帝视角看母校", "大美交大"],
            danmakuPos: [0, 5, 0],
            splatCount: 984060,
            bgmAsset: 'bg0_1.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-1',
            campus: 'minhang',
            name: '凯旋门',
            tourSpeed: 3,
            chapter: '第一篇章 · 初见',
            splatUrl:"https://3d.sjtu.cn/assets/models/lodkaixuanmen/lod-meta.json",
            environmentUrl: '', 
            thumbName: 'scene1.png',
            hotspotRootName: 'Hotspots_Scene1',
            collisionRootName: 'Collision_Scene1', 
            tourPathRootName: 'TourPath_Minhang_1',
            starRootName: 'minhangStars_Scene1',
            initPos:[31.82,2,-27],
            initRot:[0.13,70.22,0],
            initTarget: [0, 0, 180],
            introLines: [
                "2006年，一座拱形建筑在闵行校区落成，",
                "成为交大人走向世界的出发坐标。",
                "它铭刻着改革开放以来的奋进足迹；",
                "学子由此远行，亦循此归航，共赴民族复兴之约。"
            ],
            danmakuList: ["欢迎回家，交大人", "每一次穿过都是新的开始", "泪目了", "向母校报到"],
            danmakuPos: [36, 2, 5],
            splatCount: 851930,
            bgmAsset: 'bg0_1.mp3',
            bgmVolume: 0.05
        },

        // ----------- 第二篇章：【求索·书香】 -----------
        {
            id: 'scene-minhang-2',
            campus: 'minhang',
            name: '上中下院和思源湖',
            chapter: '第二篇章 · 求索',
            tourSpeed: 2.0,
            splatUrl:"https://3d.sjtu.cn/assets/models/lodsiyuanmen/lod-meta.json",
            environmentUrl: '', 
            thumbName: 'scene2.jpg',
            hotspotRootName: 'Hotspots_Scene2',
            collisionRootName: 'Collision_Scene2', 
            tourPathRootName: 'TourPath_Minhang_2',
            starRootName: 'minhangStars_Scene2',
            initPos:[28.53,0.85,-40.82],
            initRot:[0, 223.31, 0],
            initTarget: [26.13, 0.85, -36.43],
            introLines: [
                "红墙沉静的教学楼群环抱思源湖畔，",
                "这里是交大学子求知若渴的第一站。",
                "上中下院的朗朗书声与湖畔的垂柳相映成趣，",
                "记录了无数个清晨与日暮的潜心苦读。"
            ],
            danmakuList: ["上院抢前排的日子", "思源湖畔背单词", "那年夏天的风", "高数课的噩梦XD", "还是熟悉的味道"],
            danmakuPos: [36, 2, 5],
            splatCount: 2380000,
            bgmAsset: 'bg4_3_2.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-3',
            campus: 'minhang',
            name: '包玉刚图书馆',
            tourSpeed: 2.0,
            chapter: '第二篇章 · 积淀',
            splatUrl:"https://3d.sjtu.cn/assets/models/yugangout/lod-meta.json",
            environmentUrl: '', 
            thumbName: 'scene3.png',
            hotspotRootName: 'Hotspots_Scene3',
            collisionRootName: 'Collision_Scene3', 
            tourPathRootName: 'TourPath_Minhang_3',
            starRootName: 'minhangStars_Scene3',
            initPos:[47.85,2,23.05],
            initRot:[2.72,17.49,0],
            initTarget: [47.21, -2, 20.67],
            introLines: [
                "坐落于思源湖畔的包玉刚图书馆，",
                "由著名爱国人士包玉刚先生捐资兴建。",
                "它不仅是知识的宝库，更是闵行校区早期建设的里程碑，",
                "承载着一代代交大人对知识改变命运的坚定信仰。"
            ],
            danmakuList: ["红墙黑瓦的记忆", "包图YYDS", "那时候的自行车海", "通宵复习的战友们在哪", "饮水思源"],
            danmakuPos: [36, 2, 5],
            splatCount: 980100,
            bgmAsset: 'bg4_3_2.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-4',
            campus: 'minhang',
            name: '包玉刚图书馆内景',
            tourSpeed: 2.0,
            chapter: '第二篇章 · 书香',
            splatUrl:"https://3d.sjtu.cn/assets/models/yugangin/lod-meta.json",
            environmentUrl: '', 
            thumbName: 'scene4.png',
            hotspotRootName: 'Hotspots_Scene4',
            collisionRootName: 'Collision_Scene4', 
            tourPathRootName: 'TourPath_Minhang_4',
            starRootName: 'minhangStars_Scene4',
            initPos:[16.93,0.85,4.32],
            initRot:[-4.72,-88.76,0],
            initTarget: [16.93, 0.85, -0.68],
            introLines: [
                "走进这座知识的殿堂，仿佛时光静止。",
                "层层叠叠的书架间，弥漫着墨香与静谧。",
                "这里见证了无数学子在书海中探索真理的身影，",
                "是思想碰撞与智慧沉淀的最美空间。"
            ],
            danmakuList: ["闭馆音乐还在耳边", "在这里写完了毕业论文", "现在的书桌好高级", "嘘，安静学习", "梦开始的地方"],
            danmakuPos: [36, 2, 5],
            splatCount: 1290000,
            bgmAsset: 'bg4_3_2.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-5',
            campus: 'minhang',
            name: '主图书馆',
            tourSpeed: 2.0,
            chapter: '第二篇章 · 宏图',
            splatUrl:"https://3d.sjtu.cn/assets/models/lodzhutu/lod-meta.json",
            environmentUrl: '', 
            thumbName: 'scene5.jpg',
            hotspotRootName: 'Hotspots_Scene5',
            collisionRootName: 'Collision_Scene5', 
            tourPathRootName: 'TourPath_Minhang_5',
            starRootName: 'minhangStars_Scene5',
            initPos:[61.84,0.5,-20.98],
            initRot:[-14.44,89.62,0],
            initTarget: [0, 0, 180],
            introLines: [
                "巍峨耸立的图书信息大楼，是闵行校区的新地标。",
                "它以宏伟的气势展示着交大迈向世界一流大学的决心。",
                "现代化的设施与海量的馆藏，",
                "为新时代的学术创新提供了最坚实的支撑。"
            ],
            danmakuList: ["这也太气派了", "羡慕现在的学弟学妹", "交大新地标", "宏伟大气", "想回去再读一次书"],
            danmakuPos: [36, 2, 5],
            splatCount: 931230,
            bgmAsset: 'bg5_6.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-6',
            campus: 'minhang',
            name: '主图书馆内景',
            tourSpeed: 1,
            chapter: '第二篇章 · 博览',
            splatUrl:"https://3d.sjtu.cn/assets/models/zhutu1floor/lod-meta.json",
            environmentUrl: '', 
            thumbName: 'scene6.png',
            hotspotRootName: 'Hotspots_Scene6',
            collisionRootName: 'Collision_Scene6', 
            tourPathRootName: 'TourPath_Minhang_6',
            starRootName: 'minhangStars_Scene6',
            initPos:[-104.43,3,-53.3],
            initRot:[-1.88,67.64,0],
            initTarget: [-104.43,0.84,-58.30],
            introLines: [
                "宽敞明亮的中庭与通透的设计，让这里充满了现代气息。",
                "数百万册的藏书构建起浩瀚的知识海洋，",
                "在这里，你可以与古今圣贤对话，",
                "也可以在数字化的学术资源中触碰科技的前沿。"
            ],
            danmakuList: ["知识的海洋", "在这里看过世界", "博览群书", "好想再借一本书", "沉迷学习无法自拔"],
            danmakuPos: [36, 2, 5],
            splatCount: 1630000,
            bgmAsset: 'bg5_6.mp3',
            bgmVolume: 0.2
        },

        // ----------- 第三篇章：【脊梁·强国】 -----------
        {
            id: 'scene-minhang-7',
            campus: 'minhang',
            name: '机械与动力工程学院',
            tourSpeed: 1.0,
            chapter: '第三篇章 · 脊梁',
            splatUrl:"https://3d.sjtu.cn/assets/models/lodjidong/lod-meta.json",
            environmentUrl: '', 
            thumbName: 'scene7.jpg',
            hotspotRootName: 'Hotspots_Scene7',
            collisionRootName: 'Collision_Scene7', 
            tourPathRootName: 'TourPath_Minhang_7',
            starRootName: 'minhangStars_Scene7',
            initPos:[-0.64,0.62,-2.77],
            initRot:[0,173.44,0], 
            initTarget: [-0.85,0.61,-8.33],
            introLines: [
                "这里是著名的机械与动力工程学院，",
                "被誉为“制造强国的发动机”。",
                "无数大国重器的研发与关键技术的突破都源自这里，",
                "诠释着交大人“实干兴邦”的硬核担当。"
            ],
            danmakuList: ["选择了交大就是选择了责任", "大国重器", "硬核机动", "实干兴邦", "祖国万岁"],
            danmakuPos: [36, 2, 5],
            splatCount: 755160,
            bgmAsset: 'bg7.mp3',
            bgmVolume: 0.1
        },

         {
            id: 'scene-minhang-8',
            campus: 'minhang',
            name: '第四餐厅',
            tourSpeed: 4.0,
            chapter: '第四篇章 · 烟火',
            splatUrl:"https://3d.sjtu.cn/assets/models/lodxuechuangout/lod-meta.json",
            environmentUrl: '', 
            thumbName: 'scene8.png',
            hotspotRootName: 'Hotspots_Scene8',
            collisionRootName: 'Collision_Scene8', 
            tourPathRootName: 'TourPath_Minhang_8',
            starRootName: 'minhangStars_Scene8',
            initPos:[30.33,0.85,-6.36],
            initRot:[-1,25.96,0],
            initTarget: [30.33,0.85,-11.38 ],
            introLines: [
                "在这片充满科技感的校园里，也有最抚凡人心的烟火气。",
                "第四餐饮大楼不仅承载着舌尖上的美味记忆，",
                "更毗邻学生创新中心，",
                "是创意灵感与生活热度交织的活力空间。"
            ],
            danmakuList: ["想念四餐的大排", "干饭人集合！", "这就是双创梦工厂", "深夜食堂", "又饿了..."],
            danmakuPos: [36, 2, 5],
            splatCount: 1590000,
            bgmAsset: 'bg8.mp3',
            bgmVolume: 0.1
        },

        // ----------- 终章：【荣耀·再出发】 -----------
        {
            id: 'scene-minhang-9',
            campus: 'minhang',
            tourSpeed: 3.0,
            name: '霍英东体育馆',
            chapter: '终章 · 荣耀',
            splatUrl:"https://3d.sjtu.cn/assets/models/lodhuoti/lod-meta.json",
            environmentUrl: '', 
            thumbName: 'scene9.png',
            hotspotRootName: 'Hotspots_Scene9',
            collisionRootName: 'Collision_Scene9', 
            tourPathRootName: 'TourPath_Minhang_9',
            starRootName: 'minhangStars_Scene9',
            initPos:[16.95,1.85,63.74],
            initRot:[1.06,56.75,0],
            initTarget: [0, 0, 180],
            introLines: [
                "这座气势恢宏的体育馆，是无数交大梦开始与结束的地方。",
                "它见证了开学典礼上的懵懂誓言，",
                "也铭记着毕业典礼上的稻穗垂首，终成金黄。",
                "相逢皆意气，别离亦荣光。",
                "从此奔赴山海，各自闪耀。"
            ],
            danmakuList: ["梦开始与结束的地方", "毕业快乐", "聚是一团火，散是满天星", "吾友南洋", "130岁生日快乐！"],
            danmakuPos: [36, 2, 5],
            splatCount: 1470000,
            bgmAsset: 'bg9.mp3',
            bgmVolume: 0.1
        },

        // ==========================================
        // 新增：校区建筑/地标
        // ==========================================
        {
            id: 'scene-minhang-30',
            campus: 'minhang',
            name: '东大门（庙门）',
            chapter: '地标 · 迎宾',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodxmiaomenxingzhenglouxuefu/miaomen/lod-meta.json",
            environmentUrl: '',
            collisionRootName: 'Collision_Scene38', 
            thumbName: 'scene010.png', 
            initPos: [0, 2, 0],
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "巍峨东大门，又称“庙门”。",
                "古色古香，庄重典雅。",
                "是交大闵行校区的重要标志与迎宾门面。"
            ],
            danmakuList: ["打卡庙门", "古色古香", "交大门面"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg0_1.mp3',
            bgmVolume: 0.2
        },

        {
            id: 'scene-minhang-32',
            campus: 'minhang',
            name: '新学生服务中心',
            chapter: '地标 · 服务',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodxmiaomenxingzhenglouxuefu/xinxuefu/lod-meta.json",
            environmentUrl: '',
            thumbName: 'scene011.png',
            collisionRootName: 'Collision_Scene42',  
            initPos: [0, 2, 0],
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "集便捷与现代于一体的新学生服务中心。",
                "为交大学子的学习与生活提供全方位保障。",
                "温馨的空间，是校园里的贴心港湾。"
            ],
            danmakuList: ["校园生活管家", "太方便了", "环境真好"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg5_6.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-33',
            campus: 'minhang',
            name: '伍威权堂',
            chapter: '地标 · 殿堂',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodxmiaomenxingzhenglouxuefu/baogaoting/lod-meta.json",
            environmentUrl: '',
            thumbName: 'scene012.png', 
            collisionRootName: 'Collision_Scene43', 
            initPos: [0, 2, 0],
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "庄重大气的伍威权堂。",
                "见证了无数思想火花的激烈碰撞。"
            ],
            danmakuList: ["学术报告厅", "高端大气", "在这里听过讲座"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg5_6.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-34',
            campus: 'minhang',
            name: '行政楼',
            chapter: '地标 · 枢纽',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodxmiaomenxingzhenglouxuefu/xingzhenglou/lod-meta.json",
            environmentUrl: '',
            thumbName: 'scene013.png', 
            collisionRootName: 'Collision_Scene44', 
            initPos: [0, 2, 0],
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "闵行校区新行政楼，",
                "运筹帷幄的校园枢纽，",
                "引领着交大不断迈向世界一流。"
            ],
            danmakuList: ["行政中枢", "恢宏大气", "办事必经之地"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg5_6.mp3',
            bgmVolume: 0.2
        },

        // ----------- 各学院与双创中心 -----------
        {
            id: 'scene-minhang-12',
            campus: 'minhang',
            name: '大电类群楼',
            chapter: '第三篇章 · 信息',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/loddianyuan/lod-meta.json",
            environmentUrl: '',
            thumbName: 'dianyuan.png', 
            hotspotRootName: 'Hotspots_Scene12',
            collisionRootName: 'Collision_Scene36',
            tourPathRootName: 'TourPath_Minhang_12',
            starRootName: 'minhangStars_Scene12',
            initPos: [0, 2, 0],
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "这里是曾经是学校体量最大的电子信息与电气工程学院，现在是，",
                "电气工程学院、自动化与感知学院",
                "计算机学院、信息与电子工程学院。"
            ],
            danmakuList: ["电院YYDS", "脱发警告", "写代码到天明", "万物互联"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg7.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-13',
            campus: 'minhang',
            name: '生物医学工程学院',
            chapter: '第三篇章 · 生命',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodshengyigong/lod-meta.json",
            environmentUrl: '',
            thumbName: 'shengyigong.png',
            hotspotRootName: 'Hotspots_Scene13',
            collisionRootName: 'Collision_Scene27',
            tourPathRootName: 'TourPath_Minhang_13',
            starRootName: 'minhangStars_Scene13',
            initPos: [0, 2, 0],
            initRot: [0, 180, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "医工交叉，守护生命。",
                "工程科学与医学在此深度碰撞，",
                "为人类健康贡献着坚实的交大智慧。"
            ],
            danmakuList: ["健康所系，性命相托", "医工交叉", "致敬白衣天使"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg7.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-14',
            campus: 'minhang',
            name: '生命科学技术学院&药学院',
            chapter: '第三篇章 · 探索',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodshengke/lod-meta.json",
            environmentUrl: '',
            thumbName: 'shengke.png',
            hotspotRootName: 'Hotspots_Scene14',
            collisionRootName: 'Collision_Scene28',
            tourPathRootName: 'TourPath_Minhang_14',
            starRootName: 'minhangStars_Scene14',
            initPos: [0, 2, 0],
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "探索生命奥秘，研制造福人类的良药。",
                "在这里解开基因的密码，",
                "让科技之光照亮人类的健康之路。"
            ],
            danmakuList: ["生科人绝不认输", "做实验啦", "生命奥秘"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg7.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-15',
            campus: 'minhang',
            name: '船舶海洋与建筑工程学院',
            chapter: '第三篇章 · 远航',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodchuanjian/lod-meta.json",
            environmentUrl: '',
            thumbName: 'chuanjian.png',
            hotspotRootName: 'Hotspots_Scene15',
            collisionRootName: 'Collision_Scene15',
            tourPathRootName: 'TourPath_Minhang_15',
            starRootName: 'minhangStars_Scene15',
            initPos: [0, 2, 0],
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "纵横四海，国之重器。",
                "承载着“船”递梦想的深蓝使命，",
                "为祖国的万里海疆、全球的蓝色版图，输送了无数中流砥柱。"
            ],
            danmakuList: ["乘风破浪", "造船强国", "船建威武"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg7.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-16',
            campus: 'minhang',
            name: '媒体与传播学院&马克思主义学院',
            chapter: '第三篇章 · 思想',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodmeichuan/lod-meta.json",
            environmentUrl: '',
            thumbName: 'meichuan.png',
            hotspotRootName: 'Hotspots_Scene16',
            collisionRootName: 'Collision_Scene29',
            tourPathRootName: 'TourPath_Minhang_16',
            starRootName: 'minhangStars_Scene16',
            initPos: [0, 2, 0],
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "人文与思想的交汇之地。",
                "记录时代新声，筑牢信仰之基，",
                "在这里感受交大人文思想的深度与广度。"
            ],
            danmakuList: ["铁肩担道义", "妙手著文章", "交大人文"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg5_6.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-17',
            campus: 'minhang',
            name: '设计学院',
            chapter: '第三篇章 · 创意',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodsheji/lod-meta.json",
            environmentUrl: '',
            thumbName: 'sheji.png',
            hotspotRootName: 'Hotspots_Scene17',
            collisionRootName: 'Collision_Scene30',
            tourPathRootName: 'TourPath_Minhang_17',
            starRootName: 'minhangStars_Scene17',
            initPos: [0, 2, 0],
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "科技与艺术完美融合的地方。",
                "用创意点亮生活，以人为本，",
                "将美的理念融入到每一次创新探索之中。"
            ],
            danmakuList: ["设计之光", "美学前沿", "最美学院"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg5_6.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-18',
            campus: 'minhang',
            name: '学生创新中心',
            chapter: '第三篇章 · 双创',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodsaiche/lod-meta.json",
            environmentUrl: '',
            thumbName: 'saiche.png',
            hotspotRootName: 'Hotspots_Scene18',
            collisionRootName: 'Collision_Scene31',
            tourPathRootName: 'TourPath_Minhang_18',
            starRootName: 'minhangStars_Scene18',
            initPos: [0, 2, 0],
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "交大学子的“造梦工厂”。",
                "从赛车到机器人，从图纸到实物。",
                "这里让每一个疯狂的创想，变成触手可及的现实。"
            ],
            danmakuList: ["造车人集合", "熬夜做大创", "交大双创YYDS", "赛车太酷了"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg8.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-19',
            campus: 'minhang',
            name: '材料科学与工程学院&化学化工学院',
            chapter: '第三篇章 · 探索',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodmiyuanshuwuwaiyuan/cailiaohuayuan/lod-meta.json",
            environmentUrl: '',
            thumbName: 'cailiaohuayuan.png',
            hotspotRootName: 'Hotspots_Scene19',
            collisionRootName: 'Collision_Scene19',
            tourPathRootName: 'TourPath_Minhang_19',
            starRootName: 'minhangStars_Scene19',
            initPos: [0, 2, 0],
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "物质的重构与元素的共舞。",
                "材料学院与化学化工学院比邻而居，",
                "在这里，交大人从微观世界出发，筑造宏伟的未来基石。"
            ],
            danmakuList: ["炼丹炉日常", "材料强国", "化学反应之美"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg7.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-20',
            campus: 'minhang',
            name: '数学科学学院&物理与天文学院',
            chapter: '第三篇章 · 理意',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodmiyuanshuwuwaiyuan/shuwu/lod-meta.json",
            environmentUrl: '',
            thumbName: 'shuwu.png',
            hotspotRootName: 'Hotspots_Scene20',
            collisionRootName: 'Collision_Scene32',
            tourPathRootName: 'TourPath_Minhang_20',
            starRootName: 'minhangStars_Scene20',
            initPos: [0, 2, 0],
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "仰望星空，推演万物之理。",
                "数学科学学院与物理与天文学院，",
                "以最纯粹的逻辑与公式，丈量着宇宙的浩瀚与深邃。"
            ],
            danmakuList: ["宇宙的尽头是数学", "物理人的浪漫", "仰望星空"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg7.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-21',
            campus: 'minhang',
            name: '外国语学院&人文学院',
            chapter: '第三篇章 · 人文',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodmiyuanshuwuwaiyuan/waiyuan/lod-meta.json",
            environmentUrl: '',
            thumbName: 'waiyuan.png',
            hotspotRootName: 'Hotspots_Scene21',
            collisionRootName: 'Collision_Scene33',
            tourPathRootName: 'TourPath_Minhang_21',
            starRootName: 'minhangStars_Scene21',
            initPos: [0, 2, 0],
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "沟通世界，文以载道。",
                "外国语学院与人文学院，为这座工科强校注入了温润的底色，",
                "在这里，跨越语言的边界，倾听文明的回响。"
            ],
            danmakuList: ["交大不仅有硬核", "人文之光", "语言的桥梁"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg5_6.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-22',
            campus: 'minhang',
            name: '环境科学与工程学院',
            chapter: '第三篇章 · 绿水',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodhuanjing/lod-meta.json",
            environmentUrl: '',
            thumbName: 'huanjing.png',
            hotspotRootName: 'Hotspots_Scene22',
            collisionRootName: 'Collision_Scene22',
            tourPathRootName: 'TourPath_Minhang_22',
            starRootName: 'minhangStars_Scene22',
            initPos: [0, 2, 0],
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "绿水青山，就是金山银山。",
                "环境科学与工程学院，致力于生态文明建设，",
                "用科技守护我们共同的美丽家园。"
            ],
            danmakuList: ["守护绿水青山", "环保卫士", "环境YYDS"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg7.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-23',
            campus: 'minhang',
            name: '浦江国际学院',
            chapter: '第三篇章 · 国际',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodmiyuanshuwuwaiyuan/miyuan/lod-meta.json",
            environmentUrl: '',
            thumbName: 'miyuan.png',
            hotspotRootName: 'Hotspots_Scene23',
            collisionRootName: 'Collision_Scene23',
            tourPathRootName: 'TourPath_Minhang_23',
            starRootName: 'minhangStars_Scene23',
            initPos: [0, 2, 0],
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "强强联手，融汇中外。",
                "上海交大浦江国际学院，国际化办学的璀璨明珠，",
                "在这里培育具有全球视野的领军人才。"
            ],
            danmakuList: ["密院打卡", "Go Blue!", "国际化视野"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg5_6.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-24', 
            campus: 'minhang',
            name: '巴黎卓越工程师学院',
            chapter: '第三篇章 · 交融',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/bayuan1/lod-meta.json",
            environmentUrl: '', 
            thumbName: 'bayuan_out.png', 
            hotspotRootName: 'Hotspots_Scene24',
            collisionRootName: 'Collision_Scene24', 
            tourPathRootName: 'TourPath_Minhang_24',
            starRootName: 'minhangStars_Scene24',
            initPos: [0, 2, 0], 
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "中法交融的学术殿堂，",
                "这里是巴黎卓越工程师学院。",
                "浪漫的法式风情与严谨的工程精神，在这里完美共振。"
            ],
            danmakuList: ["Bonjour!", "巴院YYDS", "浪漫与严谨并存", "中法友谊长存"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg7.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-25',
            campus: 'minhang',
            name: '巴院内景',
            chapter: '第三篇章 · 卓越',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/bayuaninside/lod-meta.json",
            environmentUrl: '', 
            thumbName: 'bayuan_in.png', 
            hotspotRootName: 'Hotspots_Scene25',
            collisionRootName: 'Collision_Scene25', 
            tourPathRootName: 'TourPath_Minhang_25',
            starRootName: 'minhangStars_Scene25',
            initPos: [0, 2, 0], 
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "步入巴院大楼，现代化的教学空间映入眼帘。",
                "作为卓越工程师教育培养的摇篮，",
                "这里见证着无数学子走向世界舞台的坚实步伐。"
            ],
            danmakuList: ["内部环境太好了", "国际化视野", "想去法国交换", "未来的卓越工程师"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg7.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-35',
            campus: 'minhang',
            name: '农业与生物学院',
            chapter: '第三篇章 · 农生',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodxmiaomenxingzhenglouxuefu/nongsheng/lod-meta.json",
            environmentUrl: '',
            thumbName: 'scene014.png', 
            collisionRootName: 'Collision_Scene45', 
            initPos: [0, 2, 0],
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "这里是农业与生物学院。",
                "扎根大地，仰望星空，",
                "用现代科技赋能农业，守护绿水青山与人类健康。"
            ],
            danmakuList: ["农生YYDS", "亲近大自然", "科技兴农"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg7.mp3',
            bgmVolume: 0.2
        },
        
        // ----------- 第四篇章：【烟火·未来】 -----------
        {
            id: 'scene-minhang-26',
            campus: 'minhang',
            name: '第三餐厅&捭阖塘',
            chapter: '第四篇章 · 寻味',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodmiyuanshuwuwaiyuan/sancan/lod-meta.json",
            environmentUrl: '',
            thumbName: 'sancan.png',
            hotspotRootName: 'Hotspots_Scene26',
            collisionRootName: 'Collision_Scene26',
            tourPathRootName: 'TourPath_Minhang_26',
            starRootName: 'minhangStars_Scene26',
            initPos: [0, 2, 0],
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "味蕾的记忆，青春的倒影。",
                "从第三餐饮大楼的热气氤氲，到荷花池边的浪漫漫步，",
                "把校园里每一个平凡的日子，过成一首诗。"
            ],
            danmakuList: ["三餐的麻辣香锅", "捭阖塘畔的微风", "干饭人永不言弃", "怀念的味道"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg8.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-minhang-27', 
            campus: 'minhang',
            name: '工程实践中心',
            chapter: '',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodxuechuanga1/lod-meta.json",
            environmentUrl: '', 
            thumbName: 'gc.png', 
            hotspotRootName: 'Hotspots_Scene10',
            collisionRootName: 'Collision_Scene39', 
            tourPathRootName: 'TourPath_Minhang_10',
            starRootName: 'minhangStars_Scene10',
            showNext: true,
            initPos: [0, 2, 0], 
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "走进工程实践中心，机器的轰鸣奏响创新的交响。",
                "这里是理论与实践交汇的熔炉，",
                "无数交大学子在这里打磨出走向大国重器的第一把锤子。"
            ],
            danmakuList: ["打铁的回忆", "金工实习YYDS", "未来的大国工匠从这里起步"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg7.mp3',
            bgmVolume: 0.05
        },
        
        // --- 新增：机械制造中心 ---
        {
            id: 'scene-minhang-28',
            campus: 'minhang',
            name: '机械制造中心',
            chapter: '',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodxuechuanga3/lod-meta.json",
            environmentUrl: '', 
            thumbName: 'gc1.png', 
            hotspotRootName: 'Hotspots_Scene11',
            collisionRootName: 'Collision_Scene40', 
            tourPathRootName: 'TourPath_Minhang_11',
            starRootName: 'minhangStars_Scene11',
            showNext: true,
            initPos: [0, 2, 0], 
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "机械制造中心，硬核科技的摇篮。",
                "精密机床与智能设备共舞，",
                "交大制造的硬核实力在这里展现得淋漓尽致。"
            ],
            danmakuList: ["硬核制造", "机械人的浪漫", "在这里磨破了第一套工作服"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg7.mp3',
            bgmVolume: 0.05
        },

        // =========================================================
        // ----------- 徐汇校区 (Xuhui) -----------
        // =========================================================
        {
            id: 'scene-xuhui-0',
            campus: 'xuhui',
            name: '徐汇校区全景', 
            type: 'panorama', 
            chapter: '徐汇篇章 · 溯源',
            panoramaTextureName: 'Texture_Aerial_Pano', 
            splatUrl: "", 
            environmentUrl: '', 
            thumbName: 'xuhuicover.png',
            hotspotRootName: 'Hotspots_Scene0', 
            collisionRootName: '', 
            initPos: [0, 0, 0],   
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1], 
            introLines: [
                "跨越三个世纪的徐汇校区，是交通大学的诞生地。",
                "这里的一草一木、一砖一瓦都刻写着‘南洋公学’的历史记忆。",
                "作为中国高等教育的策源地之一，",
                "它始终保持着那份厚重深邃的学术底色。"
            ],
            danmakuList: ["欢迎来到数字交大", "130周年快乐！", "全景视角", "大美交大"],
            danmakuPos: [0, 5, 0],
            splatCount: 424000,
            bgmAsset: 'bg0_1.mp3',
            bgmVolume: 0.2
        },
        {
            id: 'scene-xuhui-1',
            campus: 'xuhui',
            name: '老图书馆',
            chapter: '徐汇篇章 · 典藏',
            tourSpeed: 4.0,
            splatUrl: 'https://3d.sjtu.cn/assets/models/lodxuhui/lod-meta.json',
            environmentUrl: '',
            thumbName: 'c21.png',
            hotspotRootName: 'Hotspots_Scene9',
            collisionRootName: 'Collision_Scene11', 
            tourPathRootName: 'TourPath_Xuhui_10',
            starRootName: 'xuhuiStars_Scene1',
            initPos: [0, 2.85, 0],
            initRot: [0, 0, 0],
            initTarget: [0, 1, 0],
            introLines: [
                "建于1919年的老图书馆，是交大跨越两个世纪的建筑瑰宝。",
                "它融合了欧洲文艺复兴与中式的古典元素，典雅庄重，",
                "是徐汇校区的百年地标。",
                "这里珍藏着学校最宝贵的校史文献，",
                "是连接过去与现在的精神桥梁，诉说着交大百余年的沧桑变迁"
            ],
            danmakuList: ["历史的厚重感", "我在交大修文物"],
            danmakuPos: [0, 2, 10],
            splatCount: 1080000,
            bgmAsset: 'bg4_3_2.mp3',
            bgmVolume: 0.2,
            portals: [
                { 
                    id: 'portal-to-lib',
                    pos:[137.53,1.35,-72.34],
                    label: '新上院',      // 提示文字
                    targetSceneId: 'scene-xuhui-4', // B场景：要去哪个场景
                    targetPos: [0.77, 2, 12],         // B点：到达B场景后的具体坐标 (取代默认的 initPos)
                    targetLookAt: [0, 2, 0]        // 到达后玩家看哪里
                },
                { 
                    id: 'portal-to-antai',
                    pos:[156,0.5,-114.68],
                    label: '安泰',      // 提示文字
                    targetSceneId: 'scene-xuhui-2', // B场景：要去哪个场景
                    targetPos: [38.84,0.5, -23.35],         // B点：到达B场景后的具体坐标 (取代默认的 initPos)
                    targetLookAt: [0, 2, 0]        // 到达后玩家看哪里
                },
                { 
                    id: 'portal-to-donghaoyun',
                    pos:[80.36,0.5,31.61],
                    label: '航运',      // 提示文字
                    targetSceneId: 'scene-xuhui-6', // B场景：要去哪个场景
                    targetPos: [0,2,0],         // B点：到达B场景后的具体坐标 (取代默认的 initPos)
                    targetLookAt: [0, 2, 0]        // 到达后玩家看哪里
                },
                { 
                    id: 'portal-to-qianxuesen',
                    pos:[89.75,0.35,37.93],
                    label: '钱学森图书馆',      // 提示文字
                    targetSceneId: 'scene-xuhui-5', // B场景：要去哪个场景
                    targetPos: [0,2,0],         // B点：到达B场景后的具体坐标 (取代默认的 initPos)
                    // targetLookAt: [0, 2, 0]        // 到达后玩家看哪里
                }
            ]

        },
        {
            id: 'scene-xuhui-2',
            campus: 'xuhui',
            name: '安泰经济与管理学院&凯原法学院',
            chapter: '徐汇篇章 · 经世',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodantai/lod-meta.json",
            environmentUrl: '',
            thumbName: 'antai', 
            hotspotRootName: 'Hotspots_Scene11', 
            collisionRootName: 'Collision_Scene13', 
            tourPathRootName: 'TourPath_Xuhui_11', 
            starRootName: 'xuhuiStars_Scene2', 
            initPos: [0, 2, 0], 
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "在这片历史悠久的土地上，矗立着现代化的经管与法学楼群。",
                "安泰经管学院与凯原法学院，代表着交大商学法学的崛起。",
                "这里走出了无数商界精英与法治栋梁，",
                "践行着”经世济民、法治天下“的宏大理想。"
            ],
            danmakuList: ["经世济民", "法治天下", "安泰YYDS", "打卡凯原楼"],
            danmakuPos: [0, 2, 5],
            splatCount: 2160000,
            bgmAsset: 'bg7.mp3',
            bgmVolume: 0.2,
            portals: [
                { 
                    id: 'portal-to-lib',
                    pos:[101.97,0.35,-27.35],
                    label: '图书馆',      // 提示文字
                    targetSceneId: 'scene-xuhui-1', // B场景：要去哪个场景
                    targetPos: [145.47, 0.2, -123.17],         // B点：到达B场景后的具体坐标 (取代默认的 initPos)
                    targetLookAt: [0, 2, 0]        // 到达后玩家看哪里
                },
                { 
                    id: 'portal-to-gaojian',
                    pos:[-37.9,0.5,-2.21],
                    label: '高金',      // 提示文字
                    targetSceneId: 'scene-xuhui-3', // B场景：要去哪个场景
                    targetPos: [1.31,2,18.70],         // B点：到达B场景后的具体坐标 (取代默认的 initPos)
                    targetLookAt: [0, 2, 0]        // 到达后玩ss家看哪里
                },
                { 
                    id: 'portal-to-gym',
                    pos:[1.41,2,44.09],
                    label: '体育馆',      // 提示文字
                    targetSceneId: 'scene-xuhui-7', // B场景：要去哪个场景
                    targetPos: [-0.78,0.5,14.4],         // B点：到达B场景后的具体坐标 (取代默认的 initPos)
                    targetLookAt: [0, 2, 0]        // 到达后玩ss家看哪里
                },
            ]
        },
        {
            id: 'scene-xuhui-3',
            campus: 'xuhui',
            name: '执信西斋&上海高级金融学院',
            chapter: '徐汇篇章 · 传承',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodgaojin/lod-meta.json",
            environmentUrl: '',
            thumbName: 'c11.png', 
            hotspotRootName: 'Hotspots_Scene12', 
            collisionRootName: 'Collision_Scene12', 
            tourPathRootName: 'TourPath_Xuhui_12',
            starRootName: 'xuhuiStars_Scene3',
            initPos: [0, 2, 0],
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "执信西斋曾是全国最好的学生宿舍，钱学森学长曾在此居住。",
                "如今这里与上海高级金融学院毗邻，",
                "历史的厚重与金融的前沿在这里交汇。",
                "古老的建筑焕发出新的生机，继续培育着时代的领跑者。"
            ],
            danmakuList: ["东方MIT", "金融强国", "古色古香", "最美宿舍"],
            danmakuPos: [0, 2, 5],
            splatCount: 988040,
            bgmAsset: 'bg5_6.mp3',
            bgmVolume: 0.2,
            portals: [
                {   id: 'portal-to-gym',
                    targetSceneId: 'scene-xuhui-1', // Target: Old Library
                    pos: [0.43,0.5,-5.47],          
                    label: '前往：老图书馆' ,
                    targetPos: [0,1.35,0],         // B点：到达B场景后的具体坐标 (取代默认的 initPos)
                    targetLookAt: [0, 2, 0]        // 到达后玩家看哪里
                }
            ]
        },

        // --- 新增：新上院 ---
        {
            id: 'scene-xuhui-4',
            campus: 'xuhui',
            name: '新上院',
            chapter: '徐汇篇章 · 焕新',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/xuhuixinshangyuan/lod-meta.json",
            environmentUrl: '',
            thumbName: 'xinshangyuan.png',
            hotspotRootName: 'Hotspots_Scene10', 
            collisionRootName: 'Collision_Scene16',
            tourPathRootName: 'TourPath_Xuhui_13',
            starRootName: 'xuhuiStars_Scene4',
            initPos: [0.59, 2, 11.03], 
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "古典与现代交融的新上院，",
                "承载着交大学子的学术理想，",
                "红墙绿树间，激荡着思想的火花。"
            ],
            danmakuList: ["新上院打卡", "抢前排听课的日常"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg5_6.mp3',
            bgmVolume: 0.2,
            portals: [
                {   id: 'portal-to-gym',
                    targetSceneId: 'scene-xuhui-1', // Target: Old Library
                    pos: [-3.83,0.5,13.30],          
                    label: '前往：老图书馆' ,
                    targetPos: [133.39,1,-74.72],         // B点：到达B场景后的具体坐标 (取代默认的 initPos)
                    targetLookAt: [0, 2, 0]        // 到达后玩家看哪里
                },
                { 
                    id: 'portal-to-donghaoyun',
                    pos:[-97.39,0.35,91.07],
                    label: '航运',      // 提示文字
                    targetSceneId: 'scene-xuhui-6', // B场景：要去哪个场景
                    targetPos: [0,2,0],         // B点：到达B场景后的具体坐标 (取代默认的 initPos)
                    targetLookAt: [0, 2, 0]        // 到达后玩家看哪里
                },
                { 
                    id: 'portal-to-qianxuesen',
                    pos:[-95.58,0.35,132.81],
                    label: '钱学森图书馆',      // 提示文字
                    targetSceneId: 'scene-xuhui-5', // B场景：要去哪个场景
                    targetPos: [0,2,0],         // B点：到达B场景后的具体坐标 (取代默认的 initPos)
                    // targetLookAt: [0, 2, 0]        // 到达后玩家看哪里
                }
            ]
        },

        // --- 新增：钱学森图书馆 ---
        {
            id: 'scene-xuhui-5',
            campus: 'xuhui',
            name: '钱学森图书馆',
            chapter: '徐汇篇章 · 巨擘',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/qianxuesenout/lod-meta.json",
            environmentUrl: '',
            thumbName: 'qianxuesen.png',
            hotspotRootName: 'Hotspots_Scene15',
            collisionRootName: 'Collision_Scene37',
            tourPathRootName: 'TourPath_Xuhui_14',
            starRootName: 'xuhuiStars_Scene5',
            initPos: [0, 2, 0], 
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "国之脊梁，星火燎原。",
                "钱学森学长的崇高风范在这里凝聚，",
                "那枚破空而出的导弹，是指引交大人科技报国的长明灯。"
            ],
            danmakuList: ["致敬钱老", "两弹一星功勋", "学长榜样"],
            danmakuPos: [0, 2, 5],
            splatCount: 1500000,
            bgmAsset: 'bg7.mp3',
            bgmVolume: 0.2,
            portals: [
                { 
                    targetSceneId: 'scene-xuhui-1', // Target: Old Library
                    pos: [5.14, 0.5, 39.36],          
                    label: '前往：老图书馆' ,
                    targetPos: [72.85,2,26.47],         // B点：到达B场景后的具体坐标 (取代默认的 initPos)
                    targetLookAt: [0, 2, 0]        // 到达后玩家看哪里
                }
            ]
        },

        // --- 新增：董浩云航运博物馆 ---
        {
            id: 'scene-xuhui-6',
            campus: 'xuhui',
            name: '董浩云航运博物馆',
            chapter: '徐汇篇章 · 百川',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/hangyunbowuguan/lod-meta.json",
            environmentUrl: '',
            thumbName: 'donghaoyun.png',
            hotspotRootName: 'Hotspots_Scene16',
            collisionRootName: 'Collision_Scene18',
            tourPathRootName: 'TourPath_Xuhui_15',
            starRootName: 'xuhuiStars_Scene6',
            initPos: [0, 2, 0], 
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "海纳百川，有容乃大。",
                "一艘艘微缩舰船，浓缩了中国航运的壮阔史诗，",
                "也记载着交大与国家命运紧密相连的海洋情怀。"
            ],
            danmakuList: ["星辰大海", "东方大港的记忆", "航运强国"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg4_3_2.mp3',
            bgmVolume: 0.2,
            portals: [
                { 
                    targetSceneId: 'scene-xuhui-1', // Target: Old Library
                    pos: [-2.09, 0.5, 20.08],          
                    label: '前往：老图书馆' ,
                    targetPos: [72.85,2,26.47],         // B点：到达B场景后的具体坐标 (取代默认的 initPos)
                    targetLookAt: [0, 2, 0]        // 到达后玩家看哪里
                }
            ]
        },

        // --- 新增：郑坚固体育场 ---
        {
            id: 'scene-xuhui-7',
            campus: 'xuhui',
            name: '郑坚固体育场',
            chapter: '徐汇篇章 · 竞秀',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/xuhuicaochang/lod-meta.json",
            environmentUrl: '',
            thumbName: 'zhengjiangu.png',
            hotspotRootName: 'Hotspots_Scene17',
            collisionRootName: 'Collision_Scene17',
            tourPathRootName: 'TourPath_Xuhui_16',
            starRootName: 'xuhuiStars_Scene7',
            initPos: [0, 2, 0], 
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "绿茵场上挥洒汗水，红色的跑道记录着青春的节拍。",
                "强体魄，铸校魂，",
                "交大人的拼搏精神在这里代代相传。"
            ],
            danmakuList: ["强国必先强体", "体测加油", "青春的赛场"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg8.mp3', 
            bgmVolume: 0.2,
            portals: [
                { 
                    targetSceneId: 'scene-xuhui-2', // Target: Old Library
                    pos: [0.75, 0.5, 8.29],          
                    label: '前往：安泰' ,
                    targetPos: [0,2,0],         // B点：到达B场景后的具体坐标 (取代默认的 initPos)
                    targetLookAt: [0, 2, 0]        // 到达后玩家看哪里
                }
            ]
        },
        // --- 新增：徐汇其他地标 ---
        {
            id: 'scene-xuhui-8',
            campus: 'xuhui',
            name: '安泰内景',
            chapter: '徐汇篇章 · 经管',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodxmiaomenxingzhenglouxuefu/antaiin/lod-meta.json",
            environmentUrl: '',
            thumbName: 'antai.png',
            collisionRootName: 'Collision_Scene46', 
            initPos: [0, 2, 0], 
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "步入安泰经管学院大楼内部。",
                "现代化的设施与浓厚的学术氛围，",
                "孕育着新一代的商界领袖与经济学精英。"
            ],
            danmakuList: ["安泰内景打卡", "商界精英摇篮", "学术氛围拉满"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg7.mp3', 
            bgmVolume: 0.2
        },
        {
            id: 'scene-xuhui-9',
            campus: 'xuhui',
            name: '中银科技楼',
            chapter: '徐汇篇章 · 创新',
            tourSpeed: 3.0,
            splatUrl: "https://3d.sjtu.cn/assets/models/lodxmiaomenxingzhenglouxuefu/zhongyin/lod-meta.json",
            environmentUrl: '',
            thumbName: 'zhongyin.png',
            collisionRootName: 'Collision_Scene47', 
            initPos: [0, 2, 0], 
            initRot: [0, 0, 0],
            initTarget: [0, 0, 1],
            introLines: [
                "拔地而起的中银科技楼。",
                "前沿科技与金融创新在此交汇，",
                "是徐汇校区焕发新活力的重要地标。"
            ],
            danmakuList: ["科技前沿", "金融创新", "现代化建筑"],
            danmakuPos: [0, 2, 5],
            splatCount: 1000000,
            bgmAsset: 'bg5_6.mp3', 
            bgmVolume: 0.2
        }
    ]

    /** @attribute */
    totalSplats = 34904729;

    initialize() {
        
        this._injectStyles();
        this._injectHTML();
        this._initAudioSystem();

        this._blockStoryPopup = false; 

        this._cacheElements();
        this._attachEventListeners();

        this._hasSeenTutorial = false; // 初始化标记

        this._loadTutorialImages();    // 加载本地图片资源
        
        // --- 星星系统初始化 ---
        this.currentSceneStarsTotal = 0;
        this.currentSceneStarsCollected = 0;
        this.app.on('star:collected', this._onStarCollected, this);
        this._hasSeenTutorial = false;
        this._hasSeenStarGuide = false; // 标记是否看过星星引导
        
        if (this._storyPopup) this._storyPopup.style.display = 'none';

        this._initCampusCoverImages();

        this._currentSceneId = null; 
        this._currentCampus = null;

        this._updateButtonStates();
        
        this.app.on('ui:setPreset', this._onPresetChanged, this);
        this.app.on('ui:updateStats', this._onUpdateStats, this);
        this.app.on('ui:openStory', this._openStoryPopup, this);

        // --- 新增：监听来自 3D 场景的传送请求 ---
        this.app.on('scene:teleport', this._handleTeleport, this);

        this._btnManual = document.getElementById('btn-manual');
        if (this._btnManual) {
            this._btnManual.addEventListener('click', (e) => {
                e.stopPropagation();
                this._showTutorial(); 
            });
        }

        if (this._dmContainer) {
            this._dmContainer.classList.remove('visible');
            this._dmContainer.style.display = ''; 
        }
        
        this.once('destroy', () => this.onDestroy());
        
        if (platform.mobile) {
            this._setLandscapeMode(true);
        }

        // ============================================================
        // 【核心修改】启动逻辑变更为：春节开场 -> 校区选择
        // ============================================================
        // 1. 确保登录页初始隐藏 (防止闪烁)
        if (this._loginOverlay) this._loginOverlay.style.display = 'none';

        const curtain = document.getElementById('transition-curtain');
        if (curtain) {
            curtain.style.transition = 'none'; // 临时禁用过渡
            curtain.classList.add('active');   // 立即变黑
            curtain.offsetHeight;              // 强制重绘
            curtain.style.transition = '';     // 恢复过渡
        }

        setTimeout(() => {
            const targetId = this._getUrlParam('scene');
            // 如果有 Deep Link，直接进场景，跳过开场
            if (targetId) {
                this._handleDeepLink();
            } else {
                // 否则，播放新年开场动画
                this._playNewYearIntroSequence();
            }
        }, 100);
    }
    
    update(dt) {
        const player = this.app.root.findByName('Character Controller') || this.app.root.findByName('Player');
        const cameraEntity = this.app.root.findByName('Camera') || this.app.root.findByName('Main Camera') || this.app.root.findByName('View');
        
        // 防跌落保护
        if (player) {
            const pos = player.getPosition();
            if (pos.y < -40) {
                console.warn("UI: 检测到玩家掉出地图 (Y < -40)，执行紧急复位");
                this._resetPlayerPosition();
            }
        }
        // 👇 传送门物理感应检测 (无光柱纯净版)
        if (this._activePortals && this._activePortals.length > 0 && player && !this._isTeleporting) {
            const playerPos = player.getPosition();
            let nearestPortal = null; let minDist = Infinity;

            this._activePortals.forEach(p => {
                p.ring.rotateLocal(0, dt * 15, 0); // 底盘慢速自转
                
                const dist = Math.sqrt(Math.pow(playerPos.x - p.pos.x, 2) + Math.pow(playerPos.z - p.pos.z, 2));
                if (dist < minDist) { minDist = dist; nearestPortal = p; }
                
                // 距离大于4米时，恢复平静状态
                if (dist > 4) {
                    p.light.light.intensity = pc.math.lerp(p.light.light.intensity, 1.5, dt * 2);
                    p.particles.particlesystem.rate = 0.05; // 恢复常态粒子发射率
                }
            });

            if (nearestPortal) {
                // 【感知区】进入 4 米范围
                if (minDist < 4 && minDist >= 0.8) {
                    const factor = 1 + (4 - minDist); // 越近越强，系数 1 到 4
                    
                    nearestPortal.ring.rotateLocal(0, dt * 40 * factor, 0); // 法阵加速狂转
                    nearestPortal.light.light.intensity = pc.math.lerp(nearestPortal.light.light.intensity, 1.5 * factor, dt * 5); // 亮度增高
                    nearestPortal.particles.particlesystem.rate = 0.015; // 靠近时粒子疯狂喷发，形成星火柱
                    
                    // 显示文字提示
                    if (this._portalHint && this._portalHintText) {
                        this._portalHintText.textContent = nearestPortal.config.label; 
                        this._portalHint.classList.add('visible');
                    }
                } 
                // 【跃迁区】走入 0.8 米中心
                else if (minDist < 0.8) {
                    this._triggerTeleport(nearestPortal.config); 
                } 
                // 安全区外隐藏提示
                else {
                    if (this._portalHint) this._portalHint.classList.remove('visible');
                }
            }
        }
    }

    // ============================================================
    // 新增：处理 3D 场景内触发的传送门逻辑
    // ============================================================
    _handleTeleport(targetSceneId) {
        if (this._currentSceneId === targetSceneId) return;
        
        const targetScene = this.scenesConfig.find(s => s.id === targetSceneId);
        if (targetScene) {
            console.log(`UI: 🌌 传送门激活，目标 -> ${targetScene.name}`);
            
            // 播放一下音效（如果你有的话）
            if (this.app.systems.sound && this.entity.sound) {
                // this.entity.sound.play('teleport_sound'); // 预留音效接口
            }
            
            // 核心：直接调用已有的切换场景方法
            this._switchScene(targetScene);
        } else {
            console.error(`UI Error: 传送门找不到目标场景 ID [${targetSceneId}]`);
        }
    }

    // ============================================================
    // 春节开场动画逻辑 (包含样式更新)
    // ============================================================
    _playNewYearIntroSequence() {
        const curtain = document.getElementById('transition-curtain');
        const textBox = document.getElementById('transition-text-box');
        
        if (!curtain || !textBox) {
            this._showCampusSelectionDirectly();
            return;
        }

        // 1. 准备黑屏和文字容器
        textBox.innerHTML = '';
        curtain.classList.add('active'); // 确保是黑的
         
        // 2. 创建新年祝福文字 (更具活力的马年谐音梗版)
        const container = document.createElement('div');
        container.className = 'new-year-container';
        
        // 这里使用了方案二：想回母校？马上出发！
        container.innerHTML = `
            <div class="new-year-text">想回母校看看？</div>
            <div class="new-year-text main-title">上海交通大学数字空间</div>
            <div class="new-year-text sub">
                穿越时空，<span class="highlight-char">『马』</span>上出发！
            </div>
        `;
        textBox.appendChild(container);

        // 3. 动画序列
        // 3.1 激活文字 (Fade In - 2s)
        setTimeout(() => {
            const texts = container.querySelectorAll('.new-year-text');
            texts.forEach(t => t.classList.add('active'));
        }, 100);

        // 3.2 停留后消失 (Wait 3s -> Fade Out 1s)
        setTimeout(() => {
            const texts = container.querySelectorAll('.new-year-text');
            texts.forEach(t => t.classList.add('fade-out'));
        }, 3100); // 100 + 2000(fade in) + 1000(stay)

        // 3.3 结束黑屏，显示校区选择 (Total ~4.5s)
        setTimeout(() => {
            curtain.classList.remove('active');
            this._showCampusSelectionDirectly();
        }, 4500); 
    }

    // 【新增】直接显示校区选择（跳过填写信息）
    _showCampusSelectionDirectly() {
        if (this._loginOverlay) {
            this._loginOverlay.style.display = 'flex';
            this._loginOverlay.classList.remove('hidden');
            this._loginOverlay.style.opacity = '1';
            this._loginOverlay.style.visibility = 'visible';
            this._loginOverlay.style.pointerEvents = 'auto'; 
        }
        
        // 关键：隐藏第一步(信息填写)，显示第二步(校区选择)
        if (this._stepInfo) this._stepInfo.style.display = 'none';
        if (this._stepCampus) {
            this._stepCampus.style.display = 'block';
            this._stepCampus.style.animation = 'slideUp 0.5s ease';
        }
    }

    // ============================================================
    // 动态生成视频屏幕 (新增：支持缩放)
    // ============================================================
    _clearVideoScreens() {
        const screens = this.app.root.findByTag('dynamic-video-screen');
        screens.forEach(s => s.destroy());
    }

    // ============================================================
    // 新增：动态生成视频的边缘羽化遮罩 (Alpha Mask)
    // ============================================================
    _createVideoEdgeMask() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 512, 512);

        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 80; 
        ctx.fillStyle = '#ffffff';

        const margin = 60; 
        ctx.fillRect(margin, margin, 512 - margin * 2, 512 - margin * 2);
        
        ctx.shadowBlur = 20;
        ctx.fillRect(margin + 20, margin + 20, 512 - (margin + 20) * 2, 512 - (margin + 20) * 2);

        const texture = new pc.Texture(this.app.graphicsDevice, {
            width: 512, height: 512, format: pc.PIXELFORMAT_R8_G8_B8_A8
        });
        texture.setSource(canvas);
        
        // 👇 核心修复1：强制立即将生成的图像上传至显存，防止变成黑图
        texture.upload(); 
        
        return texture;
    }

    _spawnVideoScreens(sceneId) {
        // 1. 先清理旧的
        this._clearVideoScreens();

        // 仅对 iOS 设备屏蔽（为了防崩溃），其余设备皆允许（支持 Android / PC）
        const ua = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
        if (isIOS) {
            console.log("UI: 🍎 iOS模式，已物理隔离视频纹理");
            return;
        }

        // 2. 获取当前场景配置
        const videos = this.videoConfig[sceneId];
        if (!videos || videos.length === 0) return;

        console.log(`UI: 正在为场景 [${sceneId}] 生成 ${videos.length} 个视频屏幕`);

        if (!this._videoMaskTex) {
            this._videoMaskTex = this._createVideoEdgeMask();
        }

        // 👇 获取引擎的 UI 渲染层 (这是突破高斯遮挡的核心)
        const uiLayer = this.app.scene.layers.getLayerById(pc.LAYERID_UI);

        // 3. 遍历生成
        videos.forEach(vData => {
            const screen = new Entity('DynamicVideoScreen');
            screen.tags.add('dynamic-video-screen');

            // --- A. 添加渲染组件 (Plane) ---
            screen.addComponent('render', {
                type: 'plane',
                castShadows: false,
                receiveShadows: false
            });

            // 💥 终极杀招 1：无限大包围盒 (Custom AABB)
            // 彻底粉碎相机的角度剔除逻辑，让引擎永远以为屏幕在视野正中央！
            screen.render.customAabb = new pc.BoundingBox(
                new pc.Vec3(0, 0, 0), 
                new pc.Vec3(10000, 10000, 10000)
            );

            // 💥 终极杀招 2：强制提升渲染图层到 UI 层
            // 逃离高斯渲染所在的 World 层，确保视频最后绘制，绝对不被模型“吃掉”
            if (uiLayer) {
                screen.render.layers = [uiLayer.id];
            }

            // --- B. 添加碰撞组件 (为了支持点击检测) ---
            if (this.app.systems.collision) {
                screen.addComponent('collision', {
                    type: 'box',
                    halfExtents: new Vec3(0.5, 0.5, 0.5) 
                });
            }
            if (this.app.systems.rigidbody) {
                 screen.addComponent('rigidbody', {
                    type: 'static',
                    restitution: 0
                });
            }

            // --- C. 设置位置和缩放 ---
            screen.setPosition(vData.pos[0], vData.pos[1], vData.pos[2]);
            const w = (vData.scale && vData.scale[0]) || 3.2;
            const h = (vData.scale && vData.scale[1]) || 1.8;
            screen.setLocalScale(w, 1, h);

            // --- D. 添加 VideoScreen 脚本 ---
            screen.addComponent('script');
            screen.script.create('videoScreen', {
                attributes: {
                    videoUrl: vData.url,
                    triggerDistance: vData.dist || 30, 
                    playerTag: 'Player'
                }
            });

            // --- E. 添加到场景 ---
            this.app.root.addChild(screen);

            // 👇👇👇 材质拦截器 (负责色彩修复和羽化遮罩) 👇👇👇
            const checkTexTimer = setInterval(() => {
                if (!screen || !screen.render) {
                    clearInterval(checkTexTimer);
                    return;
                }
                
                const meshInstance = screen.render.meshInstances[0];
                const mat = meshInstance?.material;
                
                if (mat && (mat.emissiveMap || mat.diffuseMap) && !mat._isFixedForSkybox) {
                    
                    if (meshInstance) meshInstance.cull = false; // 双重防剔除保险
                    
                    // 1. 切断光照和天空盒干扰
                    mat.useLighting = false; 
                    mat.useSkybox = false;
                    
                    // 2. 曝光纠正
                    mat.emissive = new pc.Color(1, 1, 1);
                    mat.diffuse = new pc.Color(0, 0, 0);
                    mat.cull = pc.CULLMODE_NONE; // 正反面可见

                    // 3. 全息羽化与透明度遮罩 
                    mat.blendType = pc.BLEND_NORMAL;   
                    mat.opacity = 1.0;                 
                    mat.depthWrite = false;            
                    mat.depthTest = false; // UI层中取消深度测试，完美叠加
                    
                    mat.opacityMap = this._videoMaskTex; 
                    mat.opacityMapChannel = 'r';       
                    mat.emissiveIntensity = 0.85;      

                    // 4. SRGB 防泛白处理
                    const tex = mat.emissiveMap || mat.diffuseMap;
                    if (tex) {
                        tex.colorSpace = pc.COLORSPACE_SRGB;
                        if (pc.TEXTURETYPE_SRGB) tex.type = pc.TEXTURETYPE_SRGB; 
                        
                        if (mat.emissiveMap) mat.emissiveMap = null;
                        if (mat.diffuseMap) mat.diffuseMap = null;
                        mat.update();
                        
                        mat.emissiveMap = tex;
                    }
                    
                    mat._isFixedForSkybox = true;
                    mat.update(); 
                    
                    clearInterval(checkTexTimer);
                }
            }, 100); 
        });
    }

    // ============================================================
    // 👇 新增：动态生成并挂载可交互悬浮图片
    // ============================================================
    _spawnFloatingImage(sceneData) {
        // 先清理可能存在的旧图片节点
        const oldScreen = this.app.root.findByName('FloatingPosterScreen');
        if (oldScreen) oldScreen.destroy();

        // 维护一个海报配置表
        const posterConfigs = {
            'scene-minhang-12': {
                url: 'https://3d.sjtu.cn/assets/jvshen.png',
                width: 380, 
                height: 200,
                link: 'https://vapour-x.cn/',
                fixedPos: [-2.64, 1.65, -6.82] 
            },
            'scene-minhang-14': { // 生科与药学院
                url: 'https://3d.sjtu.cn/assets/海报0.png',
                width: 380, // 4.6 比例
                height: 570, // 6.8 比例
                distance: 12,
                link: null
            },
            'scene-minhang-7': { // 机械与动力工程学院
                url: 'https://3d.sjtu.cn/assets/海报1.png',
                width: 230,
                height: 340,
                distance: 32,
                link: null
            },
            'scene-minhang-13': { // 生医工与医学院
                url: 'https://3d.sjtu.cn/assets/海报2.png',
                width: 380,
                height: 570,
                distance: 12,
                link: null
            }
        };

        const config = posterConfigs[sceneData.id];
        if (!config) return;

        // 1. 创建基于 3D 屏幕的实体
        const screenEntity = new pc.Entity('FloatingPosterScreen');
        screenEntity.addComponent('screen', {
            referenceResolution: new pc.Vec2(1280, 720),
            scaleBlend: 0.5,
            scaleMode: pc.SCALEMODE_BLEND,
            screenSpace: false // 设置为 3D 世界空间
        });
        
        // 2. 计算位置和朝向
        if (config.fixedPos) {
            screenEntity.setPosition(config.fixedPos[0], config.fixedPos[1], config.fixedPos[2]);
            // 默认朝向即可 (通常是正对 Z 轴)
        } else {
            // 根据出生点动态摆放：出生点坐标 + 视角朝向
            const startPos = sceneData.initPos || [0, 2, 0];
            const rot = sceneData.initRot || [0, 0, 0];
            
            // 先放置在出生点并对齐视角
            screenEntity.setPosition(startPos[0], startPos[1], startPos[2]);
            screenEntity.setEulerAngles(rot[0], rot[1], rot[2]);
            
            // 然后沿着局部坐标系的 -Z 轴（正前方）往前推指定的距离
            screenEntity.translateLocal(0, 0, -config.distance);
        }

        // 给它一定的缩放让像素匹配米级单位 (0.01 意味着宽 460px = 4.6 米)
        screenEntity.setLocalScale(0.01, 0.01, 0.01);

        // 3. 创建图片元素
        const imageEntity = new pc.Entity('FloatingPosterImage');
        imageEntity.addComponent('element', {
            anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),
            pivot: new pc.Vec2(0.5, 0.5),
            type: 'image',
            width: config.width, 
            height: config.height,
            useInput: !!config.link // 如果有链接则开启交互
        });
        
        if (config.link) {
            imageEntity.addComponent('button', {
                active: true,
                imageEntity: imageEntity,
                transitionMode: pc.BUTTON_TRANSITION_MODE_TINT,
                hoverTint: new pc.Color(0.8, 0.8, 0.8),
                pressedTint: new pc.Color(0.5, 0.5, 0.5)
            });
            imageEntity.button.on('click', () => {
                window.open(config.link, '_blank');
            });
        }

        screenEntity.addChild(imageEntity);
        this.app.root.addChild(screenEntity);

        // 4. 加载外部资源
        // URL 包含中文，需要用 encodeURI 包装一下以防部分浏览器报错
        const safeUrl = encodeURI(config.url);
        this.app.assets.loadFromUrl(safeUrl, 'texture', (err, asset) => {
            if (!err && asset) {
                imageEntity.element.texture = asset.resource;
            } else {
                console.warn("加载悬浮海报失败: ", safeUrl, err);
            }
        });
    }

    // ============================================================
    // 星星收集系统
    // ============================================================
    
    _initStarsForScene(sceneData) {
        // 1. 重置计数器数据
        this.currentSceneStarsTotal = 0;
        this.currentSceneStarsCollected = 0;
        
        // 2. 统计当前场景星星数量
        let starRoot = null;
        if (sceneData.starRootName) {
            starRoot = this.app.root.findByName(sceneData.starRootName);
        }
        if (!starRoot) {
            starRoot = this.app.root.findByName('Stars_' + sceneData.id);
        }
        
        if (starRoot) {
            const stars = starRoot.findComponents('script');
            let count = 0;
            stars.forEach(s => {
                if (s.has('starItem')) count++;
            });
            if (count === 0) {
                // 兼容没有挂脚本但名字含star的情况
                starRoot.children.forEach(child => {
                    if (child.name.toLowerCase().includes('star')) count++;
                });
            }
            this.currentSceneStarsTotal = count;
            console.log(`UI: 场景 [${sceneData.name}] 共有星星: ${count} 个`);
        } else {
            console.log(`UI: 场景 [${sceneData.name}] 未找到星星根节点`);
        }
        
        // ============================================================
        // 【核心修复】重置右上角 UI 状态
        // ============================================================
        if (this._starCounterHud) {
            // 1. 移除金底样式
            this._starCounterHud.classList.remove('completed');
            
            // 2. 默认隐藏 (等用户选了自由探索再显示)
            this._starCounterHud.style.display = 'none';

            // 3. 【关键】强制恢复 HTML 结构
            // 因为上个场景结束时结构被破坏了，必须重建
            this._starCounterHud.innerHTML = `
                <span class="star-icon">⭐</span>
                <span class="star-text">还需收集 <span id="star-rem-count">${this.currentSceneStarsTotal}</span> 颗</span>
            `;
            
            // 4. 重新获取数字 DOM 引用 (因为刚刚innerHTML重建了，旧引用失效了)
            this._starRemCountEl = this._starCounterHud.querySelector('#star-rem-count');
        }
        
        // 隐藏常驻按钮 (如果之前显示过)
        if (this._btnPersistentNext) {
            this._btnPersistentNext.style.display = 'none';
        }
    }

    _onStarCollected(data) {
        if (this.currentSceneStarsTotal <= 0) return;
        this.currentSceneStarsCollected++;
        
        // 更新 HUD
        this._updateStarCounterUI();

        const remaining = this.currentSceneStarsTotal - this.currentSceneStarsCollected;
        
        // 弹个 Toast (增加安全检查)
        const toastText = (data && data.text) ? data.text : "拾取时光碎片";
        if (this._showStarToast) this._showStarToast(toastText);
        
        // 收集完毕逻辑
        if (remaining <= 0) {
            console.log("UI: 星星全部收集完毕！");
            
            // HUD 变色提示
            if (this._starCounterHud) {
                this._starCounterHud.classList.add('completed');
                
                // 【核心修复】更安全的文字替换逻辑
                // 尝试找父级 .star-text，如果找不到，直接改 HUD 的文字
                const textEl = this._starCounterHud.querySelector('.star-text');
                if (textEl) {
                    textEl.textContent = "探索完成";
                } else if (this._starRemCountEl && this._starRemCountEl.parentElement) {
                    this._starRemCountEl.parentElement.textContent = "探索完成";
                }
            }

            // 2秒后弹出结算窗口
            setTimeout(() => {
                if (this._showStarFinishPopup) this._showStarFinishPopup(); 
            }, 2000); 
        }

        // 播放音效
        if (this.app.systems.sound && this.entity.sound) {
            this.entity.sound.play('collect');
        }
    }

    _updateStarCounterUI() {
        if (!this._starRemCountEl) return;
        const remaining = Math.max(0, this.currentSceneStarsTotal - this.currentSceneStarsCollected);
        this._starRemCountEl.textContent = remaining;
    }

    _showStarToast(text) {
        if (!this._starToast || !this._starToastText) return;
        this._starToastText.textContent = text;
        this._starToast.classList.remove('show');
        void this._starToast.offsetWidth; 
        this._starToast.classList.add('show');
    }

    _showStarFinishPopup() {
        if (!this._starFinishPopup) return;
        
        const nextScene = this._findNextScene();
        const currentScene = this.scenesConfig.find(s => s.id === this._currentSceneId);
        
        let storyText = "记忆碎片已集齐。";
        if (currentScene) {
            if (currentScene.name.includes("凯旋门") || currentScene.name.includes("航拍")) {
                storyText = "归乡的脚步已经迈出，<br>去看看梦开始的地方吧。";
            } else if (currentScene.name.includes("上中下院")) {
                storyText = "书声琅琅犹在耳，<br>还记得包图深夜的灯光吗？";
            } else if (currentScene.name.includes("包玉刚")) {
                storyText = "知识的殿堂在不断长高，<br>去见证主图书馆的宏伟。";
            } else if (currentScene.name.includes("主图书")) {
                storyText = "博览群书之后，<br>去感受大国重器的力量。";
            } else if (currentScene.name.includes("机动")) {
                storyText = "硬核科技之外，<br>也有四餐的人间烟火。";
            } else if (currentScene.name.includes("餐厅") || currentScene.name.includes("创新")) {
                storyText = "吃饱喝足，科技在手。<br>去迎接最后的荣耀时刻！";
            } else if (currentScene.name.includes("徐汇") || currentScene.name.includes("安泰") || currentScene.name.includes("高金")) {
                storyText = "百卅交大，源远流长。<br>感受跨越世纪的学术积淀。";
            }
        }

        if (this._btnPersistentNext) {
            if (nextScene) {
                this._btnPersistentNext.querySelector('.next-text').textContent = "前往 " + nextScene.name;
                this._btnPersistentNext.style.display = 'flex';
            } else {
                this._btnPersistentNext.querySelector('.next-text').textContent = "返回首页";
                this._btnPersistentNext.style.display = 'flex';
            }
        }

        if (nextScene) {
            if(this._starFinishTitle) this._starFinishTitle.textContent = "当前站点探索完成";
            if(this._starFinishDesc) this._starFinishDesc.innerHTML = 
                `${storyText}<br><br>下一站：<strong style="color:var(--sjtu-gold); font-size:18px;">${nextScene.name}</strong>`;
            if(this._btnStarNext) this._btnStarNext.textContent = "出发！";
        } else {
            if(this._starFinishTitle) this._starFinishTitle.textContent = "130周年旅程圆满";
            if(this._starFinishDesc) this._starFinishDesc.innerHTML = 
                "你已点亮所有交大地标。<br><br><strong style='color:var(--sjtu-gold);'>聚是一团火，散是满天星。</strong><br>欢迎回家，交大人！";
            if(this._btnStarNext) this._btnStarNext.textContent = "返回首页";
        }
        
        this._starFinishPopup.style.display = 'flex';
        if (this._btnStarStay) this._btnStarStay.textContent = "稍后前往 (寻找彩蛋)";
    }

    _handleStarNext() {
        console.log("UI: 正在处理跳转逻辑...");
        if (this._starFinishPopup) this._starFinishPopup.style.display = 'none';
        
        const nextScene = this._findNextScene();
        if (nextScene) {
            console.log(`UI: 找到下一站 -> ${nextScene.name}`);
            this._switchScene(nextScene);
        } else {
            console.log("UI: 没有下一站了，返回选校区界面");
            this._returnToCampusSelection();
        }
    }
    
    _findNextScene() {
        if (!this._currentSceneId) return null;
        const currentIndex = this.scenesConfig.findIndex(s => s.id === this._currentSceneId);
        if (currentIndex === -1) return null;
        const nextScene = this.scenesConfig[currentIndex + 1];
        if (nextScene && nextScene.campus === this._currentCampus) {
            return nextScene;
        }
        return null; 
    }

    // ============================================================
    // 【新增】专门为徐汇校区更新导航按钮
    // ============================================================
    _updateXuhuiNavButton() {
        // 1. 只有徐汇校区才执行此逻辑
        if (this._currentCampus !== 'xuhui') return;
        if (!this._btnPersistentNext) return;

        // 2. 查找下一站
        const nextScene = this._findNextScene();
        const btnText = this._btnPersistentNext.querySelector('.next-text');
        
        // 3. 更新按钮文字
        if (nextScene) {
            // 如果有下一站 -> "前往 [场景名]"
            if (btnText) btnText.textContent = "前往 " + nextScene.name;
        } else {
            // 如果是最后一站 -> "返回首页"
            if (btnText) btnText.textContent = "返回首页";
        }

        // 4. 强制显示 (带一点延迟动画效果)
        this._btnPersistentNext.style.display = 'flex';
        this._btnPersistentNext.style.animation = 'none';
        this._btnPersistentNext.offsetHeight; /* 触发重绘 */
        this._btnPersistentNext.style.animation = 'slideInRight 0.5s ease-out, glowPulse 2s infinite';
    }

    _returnToCampusSelection() {
        if (this._drawer) this._drawer.classList.remove('open');
        if (this._loginOverlay) {
            this._loginOverlay.style.display = 'flex';
            this._loginOverlay.classList.remove('hidden');
            this._loginOverlay.style.opacity = '1';
            this._loginOverlay.style.visibility = 'visible';
            this._loginOverlay.style.pointerEvents = 'auto'; 
        }
        if (this._stepInfo) this._stepInfo.style.display = 'none';
        if (this._stepCampus) this._stepCampus.style.display = 'block';
    }

    // ============================================================
    // 基本功能
    // ============================================================

    _initCampusCoverImages() {
        const minhangBgEl = document.getElementById('img-bg-minhang');
        if (minhangBgEl) {
            const asset = this.app.assets.find('minhangcover.png'); 
            if (asset) {
                minhangBgEl.style.backgroundImage = `url('${asset.getFileUrl()}')`;
            }
        }
        const xuhuiBgEl = document.getElementById('img-bg-xuhui');
        if (xuhuiBgEl) {
            const asset = this.app.assets.find('xuhuicover.png');
            if (asset) {
                xuhuiBgEl.style.backgroundImage = `url('${asset.getFileUrl()}')`;
            }
        }
    }

    _handleDeepLink() {
        const targetId = this._getUrlParam('scene');
        let startScene = null;
        if (targetId) {
            const foundScene = this.scenesConfig.find(s => s.id === targetId);
            if (foundScene) {
                startScene = foundScene;
                this._currentCampus = foundScene.campus;
            }
        }
        if (startScene) {
            if (this._loginOverlay) this._loginOverlay.style.display = 'none';
            this._initSceneList(); 
            this._switchScene(startScene);
        }
    }

    _getUrlParam(name) {
        if (typeof window !== 'undefined' && window.location) {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(name);
        }
        return null;
    }  
    
    _injectStyles() {
        if (this.cssAsset) {
            const styleEl = document.createElement('style');
            styleEl.textContent = this.cssAsset.resource;
            document.head.appendChild(styleEl);
        }
    }

    _injectHTML() {
        if (this.htmlAsset) {
            this.ui = document.createElement('div');
            this.ui.classList.add('ui-container'); 
            
            this.ui.innerHTML = this.htmlAsset.resource + `
                <div id="transition-curtain">
                    <div id="transition-text-box" class="transition-text-container"></div>
                </div>
                
                <div id="transition-spinner" class="transition-loader-container">
                    <svg class="progress-ring" width="60" height="60">
                        <circle class="progress-ring__circle" stroke="var(--sjtu-gold)" stroke-width="4" fill="transparent" r="26" cx="30" cy="30"/>
                    </svg>
                </div>
                
                <div id="hologram-signage-container" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index: 100; overflow:hidden;"></div>
                
                <div id="jump-confirm-popup" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; z-index:9999; background:rgba(0,0,0,0.8); backdrop-filter:blur(5px); justify-content:center; align-items:center;">
                    <div style="background:linear-gradient(135deg, rgba(20,20,20,0.9), rgba(40,10,10,0.9)); border: 1px solid var(--sjtu-gold); border-radius: 12px; padding: 30px 40px; text-align: center; box-shadow: 0 0 30px rgba(212,175,55,0.3); animation: slideUpSmall 0.3s ease;">
                        <h3 style="color:var(--sjtu-gold); margin:0 0 10px 0; font-family:var(--font-serif); font-size: 22px; letter-spacing: 2px;">DIGITAL SPACE JUMP</h3>
                        <p id="jump-target-text" style="color:#fff; font-size: 16px; margin:0 0 25px 0;">建立连接中...</p>
                        <div style="display:flex; gap: 20px; justify-content:center;">
                            <button id="btn-jump-confirm" style="padding:10px 30px; border-radius:30px; border:none; background:var(--sjtu-gold); color:#000; font-weight:bold; cursor:pointer;">确认跃迁</button>
                            <button id="btn-jump-cancel" style="padding:10px 30px; border-radius:30px; border:1px solid #666; background:transparent; color:#ccc; cursor:pointer;">暂不</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(this.ui);
            
            const statsContainer = document.getElementById('gsplat-footer');
            if (statsContainer) statsContainer.classList.add(platform.mobile ? 'mobile' : 'desktop');
        }
    }

    _cacheElements() {
        this._buttons = new Map();
        const buttonIds = ['ultra', 'high', 'medium', 'low'];
        for (const id of buttonIds) {
            const btn = document.getElementById(`btn-${id}`);
            if (btn) this._buttons.set(id, btn);
        }
        this._splatCountEl = document.getElementById('splat-count');

        // === 新增：缓存团队介绍相关的 DOM 元素 ===
        this._btnTeamInfo = document.getElementById('btn-team-info');
        this._teamPopup = document.getElementById('team-info-popup');
        this._btnCloseTeam = document.getElementById('btn-close-team');
        this._btnTeamContinue = document.getElementById('btn-team-continue');
        
        this._menuBtn = document.getElementById('scene-menu-btn');
        this._toggleDmBtn = document.getElementById('toggle-dm-btn');
        this._dmContainer = document.querySelector('.danmaku-input-container'); 
        
        this._drawer = document.getElementById('scene-drawer');
        this._drawerCloseBtn = document.getElementById('drawer-close-btn');
        this._sceneListEl = document.getElementById('scene-list');

        this._storyPopup = document.getElementById('story-popup');
        this._storyCloseBtn = document.getElementById('btn-close-story');
        this._storyShareBtn = document.getElementById('btn-share');
        // 👇 新增缓存全局分享按钮
        this._btnGlobalShare = document.getElementById('btn-global-share');
        
        this._elStoryTitle = document.getElementById('story-title');
        this._elStoryDesc = document.getElementById('story-desc');
        this._elStoryAuthor = document.getElementById('story-author');
        this._elStoryYear = document.getElementById('story-year');
        this._elStoryImg = document.getElementById('story-img');
        this._elStoryVideo = document.getElementById('story-video');
        this._elQrCode = document.getElementById('qr-code-img');

        this._orientationBtn = document.getElementById('orientation-btn');
        
        this._loginOverlay = document.getElementById('login-overlay');
        this._stepInfo = document.getElementById('step-info');
        this._stepCampus = document.getElementById('step-campus');

        this._inputName = document.getElementById('user-name');
        this._inputGrade = document.getElementById('user-grade');
        this._inputMajor = document.getElementById('user-major');
        
        this._loginError = document.getElementById('login-error');
        this._welcomeText = document.getElementById('welcome-text');

        this._btnSubmitInfo = document.getElementById('btn-submit-info');
        this._btnMinhang = document.getElementById('btn-select-minhang');
        this._btnXuhui = document.getElementById('btn-select-xuhui');

        this._tourPopup = document.getElementById('tour-confirm-popup');
        this._btnTourYes = document.getElementById('btn-tour-yes');
        this._btnTourNo = document.getElementById('btn-tour-no');

        // 【新增】星星计数器
        this._starCounterHud = document.getElementById('star-counter-hud');
        this._starRemCountEl = document.getElementById('star-rem-count');
        this._starToast = document.getElementById('star-toast');
        this._starToastText = document.getElementById('star-toast-text');
        this._starFinishPopup = document.getElementById('star-finish-popup');
        this._starFinishTitle = document.getElementById('star-finish-title');
        this._starFinishDesc = document.getElementById('star-finish-desc');
        this._btnStarStay = document.getElementById('btn-star-stay');
        this._btnStarNext = document.getElementById('btn-star-next');
        this._starGuidePopup = document.getElementById('star-guide-popup');
        this._btnStarGuideOk = document.getElementById('btn-star-guide-ok');

        this._introOverlay = document.getElementById('scene-intro');
        this._introChapter = document.getElementById('intro-chapter');
        this._introName = document.getElementById('intro-name');
        this._btnPersistentNext = document.getElementById('btn-persistent-next');

        this._tutorialOverlay = document.getElementById('tutorial-overlay');
        this._imgTutorialPc = document.getElementById('img-tutorial-pc');     
        this._imgTutorialMobile = document.getElementById('img-tutorial-mobile'); 
        this._btnTutorialClosePc = document.getElementById('btn-tutorial-close-pc');
        this._btnTutorialCloseMobile = document.getElementById('btn-tutorial-close-mobile');

        // 传送门相关 UI
        this._portalHint = document.getElementById('portal-proximity-hint');
        this._portalHintText = document.getElementById('portal-hint-text');
        this._portalFlash = document.getElementById('portal-flash-overlay');
        
        this._activePortals = []; // 存储当前场景实例化的光阵实体
        this._isTeleporting = false; // 防止重复跃迁的锁
    }

    _playSceneIntro(chapter, name) {
        if (!this._introOverlay) return;
        if (this._introChapter) this._introChapter.textContent = chapter || "";
        if (this._introName) this._introName.textContent = name || "";

        this._introOverlay.classList.remove('active');
        const content = this._introOverlay.querySelector('.intro-content');
        if(content) {
            content.style.animation = 'none';
            content.offsetHeight; 
            content.style.animation = ''; 
        }

        this._introOverlay.classList.add('active');
        setTimeout(() => {
            this._introOverlay.classList.remove('active');
        }, 4000);
    }

    _loadTutorialImages() {
        const assetPc = this.app.assets.find('pc.png');
        if (assetPc && this._imgTutorialPc) {
            this._imgTutorialPc.src = assetPc.getFileUrl();
        }

        const assetMobile = this.app.assets.find('mobile.png');
        if (assetMobile && this._imgTutorialMobile) {
            this._imgTutorialMobile.src = assetMobile.getFileUrl();
        }
    }

    _createRingTexture(){
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(256, 256, 220, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 6; ctx.setLineDash([20, 15]); ctx.beginPath(); ctx.arc(256, 256, 180, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 2; ctx.setLineDash([5, 10]); ctx.beginPath(); ctx.arc(256, 256, 140, 0, Math.PI * 2); ctx.stroke();
        const texture = new pc.Texture(this.app.graphicsDevice, { width: 512, height: 512, format: pc.PIXELFORMAT_R8_G8_B8_A8 });
        texture.setSource(canvas); 
        
        // 👇 核心修复：强制声明为 SRGB 格式，防止被全局伽马校正压碎成透明
        texture.colorSpace = pc.COLORSPACE_SRGB;
        if (pc.TEXTURETYPE_SRGB) texture.type = pc.TEXTURETYPE_SRGB;
        
        return texture;
    }

    _createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)'); gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(32, 32, 32, 0, Math.PI * 2); ctx.fill();
        const texture = new pc.Texture(this.app.graphicsDevice, { width: 64, height: 64, format: pc.PIXELFORMAT_R8_G8_B8_A8 });
        texture.setSource(canvas); 
        
        // 👇 核心修复：强制声明为 SRGB 格式
        texture.colorSpace = pc.COLORSPACE_SRGB;
        if (pc.TEXTURETYPE_SRGB) texture.type = pc.TEXTURETYPE_SRGB;
        
        return texture;
    }

    _spawnPortals(sceneData) {
        if (this._activePortals) this._activePortals.forEach(p => p.entity.destroy());
        this._activePortals = [];
        this._isTeleporting = false; 

        if (!sceneData.portals || sceneData.portals.length === 0) return;

        // 生成贴图
        if (!this._ringTex) this._ringTex = this._createRingTexture();
        if (!this._particleTex) this._particleTex = this._createParticleTexture();

        // 【终极必杀技 1】：获取引擎的 UI 层级！
        // 把 3D 传送门放入 UI 层，强行最后渲染，绝不让高斯溅射覆盖它
        const uiLayer = this.app.scene.layers.getLayerById(pc.LAYERID_UI);
        const targetLayers = uiLayer ? [uiLayer.id] : undefined;

        sceneData.portals.forEach(pData => {
            const portalEntity = new pc.Entity('Portal_' + pData.targetId);
            const groundY = pData.pos[1] + 0.05; 
            const worldPos = new pc.Vec3(pData.pos[0], groundY, pData.pos[2]); // 记录准确的世界坐标
            portalEntity.setPosition(worldPos);

            // ==========================================
            // A. 底盘发光法阵
            // ==========================================
            const ring = new pc.Entity('Ring'); 
            ring.addComponent('render', { type: 'plane' });
            ring.setLocalScale(3.5, 1, 3.5); 
            
            // 强行塞入 UI 渲染层
            if (targetLayers) ring.render.layers = targetLayers;
            
            const ringMat = new pc.StandardMaterial();
            // 👇 核心修复：断开与物理环境的连接，防止天空盒覆盖属性
            ringMat.useLighting = false; // 关闭阴影与环境光照
            ringMat.useSkybox = false;   // 关闭天空盒反射
            ringMat.emissiveIntensity = 3.5;
            ringMat.diffuse = new pc.Color(0, 0, 0); 
            ringMat.emissive = new pc.Color(1.0, 0.7, 0.1);
            ringMat.emissiveMap = this._ringTex; 
            ringMat.opacityMap = this._ringTex;
            ringMat.blendType = pc.BLEND_ADDITIVE; 
            ringMat.depthWrite = false; 
            ringMat.depthTest = false; // 关闭深度测试，永不被地面遮挡
            ringMat.cull = pc.CULLMODE_NONE; 
            ringMat.update(); 
            ring.render.material = ringMat; 
            
            // 【终极必杀技 2】：包围盒中心必须对准 worldPos，而不是 0,0,0
            const hugeAabb = new pc.BoundingBox(worldPos.clone(), new pc.Vec3(1000, 1000, 1000));
            ring.render.customAabb = hugeAabb;
            
            portalEntity.addChild(ring);

            // ==========================================
            // B. 星火粒子系统
            // ==========================================
            const particles = new pc.Entity('Particles');
            particles.addComponent('particlesystem', {
                numParticles: 150,           
                lifetime: 3.0,               
                rate: 0.05,                  
                colorMap: this._particleTex, 
                initialVelocity: 0.8,
                emitterShape: pc.EMITTERSHAPE_CYLINDER, 
                emitterExtents: new pc.Vec3(1.6, 0, 1.6), 
                velocityGraph: new pc.CurveSet([[0,0], [0,1,1,2.5], [0,0]]), 
                colorGraph: new pc.CurveSet([[0,1,0.5,1,1,0.8], [0,1,0.5,0.7,1,0.2], [0,1,0.5,0.1,1,0]]),
                alphaGraph: new pc.Curve([0,0, 0.2,1, 0.8,1, 1,0]), 
                scaleGraph: new pc.Curve([0,0.1, 0.2,0.3, 0.8,0.2, 1,0.05]), 
                blendType: pc.BLEND_ADDITIVE, 
                depthWrite: false,
                depthTest: false,
                layers: targetLayers // 粒子系统也强行塞入 UI 层！
            });
            particles.setLocalPosition(0, 0.1, 0); 
            portalEntity.addChild(particles);

            // ==========================================
            // C. 氛围点光源
            // ==========================================
            const light = new pc.Entity('Light');
            light.addComponent('light', { 
                type: 'point', 
                color: new pc.Color(1.0, 0.7, 0.1), 
                intensity: 1.5, 
                range: 6 
            });
            light.setLocalPosition(0, 0.5, 0); 
            portalEntity.addChild(light);

            this.app.root.addChild(portalEntity);
            
            this._activePortals.push({
                entity: portalEntity, 
                ring: ring, 
                particles: particles, 
                light: light,
                config: pData, 
                pos: worldPos
            });

            // ==========================================
            // D. 延迟关闭底层剔除权
            // ==========================================
            setTimeout(() => {
                try {
                    if (ring.render && ring.render.meshInstances) {
                        ring.render.meshInstances.forEach(mi => mi.cull = false);
                    }
                    if (particles.particlesystem && particles.particlesystem.emitter && particles.particlesystem.emitter.meshInstance) {
                        particles.particlesystem.emitter.meshInstance.cull = false;
                    }
                } catch (err) {}
            }, 100); 
        });
    }
    _triggerTeleport(portalConfig) {
        this._isTeleporting = true; 
        if (this._portalHint) this._portalHint.classList.remove('visible'); 
        
        console.log(`UI: 🌌 踏入光阵，跃迁至 -> ${portalConfig.targetSceneId}`);

        const player = this.app.root.findByName('Character Controller') || this.app.root.findByName('Player');
        if (player && player.script && player.script.characterController) player.script.characterController.enabled = false;

        if (this._portalFlash) this._portalFlash.classList.add('flash'); 

        setTimeout(() => {
            const targetScene = this.scenesConfig.find(s => s.id === portalConfig.targetSceneId);
            if (targetScene) {
                // 【核心修改】把目标 B 点的配置作为第二个参数传给 _switchScene
                this._switchScene(targetScene, portalConfig);
            } else {
                console.error("UI Error: 未找到目标场景！"); this._isTeleporting = false; 
            }
            
            setTimeout(() => {
                if (this._portalFlash) this._portalFlash.classList.remove('flash'); 
                if (player && player.script && player.script.characterController) player.script.characterController.enabled = true;
                this._isTeleporting = false;
            }, 600); 
        }, 300); 
    }

    // 1.5 新增：用 Canvas 绘制光柱的垂直渐变贴图 (底部亮，顶部透明)
    _createBeamTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64; 
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // 创建从下到上的线性渐变
        const gradient = ctx.createLinearGradient(0, 256, 0, 0);
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)'); // 底部：不透明的金色
        gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)'); // 中部：半透明
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');   // 顶部：完全透明

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 256);

        const texture = new pc.Texture(this.app.graphicsDevice, { 
            width: 64, height: 256, format: pc.PIXELFORMAT_R8_G8_B8_A8 
        });
        texture.setSource(canvas); 
        return texture;
    }

    _attachEventListeners() {
        const preventCapture = (e) => { e.stopPropagation(); e.preventDefault(); };

        this._buttons.forEach((btn, quality) => {
            btn.addEventListener('click', (e) => {
                preventCapture(e);
                this.app.fire(`preset:${quality}`);
            });
            btn.addEventListener('mousedown', preventCapture);
            btn.addEventListener('mouseup', preventCapture);
        });

        if (this._menuBtn) {
            this._menuBtn.addEventListener('click', (e) => {
                preventCapture(e);
                this._toggleDrawer(true);
            });
        }
        if (this._drawerCloseBtn) {
            this._drawerCloseBtn.addEventListener('click', (e) => {
                preventCapture(e);
                this._toggleDrawer(false);
            });
        }

        if (this._toggleDmBtn && this._dmContainer) {
            this._toggleDmBtn.addEventListener('click', (e) => {
                e.stopPropagation(); e.preventDefault();
                this._dmContainer.classList.toggle('visible');
                if (this._dmContainer.classList.contains('visible')) {
                    const input = document.getElementById('dm-input');
                    if(input) input.focus();
                }
            });
            const sendBtn = document.getElementById('dm-btn');
            if (sendBtn) {
                sendBtn.addEventListener('click', () => {
                    this._dmContainer.classList.remove('visible');
                });
            }
            this._dmContainer.addEventListener('click', (e) => {
                if (e.target === this._dmContainer) {
                    this._dmContainer.classList.remove('visible');
                }
            });
        }

        if (this._storyCloseBtn) {
            this._storyCloseBtn.addEventListener('click', (e) => {
                preventCapture(e);
                this._closeStoryPopup();
            });
        }
        if (this._storyPopup) {
            this._storyPopup.addEventListener('click', (e) => {
                if (e.target === this._storyPopup) {
                    this._closeStoryPopup();
                }
            });
        }

        // ============================================================
        // 👇 新增：分享链接全局统一写入剪贴板逻辑
        // ============================================================
        const handleShareClick = (e) => {
            preventCapture(e);
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText('https://3d.sjtu.cn').then(() => {
                    alert("链接已复制");
                }).catch(err => {
                    console.error('复制失败: ', err);
                });
            } else {
                // 兼容性回退
                const input = document.createElement('input');
                input.value = 'https://3d.sjtu.cn';
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
                alert("链接已复制");
            }
        };

        if (this._storyShareBtn) {
            this._storyShareBtn.addEventListener('click', handleShareClick);
        }
        if (this._btnGlobalShare) {
            this._btnGlobalShare.addEventListener('click', handleShareClick);
        }

        const dmBtn = document.getElementById('dm-btn');
        const dmInput = document.getElementById('dm-input');
        if (dmBtn && dmInput) {
            const sendDanmaku = (e) => {
                if (e) { e.stopPropagation(); e.preventDefault(); }
                const txt = dmInput.value.trim();
                if (!txt) return;
                this.app.fire('danmaku:send', txt);
                
                const currentSceneId = this._currentSceneId || this.scenesConfig[0].id;
                const apiUrl = `${this.API_BASE_URL}/api/submit`;
                
                fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scene_id: currentSceneId, content: txt })
                }).catch(err => console.error(err));

                dmInput.value = '';
                dmInput.blur(); 
                this._dmContainer.classList.remove('visible');
            };
            dmBtn.addEventListener('click', sendDanmaku);
            dmInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') sendDanmaku(e);
            });
        }

        if (this._orientationBtn) {
            this._orientationBtn.addEventListener('click', (e) => {
                e.stopPropagation(); e.preventDefault(); 
                this._toggleOrientation();
            });
        }

        if (this._btnSubmitInfo) {
            this._btnSubmitInfo.addEventListener('click', (e) => {
                preventCapture(e);
                this._handleInfoSubmit();
            });
        }
        if (this._btnMinhang) {
            this._btnMinhang.addEventListener('click', (e) => {
                preventCapture(e);
                this._setCampusContext('minhang');
            });
        }
        if (this._btnXuhui) {
            this._btnXuhui.addEventListener('click', (e) => {
                preventCapture(e);
                this._setCampusContext('xuhui');
            });
        }

        if (this._btnTourYes) {
            this._btnTourYes.addEventListener('click', (e) => {
                e.stopPropagation();
                this._handleTourChoice(true);
            });
        }
        if (this._btnTourNo) {
            this._btnTourNo.addEventListener('click', (e) => {
                e.stopPropagation();
                this._handleTourChoice(false);
            });
        }

        if (this._btnStarStay) {
            this._btnStarStay.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this._starFinishPopup) this._starFinishPopup.style.display = 'none';
            });
        }

        const closeTutorial = (e) => {
            if (e) { e.stopPropagation(); e.preventDefault(); }
            this._closeTutorial();
        };

        if (this._btnTutorialClosePc) this._btnTutorialClosePc.addEventListener('click', closeTutorial);
        if (this._btnTutorialCloseMobile) {
            this._btnTutorialCloseMobile.addEventListener('click', closeTutorial);
            this._btnTutorialCloseMobile.addEventListener('touchstart', closeTutorial, {passive: false});
        }

        this._onKeyDownTutorial = (e) => {
            if (this._tutorialOverlay && this._tutorialOverlay.style.display !== 'none') {
                this._closeTutorial();
            }
        };
        window.addEventListener('keydown', this._onKeyDownTutorial);
        
        // 常驻按钮点击事件
        if (this._btnPersistentNext) {
            const newBtn = this._btnPersistentNext.cloneNode(true);
            this._btnPersistentNext.parentNode.replaceChild(newBtn, this._btnPersistentNext);
            this._btnPersistentNext = newBtn; 

            this._btnPersistentNext.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log("UI: 👉 用户点击了常驻【下一站】按钮");
                this._btnPersistentNext.style.transform = "scale(0.9)";
                setTimeout(() => {
                    if (this._btnPersistentNext) this._btnPersistentNext.style.transform = "scale(1)";
                }, 100);
                this._handleStarNext();
            });
            this._btnPersistentNext.style.cursor = 'pointer';
        }

        // 弹窗出发按钮
        if (this._btnStarNext) {
            const newBtn = this._btnStarNext.cloneNode(true);
            this._btnStarNext.parentNode.replaceChild(newBtn, this._btnStarNext);
            this._btnStarNext = newBtn;

            this._btnStarNext.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log("UI: 👉 用户点击了弹窗的【出发】按钮");
                this._btnStarNext.style.transform = "scale(0.95)";
                setTimeout(() => this._btnStarNext.style.transform = "scale(1)", 100);
                try {
                    this._handleStarNext();
                } catch (err) {
                    console.error("UI Error: 跳转逻辑报错:", err);
                }
            });
            this._btnStarNext.style.cursor = "pointer";
        }

        // 【新增】点击“我明白了”关闭弹窗
        if (this._btnStarGuideOk) {
            this._btnStarGuideOk.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this._starGuidePopup) this._starGuidePopup.style.display = 'none';
            });
        }

        // === 新增：团队介绍的交互逻辑 ===
        
        // 1. 点击左上角“关于团队”按钮，打开弹窗
        if (this._btnTeamInfo) {
            this._btnTeamInfo.addEventListener('click', (e) => {
                preventCapture(e); // 防止点透到后面的 3D 场景
                if (this._teamPopup) {
                    this._teamPopup.style.display = 'flex';
                    // 可选：如果打开了右侧边栏，顺手关掉它，保持界面清爽
                    this._toggleDrawer(false); 
                }
            });
        }

        // 2. 统一定义关闭弹窗的函数
        const closeTeamPopup = (e) => {
            if (e) preventCapture(e);
            if (this._teamPopup) {
                this._teamPopup.style.display = 'none';
            }
        };

        // 3. 绑定关闭按钮（右上角的 X）和继续探索按钮
        if (this._btnCloseTeam) {
            this._btnCloseTeam.addEventListener('click', closeTeamPopup);
        }
        if (this._btnTeamContinue) {
            this._btnTeamContinue.addEventListener('click', closeTeamPopup);
        }

        // 4. 贴心体验：点击黑色半透明背景遮罩时，也关闭弹窗
        if (this._teamPopup) {
            this._teamPopup.addEventListener('click', (e) => {
                // 确保只有点击到最外层遮罩才关闭，点到卡片内部不关闭
                if (e.target === this._teamPopup) {
                    closeTeamPopup(e);
                }
            });
        }

    }

    _handleInfoSubmit() {
        const name = this._inputName.value.trim();
        const grade = this._inputGrade.value.trim();
        const major = this._inputMajor.value.trim();

        if (!name || !grade || !major) {
            if (this._loginError) {
                this._loginError.style.display = 'block';
            }
            return;
        }

        const loginUrl = `${this.API_BASE_URL}/api/user/login`;
        fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                grade: grade,
                major: major
            })
        })
        .then(res => res.json())
        .then(data => console.log("UI: 用户信息已保存", data))
        .catch(err => console.warn("UI: 保存用户信息失败 (服务器可能未启动)", err));

        if (this._loginError) this._loginError.style.display = 'none';
        if (this._stepInfo) this._stepInfo.style.display = 'none';
        
        if (this._stepCampus) {
            this._stepCampus.style.display = 'block';
            this._stepCampus.style.animation = 'slideUp 0.5s ease';
        }
        if (this._welcomeText) {
            this._welcomeText.textContent = `${name}，欢迎回家`;
        }
    }

    _setCampusContext(campusName) {
        console.log(`UI: 用户选择了校区 [${campusName}]`);
        this._currentCampus = campusName;

        this._initSceneList();
        
        const entryScene = this.scenesConfig.find(s => s.campus === campusName);
        if (entryScene) {
            this._enterCampus(entryScene);
        } else {
            console.error(`UI Error: 未在配置中找到属于 ${campusName} 的场景`);
        }
    }

    _enterCampus(sceneData) {
        this._blockStoryPopup = true;
        setTimeout(() => {
            this._blockStoryPopup = false;
        }, 1000);

        // 1. 开始淡出隐藏选校区界面
        if (this._loginOverlay) {
            this._loginOverlay.classList.add('hidden');
            setTimeout(() => {
                this._loginOverlay.style.display = 'none';
            }, 800);
        }

        // 2. 播放团队过场动画，播完之后，再开始加载 3D 场景！
        this._playCinematicCredits(() => {
            this._switchScene(sceneData);
        });
    }

    // === 新增：控制 4秒团队过场动画的方法 ===
    _playCinematicCredits(callback) {
        const creditsEl = document.getElementById('cinematic-credits-container');
        const curtain = document.getElementById('transition-curtain');

        // 如果找不到元素，直接跳过动画进入场景（防错处理）
        if (!creditsEl) {
            if (callback) callback();
            return;
        }

        // 1. 瞬间拉起黑幕，遮挡背后还没加载好的 3D 场景
        if (curtain) {
            curtain.style.transition = 'none'; // 取消渐变，瞬间变黑
            curtain.classList.add('active');
            curtain.offsetHeight; // 强制浏览器重绘
            curtain.style.transition = ''; // 恢复原有的平滑渐变
        }

        // 2. 激活字幕 DOM，CSS 中写好的 4 秒淡入淡出动画会自动开始！
        creditsEl.style.display = 'flex';
        creditsEl.style.animation = 'none';
        creditsEl.offsetHeight; // 强制重绘，确保每次进来都能重新播放动画
        creditsEl.style.animation = 'cinematicFade 4s ease-in-out forwards';

        // 3. 设定 4 秒的定时器，动画播完后隐藏字幕，并执行回调（进入场景）
        setTimeout(() => {
            creditsEl.style.display = 'none';
            if (callback) callback();
        }, 4000); // 这里的 4000 毫秒刚好对应 CSS 里的 4s 动画
    }

    _setLandscapeMode(enable) {
        if (enable) {
            document.body.classList.add('force-landscape');
        } else {
            document.body.classList.remove('force-landscape');
        }
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
            this.app.resizeCanvas(); 
        }, 100);
    }

    _toggleOrientation() {
        const isCurrentlyLandscape = document.body.classList.contains('force-landscape');
        this._setLandscapeMode(!isCurrentlyLandscape);
    }

    _resetPlayerPosition() {
        if (!this._currentSceneId) return;
        const currentScene = this.scenesConfig.find(s => s.id === this._currentSceneId);
        if (!currentScene || !currentScene.initPos) return;

        const player = this.app.root.findByName('Character Controller') || this.app.root.findByName('Player');
        if (!player) return;

        const controllerScript = player.script ? (player.script.characterController || player.script.firstPersonController) : null;
        console.log(`UI: 正在复位玩家至 [${currentScene.initPos}]`);

        const tourSystem = this.app.root.findByName('TourSystem');
        if (tourSystem && tourSystem.script.tourController) {
            tourSystem.script.tourController.stopTour("复位打断");
        }

        const targetPos = new Vec3(currentScene.initPos[0], currentScene.initPos[1], currentScene.initPos[2]);
        if (player.rigidbody) {
            player.rigidbody.teleport(targetPos);
            player.rigidbody.linearVelocity = Vec3.ZERO;
            player.rigidbody.angularVelocity = Vec3.ZERO;
        } else {
            player.setPosition(targetPos);
        }
        
        if (currentScene.initRot) {
            const ex = currentScene.initRot[0]; 
            const ey = currentScene.initRot[1]; 
            if (controllerScript) {
                if (controllerScript.yaw !== undefined) controllerScript.yaw = ey;
                if (controllerScript.pitch !== undefined) controllerScript.pitch = ex;
            }
            player.setEulerAngles(0, ey, 0);
            const camera = player.findByName('Camera') || player.findByName('Main Camera') || player.findByName('View');
            if (camera) {
                camera.setLocalEulerAngles(ex, 0, 0);
            } else {
                player.setEulerAngles(ex, ey, 0);
            }
            console.log(`UI: 视角已强制重置 -> Pitch:${ex}, Yaw:${ey}`);
        } else if (currentScene.initTarget) {
            player.lookAt(currentScene.initTarget[0], currentScene.initTarget[1], currentScene.initTarget[2]);
            if (controllerScript) {
                const rot = player.getEulerAngles();
                if (controllerScript.yaw !== undefined) controllerScript.yaw = rot.y;
                if (controllerScript.pitch !== undefined) controllerScript.pitch = rot.x;
            }
        }
    }

    _handleTourChoice(startAutoTour) {
        if (this._tourPopup) this._tourPopup.style.display = 'none';
        
        const tourSystem = this.app.root.findByName('TourSystem');
        const gsplatScripts = this.app.root.findComponents('script')
            .filter(c => c.has('streamedGsplat'))
            .map(c => c.streamedGsplat);

        const currentScene = this.scenesConfig.find(s => s.id === this._currentSceneId);
        if (currentScene) this._playSceneBgm(currentScene);

        if (startAutoTour) {
            console.log("UI: 🚀 开启导览模式");
            gsplatScripts.forEach(script => script.setTourMode(true));
            if (tourSystem && tourSystem.script.tourController) {
                tourSystem.script.tourController.startTour();
                tourSystem.script.tourController.once('tour:ended', () => {
                    gsplatScripts.forEach(script => script.setTourMode(false));
                });
            }
            
            if (this._starCounterHud) this._starCounterHud.style.display = 'none';

        } else {
            console.log("UI: 🚶 进入自由探索");
            gsplatScripts.forEach(script => script.setTourMode(false));
            if (tourSystem && tourSystem.script.tourController) {
                tourSystem.script.tourController.stopTour(); 
            }

            this._updateStarCounterUI();
            if (this._starCounterHud) {
                this._starCounterHud.style.display = 'flex';
                this._starCounterHud.classList.remove('completed'); 
            }

            if (!this._hasSeenStarGuide) {
                if (this._starGuidePopup) {
                    this._starGuidePopup.style.display = 'flex';
                    this._starGuidePopup.style.animation = 'none';
                    this._starGuidePopup.offsetHeight; 
                    this._starGuidePopup.style.animation = 'fadeIn 0.3s ease';
                    
                    this._hasSeenStarGuide = true;
                }
            }
        }
    }

    _openStoryPopup(data) {
        if (this._blockStoryPopup) return;
        if (!this._storyPopup) return;
        
        this.app.fire('ui:videoOpened');

        if (this._elStoryTitle) this._elStoryTitle.textContent = data.badge || '信息展示';
        if (this._elStoryDesc) this._elStoryDesc.textContent = data.text || '';
        if (this._elStoryAuthor) this._elStoryAuthor.textContent = data.author || '';
        if (this._elStoryYear) this._elStoryYear.textContent = data.year || '';
        
        const card = this._storyPopup.querySelector('.story-card');
        if (card) {
            card.classList.remove('club-mode');
            if (data.type === 'club') card.classList.add('club-mode');
        }

        if (this._elStoryImg) this._elStoryImg.style.display = 'none';
        if (this._elStoryVideo) {
            this._elStoryVideo.style.display = 'none';
            this._elStoryVideo.pause();
        }

        if (data.video) {
            if (this._elStoryVideo) {
                this._elStoryVideo.src = data.video;
                this._elStoryVideo.style.display = 'block';
                this._toggleCarouselControls(false); 
            }
        } 
        else {
            this._currentGalleryList = [];
            if (data.imageList && data.imageList.length > 0) {
                this._currentGalleryList = data.imageList;
            } 
            else if (data.image) {
                this._currentGalleryList = [data.image];
            }

            if (this._currentGalleryList.length > 0) {
                this._currentGalleryIndex = 0; 
                this._ensureCarouselUI();
                this._updateGalleryDisplay();
                if (this._elStoryImg) this._elStoryImg.style.display = 'block';
            }
        }

        if (this._elQrCode) {
            if (data.qr) {
                this._elQrCode.style.backgroundImage = `url('${data.qr}')`;
                this._elQrCode.style.backgroundSize = 'cover';
                this._elQrCode.style.backgroundColor = 'white';
                this._elQrCode.style.display = 'block';
            } else {
                this._elQrCode.style.display = 'none';
            }
        }

        this._storyPopup.style.display = 'flex';
    }

    _ensureCarouselUI() {
        const container = this._elStoryImg ? this._elStoryImg.parentElement : null;
        if (!container) return;

        if (!container.querySelector('.carousel-btn')) {
            const prevBtn = document.createElement('div');
            prevBtn.className = 'carousel-btn prev';
            prevBtn.innerHTML = '&#10094;'; 
            prevBtn.onclick = (e) => { e.stopPropagation(); this._changeGalleryImage(-1); };
            
            const nextBtn = document.createElement('div');
            nextBtn.className = 'carousel-btn next';
            nextBtn.innerHTML = '&#10095;'; 
            nextBtn.onclick = (e) => { e.stopPropagation(); this._changeGalleryImage(1); };
            
            const counter = document.createElement('div');
            counter.className = 'carousel-counter';
            counter.id = 'carousel-counter-text';
            
            container.appendChild(prevBtn);
            container.appendChild(nextBtn);
            container.appendChild(counter);
            
            this._elCarouselPrev = prevBtn;
            this._elCarouselNext = nextBtn;
            this._elCarouselCounter = counter;
        } else {
            this._elCarouselPrev = container.querySelector('.carousel-btn.prev');
            this._elCarouselNext = container.querySelector('.carousel-btn.next');
            this._elCarouselCounter = container.querySelector('#carousel-counter-text');
        }
    }

    _updateGalleryDisplay() {
        if (!this._elStoryImg || this._currentGalleryList.length === 0) return;

        this._elStoryImg.src = this._currentGalleryList[this._currentGalleryIndex];
        const showControls = this._currentGalleryList.length > 1;
        this._toggleCarouselControls(showControls);

        if (showControls && this._elCarouselCounter) {
            this._elCarouselCounter.textContent = `${this._currentGalleryIndex + 1} / ${this._currentGalleryList.length}`;
        }
    }

    _toggleCarouselControls(show) {
        const displayVal = show ? 'flex' : 'none';
        const counterDisplay = show ? 'block' : 'none';
        
        if (this._elCarouselPrev) this._elCarouselPrev.style.display = displayVal;
        if (this._elCarouselNext) this._elCarouselNext.style.display = displayVal;
        if (this._elCarouselCounter) this._elCarouselCounter.style.display = counterDisplay;
    }

    _changeGalleryImage(direction) {
        if (!this._currentGalleryList || this._currentGalleryList.length <= 1) return;

        this._currentGalleryIndex += direction;

        if (this._currentGalleryIndex < 0) {
            this._currentGalleryIndex = this._currentGalleryList.length - 1;
        } else if (this._currentGalleryIndex >= this._currentGalleryList.length) {
            this._currentGalleryIndex = 0;
        }

        this._updateGalleryDisplay();
    }

    _closeStoryPopup() {
        if (this._storyPopup) this._storyPopup.style.display = 'none';
        this._stopCarousel(); 
        this.app.fire('ui:videoClosed');
    }
    
    _startCarousel() {
        this._carouselTimer = setInterval(() => {
            this._nextImage();
        }, 3000);
    }

    _stopCarousel() {
        if (this._carouselTimer) {
            clearInterval(this._carouselTimer);
            this._carouselTimer = null;
        }
    }

    _nextImage() {
        if (!this._galleryImages || this._galleryImages.length <= 1) return;
        this._galleryIndex = (this._galleryIndex + 1) % this._galleryImages.length;
        this._updateGalleryDisplay();
    }

    _prevImage() {
        if (!this._galleryImages || this._galleryImages.length <= 1) return;
        this._galleryIndex--;
        if (this._galleryIndex < 0) this._galleryIndex = this._galleryImages.length - 1;
        this._updateGalleryDisplay();
    }

    _initCarouselDots(count) {
        const wrapper = document.querySelector('.media-wrapper');
        if (!wrapper) return;

        let dotsContainer = wrapper.querySelector('.carousel-indicators');
        if (!dotsContainer) {
            dotsContainer = document.createElement('div');
            dotsContainer.className = 'carousel-indicators';
            wrapper.appendChild(dotsContainer);
        }
        dotsContainer.innerHTML = ''; 

        for (let i = 0; i < count; i++) {
            const dot = document.createElement('div');
            dot.className = 'carousel-dot';
            if (i === 0) dot.classList.add('active');
            dotsContainer.appendChild(dot);
        }
    }

    _removeCarouselDots() {
        const dotsContainer = document.querySelector('.carousel-indicators');
        if (dotsContainer) dotsContainer.remove();
    }

    _bindSwipeGestures() {
        if (this._hasBoundSwipe) return; 
        
        const imgEl = this._elStoryImg;
        let startX = 0;

        imgEl.addEventListener('touchstart', (e) => {
            startX = e.changedTouches[0].pageX;
            this._stopCarousel(); 
        }, { passive: true });

        imgEl.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].pageX;
            const diff = endX - startX;

            if (Math.abs(diff) > 50) {
                if (diff < 0) this._nextImage(); 
                else this._prevImage();          
            }
            
            this._startCarousel(); 
        }, { passive: true });

        this._hasBoundSwipe = true;
    }

    _startSlideShow() {
        this._stopSlideShow(); 
        this._slideTimer = setInterval(() => {
            this._nextImage();
        }, 3000);

        if (!this._hasBoundSwipe && this._elStoryImg) {
            this._bindSwipeEvents();
            this._hasBoundSwipe = true;
        }
    }

    _stopSlideShow() {
        if (this._slideTimer) {
            clearInterval(this._slideTimer);
            this._slideTimer = null;
        }
    }

    _bindSwipeEvents() {
        let startX = 0;
        const imgEl = this._elStoryImg;

        imgEl.addEventListener('touchstart', (e) => {
            startX = e.changedTouches[0].pageX;
            this._stopSlideShow(); 
        }, { passive: true });

        imgEl.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].pageX;
            const diff = endX - startX;

            if (Math.abs(diff) > 50) { 
                if (diff < 0) {
                    this._nextImage(); 
                } else {
                    this._prevImage(); 
                }
            }
            this._startSlideShow(); 
        }, { passive: true });
        
        imgEl.addEventListener('mousedown', (e) => { startX = e.pageX; });
        imgEl.addEventListener('mouseup', (e) => {
            if (e.pageX - startX < -50) this._nextImage();
            if (e.pageX - startX > 50) this._prevImage();
        });
    }

    _initSceneList() {
        if (!this._sceneListEl) return;
        this._sceneListEl.innerHTML = '';
        
        if (!this._currentCampus) return;

        const filteredScenes = this.scenesConfig.filter(s => s.campus === this._currentCampus);

        filteredScenes.forEach(scene => {
            const item = document.createElement('div');
            item.className = 'scene-item';
            
            if (scene.id === this._currentSceneId) {
                item.classList.add('active');
            }

            let finalImgUrl = '';
            if (scene.thumbName) {
                const asset = this.app.assets.find(scene.thumbName);
                if (asset) finalImgUrl = asset.getFileUrl();
            }
            if (!finalImgUrl && scene.thumbUrl) finalImgUrl = scene.thumbUrl;
            if (!finalImgUrl) finalImgUrl = 'https://via.placeholder.com/300x200?text=No+Image';

            item.innerHTML = `
                <img src="${finalImgUrl}" alt="${scene.name}">
                <span>${scene.name}</span>
            `;

            item.addEventListener('click', () => {
                this._switchScene(scene);
                if (platform.mobile) this._toggleDrawer(false);
            });

            this._sceneListEl.appendChild(item);
        });
    }

    loadDanmakuFromServer(sceneId, defaultList, danmakuPos) {
        const apiUrl = `${this.API_BASE_URL}/api/list?scene_id=${sceneId}`;
        fetch(apiUrl)
            .then(res => {
                if (!res.ok) throw new Error("Server Error");
                return res.json();
            })
            .then(serverList => {
                const combinedList = defaultList.concat(serverList);
                this.app.fire('danmaku:updateContext', {
                    messages: combinedList,
                    position: danmakuPos
                });
            })
            .catch(err => {
                this.app.fire('danmaku:updateContext', {
                    messages: defaultList,
                    position: danmakuPos
                });
            });
    }

    _toggleQualityButtons(show) {
        const qualityGroup = document.querySelector('.quality-group');
        if (qualityGroup) {
            qualityGroup.style.display = show ? 'flex' : 'none';
        } else {
            const footer = document.getElementById('gsplat-footer');
            if (footer) footer.style.display = show ? 'block' : 'none';
        }
    }

    _toggleMobileControls(show) {
        const idsToToggle = [
            'joystick-zone',      
            'virtual-joystick',   
            'jump-btn',
            'mobile-controls',
            'joystick-wrapper',
            'movement-pad'
        ];

        idsToToggle.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = show ? 'block' : 'none';
            }
        });
        
        const controls = document.querySelectorAll('.touch-controls, .joystick, .jump-button');
        controls.forEach(el => {
            el.style.display = show ? '' : 'none'; 
        });
    }
    
    _updateListHighlight() {
        if(!this._sceneListEl) return;
        const items = this._sceneListEl.querySelectorAll('.scene-item');
        const filteredScenes = this.scenesConfig.filter(s => s.campus === this._currentCampus);
        
        filteredScenes.forEach((scene, index) => {
            if (items[index]) {
                if(scene.id === this._currentSceneId) items[index].classList.add('active');
                else items[index].classList.remove('active');
            }
        });
    }

    _toggleDrawer(isOpen) {
        if (this._drawer) {
            if (isOpen) this._drawer.classList.add('open');
            else this._drawer.classList.remove('open');
        }
    }

    _onPresetChanged(presetName) {
        this._currentPreset = presetName;
        this._updateButtonStates();
    }

    _onUpdateStats(rendered) {
        if (this._splatCountEl) {
            this._splatCountEl.textContent = 
                `Splats: ${this._formatSplatCount(rendered)} / ${this._formatSplatCount(this.currentSceneTargetSplats || this.totalSplats)}`;
        }

        let progress = 0;
        if (this.currentSceneTargetSplats > 0) {
            progress = rendered / this.currentSceneTargetSplats;
            if (progress > 1) progress = 1; 
        } else {
            progress = 1; 
        }

        this._updateLoadingRing(progress);

        if (progress >= 0.9 && this._loadingResolve) {
            this._loadingResolve(); 
            this._loadingResolve = null; 
        }
    }

    _updateLoadingRing(progress) {
        const spinnerContainer = document.getElementById('transition-spinner');
        if (!spinnerContainer) return;
        
        const circle = spinnerContainer.querySelector('circle');
        if (circle) {
            const radius = 26;
            const circumference = 2 * Math.PI * radius; 
            const offset = circumference - (progress * circumference);
            circle.style.strokeDashoffset = offset;
        }
    }

    _formatSplatCount(count) {
        if (count >= 1000000) return (count / 1000000).toFixed(2) + 'M';
        if (count >= 1000) return (count / 1000).toFixed(2) + 'K';
        return count.toString();
    }

    _updateButtonStates() {
        this._buttons.forEach((btn, quality) => {
            btn.classList.toggle('active', quality === (this._currentPreset || 'medium'));
        });
    }

    onDestroy() {
        this.app.off('ui:setPreset', this._onPresetChanged, this);
        this.app.off('ui:updateStats', this._onUpdateStats, this);
        this.app.off('ui:openStory', this._openStoryPopup, this);
        
        // --- 清除传送门事件监听 ---
        this.app.off('scene:teleport', this._handleTeleport, this);
        
        this._buttons.clear();
        this._splatCountEl = null;
        if (this.ui && this.ui.parentElement) {
            this.ui.parentElement.removeChild(this.ui);
        }
        if (this._loginOverlay && this._loginOverlay.parentElement) {
            this._loginOverlay.parentElement.removeChild(this._loginOverlay);
        }
        if (this._tourPopup && this._tourPopup.parentElement) {
            this._tourPopup.parentElement.removeChild(this._tourPopup);
        }
        if (this._starFinishPopup && this._starFinishPopup.parentElement) {
            this._starFinishPopup.parentElement.removeChild(this._starFinishPopup);
        }
        if (this._starToast && this._starToast.parentElement) {
            this._starToast.parentElement.removeChild(this._starToast);
        }
    }

    _switchScene(sceneData, portalOverride = null) {

        if (this._currentSceneId === sceneData.id && !portalOverride) return;
        console.log(`=== 🎬 切换场景: ${sceneData.name} (${sceneData.id}) ===`);

        // 1. 关闭旧弹窗与重置状态
        this._closeStoryPopup();
        if (this._tourPopup) this._tourPopup.style.display = 'none';
        if (this._starFinishPopup) this._starFinishPopup.style.display = 'none'; 
        if (this._btnPersistentNext) this._btnPersistentNext.style.display = 'none';

        this._currentSceneId = sceneData.id;

        // 2. 严谨的设备判定 (兼容 iPad 桌面模式)
        const ua = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || window.innerWidth < 768;

        console.group(`[DEBUG] 场景切换自检: ${sceneData.id}`);
        console.log(`- 是否为 iOS: ${isIOS}`);
        console.log(`- 是否为移动端 (将执行减负): ${isMobileDevice}`);

        // 3. iOS 强制封顶 80 万点云
        const rawCount = sceneData.splatCount || 1000000;
        this.currentSceneTargetSplats = isIOS ? Math.min(rawCount, 800000) : rawCount;
        this.currentSceneStarsCollected = 0;
        this.currentSceneStarsTotal = 100; 

        // 4. 播放 UI 标题过场
        const chapterTitle = sceneData.chapter || ""; 
        this._playSceneIntro(chapterTitle, sceneData.name);
        
        if (this._resetBtn) {
            this._resetBtn.style.display = (sceneData.type === 'panorama') ? 'none' : 'block';
        }
        
        // iOS 强制切到 low preset，切断高精度点云块下载
        if (isIOS) this.app.fire('preset:low');

        const spawnPos = portalOverride && portalOverride.targetPos ? portalOverride.targetPos : sceneData.initPos;
        const spawnTarget = portalOverride && portalOverride.targetLookAt ? portalOverride.targetLookAt : sceneData.initTarget;

        // ☁️ 5. 【双重物理拦截天空盒】
        // 第一重：拦截 3DGS 环境贴图 (置空 URL)
        const finalEnvUrl = isIOS ? '' : (sceneData.environmentUrl || '');
        console.log(`- 下发环境贴图 URL: ${finalEnvUrl === '' ? '已屏蔽(空)' : finalEnvUrl}`);

        // 第二重：拦截引擎原生天空盒图层
        const skyboxLayer = this.app.scene.layers.getLayerById(pc.LAYERID_SKYBOX);
        if (skyboxLayer) {
            skyboxLayer.enabled = !isIOS; 
            console.log(`- 原生 Skybox 图层状态: ${skyboxLayer.enabled ? '开启' : '关闭'}`);
        } else {
            console.warn(`- 警告: 未找到 LAYERID_SKYBOX 图层`);
        }
        console.groupEnd();

        // 6. 触发场景加载
        this.app.fire('scene:load', {
            id: sceneData.id, 
            splatUrl: sceneData.splatUrl,
            environmentUrl: finalEnvUrl,  
            initPos: spawnPos,          
            initRot: sceneData.initRot, 
            initTarget: spawnTarget,    
            type: sceneData.type || 'normal' 
        });

        // 7. 全景球逻辑 (保持 PC 端正常解析全景贴图)
        const panoramaSphere = this.app.root.findByName('PanoramaSphere');
        if (panoramaSphere) {
            if (sceneData.type === 'panorama' && sceneData.panoramaTextureName) {
                panoramaSphere.enabled = true;
                this.app.graphicsDevice.maxPixelRatio = window.devicePixelRatio;
                this.app.resizeCanvas();
                
                const textureAsset = this.app.assets.find(sceneData.panoramaTextureName);
                if (textureAsset) {
                    const render = panoramaSphere.render;
                    if (render && render.meshInstances.length > 0) {
                        const mat = render.meshInstances[0].material;
                        if (mat) {
                            mat.emissiveMap = textureAsset.resource;
                            mat.diffuseMap = null; 
                            if (mat.emissiveMap) {
                                mat.emissiveMap.anisotropy = this.app.graphicsDevice.maxAnisotropy;
                                mat.emissiveMap.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
                                mat.emissiveMap.magFilter = pc.FILTER_LINEAR;
                            }
                            mat.update();
                        }
                    }
                }
            } else {
                panoramaSphere.enabled = false;
            }
        }

        // 8. 星星数据初始化
        if (this._starCounterHud) this._starCounterHud.style.display = 'none';
        this._initStarsForScene(sceneData);

        // 9. 显隐 Root 节点 (精确屏蔽移动端彩蛋检测)
        this.scenesConfig.forEach(cfg => {
            const isCurrent = (cfg.id === sceneData.id);

            // 🎯 强制关闭部分移动端热点
            const hRoot = this.app.root.findByName(cfg.hotspotRootName);
            if (hRoot) hRoot.enabled = isIOS ? false : isCurrent; 
            
            if (cfg.collisionRootName) {
                const cRoot = this.app.root.findByName(cfg.collisionRootName);
                if (cRoot) cRoot.enabled = isCurrent;
            }

            if (cfg.tourPathRootName) {
                const pRoot = this.app.root.findByName(cfg.tourPathRootName);
                if (pRoot) pRoot.enabled = isCurrent;
            }

            let sRootName = cfg.starRootName || ('Stars_' + cfg.id);
            const sRoot = this.app.root.findByName(sRootName.trim());
            if (sRoot) sRoot.enabled = isCurrent;
        });

        const screenNodeName = 'Screen_Scene8'; 
        const screenRoot = this.app.root.findByName(screenNodeName);
        if (screenRoot) screenRoot.enabled = (sceneData.screenRootName === screenNodeName);

        // 10. 加载弹幕
        this.loadDanmakuFromServer(sceneData.id, sceneData.danmakuList, sceneData.danmakuPos);
        
        // 📺 11. 物理隔离移动端视频纹理
        if (isIOS) {
            this._clearVideoScreens(); // iOS彻底清除且不生成
        } else {
            this._spawnVideoScreens(sceneData.id); 
        }

        // --- 👇 新增：生成大电类群楼悬浮图片 ---
        this._spawnFloatingImage(sceneData);

        this._updateListHighlight();

        // 12. 设置自动导览路径数据
        if (sceneData.type !== 'panorama') {
            const tourSystem = this.app.root.findByName('TourSystem');
            if (tourSystem && tourSystem.script.tourController) {
                const controller = tourSystem.script.tourController;
                controller.speed = sceneData.tourSpeed || 3.0;
                let pathEntity = null;
                if (sceneData.tourPathRootName) {
                    pathEntity = this.app.root.findByName(sceneData.tourPathRootName);
                }
                controller.setPathEntity(pathEntity);
            }
        }

        // 13. 生成传送门
        this._spawnPortals(sceneData);

        // ===========================================
        // ▼ 调用纯净文字 DOM 过场动画
        // ===========================================
        this._playTransitionSequence(sceneData);
    }
    // ============================================================
    // 纯净文字过场动画 (放弃 Canvas，改用 CSS DOM 逐行渲染)
    // ============================================================
    async _playTransitionSequence(sceneData) {
        const curtain = document.getElementById('transition-curtain');
        const textBox = document.getElementById('transition-text-box');
        const barContainer = document.querySelector('.virtual-loading-bar-container');
        const barFill = document.getElementById('virtual-loading-fill');
        const particleText = document.getElementById('particle-progress-text');
        
        if (!curtain || !textBox) return;

        // 1. 重置 UI 状态
        textBox.innerHTML = '';
        textBox.style.display = 'flex';
        curtain.classList.add('active'); 
        if (barContainer) { 
            barContainer.style.display = 'flex'; 
            barContainer.style.opacity = '1'; 
        }

        // 2. 获取并生成文本节点 (利用你 css 中已有的 .intro-line-item)
        const lines = sceneData.introLines || ["正在初始化空间坐标...", "请稍候..."];
        const lineElements = [];
        
        lines.forEach((lineText) => {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'intro-line-item'; 
            lineDiv.textContent = lineText;
            textBox.appendChild(lineDiv);
            lineElements.push(lineDiv);
        });

        // 3. 逐行淡入的动画逻辑
        let currentLineIndex = 0;
        const showNextLine = () => {
            if (currentLineIndex < lineElements.length) {
                lineElements[currentLineIndex].classList.add('visible'); // 触发 CSS 动画
                currentLineIndex++;
                setTimeout(showNextLine, 800); // 每行间隔 800 毫秒
            }
        };
        // 延迟 300 毫秒后开始逐行显示文字
        setTimeout(showNextLine, 300); 

        // 4. 进度条倒计时加载逻辑
        let isRealLoaded = false;
        let percent = 0;
        let elapsed = 0;
        
        const intervalId = setInterval(() => {
            elapsed += 50;
            percent = (elapsed / 3000) * 100; // 假装 3 秒加载完
            
            if (percent > 98 && !isRealLoaded) percent = 98;
            if (percent >= 100) percent = 100;

            if (barFill) barFill.style.width = percent + '%';
            if (particleText) particleText.textContent = `空间坐标解析中... ${Math.floor(percent)}%`;

            if (percent >= 100 && isRealLoaded) {
                clearInterval(intervalId);
                finishTransition();
            }
        }, 50);

        const finishTransition = async () => {
            if (particleText) particleText.textContent = `坐标锁定，跃迁开始`;
            
            // 文本全部退场动画
            lineElements.forEach(el => {
                el.classList.remove('visible');
                el.classList.add('fade-out');
            });

            await new Promise(r => setTimeout(r, 600)); 
            
            if (barContainer) barContainer.style.opacity = '0';
            curtain.classList.remove('active');
            
            this._playSceneIntro(sceneData.chapter || "", sceneData.name);
            setTimeout(() => this._checkAndShowTourPopup(sceneData), 4000);
        };

        const realLoad = new Promise(resolve => {
            this._loadingResolve = resolve;
            setTimeout(() => { 
                if(this._loadingResolve) {
                    this._loadingResolve(); 
                    this._loadingResolve = null;
                } 
            }, 12000);
        });
        
        realLoad.then(() => { isRealLoaded = true; });
    }

    _showJumpConfirm(holoObj) {
        this._pendingJumpTarget = holoObj;
        if (this._jumpTargetText) this._jumpTargetText.textContent = `目标地点：${holoObj.label.replace('前往：', '')}`;
        if (this._jumpPopup) {
            this._jumpPopup.style.display = 'flex';
        }
    }

    _showTutorial(callback) {
        if (!this._tutorialOverlay) {
            if(callback) callback();
            return;
        }
        this._tutorialOverlay.style.display = 'flex';
        this._tutorialOverlay.offsetHeight; 
        this._tutorialOverlay.classList.add('active');
        
        this._hasSeenTutorial = true; 
        this._tutorialCallback = callback; 
    }

    _closeTutorial() {
        if (!this._tutorialOverlay) return;
        this._tutorialOverlay.classList.remove('active');
        setTimeout(() => {
            this._tutorialOverlay.style.display = 'none';
            if (this._tutorialCallback) {
                this._tutorialCallback();
                this._tutorialCallback = null;
            }
        }, 500);
    }

    _checkAndShowTourPopup(sceneData) {
        if (sceneData.type !== 'panorama') {
            if (sceneData.tourPathRootName) {
                const pathEntity = this.app.root.findByName(sceneData.tourPathRootName);
                if (pathEntity && this._tourPopup) {
                    this._tourPopup.style.display = 'flex';
                }
            }
        }
    }

    // ============================================================
    // 🎵 音频系统：BGM 管理与硬暂停/恢复机制
    // ============================================================
    _initAudioSystem() {
        console.log("UI: 初始化音频系统...");
        
        if (!this._bgmEntity) {
            this._bgmEntity = new pc.Entity('GlobalBGMPlayer');
            this.app.root.addChild(this._bgmEntity);
            
            this._bgmEntity.addComponent('sound', {
                positional: false 
            });
            
            console.log("UI: BGM 播放器实体已创建 (2D模式)");
        }

        this._currentBgmSlot = null;
        this._targetBgmVol = 0.3; 

        // 👇 核心修改：收到 duck 指令后直接触发 pause 和 resume，不再改变 volume
        this.app.on('audio:duck', (shouldPause) => {
            if (!this._currentBgmSlot || !this._bgmEntity || !this._bgmEntity.sound) return;
            
            if (shouldPause) {
                this._bgmEntity.sound.pause(this._currentBgmSlot);
            } else {
                this._bgmEntity.sound.resume(this._currentBgmSlot);
            }
        }, this);
    }

    _playSceneBgm(sceneData) {
        const bgmName = sceneData.bgmAsset; 
        console.log(`UI [调试]: 场景 ${sceneData.id} 准备播放 BGM: ${bgmName}`);

        if (!bgmName) return;

        // 【修正】动态读取场景配置中的音量，默认 0.05
        const targetVol = sceneData.bgmVolume || 0.05;
        this._sceneBgmVol = targetVol; 

        if (this.app.systems.sound.manager.context.state === 'suspended') {
            this.app.systems.sound.manager.context.resume();
        }

        if (!this._bgmEntity) {
            this._bgmEntity = new pc.Entity('GlobalBGMPlayer');
            this.app.root.addChild(this._bgmEntity);
            this._bgmEntity.addComponent('sound', { positional: false });
        }
        
        this._bgmEntity.sound.positional = false;

        const asset = this.app.assets.find(bgmName);
        if (!asset) return;

        const currentSlotName = this._currentBgmSlot;
        if (currentSlotName) {
             const currentSlot = this._bgmEntity.sound.slot(currentSlotName);
             if (currentSlot && currentSlot.asset === asset.id && currentSlot.isPlaying) {
                 currentSlot.volume = targetVol; // 【修正】这里也要用 targetVol
                 return; 
             }
             this._bgmEntity.sound.stop();
             this._bgmEntity.sound.removeSlot(currentSlotName);
        }

        const slotName = "bgm_" + sceneData.id + "_" + Math.floor(Math.random() * 1000);
        this._currentBgmSlot = slotName;

        this._bgmEntity.sound.addSlot(slotName, {
            asset: asset, autoPlay: true, loop: true, overlap: true,
            volume: targetVol // 【修正】这里使用 targetVol
        });
        this._bgmEntity.sound.play(slotName);
    }
}

export { UI };
