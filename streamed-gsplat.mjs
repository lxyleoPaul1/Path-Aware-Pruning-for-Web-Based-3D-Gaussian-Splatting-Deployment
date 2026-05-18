import { Script, Asset, Entity, platform, Vec3 } from 'playcanvas';

class StreamedGsplat extends Script {
    static scriptName = 'streamedGsplat';

    /** @attribute {string} */
    splatUrl = '';
    /** @attribute {string} */
    environmentUrl = '';

    // ============================================================
    // [PC Settings]
    // ============================================================
    /** @attribute {number[]} */
    pcUltraLodDistances = [3, 10, 25, 40, 60, 80, 150];
    /** @attribute {number[]} */
    pcHighLodDistances = [5, 15, 30, 50, 70, 100, 150];
    /** @attribute {number[]} */
    pcMediumLodDistances = [5, 10, 20, 35, 60, 90, 150];
    /** @attribute {number[]} */
    pcLowLodDistances = [5, 8, 15, 25, 40, 70, 100];

    // ============================================================
    // [Mobile Settings]
    // ============================================================
    /** @attribute {number[]} */
    mobileUltraLodDistances = [4, 8, 15, 30, 50, 80, 120];
    /** @attribute {number[]} */
    mobileHighLodDistances = [5, 10, 20, 35, 60, 90, 120];
    /** @attribute {number[]} */
    mobileMediumLodDistances = [5, 8, 15, 25, 50, 80, 100];
    /** @attribute {number[]} */
    mobileLowLodDistances = [3, 5, 10, 15, 30, 50, 80];

    pcRangeUltra = [0, 5]; pcRangeHigh = [0, 5]; pcRangeMedium = [1, 5]; pcRangeLow = [2, 5];
    mobileRangeUltra = [1, 5]; mobileRangeHigh = [1, 5]; mobileRangeMedium = [2, 5]; mobileRangeLow = [3, 5];

    /** @type {Asset[]} */
    _assets = [];
    /** @type {Entity[]} */
    _children = [];
    _colorize = false;
    
    // 状态变量
    _lastCameraPos = new Vec3();
    _lastCameraRot = new Vec3();
    _isMoving = false;
    _moveTimer = 0;
    _lastSortTime = 0;

    // 动态调整变量
    _currentDpr = 1.0;
    _targetDpr = 1.0;
    
    // 【新增】点云数量控制 (0.0 - 1.0)
    _currentSplatRatio = 0.5; 
    _targetSplatRatio = 1.0;

    _isTouring = false; 
    _savedPreset = null;

    initialize() {
        const app = this.app;
        this._currentPreset = platform.mobile ? 'medium' : 'high';

        app.on('preset:ultra', () => this._setPreset('ultra'), this);
        app.on('preset:high', () => this._setPreset('high'), this);
        app.on('preset:medium', () => this._setPreset('medium'), this);
        app.on('preset:low', () => this._setPreset('low'), this);
        app.on('colorize:toggle', this._toggleColorize, this);
        app.on('scene:load', this._onLoadNewScene, this);

        this._setupSceneSettings();
        
        this._camera = app.systems.camera.cameras[0]?.entity; 
        if (!this._camera) this._camera = app.root.findByName('Camera') || app.root.findByName('View');

        // 初始化 DPR
        this._currentDpr = window.devicePixelRatio || 1;
        // 手机端限制最大 DPR，防止 3K 屏卡死
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
            // 苹果手机强制设为 1.0，减少 GPU 压力防止闪退
            this._currentDpr = 1.0;
            this.app.graphicsDevice.maxPixelRatio = 1.0;
        } else if (platform.mobile) {
            this._currentDpr = Math.min(this._currentDpr, 1.43); 
        }
        
        this.app.graphicsDevice.maxPixelRatio = this._currentDpr;
        this.app.resizeCanvas();

        this._loadSplats(this.splatUrl, this.environmentUrl);

