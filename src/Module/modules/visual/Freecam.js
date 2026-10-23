import hooks from "../../../hooks";
import Module from "../../Module";

export default class Freecam extends Module {
    constructor() {
        super("Freecam", "Visual", "Free camera movement");

        this.speed = 7.0;
        this.sensitivity = 1.0;
        this.fastMultiplier = 3.0;

        this.keys = Object.create(null);
        this.freePosition = { x: 0, y: 0, z: 0 };
        this.yaw = 0;
        this.pitch = 0;
        this.lastFrame = performance.now();

        this.originalParent = null;
        this.originalIndex = -1;
        this.originalPosition = null;
        this.originalRotation = null;
        this.originalQuaternion = null;
        this.savedPerspective = null;

        this._matrixHook = null;
        this._worldMatrixHook = null;

        this._onKeyDown = this.onKeyDown.bind(this);
        this._onKeyUp = this.onKeyUp.bind(this);
        this._onMouseMove = this.onMouseMove.bind(this);
        this._loop = this.loop.bind(this);
        this.animFrameId = null;
    }

    onEnable() {
        const game = hooks.game;
        const player = game?.player;
        const camera = this.resolveCamera();

        if (!player || !camera) {
            console.warn("[Freecam] player/camera not found");
            this.toggle();
            return;
        }

        this.camera = camera;
        this.player = player;

        // 1. сохраняем оригинальное состояние
        this.originalParent = camera.parent || null;
        this.originalIndex = Array.isArray(this.originalParent?.children)
            ? this.originalParent.children.indexOf(camera) : -1;
        this.originalPosition = this.cloneXYZ(camera.position);
        this.originalRotation = this.cloneRotation(camera.rotation);
        this.originalQuaternion = this.cloneQuaternion(camera.quaternion);

        // 2. capture world pose ДО detach
        const worldPos = this.captureWorldPosition(camera);
        const worldQuat = this.captureWorldQuaternion(camera);

        const origin = this.getPlayerCameraOrigin(player) || worldPos || { x: 0, y: 0, z: 0 };
        this.freePosition = { x: origin.x, y: origin.y, z: origin.z };

        if (worldQuat) {
            const e = this.quaternionToEulerYXZ(worldQuat);
            this.pitch = this.clamp(e.x, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
            this.yaw = e.y;
        } else {
            this.pitch = this.clamp(Number(camera.rotation?.x) || 0, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
            this.yaw = Number(camera.rotation?.y) || 0;
        }

        // 3. force 3rd person (тело игрока должно рендериться)
        this.forceThirdPerson(player);

        // 4. detach камеры в сцену
        this.detachCamera(camera);

        // 5. хуки на updateMatrixWorld — иначе игра перезатирает позу
        this.installCameraHooks(camera);

        this.clearKeys();
        this.releaseGameMovementKeys();
        this.neutralizePlayerInput();
        this.applyPose();
        this.lastFrame = performance.now();

        window.addEventListener('keydown', this._onKeyDown, true);
        window.addEventListener('keyup', this._onKeyUp, true);
        window.addEventListener('mousemove', this._onMouseMove, true);

        this.animFrameId = requestAnimationFrame(this._loop);
    }

    onDisable() {
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }

        window.removeEventListener('keydown', this._onKeyDown, true);
        window.removeEventListener('keyup', this._onKeyUp, true);
        window.removeEventListener('mousemove', this._onMouseMove, true);

        this.uninstallCameraHooks();

        if (this.camera) {
            if (this.originalParent && this.camera.parent !== this.originalParent) {
                this.restoreCameraParent(this.camera);
            }
            if (this.originalPosition) this.copyXYZ(this.camera.position, this.originalPosition);
            if (this.originalQuaternion) this.copyQuaternion(this.camera.quaternion, this.originalQuaternion);
            if (this.originalRotation) this.copyRotation(this.camera.rotation, this.originalRotation);

            try { this.camera.updateMatrixWorld?.(true); } catch (_) {}
        }

        this.restorePerspective(this.player);

        this.clearKeys();
        this.camera = null;
        this.player = null;
        this._matrixHook = null;
        this._worldMatrixHook = null;
        this.originalParent = null;
        this.originalIndex = -1;
        this.originalPosition = null;
        this.originalRotation = null;
        this.originalQuaternion = null;
    }

    loop() {
        if (!this.state) return;

        const now = performance.now();
        const dt = this.clamp((now - this.lastFrame) / 1000, 0, 0.05);
        this.lastFrame = now;

        if (this.camera && document.pointerLockElement && !this.isTypingOrUiOpen()) {
            let forward = 0, strafe = 0, vertical = 0;

            if (this.keys.KeyW) forward += 1;
            if (this.keys.KeyS) forward -= 1;
            if (this.keys.KeyD) strafe += 1;
            if (this.keys.KeyA) strafe -= 1;
            if (this.keys.Space) vertical += 1;
            if (this.keys.ShiftLeft || this.keys.ShiftRight) vertical -= 1;

            const len = Math.hypot(forward, strafe);
            if (len > 1) { forward /= len; strafe /= len; }

            const boost = (this.keys.ControlLeft || this.keys.ControlRight) ? this.fastMultiplier : 1;
            const dist = this.speed * boost * dt;

            const sinYaw = Math.sin(this.yaw);
            const cosYaw = Math.cos(this.yaw);

            this.freePosition.x += (-sinYaw * forward + cosYaw * strafe) * dist;
            this.freePosition.z += (-cosYaw * forward - sinYaw * strafe) * dist;
            this.freePosition.y += vertical * dist;

            this.applyPose();
        }

        this.neutralizePlayerInput();
        this.animFrameId = requestAnimationFrame(this._loop);
    }

    // === CORE: применяет мировую позу в локальном пространстве родителя ===
    applyPose() {
        const camera = this.camera;
        if (!camera || !this.freePosition) return;

        const parent = camera.parent || null;
        let x = this.freePosition.x;
        let y = this.freePosition.y;
        let z = this.freePosition.z;

        try {
            if (parent && typeof parent.updateWorldMatrix === 'function') {
                parent.updateWorldMatrix(true, false);
            }
            if (parent && typeof parent.worldToLocal === 'function' && camera.position?.clone) {
                const local = camera.position.clone();
                if (typeof local.set === 'function') local.set(x, y, z);
                else { local.x = x; local.y = y; local.z = z; }
                parent.worldToLocal(local);
                if (Number.isFinite(local.x) && Number.isFinite(local.y) && Number.isFinite(local.z)) {
                    x = local.x; y = local.y; z = local.z;
                }
            }
        } catch (_) {}

        if (camera.position) {
            if (typeof camera.position.set === 'function') camera.position.set(x, y, z);
            else { camera.position.x = x; camera.position.y = y; camera.position.z = z; }
        }

        try {
            if (camera.quaternion && camera.rotation) {
                const Quat = camera.quaternion.constructor;
                const Euler = camera.rotation.constructor;
                const worldQuat = new Quat().setFromEuler(new Euler(this.pitch, this.yaw, 0, 'YXZ'));

                const parentQuat = new Quat();
                if (parent && typeof parent.getWorldQuaternion === 'function') {
                    parent.getWorldQuaternion(parentQuat);
                    parentQuat.invert();
                    worldQuat.premultiply(parentQuat);
                }

                if (typeof camera.quaternion.copy === 'function') camera.quaternion.copy(worldQuat);
                else this.copyQuaternion(camera.quaternion, worldQuat);

                if (typeof camera.rotation.setFromQuaternion === 'function') {
                    camera.rotation.setFromQuaternion(camera.quaternion, 'YXZ');
                }
                if ('order' in camera.rotation) camera.rotation.order = 'YXZ';
            } else if (camera.rotation) {
                if (typeof camera.rotation.set === 'function') camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
                else {
                    camera.rotation.x = this.pitch;
                    camera.rotation.y = this.yaw;
                    camera.rotation.z = 0;
                }
            }
        } catch (_) {}
        // NB: НЕ вызываем updateMatrixWorld здесь — иначе рекурсия через хук
    }

    installCameraHooks(camera) {
        if (!camera) return;
        const self = this;

        if (typeof camera.updateMatrixWorld === 'function') {
            const original = camera.updateMatrixWorld;
            const hook = function (...args) {
                if (self.state && self.camera === camera) self.applyPose();
                return original.apply(this, args);
            };
            try {
                camera.updateMatrixWorld = hook;
                this._matrixHook = { camera, original, hook };
            } catch (_) {}
        }

        if (typeof camera.updateWorldMatrix === 'function') {
            const original = camera.updateWorldMatrix;
            const hook = function (...args) {
                if (self.state && self.camera === camera) self.applyPose();
                return original.apply(this, args);
            };
            try {
                camera.updateWorldMatrix = hook;
                this._worldMatrixHook = { camera, original, hook };
            } catch (_) {}
        }
    }

    uninstallCameraHooks() {
        if (this._matrixHook) {
            try { this._matrixHook.camera.updateMatrixWorld = this._matrixHook.original; } catch (_) {}
            this._matrixHook = null;
        }
        if (this._worldMatrixHook) {
            try { this._worldMatrixHook.camera.updateWorldMatrix = this._worldMatrixHook.original; } catch (_) {}
            this._worldMatrixHook = null;
        }
    }

    resolveCamera() {
        const game = hooks.game;
        return game?.gameScene?.camera ||
               game?.player?.game?.gameScene?.camera ||
               game?.scene?.camera ||
               game?.camera || null;
    }

    detachCamera(camera) {
        const parent = camera?.parent;
        if (!parent) return;

        let scene = camera;
        for (let i = 0; scene && i < 12; i++, scene = scene.parent) {
            if (scene.isScene === true) break;
        }

        if (scene && scene !== parent && typeof scene.add === 'function') {
            try {
                camera.updateMatrixWorld?.(true);
                if (typeof scene.attach === 'function') scene.attach(camera);
                else { parent.remove?.(camera); scene.add(camera); }
            } catch (_) {}
        }
    }

    restoreCameraParent(camera) {
        if (!this.originalParent) return;
        try {
            this.originalParent.add(camera);
            if (this.originalIndex >= 0 && Array.isArray(this.originalParent.children)) {
                const idx = this.originalParent.children.indexOf(camera);
                if (idx !== -1 && this.originalIndex < this.originalParent.children.length - 1) {
                    this.originalParent.children.splice(idx, 1);
                    this.originalParent.children.splice(this.originalIndex, 0, camera);
                }
            }
        } catch (_) {}
    }

    forceThirdPerson(player) {
        this.savedPerspective = null;
        if (!player || !Number.isFinite(Number(player.perspective))) return;
        this.savedPerspective = Number(player.perspective);
        if (this.savedPerspective === 0) {
            try {
                player.perspective = 1;
                if (typeof player.toggleCameraPerspective === 'function') player.toggleCameraPerspective();
            } catch (_) {}
        }
    }

    restorePerspective(player) {
        if (!player || this.savedPerspective === null) { this.savedPerspective = null; return; }
        try {
            if (Number(player.perspective) !== this.savedPerspective) {
                player.perspective = this.savedPerspective;
                if (typeof player.toggleCameraPerspective === 'function') player.toggleCameraPerspective();
            }
        } catch (_) {}
        this.savedPerspective = null;
    }

    releaseGameMovementKeys() {
        const defs = {
            KeyW: ['w', 87], KeyA: ['a', 65], KeyS: ['s', 83], KeyD: ['d', 68],
            Space: [' ', 32], ShiftLeft: ['Shift', 16], ShiftRight: ['Shift', 16],
            ControlLeft: ['Control', 17], ControlRight: ['Control', 17]
        };
        for (const [code, [key, keyCode]] of Object.entries(defs)) {
            try {
                window.dispatchEvent(new KeyboardEvent('keyup', {
                    code, key, keyCode, which: keyCode, bubbles: true, cancelable: true
                }));
            } catch (_) {}
        }
    }

    onKeyDown(event) {
        if (!this.state || this.isTypingOrUiOpen()) return;
        const movement = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight'];
        if (movement.includes(event.code)) {
            this.keys[event.code] = true;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
        }
    }

    onKeyUp(event) {
        if (event.code in this.keys) this.keys[event.code] = false;
    }

    onMouseMove(event) {
        if (!this.state || !document.pointerLockElement || this.isTypingOrUiOpen()) return;
        const sens = 0.0022 * this.clamp(this.sensitivity, 0.1, 3);
        this.yaw -= Number(event.movementX || 0) * sens;
        this.pitch -= Number(event.movementY || 0) * sens;
        this.pitch = this.clamp(this.pitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
        event.preventDefault();
        event.stopPropagation();
    }

    neutralizePlayerInput() {
        const player = this.player || hooks.game?.player;
        if (!player) return;
        try { if ('wWQmwuDLqA' in player) player.wWQmwuDLqA = 0; } catch (_) {}
        try { if ('YApHmhhGagG' in player) player.YApHmhhGagG = 0; } catch (_) {}
        try { if ('jumping' in player) player.jumping = false; } catch (_) {}
        try { if ('sneak' in player) player.sneak = false; } catch (_) {}
    }

    isTypingOrUiOpen() {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return true;
        const chat = hooks.game?.chat;
        return !!(chat?.showInput || chat?.inputOpen || chat?.isInputOpen);
    }

    getPlayerCameraOrigin(player) {
        const pos = player?.pos || player?.position;
        if (!pos) return null;
        let eye = typeof player?.getEyeHeight === 'function' ? Number(player.getEyeHeight()) : Number(player?.eyeHeight);
        if (!Number.isFinite(eye)) eye = 1.62;
        return { x: Number(pos.x), y: Number(pos.y) + eye, z: Number(pos.z) };
    }

    captureWorldPosition(camera) {
        try {
            if (typeof camera.getWorldPosition === 'function' && camera.position?.clone) {
                const out = camera.position.clone();
                camera.getWorldPosition(out);
                return this.cloneXYZ(out);
            }
        } catch (_) {}
        return this.cloneXYZ(camera?.position);
    }

    captureWorldQuaternion(camera) {
        try {
            if (typeof camera.getWorldQuaternion === 'function' && camera.quaternion?.clone) {
                const out = camera.quaternion.clone();
                camera.getWorldQuaternion(out);
                return this.cloneQuaternion(out);
            }
        } catch (_) {}
        return this.cloneQuaternion(camera?.quaternion);
    }

    quaternionToEulerYXZ(q) {
        try {
            const camera = this.camera;
            const Euler = camera?.rotation?.constructor;
            if (Euler && Euler.prototype?.setFromQuaternion) {
                const e = new Euler().setFromQuaternion({ x: q.x, y: q.y, z: q.z, w: q.w }, 'YXZ');
                return { x: Number(e.x) || 0, y: Number(e.y) || 0, z: Number(e.z) || 0 };
            }
        } catch (_) {}
        return { x: 0, y: 0, z: 0 };
    }

    clearKeys() { this.keys = Object.create(null); }
    clamp(v, min, max) { return Math.min(max, Math.max(min, Number(v) || 0)); }
    cloneXYZ(v) { return v ? { x: Number(v.x), y: Number(v.y), z: Number(v.z) } : null; }
    copyXYZ(t, s) { if (t && s) { t.x = s.x; t.y = s.y; t.z = s.z; } }
    cloneRotation(v) { return v ? { x: Number(v.x), y: Number(v.y), z: Number(v.z), order: v.order || 'YXZ' } : null; }
    copyRotation(t, s) { if (t && s) { t.x = s.x; t.y = s.y; t.z = s.z; if ('order' in t) t.order = s.order || 'YXZ'; } }
    cloneQuaternion(v) { return v ? { x: Number(v.x), y: Number(v.y), z: Number(v.z), w: Number(v.w) } : null; }
    copyQuaternion(t, s) { if (t && s) { t.x = s.x; t.y = s.y; t.z = s.z; t.w = s.w; } }
}
