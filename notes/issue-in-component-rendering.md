/**
 * CollabPanel — Live Collaboration right-side panel.
 *
 * Owns the full collab lifecycle: session creation (CursorSession), cursor
 * rendering (CursorLayer), and media tracks (MediaFeeds). The host page
 * passes a graph coordinate interface via open() — the panel handles
 * everything else.
 *
 * Public API:
 *   open({ boardPuid, boardName, svgEl, screenToSvg, svgToScreen })
 *   close()
 */

import LucideIcon                                     from '@components/utils/lucide-icon';
import { viUiStore }                                  from '@components/visual-ideation/visual-ideation-ui-store';
import { CursorSession, CursorLayer, MediaFeeds }     from '@components/collab';
import { collabStore }                                from './collab-store.js';

export default class CollabPanel extends Muffin.DOMComponent {
    static domElName = 'collab-panel';

    // ─── Styles — only what Tailwind can't express ────────────────────────────

    static styleMarkup(rootEl) {
        return `<style type="text/css">
            ${rootEl} .cp-panel {
                transform: translateX(100%);
                transition: transform 280ms cubic-bezier(0.32,0.72,0,1);
            }
            ${rootEl}[is-visible] .cp-panel {
                transform: translateX(0);
                box-shadow: -8px 0 40px rgba(0,0,0,0.12);
            }
            ${rootEl} .cp-media-btn {
                transition: background 120ms ease, color 120ms ease;
            }
            ${rootEl} .cp-media-btn:hover { background: #f3f4f6; }
            ${rootEl} .cp-media-btn[data-active="true"] {
                background: #eef2ff;
                border-color: #c7d2fe;
                color: #4338ca;
            }
        </style>`;
    }

    // ─── Body helpers ─────────────────────────────────────────────────────────

    static _idleBody() {
        return `<div class="flex flex-col gap-5">
            <div class="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-4">
                <p class="text-xs text-indigo-700 leading-relaxed">
                    Start a live session to collaborate on this board in real time.
                    Others with board access can join once the session is active.
                </p>
            </div>
            <button class="w-full flex items-center justify-center gap-2
                           px-4 py-2.5 rounded-lg bg-indigo-600 text-white
                           text-sm font-semibold hover:bg-indigo-700 transition-colors"
                    on-click="startSession">
                ${LucideIcon.renderIcon('users', 14)}
                <span>Start session</span>
            </button>
        </div>`;
    }

    static _connectingBody() {
        return `<div class="flex flex-col items-center justify-center gap-4 py-12">
            <div class="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin"></div>
            <p class="text-sm text-gray-500">Connecting…</p>
            <button class="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    on-click="endSession"><span>Cancel</span></button>
        </div>`;
    }

    static _connectedBody({ participants, cameraOn, micOn }) {
        const cameraIcon = cameraOn ? 'video' : 'video-off';
        const micIcon    = micOn    ? 'mic'   : 'mic-off';

        const rows = participants?.length
            ? `<div class="flex flex-col gap-2">${participants.map(p => `
                <div class="flex items-center gap-2.5 px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50">
                    <div class="w-2 h-2 rounded-full flex-shrink-0" style="background:${_esc(p.color || '#6366f1')}"></div>
                    <span class="text-sm text-gray-700 flex-1 truncate">${_esc(p.nickname || p.actorId)}</span>
                </div>`).join('')}</div>`
            : `<p class="text-xs text-gray-400 italic">Waiting for others to join…</p>`;

        return `<div class="flex flex-col gap-5">
            <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-100">
                <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0"></span>
                <span class="text-xs font-medium text-green-700">Session active</span>
            </div>

            <div class="flex gap-2">
                <button class="cp-media-btn flex items-center justify-center gap-1.5
                               flex-1 px-3 py-2 rounded-lg border border-gray-200
                               bg-gray-50 text-gray-700 text-sm font-medium cursor-pointer"
                        data-active="${!!cameraOn}" on-click="toggleCamera">
                    ${LucideIcon.renderIcon(cameraIcon, 14)}
                    <span>${cameraOn ? 'Camera on' : 'Camera'}</span>
                </button>
                <button class="cp-media-btn flex items-center justify-center gap-1.5
                               flex-1 px-3 py-2 rounded-lg border border-gray-200
                               bg-gray-50 text-gray-700 text-sm font-medium cursor-pointer"
                        data-active="${!!micOn}" on-click="toggleMic">
                    ${LucideIcon.renderIcon(micIcon, 14)}
                    <span>${micOn ? 'Mic on' : 'Mic'}</span>
                </button>
            </div>

            <div>
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Participants</p>
                ${rows}
            </div>

            <button class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                           border border-red-200 bg-red-50 text-red-600
                           text-sm font-semibold hover:bg-red-100 transition-colors"
                    on-click="endSession">
                ${LucideIcon.renderIcon('log-out', 14)}
                <span>End session</span>
            </button>
        </div>`;
    }

