var currentCaption: Caption = null;
var captionNum = 0;
var activeTileId: number = null;
var ws: WebSocket = null;
var symblSocket: SymblSocket = null;
const insights: any = [];

const hashCode = function(s: string): number {
    var h = 0, l = s.length, i = 0;
    if (l > 0)
        while (i < l)
            h = (h << 5) - h + s.charCodeAt(i++) | 0;
    return h;
};

export class SymblEvents {
    subtitleHandlers: any = [];
    insightHandlers: any = [];
    transcriptHandlers: any = [];
    constructor() { }
    getHandlerArr(handlerType: string): any {
        let handlerArr;
        if (handlerType === 'subtitle') {
            handlerArr = this.subtitleHandlers;
        } else if (handlerType === 'insight') {
            handlerArr = this.insightHandlers;
        } else if(handlerType === 'transcript') {
            handlerArr = this.transcriptHandlers;
        }else {
            throw new Error(`Unhandled SymblEvent handler type ${handlerType}`);
        }
        return handlerArr;
    }
    subscribe(type: string, handler: any): any {
        try {
            const handlerArr = this.getHandlerArr(type);
            if (handlerArr) {
                handlerArr.push(handler);
                return () => {
                    let index = this.subtitleHandlers.indexOf(handler);
                    if (index > -1) {
                        let removedHandler = this.subtitleHandlers.splice(index, 1);
                        return removedHandler;
                    }
                }
            }
        } catch (err) {
            console.log(err);
            throw new Error(`Error subscribing to SymblEvent type ${type} ${err}`);
        }
    }
    emit(type: string, event: string, ...args: any[]) {
        try {
            const handlerArr = this.getHandlerArr(type);
            if (handlerArr) {
                handlerArr.forEach((handler: any) => {
                    if (handler[event]) {
                        handler[event](...args);
                    }
                })
            }
        } catch (err) {
            console.error(err);
            throw new Error(`Error emitting event type ${type} ${err}`);
        }
    }
}
const symblEvents = new SymblEvents();


export class Transcript {
    lines: Array<TranscriptItem> = [];
    constructor() {

    }
    addLine(transcriptItem: TranscriptItem): void {
        this.lines.unshift(transcriptItem);
    }
    printAll(): string {
        let content = '';
        for (let line of this.lines) {
            content = content + `${line.userName}: ${line.message}\n`;
        }
        // console.log('Transcript\n', content);
        return content;
    }
}

export class TranscriptItem {
    message: string = null;
    userName: string = null;
    id: string = null;
    userId: string = null;
    timeStamp: Date = new Date();
    constructor(data: {
        isFinal: true,
        payload: any,
        punctuated: {
            transcript: string,
            type: 'recognition_result',
        },
        user: {
            id: string,
            name: string,
            userId: string,
        },
        type: string
    },
    ) {
        if(data && data.isFinal !== true){
            throw new Error('Message is not final transcript response');
        }

        this.message = data.punctuated.transcript;
        this.userName = data.user.name;
        this.id = data.user.id;
        this.userId = data.user.userId;
        symblEvents.emit('transcript', 'onTranscriptCreated', this);
    }
}

const transcript = new Transcript();


export class Insight {
    data: {
        assignee: { name: string, userId: string, id: string, },
        from: any,
        id: string,
        text: string,
        type: string
    } = null;
    id: string = null;
    _element: HTMLDivElement = null;

