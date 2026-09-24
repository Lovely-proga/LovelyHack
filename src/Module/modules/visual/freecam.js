import hooks from "../../../hooks";
import Module from "../../Module";

export default class Freecam extends Module {
    constructor() {
        super("Freecam", "Visual", "Free camera movement");
        
        // Настройки по умолчанию
        this.speed = 7.0;
        this.sensitivity = 1.0;
        this.fastMultiplier = 3.0;

        // Внутреннее состояние
        this.keys = Object.create(null);
        this.freePosition = null;
        this.yaw = 0;
        this.pitch = 0;
        this.lastFrame = performance.now();
        
        this.originalParent = null;
        this.originalIndex = -1;
        this.originalPosition = null;
        this.originalRotation = null;
        this.originalQuaternion = null;
        this.savedPerspective = null;
        
        // Привязываем контекст для обработчиков событий
        this._onKeyDown = this.onKeyDown.bind(this);
        this._onKeyUp = this.onKeyUp.bind(this);
        this._onMouseMove = this.onMouseMove.bind(this);
        this._onLoop = this.loop.bind(this);
        this.animFrameId = null;
    }

    onEnable() {
        const game = hooks.game;
        const player = game?.player;
        const camera = this.resolveCamera();

        if (!player || !camera) {
            this.toggle(); // Если нет игрока или камеры, отключаем
            return;
        }

        this.camera = camera;
        this.player = player;

        // Сохраняем исходное состояние камеры
        this.originalParent = camera.parent || null;
        this.originalIndex = Array.isArray(camera.parent?.children) ? camera.parent.children.indexOf(camera) : -1;
        this.originalPosition = this.cloneXYZ(camera.position);
        this.originalRotation = this.cloneRotation(camera.rotation);
        this.originalQuaternion = this.cloneQuaternion(camera.quaternion);

        // Переключаем в 3rd-person perspective при необходимости
        if (Number.isFinite(Number(player.perspective))) {
            this.savedPerspective = Number(player.perspective);
            if (this.savedPerspective === 0) {
                player.perspective = 1;
                if (typeof player.toggleCameraPerspective === 'function') {
                    player.toggleCameraPerspective();
                }
            }
        }

        // Отсоединяем камеру от игрока и прикрепляем к сцене
        this.detachCamera(camera);

        // Устанавливаем стартовую позицию и повороты
        this.freePosition = this.getPlayerCameraOrigin(player) || this.cloneXYZ(camera.position);
        this.pitch = this.clamp(camera.rotation?.x || player.pitch || 0, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
        this.yaw = camera.rotation?.y || player.yaw || 0;

        this.clearKeys();
        this.lastFrame = performance.now();

        // Навешиваем слушатели событий ввода
        window.addEventListener('keydown', this._onKeyDown, true);
        window.addEventListener('keyup', this._onKeyUp, true);
        window.addEventListener('mousemove', this._onMouseMove, true);

        // Запускаем игровой цикл обновления
        this.loop();
    }

    onDisable() {
        // Останавливаем цикл
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }

        // Снимаем слушатели
        window.removeEventListener('keydown', this._onKeyDown, true);
        window.removeEventListener('keyup', this._onKeyUp, true);
        window.removeEventListener('mousemove', this._onMouseMove, true);

        // Восстанавливаем позицию и иерархию камеры
        if (this.camera) {
            if (this.originalParent && this.camera.parent !== this.originalParent) {
                this.restoreCameraParent(this.camera);
            }
            if (this.originalPosition) this.copyXYZ(this.camera.position, this.originalPosition);
            if (this.originalQuaternion) this.copyQuaternion(this.camera.quaternion, this.originalQuaternion);
            if (this.originalRotation) this.copyRotation(this.camera.rotation, this.originalRotation);
            try { this.camera.updateMatrixWorld?.(true); } catch (_) {}
        }

        // Восстанавливаем перспективу игрока
        if (this.player && this.savedPerspective !== null) {
            if (Number(this.player.perspective) !== this.savedPerspective) {
                this.player.perspective = this.savedPerspective;
                if (typeof this.player.toggleCameraPerspective === 'function') {
                    this.player.toggleCameraPerspective();
                }
            }
        }

        this.clearKeys();
        this.freePosition = null;
        this.camera = null;
        this.player = null;
    }

    loop() {
        if (!this.isEnabled) return;

        const now = performance.now();
        const dt = this.clamp((now - this.lastFrame) / 1000, 0, 0.05);
        this.lastFrame = now;

        if (this.camera && this.freePosition && document.pointerLockElement && !this.isTypingOrUiOpen()) {
            let forward = 0;
            let strafe = 0;
            let vertical = 0;

            if (this.keys.KeyW) forward += 1;
            if (this.keys.KeyS) forward -= 1;
            if (this.keys.KeyD) strafe += 1;
            if (this.keys.KeyA) strafe -= 1;
            if (this.keys.Space) vertical += 1;
            if (this.keys.ShiftLeft || this.keys.ShiftRight) vertical -= 1;

            const length = Math.hypot(forward, strafe);
            if (length > 1) {
                forward /= length;
                strafe /= length;
            }

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
        this.animFrameId = requestAnimationFrame(this._onLoop);
    }

    applyPose() {
        if (!this.camera || !this.freePosition) return;
        this.copyXYZ(this.camera.position, this.freePosition);
        if (this.camera.rotation) {
            if (typeof this.camera.rotation.set === 'function') {
                this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
            } else {
                this.camera.rotation.x = this.pitch;
                this.camera.rotation.y = this.yaw;
                this.camera.rotation.z = 0;
            }
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
            if (typeof scene.attach === 'function') {
                scene.attach(camera);
            } else {
                parent.remove?.(camera);
                scene.add(camera);
            }
        }
    }

    restoreCameraParent(camera) {
        if (!this.originalParent) return;
        try {
            this.originalParent.add(camera);
            if (this.originalIndex >= 0 && Array.isArray(this.originalParent.children)) {
                const idx = this.originalParent.children.indexOf(camera);
                if (idx !== -1) {
                    this.originalParent.children.splice(idx, 1);
                    this.originalParent.children.splice(this.originalIndex, 0, camera);
                }
            }
        } catch (_) {}
    }

    onKeyDown(event) {
        if (!this.isEnabled || this.isTypingOrUiOpen()) return;
        const movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight'];
        if (movementKeys.includes(event.code)) {
            this.keys[event.code] = true;
            event.preventDefault();
            event.stopPropagation();
        }
    }

    onKeyUp(event) {
        if (event.code in this.keys) {
            this.keys[event.code] = false;
        }
    }

    onMouseMove(event) {
        if (!this.isEnabled || !document.pointerLockElement || this.isTypingOrUiOpen()) return;
        const sens = 0.0022 * this.clamp(this.sensitivity, 0.1, 3);
        this.yaw -= Number(event.movementX || 0) * sens;
        this.pitch -= Number(event.movementY || 0) * sens;
        this.pitch = this.clamp(this.pitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
    }

    neutralizePlayerInput() {
        const player = this.player || hooks.game?.player;
        if (!player) return;
        try {
            if ('wWQmwuDLqA' in player) player.wWQmwuDLqA = 0;
            if ('YApHmhhGagG' in player) player.YApHmhhGagG = 0;
            if ('jumping' in player) player.jumping = false;
            if ('sneak' in player) player.sneak = false;
        } catch (_) {}
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
        let eyeHeight = typeof player?.getEyeHeight === 'function' ? Number(player.getEyeHeight()) : Number(player?.eyeHeight || 1.62);
        return { x: pos.x, y: pos.y + eyeHeight, z: pos.z };
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
