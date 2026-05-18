var { math, Vec2, Vec3, Mat4 } = pc;

const LOOK_MAX_ANGLE = 90;

// 【修改】FOV 限制范围扩大
const MIN_FOV = 10;  // 放大最大值 (看得更细)
const MAX_FOV = 120; // 缩小最大值 (超广角)

const tmpVa = new Vec2();
const tmpV1 = new Vec3();
const tmpV2 = new Vec3();
const tmpM1 = new Mat4();
// 【新增】用于计算反重力的临时向量
const tmpGravity = new Vec3();

class CharacterController {
    /** @type {Entity} */
    _camera;
    /** @type {RigidBodyComponent} */
    _rigidbody;
    _jumping = false;
    _isFlying = false;
    _isStatic = false; // 静止模式

    app;
    entity;
    look = new Vec2(0, 132.5);

    // 缩放相关变量
    targetFov = 60; // 默认 FOV
    lastTouchDist = 0; // 上一次双指距离

    controls = {
        forward: 0, backward: 0, left: 0, right: 0, jump: false, sprint: false
    };

    lookSens = 0.08;
    speedGround = 50;
    speedAir = 5;
    speedFly = 100;
    sprintMult = 1.5;
    velocityDampingGround = 0.99;
    velocityDampingAir = 0.99925;
    jumpForce = 600;

    constructor(app, camera, entity) {
        this.app = app;
        this.entity = entity;

        if (!camera) throw new Error('No camera entity found');
        this._camera = camera;
        
        // 初始化目标 FOV 为当前摄像机 FOV
        if (this._camera.camera) {
            this.targetFov = this._camera.camera.fov;
        }

        if (!entity.rigidbody) throw new Error('No rigidbody component found');
        this._rigidbody = entity.rigidbody;
        
        this._initInputListeners();
    }

    _initInputListeners() {
        // 1. 移动与视角监听
        this.app.on('cc:look', (movX, movY) => {
            let sensX = this.lookSens;
            let sensY = this.lookSens;

            // 移动端动态灵敏度
            if (pc.platform.mobile) {
                const mag = Math.sqrt(movX*movX + movY*movY);
                const baseBoost = 5.0; 
                const damping = 0.04; 
                const dynamicFactor = baseBoost / (1.0 + mag * damping);
                sensX *= dynamicFactor;
                sensY *= dynamicFactor;
            }

            this.look.x = math.clamp(this.look.x - movY * sensY, -LOOK_MAX_ANGLE, LOOK_MAX_ANGLE);
            this.look.y -= movX * sensX;
        });

        this.app.on('cc:move:forward', (val) => { this.controls.forward = val; });
        this.app.on('cc:move:backward', (val) => { this.controls.backward = val; });
        this.app.on('cc:move:left', (val) => { this.controls.left = val; });
        this.app.on('cc:move:right', (val) => { this.controls.right = val; });
        this.app.on('cc:jump', (state) => { this.controls.jump = state; });
        this.app.on('cc:sprint', (state) => { this.controls.sprint = state; });

        // 2. 鼠标滚轮缩放
        if (this.app.mouse) {
            this.app.mouse.on('mousewheel', this._onMouseWheel, this);
        }

        // 3. 触摸手势缩放
        if (this.app.touch) {
            this.app.touch.on('touchstart', this._onTouchStart, this);
            this.app.touch.on('touchmove', this._onTouchMove, this);
        }
    }

    _onMouseWheel(event) {
        if (!this._isStatic) return;
        const zoomSpeed = 0.25; 
        this.targetFov -= event.wheelDelta * zoomSpeed;
        this.targetFov = math.clamp(this.targetFov, MIN_FOV, MAX_FOV);
        if(event.event) event.event.preventDefault();
    }

    _onTouchStart(event) {
        if (!this._isStatic) return;
        if (event.touches.length === 2) {
            const t1 = event.touches[0];
            const t2 = event.touches[1];
            const dx = t1.x - t2.x;
            const dy = t1.y - t2.y;
            this.lastTouchDist = Math.sqrt(dx*dx + dy*dy);
        }
    }

    _onTouchMove(event) {
        if (!this._isStatic) return;
        if (event.touches.length === 2) {
            const t1 = event.touches[0];
            const t2 = event.touches[1];
            const dx = t1.x - t2.x;
            const dy = t1.y - t2.y;
            const currentDist = Math.sqrt(dx*dx + dy*dy);

            if (this.lastTouchDist > 0) {
                const diff = currentDist - this.lastTouchDist;
                const touchZoomSpeed = 0.6; 
                this.targetFov -= diff * touchZoomSpeed;
                this.targetFov = math.clamp(this.targetFov, MIN_FOV, MAX_FOV);
            }
            this.lastTouchDist = currentDist;
            if(event.event) event.event.preventDefault();
        }
    }