    constructor(data: any) {
        this.data = data;
        this.id = '' + hashCode(data.text + data.confidence);
        console.info('Creating insight', data, insights.includes(data));
        symblEvents.emit('insight', 'onInsightCreated', this);
    }
    createElement(): HTMLDivElement {
        let type = '';
        let color = 'bg-dark';
        let footer = '';
        switch (this.data.type) {
            case 'action_item':
                type = 'Action Item';
                color = 'bg-warning';
                footer = `Assignee: ${this.data.assignee.name}`;
                break;
            case 'question':
                type = 'Question'
                color = 'bg-success';
                footer = `Assignee: ${this.data.assignee.name}`;
                break;
            case 'follow_up':
                type = 'Follow Up';
                color = 'bg-info';
                footer = `Assignee: ${this.data.assignee.name}`;
                break;
            default:
                console.warn('Insight has no valid type?', this.data);
                break;
        }
        let content = this.data.text;
        // <h5 class="card-title">Dark card title</h5>
        const insightElementStr = `<div class="card text-white ${color} mb-3" style="max-width: 18rem; margin: 10px;">
            <div class="card-header">${type}</div>
            <div class="card-body">
                <p class="card-text">${content}</p>
                <p class="card-text"><small class="text">${footer}</small></p>
            </div>
        </div>`
        const element = document.createElement('div');
        element.innerHTML = insightElementStr;
        element.id = this.id;
        this.element = element;
        return element;
    }
    get type(): string { // action_item || question || follow_up
        return this.data.type;
    }

    get assignee(): { name: string, userId: string, id: string, } {
        return this.data.assignee;
    }
    // set assignee(assignee: { name: string, userId: string, id: string, }){
    //     // No op
    // }
    get from(): string {
        return this.data.from;
    }
    get insightId(): string {
        return this.data.id;
    }
    get text(): string {
        return this.data.text;
    }
    get element(): HTMLDivElement {
        return this._element;
    }
    set element(element: HTMLDivElement) {
        this._element = element;
    }
    add(container: HTMLElement = null) {
        if (container && this.element) {
            container.append(this.element);
            container.scroll(0, 1000000);
        }
    }
    remove() {
        this.element.remove();
    }
}

var websocketOpened: boolean = false;
export class Caption {
    data: any = null;
    element: any = null;
    nameSpan: any = null;
    contentSpan: any = null;
    name: string = '';
    captionNum: number = 0;
    textTrack: TextTrack = null;
    activeTileId: number = null;
    _videoElementId: string = null;
    videoElement: HTMLVideoElement = null;
    message: string = null;
    static subtitlesEnabled: boolean = true;
    static toggleSubtitles(show: boolean): void {
        console.log('Subtitles toggled:', show);
        // implement
    }
    constructor(data: any) {
        this.data = data
        this.captionNum = captionNum;
        captionNum++;
        this.setName(data.user.name);
        if (data.punctuated.transcript) {
            this.message = this.truncateMessage(data.punctuated.transcript);
        }
        symblEvents.emit('subtitle', 'subtitleCreated', this);

    }
    /**
     * Sets which Video element to superimpose captions over
     * @param  videoElement [description]
     * @return              [description]
     */
    setVideoElement(videoElement: HTMLVideoElement) {
        this.videoElement = videoElement;
        this.videoElement.style.transform = '';
        if (this.videoElement.textTracks.length === 0) {
            this.textTrack = this.videoElement.addTextTrack('subtitles');
            let cue = new VTTCue(this.videoElement.currentTime, this.videoElement.currentTime + 1, this.message);
            this.textTrack.mode = Caption.subtitlesEnabled ? 'showing' : 'hidden';
            this.textTrack.addCue(cue);
        } else {
            this.textTrack = this.videoElement.textTracks[0];
            this.textTrack.mode = Caption.subtitlesEnabled ? 'showing' : 'hidden';

        }
        console.log('Set video element', this.videoElement);
    }
    set videoElementId(videoElementId: string) {
        let _videoElement = document.getElementById(videoElementId);
        if (_videoElement instanceof HTMLVideoElement) {
            this._videoElementId = videoElementId;
            this.setVideoElement(_videoElement);
        } else {
            console.error('Could not retrieve Video Element by Id.')
        }
    }
    setName(name: string) {
        // this.nameSpan.innerText = `${name}: `;
        this.name = name;
    }
    truncateMessage(message: string): string {
        if (!message) {
            return '';
        }
        let truncatedMessage = message.split(' ').splice(-13 * 2).join(' ');
        if (truncatedMessage.length > 72 * 2) {
            truncatedMessage = message.split(' ').splice(-12 * 2).join(' ');
        } else if (truncatedMessage.length < 60 * 2) {
            truncatedMessage = message.split(' ').splice(-14 * 2).join(' ');
        }
        return truncatedMessage;
    }
    updateContent(message: string) {
        // Update Text in `closed-captioning-text`
        this.message = this.truncateMessage(message);
        if (this.textTrack) {
            var cue: VTTCue;
            if (this.textTrack.cues.length > 0) {
                cue = this.textTrack.cues[this.textTrack.cues.length - 1] as VTTCue;
            } else {
                cue = new VTTCue(this.videoElement.currentTime, this.videoElement.currentTime + 1, this.message);
                cue.startTime = this.videoElement.currentTime;
            }
            cue.endTime = this.videoElement.currentTime + 1;
            cue.text = this.message;
            this.textTrack.addCue(cue);

        } else {
            // this.contentSpan.innerText = message;

        }
        symblEvents.emit('subtitle', 'subtitleUpdated', this);
    }
    finalize(message: string) {
        this.contentSpan = message;
    }
    kill(killNow: boolean) {
        currentCaption = null;
        if (this.element) {
            this.element.classList.add('fade-out')
            // this.element.className = this.element.className + ' fade-out';
            if (killNow) {
                this.element.style.display = 'none';
                this.element.remove();
            } else {
                setTimeout(() => {
                    this.element.style.display = "none";
                    this.element.remove();
                }, 1000);
            }
        }
    }

}