        this.once('destroy', () => this.onDestroy());
        window.addEventListener('resize', this._onWindowResize);
    }

    update(dt) {
        // --- 1. 运动检测 ---
        if (this._camera) {
            const pos = this._camera.getPosition();
            const rot = this._camera.getEulerAngles();
            
            const moved = pos.distance(this._lastCameraPos) > 0.001;
            const rotated = rot.distance(this._lastCameraRot) > 0.01;

            if (moved || rotated) {
                this._isMoving = true;
                // 停手缓冲期：手机设长一点(0.6s)，防止手指微抖动导致画质忽高忽低
                this._moveTimer = platform.mobile ? 0.6 : 0.3; 
                this._lastCameraPos.copy(pos);
                this._lastCameraRot.copy(rot);
            } else {
                if (this._moveTimer > 0) {
                    this._moveTimer -= dt;
                    if (this._moveTimer <= 0) {
                        this._isMoving = false;
                    }
                }
            }
            
            // --- 2. 计算目标参数 ---
            this._calculateTargets();

            // --- 3. 应用参数 (平滑过渡) ---
            this._applyDynamicSettings(dt);
        }

        // --- 4. 统计数据 ---
        if (this.app.stats?.frame?.gsplats) {
            const stats = this.app.stats.frame.gsplats;
            // 尝试获取当前实际渲染的点数
            let count = (typeof stats === 'number') ? stats : (stats.visible || stats.rendered || 0);
            
            // 如果我们手动限制了点数，统计数据可能不准，手动修正一下显示
            if (this.entity.gsplat && this.entity.gsplat.instance && this.entity.gsplat.instance.sorter) {
               // 显示“当前渲染/总数”的逻辑可以在 UI 层做，这里只推数据
            }
            this.app.fire('ui:updateStats', count);
        }
    }

    // ============================================================
    // 【核心逻辑】计算目标画质参数
    // ============================================================
    _calculateTargets() {
        const settings = this.app.scene.gsplat;
        const nativeDpr = window.devicePixelRatio || 1;
        const now = Date.now() / 1000;

        // --- 场景 A: 巡游模式 (Tour Mode) ---
        if (this._isTouring) {
            // 策略：高分辨率 + 削减点云数量 + 极低频排序
            // 解释：减少 30% 的点几乎不影响观感，但能极大提升 FPS，支撑高 DPR
            
            // 分辨率：给高 (1.5 ~ 2.0)
            this._targetDpr = platform.mobile ? Math.min(nativeDpr, 1.43) : Math.min(nativeDpr, 2.0);
            
            // 点云数量：只渲染最重要的 70% (手机)
            this._targetSplatRatio = platform.mobile ? 0.7 : 0.9;

            // 排序：极低频 (0.4秒一次)
            if (now - this._lastSortTime > 0.4) {
                settings.sortDelay = 0; 
                this._lastSortTime = now;
            } else {
                settings.sortDelay = 999; 
            }
            
            settings.lodUpdateDistance = 0.5;
            return;
        }

        // --- 场景 B: 自由探索 (Free Roam) ---
        if (this._isMoving) {
            // 移动中：分辨率降级 + 点云大幅削减 + 暂停排序
            
            // 分辨率：保底 1.0 (太低会糊得难受)
            this._targetDpr = platform.mobile ? 1.0 : 1.2;
            
            // 点云数量：砍掉一半！(手机只留 40% 的点)
            // 运动时人眼对细节不敏感，这是提升流畅度最有效的方法
            this._targetSplatRatio = platform.mobile ? 0.4 : 0.6;

            // 排序：手机移动时完全不排序，或者极低频
            if (now - this._lastSortTime > (platform.mobile ? 0.5 : 0.2)) {
                settings.sortDelay = 0;
                this._lastSortTime = now;
            } else {
                settings.sortDelay = 999;
            }
            
            settings.lodUpdateDistance = 2.0;

        } else {
            // 静止时：超清画质 + 满血点云 + 实时排序
            
            // 分辨率：拉满 (最高 2.5)
            this._targetDpr = Math.min(nativeDpr, 2.5);
            
            // 点云数量：100%
            this._targetSplatRatio = 1.0;

            // 排序：实时
            settings.sortDelay = 0; 
            settings.lodUpdateDistance = 0.1;
            this._lastSortTime = now;
        }
    }

    // ============================================================
    // 【核心逻辑】应用参数 (带平滑插值)
    // ============================================================
    _applyDynamicSettings(dt) {
        // 1. 平滑调整 DPR (分辨率)
        // 只有当差异较大时才调整，避免 resizeCanvas 闪烁
        if (Math.abs(this._currentDpr - this._targetDpr) > 0.05) {
            // 变清晰慢一点(优雅)，变糊快一点(救急)
            const speed = (this._targetDpr < this._currentDpr) ? 5.0 : 1.5;
            this._currentDpr += (this._targetDpr - this._currentDpr) * speed * dt;
            
            // 限制范围
            const finalDpr = Math.max(0.5, Math.min(this._currentDpr, 3.0));
            this.app.graphicsDevice.maxPixelRatio = finalDpr;
            this.app.resizeCanvas();
        }

        // 2. 平滑调整点云数量限制 (Limit)
        if (Math.abs(this._currentSplatRatio - this._targetSplatRatio) > 0.01) {
            // 数量变化可以快一点
            this._currentSplatRatio += (this._targetSplatRatio - this._currentSplatRatio) * 3.0 * dt;
        } else {
            this._currentSplatRatio = this._targetSplatRatio;
        }

        // 应用到所有 Gsplat 实例
        this._applyLimitToInstance(this.entity, this._currentSplatRatio);
        this._children.forEach(child => {
            this._applyLimitToInstance(child, this._currentSplatRatio);
        });
    }

    _applyLimitToInstance(entity, ratio) {
        if (!entity.gsplat || !entity.gsplat.instance) return;
        
        const instance = entity.gsplat.instance;
        
        // 获取总粒子数
        // 注意：不同插件版本属性名不同，这里做兼容处理
        let totalCount = 0;
        if (instance.sorter && instance.sorter.particleCount) {
            totalCount = instance.sorter.particleCount;
        } else if (instance.splatCount) {
            totalCount = instance.splatCount;
        }

        if (totalCount > 0) {
            const limitCount = Math.floor(totalCount * ratio);
            
            // 设置绘制上限
            // 1. 标准 SuperSplat 方式: sorter.limit
            if (instance.sorter) {
                instance.sorter.limit = limitCount;
            }
            // 2. 某些版本可能是直接设置 instance.count
            if (instance.count !== undefined) {
                // instance.count = limitCount; // 慎用，有些版本是只读
            }
        }
    }

    // ============================================================
    // 导览模式切换
    // ============================================================
    setTourMode(active) {
        if (this._isTouring === active) return;
        this._isTouring = active;

        if (active) {
            console.log("StreamedGsplat: 🚀 巡游开启 (Budget: High Res / Medium Splats)");
            this._savedPreset = this._currentPreset;
            const tourPreset = platform.mobile ? 'high' : 'ultra';
            this._setPreset(tourPreset, true);
        } else {
            console.log("StreamedGsplat: 🚶 自由模式");
            if (this._savedPreset) this._setPreset(this._savedPreset, true);
            this._savedPreset = null;
        }
        
        this._isMoving = false; 
    }

    _setupSceneSettings() {
        const config = this.app.scene.gsplat;
        // 激进剔除背后的点
        config.lodBehindPenalty = 100; 
        config.lodUnderfillLimit = 32; 
        
        if (platform.mobile) {
            config.radialSorting = false; 
            config.vertexSnap = false;    
        } else {
            config.radialSorting = true; 
        }
    }

    _onLoadNewScene(data) {
        // 1. 立即卸载当前场景，断开所有 WebGL 资源的引用
        this._unloadCurrentSplats();

        // 2. 嗅探是否为移动端 (重点针对 iOS)
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
            console.log("StreamedGsplat: 📱 触发移动端内存冷却期 (GC Delay)... 等待底层显存释放");
            
            // 3. 强制延迟 1500 毫秒 (1.5秒)
            // 这 1.5 秒完美隐藏在 UI 的黑屏过渡动画中，专门留给 iOS 强制进行垃圾回收
            setTimeout(() => {
                console.log("StreamedGsplat: 🟢 内存冷却完毕，开始请求新场景数据");
                this._loadSplats(data.splatUrl, data.environmentUrl);
            }, 1500); 
            
        } else {
            // PC 端内存充裕，跳过冷却期，直接无缝加载新场景
            this._loadSplats(data.splatUrl, data.environmentUrl);
        }
    }

    _loadSplats(splatUrl, envUrl) {
        if (!splatUrl) return;
        const app = this.app;
        
        const mainAsset = new Asset('MainGsplat', 'gsplat', { url: splatUrl });
        app.assets.add(mainAsset);
        app.assets.load(mainAsset);
        this._assets.push(mainAsset);

        mainAsset.ready((a) => {
            if (this.entity.gsplat) this.entity.removeComponent('gsplat');
            this.entity.addComponent('gsplat', { enabled: false });
            
            const component = this.entity.gsplat;
            component.unified = true; 
            component.lodDistances = this._getPlatformSettings()[this._currentPreset].dist;
            component.asset = a;
            component.enabled = true;
            
            this._applyPreset(); 
        });

        if (envUrl) {
            const envAsset = new Asset('EnvGsplat', 'gsplat', { url: envUrl });
            app.assets.add(envAsset);
            app.assets.load(envAsset);
            this._assets.push(envAsset);

            envAsset.ready((a) => {
                const child = new Entity('EnvSplat');
                this.entity.addChild(child);
                this._children.push(child);
                
                child.addComponent('gsplat', { enabled: false });
                child.gsplat.unified = true;
                child.gsplat.lodDistances = this._getPlatformSettings()[this._currentPreset].dist;
                child.gsplat.asset = a;
                child.gsplat.enabled = true;
                this._applyPreset();
            });
        }
    }

    _unloadCurrentSplats() {
        if (this.entity.gsplat) this.entity.gsplat.asset = null;
        this._children.forEach(c => c.destroy());
        this._children = [];
        this._assets.forEach(a => { a.unload(); this.app.assets.remove(a); });
        this._assets = [];
    }

    _getPlatformSettings() {
        if (platform.mobile) {
            return {
                ultra: { dist: this.mobileUltraLodDistances, range: this.mobileRangeUltra },
                high:  { dist: this.mobileHighLodDistances,  range: this.mobileRangeHigh },
                medium:{ dist: this.mobileMediumLodDistances,range: this.mobileRangeMedium },
                low:   { dist: this.mobileLowLodDistances,   range: this.mobileRangeLow }
            };
        } else {
            return {
                ultra: { dist: this.pcUltraLodDistances, distRange: this.pcRangeUltra },
                high:  { dist: this.pcHighLodDistances,  distRange: this.pcRangeHigh },
                medium:{ dist: this.pcMediumLodDistances,distRange: this.pcRangeMedium },
                low:   { dist: this.pcLowLodDistances,   distRange: this.pcRangeLow }
            };
        }
    }

    _applyPreset() {
        const settings = this._getPlatformSettings()[this._currentPreset];
        if (!settings) return;
        const app = this.app;
        
        let targetRange, targetDist;
        if (platform.mobile) {
             switch(this._currentPreset) {
                 case 'ultra': targetRange = this.mobileRangeUltra; targetDist = this.mobileUltraLodDistances; break;
                 case 'high':  targetRange = this.mobileRangeHigh;  targetDist = this.mobileHighLodDistances; break;
                 case 'medium':targetRange = this.mobileRangeMedium;targetDist = this.mobileMediumLodDistances; break;
                 case 'low':   targetRange = this.mobileRangeLow;   targetDist = this.mobileLowLodDistances; break;
             }
        } else {
             switch(this._currentPreset) {
                 case 'ultra': targetRange = this.pcRangeUltra; targetDist = this.pcUltraLodDistances; break;
                 case 'high':  targetRange = this.pcRangeHigh;  targetDist = this.pcHighLodDistances; break;
                 case 'medium':targetRange = this.pcRangeMedium;targetDist = this.pcMediumLodDistances; break;
                 case 'low':   targetRange = this.pcRangeLow;   targetDist = this.pcLowLodDistances; break;
             }
        }

        if (targetRange) {
            app.scene.gsplat.lodRangeMin = targetRange[0];
            app.scene.gsplat.lodRangeMax = targetRange[1];
        }

        if (this.entity.gsplat) this.entity.gsplat.lodDistances = targetDist;
        this._children.forEach(c => {
            if (c.gsplat) c.gsplat.lodDistances = targetDist;
        });
        
        // DPR 由 _updateDynamicDPR 接管
    }

    _setPreset(presetName, internal = false) {
        this._currentPreset = presetName;
        this._applyPreset();
        if (!internal) this.app.fire('ui:setPreset', presetName);
    }

    // 留空，由 update 动态接管
    _applyResolution() {} 

    _onWindowResize = () => {}

    _toggleColorize() {
        this._colorize = !this._colorize;
        this.app.scene.gsplat.colorizeLod = this._colorize;
    }

    onDestroy() {
        window.removeEventListener('resize', this._onWindowResize);
        this.app.off('preset:ultra');
        this.app.off('preset:high');
        this.app.off('preset:medium');
        this.app.off('preset:low');
        this.app.off('colorize:toggle');
        this.app.off('scene:load', this._onLoadNewScene, this);
        this._unloadCurrentSplats();
    }
}

export { StreamedGsplat };