    setFlyMode(state) {
        this._isFlying = state;
        if (this._rigidbody) {
            this._rigidbody.linearVelocity = Vec3.ZERO;
            this._rigidbody.angularVelocity = Vec3.ZERO;
            this._rigidbody.activate();
        }
    }

    setStaticMode(state) {
        this._isStatic = state;
        if (this._rigidbody) {
            if (state) {
                this._rigidbody.type = pc.BODYTYPE_KINEMATIC;
                this._rigidbody.linearVelocity = Vec3.ZERO;
                this._rigidbody.angularVelocity = Vec3.ZERO;
                this.targetFov = 60; 
            } else {
                this._rigidbody.type = pc.BODYTYPE_DYNAMIC;
            }
            this._rigidbody.activate();
        }
    }

    _checkIfGrounded() {
        if (this._isFlying || this._isStatic) {
            this._grounded = false;
            return;
        }
        const start = this.entity.getPosition();
        const end = tmpV1.copy(start).add(Vec3.DOWN);
        end.y -= 0.1;
        this._grounded = !!this._rigidbody.system.raycastFirst(start, end);
    }

    _jump() {
        if (this._isFlying || this._isStatic) return; 
        if (this.controls.jump && !this._jumping && this._grounded) {
            this._jumping = true;
            setTimeout(() => this._jumping = false, 50);
            this._rigidbody.applyImpulse(0, this.jumpForce, 0);
        }
    }

    _look() {
        this._camera.setLocalEulerAngles(this.look.x, this.look.y, 0);
    }

    _updateFov(dt) {
        if (this._camera.camera) {
            const current = this._camera.camera.fov;
            if (Math.abs(current - this.targetFov) > 0.1) {
                const newFov = math.lerp(current, this.targetFov, dt * 10); 
                this._camera.camera.fov = newFov;
            }
        }
    }

    _move(dt) {
        if (this._isStatic) return;

        const forward = this._camera.forward;
        const right = this._camera.right;
        const dir = tmpV1.set(0, 0, 0);

        if (this._isFlying) {
            // 飞行模式：保留垂直分量
            const flyForward = this._camera.forward; 
            const flyRight = this._camera.right;

            if (this.controls.forward) dir.add(tmpV2.copy(flyForward).mulScalar(this.controls.forward));
            if (this.controls.backward) dir.add(tmpV2.copy(flyForward).mulScalar(-this.controls.backward));
            if (this.controls.left) dir.add(tmpV2.copy(flyRight).mulScalar(-this.controls.left));
            if (this.controls.right) dir.add(tmpV2.copy(flyRight).mulScalar(this.controls.right));
            if (this.controls.jump) dir.add(Vec3.UP);
            
            if (dir.length() > 0) dir.normalize();

            let speed = this.speedFly;
            if (this.controls.sprint) speed *= this.sprintMult;

            const velocity = dir.mulScalar(speed);
            this._rigidbody.linearVelocity = velocity;
            this._rigidbody.angularVelocity = Vec3.ZERO;

            // ============================================================
            // 【核心修复】施加反重力，防止自然下坠 (Anti-Gravity)
            // ============================================================
            // 每一帧都给物体施加一个向上的力，大小等于 重力 * 质量
            // 这样就能抵消物理引擎自带的重力，实现完美悬停
            const gravity = this.app.systems.rigidbody.gravity;
            if (gravity) {
                const mass = this._rigidbody.mass;
                // Force = -Gravity * Mass
                tmpGravity.copy(gravity).mulScalar(-mass);
                this._rigidbody.applyForce(tmpGravity);
            }
        } 
        else {
            // 行走模式：使用压平后的 forward 和 right
            if (this.controls.forward) dir.add(tmpV2.copy(forward).mulScalar(this.controls.forward));
            if (this.controls.backward) dir.add(tmpV2.copy(forward).mulScalar(-this.controls.backward));
            if (this.controls.left) dir.add(tmpV2.copy(right).mulScalar(-this.controls.left));
            if (this.controls.right) dir.add(tmpV2.copy(right).mulScalar(this.controls.right));
            
            dir.y = 0;
            dir.normalize();
        
            let speed = this._grounded ? this.speedGround : this.speedAir;
            if (this.controls.sprint) speed *= this.sprintMult;
        
            const accel = dir.mulScalar(speed * dt);
            const velocity = this._rigidbody.linearVelocity.add(accel);
        
            const damping = this._grounded ? this.velocityDampingGround : this.velocityDampingAir;
            const mult = Math.pow(damping, dt * 1e3);
            velocity.x *= mult;
            velocity.z *= mult;
        
            this._rigidbody.linearVelocity = velocity;
        }
    }