var ssCount = 0;
class SymblSocket {
    id: number = ssCount++;
    userName: string = null;
    bufferSize: number = 8192;
    ws: WebSocket = null;
    connected: boolean = true;
    closed: boolean = false;
    requestStarted: boolean = false;
    credentials: any = false;
    symbl: any = null;
    _conversationId: string = null;
    gainNode: any = null;
    config: any = null;
    meetingId: string = null;
    observer: {
        subtitleObservers: {
            onClosedCaptioningToggled: { (callback: (isEnabled: boolean, caption?: Caption) => void): void }[],
            onSubtitleUpdated: { (callback: (caption: Caption) => void): void }[],
        },
        insightObservers: {
            onInsightResult: { (callback: () => void): void }
        }
    }
    constructor(config: { confidenceThreshold: number, languageCode: string }, credentials: any) {
        this.id = ssCount++;
        this.config = config;
        this.credentials = credentials;
        this.userName = this.credentials.userName;
        const self = this;
        ws.onmessage = event => self.onMessage(event);
        ws.onclose = event => self.onClose(event);
        ws.onerror = event => self.onError(event);

    }
    parseMessage(message: any) {
        const data = JSON.parse(message);
        if (data.type === 'insight_response') {
            data.insights.forEach((insight: any) => {
                new Insight(insight);
            });
            return;
        }
        if (!('message' in data)) {
            // Not parsing message. Not transcript.
            return;
        }
        switch (data.message.type) {
            case 'recognition_started':
                this.conversationId = data.message.data.conversationId;
                // Transcript started
                currentCaption = null;
                break;
            case 'recognition_result':
                // transcription continued
                if(data.message && data.message.isFinal){
                    new TranscriptItem(data.message);
                }
                if (currentCaption) {
                    currentCaption.updateContent(data.message.punctuated.transcript);
                } else if (currentCaption && currentCaption.activeTileId !== activeTileId) {
                    console.info('Killing caption and adding to video-', activeTileId);

                    currentCaption.kill(true);
                    currentCaption = new Caption(data.message);
                    // console.error('no current caption area');
                } else {
                    console.info('Creating first caption');
                    currentCaption = new Caption(data.message);
                }
                if (data.message.isFinal && currentCaption) {
                    currentCaption.kill(false);
                    // TODO Post transcript to message channel?
                }
                break;
            case 'recognition_stopped':
                // transcription stopped
                if (currentCaption) {
                    currentCaption.kill(false);
                }
                break;
        }
    }
    set conversationId(conversationId) {
        this._conversationId = conversationId;
        console.info('Conversation ID set ', conversationId);
    }
    get conversationId() {
        return this._conversationId;
    }
    onMessage(event: any) {
        if (event.type === 'message') {
            // console.log('on message', event, event.data);  // Print the data for illustration purposes
            this.parseMessage(event.data);
        }
    }
    onClose(...anything: any[]) {
        this.closed = true;
        console.warn('Websocket closed', ...anything);
    }
    onError(err: Event) {
        console.error('Symbl Websocket Error', err);
    }
    startRequest(): void {
        console.info('Starting request');
        if (this.requestStarted) {
            console.info('Trying to start request. Must stop request first');
            return;
        }
        this.requestStarted = true;
        ws.send(JSON.stringify({
            "type": "start_request",
            "insightTypes": this.config.insightsEnabled ? ["question", "action_item"] : [],
            "config": {
                "confidenceThreshold": this.config.confidence || 0.5,
                // "timezoneOffset": 480, // Your timezone offset from UTC in minutes
                "languageCode": this.config.languageCode ? this.config.languageCode : "en-US",
                "speechRecognition": {
                    "encoding": "LINEAR16",
                    "sampleRateHertz": 44100 // Make sure the correct sample rate is provided for best results
                },
                "meetingTitle": "Chime Demo Application"
            },
            "speaker": {
                "userId": this.credentials.attendeeId,
                "name": this.userName,
            }
        }));
        const handleSuccess = (stream: any) => {
            const AudioContext = window.AudioContext;
            const context = new AudioContext();
            const source = context.createMediaStreamSource(stream);
            const processor = context.createScriptProcessor(1024, 1, 1);
            this.gainNode = context.createGain();
            source.connect(this.gainNode);
            this.gainNode.connect(processor);
            processor.connect(context.destination);
            processor.onaudioprocess = (e: any) => {
                // convert to 16-bit payload
                const inputData = e.inputBuffer.getChannelData(0) || new Float32Array(this.bufferSize);
                const targetBuffer = new Int16Array(inputData.length);
                for (let index = inputData.length; index > 0; index--) {
                    targetBuffer[index] = 32767 * Math.min(1, inputData[index]);
                }
                // Send to websocket
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(targetBuffer.buffer);
                }
            };
        };

        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(handleSuccess);
    }
    mute(isMuted: boolean) {
        if (this.gainNode) {
            this.gainNode.gain.value = isMuted ? 0 : 1;
        }
    }
    get isMuted(): boolean {
        if (this.gainNode) {
            return this.gainNode.gain.value === 0;
        }else{
            return false;
        }
    }
    stopRequest(): void {
        console.warn('Stopping request');
        if (!this.requestStarted) {
            console.log('Cannot stop request. Request has not started');
            return;
        }
        this.requestStarted = false;
        ws.send(JSON.stringify({
            "type": "stop_request"
        }));
    }
    close(): Promise<string> {
        console.info('Symbl closing');
        return new Promise((resolve, reject) => {
            if (!this.closed) {
                ws.addEventListener('close', (e: Event) => {
                    console.info('Symbl Connection Closed', e);
                    resolve('Closed');
                })
                ws.close();
            } else {
                reject('Failed to close websocket');
            }
        })

    }
}