    static _erroredBody(error) {
        return `<div class="flex flex-col gap-4">
            <div class="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                <p class="text-xs text-red-700 leading-relaxed">${_esc(error || 'Failed to start session.')}</p>
            </div>
            <button class="w-full flex items-center justify-center gap-2
                           px-4 py-2.5 rounded-lg bg-indigo-600 text-white
                           text-sm font-semibold hover:bg-indigo-700 transition-colors"
                    on-click="startSession">
                ${LucideIcon.renderIcon('refresh-cw', 14)}
                <span>Try again</span>
            </button>
        </div>`;
    }

    // ─── Markup ───────────────────────────────────────────────────────────────

    static markupFunc(_data, uid, _uiVars, _routeVars, _constructor, stores) {
        const { status, participants, cameraOn, micOn, error } = stores?.collab || {};

        let body;
        switch (status) {
            case 'connecting': body = _constructor._connectingBody(); break;
            case 'connected':  body = _constructor._connectedBody({ participants, cameraOn, micOn }); break;
            case 'errored':    body = _constructor._erroredBody(error); break;
            default:           body = _constructor._idleBody(); break;
        }

        return `<div class="fixed inset-0 z-[510] pointer-events-none">
            <div class="cp-panel absolute top-0 right-0 h-full w-[400px] max-w-[93vw]
                        bg-white flex flex-col overflow-hidden pointer-events-auto">

                <!-- Header -->
                <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                    <div>
                        <p class="text-xs font-semibold text-violet-500 uppercase tracking-wider mb-0.5">Live</p>
                        <h2 class="text-base font-bold text-gray-900">Collaboration</h2>
                    </div>
                    <button class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            on-click="close" title="Close (Esc)">
                        ${LucideIcon.renderIcon('x', 15)}
                    </button>
                </div>

                <!-- Body -->
                <div class="flex-1 overflow-y-auto p-6">${body}</div>
            </div>
        </div>`;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() {
        super();
        this.stores             = { collab: collabStore };
        this._cursorSession     = null;
        this._cursorLayer       = null;
        this._mediaFeeds        = null;
        this._boardPuid         = null;
        this._boardName         = null;
        this._graphInterface    = null;
        this._keyHandler        = null;
        this._participantUnsubs = [];
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    open({ boardPuid, boardName, svgEl, screenToSvg, svgToScreen } = {}) {
        this._boardPuid = boardPuid;
        this._boardName = boardName;
        this._graphInterface = (svgEl && screenToSvg && svgToScreen)
            ? { svgEl, screenToSvg, svgToScreen }
            : null;

        viUiStore.set({ activeRightPanel: 'collab' });

        requestAnimationFrame(() => requestAnimationFrame(() => {
            this.toggleRootAttr('is-visible', true);
        }));

        this._keyHandler = (ev) => { if (ev.key === 'Escape') this.close(); };
        document.addEventListener('keydown', this._keyHandler);
    }

    close() {
        if (this._cursorSession?.isConnected) this.endSession();
        this.toggleRootAttr('is-visible', false);
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
        this._graphInterface = null;
        viUiStore.set({ activeRightPanel: null });
    }

    // ─── Session control ──────────────────────────────────────────────────────

    async startSession() {
        if (!this._boardPuid) return;

        collabStore.set({ status: 'connecting', error: null });

        try {
            this._cursorSession = new CursorSession();

            const authToken = await Muffin.AccountManagerService.getSessionToken();

            const { sessionDoc } = await this._cursorSession.start({
                boardPuid:       this._boardPuid,
                boardName:       this._boardName,
                authToken,
                participantName: Muffin.WebInterface.sessionInfo?.name || null,
            });

            this._wireParticipantUpdates();
            this._mountCursorLayer();
            this._mountMediaFeeds();

            collabStore.set({
                status:       'connected',
                sessionId:    sessionDoc._id,
                participants: this._buildParticipantList(),
                cameraOn:     false,
                micOn:        false,
            });
        } catch (e) {
            this._destroyCursorLayer();
            this._destroyMediaFeeds();
            await this._cursorSession?.end().catch(() => {});
            this._cursorSession = null;
            collabStore.set({ status: 'errored', error: _errMsg(e, 'Failed to start session') });
        }
    }

    async endSession() {
        this._clearParticipantUpdates();
        this._destroyMediaFeeds();
        this._destroyCursorLayer();
        await this._cursorSession?.end().catch(() => {});
        this._cursorSession = null;
        collabStore.set({ status: 'idle', sessionId: null, participants: [], cameraOn: false, micOn: false, error: null });
    }

    // ─── Media controls ───────────────────────────────────────────────────────

    async toggleCamera() {
        if (!this._mediaFeeds) return;
        try {
            if (this._mediaFeeds.cameraEnabled) {
                this._mediaFeeds.disableCamera();
                collabStore.set({ cameraOn: false });
            } else {
                await this._mediaFeeds.enableCamera();
                collabStore.set({ cameraOn: true });
            }
        } catch (e) {
            console.warn('CollabPanel: camera toggle failed —', e);
            collabStore.set({ cameraOn: false });
        }
    }

    async toggleMic() {
        if (!this._mediaFeeds) return;
        try {
            if (this._mediaFeeds.microphoneEnabled) {
                this._mediaFeeds.disableMicrophone();
                collabStore.set({ micOn: false });
            } else {
                await this._mediaFeeds.enableMicrophone();
                collabStore.set({ micOn: true });
            }
        } catch (e) {
            console.warn('CollabPanel: mic toggle failed —', e);
            collabStore.set({ micOn: false });
        }
    }

    // ─── Cursor layer ─────────────────────────────────────────────────────────

    _mountCursorLayer() {
        if (!this._graphInterface || !this._cursorSession) return;
        const { svgEl, screenToSvg, svgToScreen } = this._graphInterface;
        this._cursorLayer = new CursorLayer({
            svgEl,
            cursorSession: this._cursorSession,
            screenToSvg,
            svgToScreen,
        });
    }

    _destroyCursorLayer() {
        this._cursorLayer?.destroy();
        this._cursorLayer = null;
    }

    // ─── Media feeds ──────────────────────────────────────────────────────────

    _mountMediaFeeds() {
        if (!this._cursorSession) return;
        const container = this._graphInterface?.svgEl?.parentElement ?? document.body;
        this._mediaFeeds = new MediaFeeds({
            container,
            cursorSession: this._cursorSession,
        });
    }

    _destroyMediaFeeds() {
        this._mediaFeeds?.destroy();
        this._mediaFeeds = null;
    }

    // ─── Participant tracking ─────────────────────────────────────────────────

    _wireParticipantUpdates() {
        if (!this._cursorSession) return;
        const live = this._cursorSession._live;
        if (!live) return;

        const refresh = () => collabStore.set({ participants: this._buildParticipantList() });

        this._participantUnsubs.push(live.onParticipantJoined(refresh));
        this._participantUnsubs.push(live.onParticipantLeft(refresh));
    }

    _clearParticipantUpdates() {
        for (const unsub of this._participantUnsubs) unsub();
        this._participantUnsubs = [];
    }

    _buildParticipantList() {
        if (!this._cursorSession) return [];
        const ids    = this._cursorSession.participants;
        const actors = this._cursorSession.actors;
        return ids.map(id => actors.get(id) ?? { actorId: id, nickname: id });
    }

    // ─── Compose ──────────────────────────────────────────────────────────────

    static compose() {
        super.compose();
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _esc(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function _errMsg(e, fallback = 'An error occurred') {
    if (typeof e === 'string') return e;
    return e?.message || e?.error || fallback;
}