    update(dt) {
        this._checkIfGrounded();
        this._jump();
        this._look();
        this._move(dt);
        this._updateFov(dt);
    }

    destroy() {
        if (this.app.mouse) this.app.mouse.off('mousewheel', this._onMouseWheel, this);
        if (this.app.touch) {
            this.app.touch.off('touchstart', this._onTouchStart, this);
            this.app.touch.off('touchmove', this._onTouchMove, this);
            this.app.touch.off('touchend', this._onTouchEnd, this);
            this.app.touch.off('touchcancel', this._onTouchEnd, this);
        }
        // 清理自定义事件
        this.app.off('cc:look');
        this.app.off('cc:move:forward');
        this.app.off('cc:move:backward');
        this.app.off('cc:move:left');
        this.app.off('cc:move:right');
        this.app.off('cc:jump');
        this.app.off('cc:sprint');
    }
}

// SCRIPTS
const CCScript = pc.createScript('character-controller');

CCScript.attributes.add('camera', { type: 'entity' });
CCScript.attributes.add('lookSens', { type: 'number', default: 0.08 });
CCScript.attributes.add('speedGround', { type: 'number', default: 50 });
CCScript.attributes.add('speedAir', { type: 'number', default: 5 });
CCScript.attributes.add('speedFly', { type: 'number', default: 100, title: 'Fly Speed (Scene0)' }); 
CCScript.attributes.add('sprintMult', { type: 'number', default: 1.5 });
CCScript.attributes.add('velocityDampingGround', { type: 'number', default: 0.99 });
CCScript.attributes.add('velocityDampingAir', { type: 'number', default: 0.99925 });
CCScript.attributes.add('jumpForce', { type: 'number', default: 600 });

CCScript.prototype.initialize = function () {
    this.controller = new CharacterController(this.app, this.camera, this.entity);
    this.controller.lookSens = this.lookSens;
    this.controller.speedGround = this.speedGround;
    this.controller.speedAir = this.speedAir;
    this.controller.speedFly = this.speedFly;
    this.controller.sprintMult = this.sprintMult;
    this.controller.velocityDampingGround = this.velocityDampingGround;
    this.controller.velocityDampingAir = this.velocityDampingAir;
    this.controller.jumpForce = this.jumpForce;

    this.app.on('scene:load', this.onSceneLoad, this);

    this.on('destroy', () => {
        this.app.off('scene:load', this.onSceneLoad, this);
        this.controller.destroy();
    });
};

CCScript.prototype.update = function (dt) {
    this.controller.update(dt);
};

CCScript.prototype.onSceneLoad = function(data) {
    if (!this.controller) return;

    const x = (data && data.initPos) ? data.initPos[0] : 0;
    const y = (data && data.initPos) ? data.initPos[1] : 2;
    const z = (data && data.initPos) ? data.initPos[2] : 0;
    const targetPos = new pc.Vec3(x, y, z);

    if (this.entity.rigidbody) {
        this.entity.rigidbody.teleport(targetPos, pc.Vec3.ZERO);
        this.entity.rigidbody.linearVelocity = pc.Vec3.ZERO;
        this.entity.rigidbody.angularVelocity = pc.Vec3.ZERO;
    } else {
        this.entity.setPosition(targetPos);
    }

    if (data.type === 'panorama') {
        this.controller.setStaticMode(true);
        this.controller.setFlyMode(false);
    } else {
        this.controller.setStaticMode(false);
        const isScene0 = (data.id === '-0') || (data.id && data.id.includes('-0')) || (data.splatUrl && data.splatUrl.includes('sjtuout'));
        if (isScene0) {
            this.controller.setFlyMode(true);
        } else {
            this.controller.setFlyMode(false);
        }
    }

    if (data && data.initRot && data.initRot.length === 3) {
        const pitch = data.initRot[0]; 
        const yaw = data.initRot[1];   
        this.controller.look.set(pitch, yaw);
        this.controller._look();
    } 
    else if (data && data.initTarget && data.initTarget.length === 3) {
        const target = new pc.Vec3(data.initTarget[0], data.initTarget[1], data.initTarget[2]);
        const direction = new pc.Vec3().sub2(target, targetPos).normalize();
        
        const yaw = Math.atan2(-direction.x, -direction.z) * pc.math.RAD_TO_DEG;
        const pitch = Math.asin(direction.y) * pc.math.RAD_TO_DEG;
        
        this.controller.look.set(pitch, yaw);
        this.controller._look();
    }
};