export class Symbl {
    static events: SymblEvents = symblEvents;
    static transcripts: Transcript = transcript;
    static ACCESS_TOKEN: string = null;
    static state: string = 'DISCONNECTED';
    public chimeConfiguration: any = {};
    public meetingId: string = null; // Meeting UUID
    public credentials: { [key: string]: string } = {
        'attendeeId': null,
        'userName': null,
        'meetingId': null,
        'meeting': null,
    };
    public meeting: any = null;
    isMuted: boolean = false;
    config: any = { // Symbl Config
        confidenceThreshold: 0.5,
        languageCode: 'en-US',
        insightsEnabled: true,
    }
    url: string = null; // Realtime API endpoint
    constructor(
        chime: {
            attendeeId: string,
            userName: string,
            meetingId: string,
            meeting: string // Meeting name
        },
        config?: {
            confidenceThreshold: number,
            languageCode: string,
            insightsEnabled: boolean,
        },

    ) {
        this.chimeConfiguration = chime;
        this.meeting = chime.meeting;

        // this.videoContainerId = videoContainerId;
        if (!Symbl.ACCESS_TOKEN) {
            throw new Error('Cannot connect to symbl. Access token undefined');
        }
        if(!chime.meetingId){
            throw new Error('Chime Meeting ID not provided.');
        }
        this.url = `wss://api.symbl.ai/v1/realtime/insights/${chime.meetingId}?access_token=${Symbl.ACCESS_TOKEN}`;

        this.credentials = chime;
        this.meetingId = chime.meetingId;
        if (config) {
            this.config = config;
        }

    }

    toggleClosedCaptioning(force?: boolean): void {
        Caption.toggleSubtitles(force);
    }
    /**
     * Subscribes to closed captioning events
     * @param  handler contains events that may be subscribed to
     * @return         [description]
     */
    subscribeToCaptioningEvents(handler: {
        onClosedCaptioningToggled: (callback: any) => void,
        subtitleCreated: (callback: any) => void,
        subtitleUpdated: (callback: any) => void,
    }
    ): any {
        return symblEvents.subscribe('subtitle', handler);
    }

    subscribeToInsightEvents(handler: { onInsightCreated: (callback: any) => void; }): any {
        return symblEvents.subscribe('insight', handler);
    }

    subscribeToTranscriptEvents(handler: { onTranscriptCreated: (callback: any) => void; }): any {
        return symblEvents.subscribe('transcript', handler);
    }
    get conversationId(): string {
        if(!symblSocket){
            throw new Error('Cannot retrieve conversation ID. Symbl is not connected.');
        }
        return symblSocket.conversationId;
    }
    muteHandler(isMuted: boolean) {
        console.log('Symbl mute', isMuted);
        if (symblSocket) {
            symblSocket.mute(isMuted);
        }
        if (isMuted && symblSocket) {
            if (symblSocket.requestStarted) {
                symblSocket.gainNode.gain.value = 0;
                symblSocket.stopRequest();
                symblSocket.close();
                symblSocket = null;
            }
        }
        this.isMuted = isMuted;
    }
    disconnect() {
        try {
            symblSocket.close();
        } catch (err) {
            console.error('Error on Symbl Disconnect', err);
        }
    }
    async start(): Promise<any> {
        console.log('Symbl Connecting!');
        if (this.isMuted) {
            console.log('Symbl not connecting, muted');
            return;
        }
        if (ws) {
            console.log('SymblSocket already exists', SymblSocket);
            if (symblSocket && symblSocket.requestStarted) {
                return;
            } else {
                return;
            }
        }
        if (websocketOpened) {
            return;
        }
        websocketOpened = true;
        const wsPromise = new Promise<SymblSocket>((resolve, reject) => {
            if (ws) {
                ws.close();
                ws = null;
            }
            ws = new WebSocket(this.url);
            Symbl.state = 'CONNECTING';
            ws.onerror = (err: Event) => {
                console.error('Connection Failed.', err);
                Symbl.state = 'FAILED';
                reject(err);
            };
            ws.onopen = () => {
                Symbl.state = 'CONNECTED';
                console.log('Connection established.');
                symblSocket = new SymblSocket(this.config, this.credentials);
                resolve(symblSocket);
            };
        });
        await wsPromise;
        symblSocket.startRequest();
        return Promise.resolve(symblSocket);
    }
    stop() {
        if (symblSocket) {
            if (symblSocket.requestStarted) {
                symblSocket.stopRequest();
                symblSocket.close();
                symblSocket = null;
            }
        }
    }
    async getSummaryUrl(): Promise<string> {
        const res = await fetch(`https://api.symbl.ai/v1/conversations/${this.conversationId}/experiences`,{
            method: "post",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": Symbl.ACCESS_TOKEN,
            },
            mode: "cors",
            body: JSON.stringify({
                name: "verbose-text-summary"
            })
        });
        const data = await res.json();
        return Promise.resolve(data.url);
    }
}
