/* eslint-disable functional/no-throw-statement */
/* eslint-disable @typescript-eslint/no-inferrable-types */
/* eslint-disable functional/immutable-data */
/* eslint-disable functional/functional-parameters */
/* eslint-disable functional/prefer-readonly-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable functional/no-return-void */
/* eslint-disable functional/no-this-expression */
/* eslint-disable functional/no-class */
/* eslint-disable functional/no-let */
import { Insight } from './Insight';
import { SymblEvents } from './SymblEvents';
import { Topic } from './Topic';
import { Tracker } from './Tracker';
import { Transcript, TranscriptItem } from './Transcript';

let currentCaption: Caption = null;
let captionNum = 0;
let ws: WebSocket = null;
let symblSocket: SymblSocket = null;
const insights: any = [];
const topics: any = [];
const trackers: any = [];

const symblEvents = new SymblEvents();
const transcript = new Transcript();

let websocketOpened = false;

export class Caption {
  data: {
    isFinal: boolean;
    false;
    payload: {
      raw: {
        alternatives: [
          {
            confidence: number;
            transcript: string;
            words: Array<any>;
          }
        ];
      };
    };
    punctuated: {
      transcript: string;
    };
    type: string; // "recognition_result"
    user: {
      id: string;
      userId: string;
      name: string;
    };
  } = null;
  userId: '865ca7f0-a880-73b6-4f6c-0c5a7e19bcac' = null;
  element?: HTMLDivElement =
    null; /** Optional element used to superimpose captions over rather than the HTMLVideoElement **/
  name = '';
  captionNum = 0; /** Caption number **/
  textTrack: TextTrack = null; /** Text track used for closed captioning **/
  _videoElementId: string =
    null; /** ID of the HTMLVideoElement the CC track will be added to **/
  videoElement: HTMLVideoElement =
    null; /** Video element the closed-caption track is added to **/
  message: string = null; /** Caption content **/
  contentSpan: string = null; /** Finalized caption content **/
  static captionsEnabled = true;
  static toggleCaptions(enabled = !Caption.captionsEnabled): void {
    if (currentCaption && currentCaption.videoElement) {
      currentCaption.setVideoElement(currentCaption.videoElement);
    }
    Caption.captionsEnabled = enabled;
    symblEvents.emit('caption', 'onCaptionToggled', enabled);
    // implement
  }
  constructor(data: any) {
    this.data = data;
    this.captionNum = captionNum;
    captionNum++;
    this.setName(data.user.name);
    if (data.punctuated.transcript) {
      this.message = this.truncateMessage(data.punctuated.transcript);
    }
    symblEvents.emit('caption', 'onCaptionCreated', this);
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
      const cue = new VTTCue(
        this.videoElement.currentTime,
        this.videoElement.currentTime + 1,
        this.message
      );
      this.textTrack.mode = Caption.captionsEnabled ? 'showing' : 'hidden';
      this.textTrack.addCue(cue);
    } else {
      this.textTrack = this.videoElement.textTracks[0];
      this.textTrack.mode = Caption.captionsEnabled ? 'showing' : 'hidden';
    }
  }
  /**
   * Sets the element that captions should be added to
   * @param  videoElementId id of the HTMLVideoElement to add captions over
   * @return
   */
  set videoElementId(videoElementId: string) {
    const _videoElement = document.getElementById(videoElementId);
    if (_videoElement instanceof HTMLVideoElement) {
      this._videoElementId = videoElementId;
      this.setVideoElement(_videoElement);
    } else {
      console.error('Could not retrieve Video Element by Id.');
    }
  }
  /**
   * Sets caption user name
   * @param  name name of the user the caption belongs to
   * @return      [description]
   */
  setName(name: string): void {
    this.name = name;
  }
  /**
   * truncates the maximum showable words at any given time
   * @param  message Caption message to be truncated
   * @return         Truncated caption message
   */
  truncateMessage(message: string): string {
    if (!message) {
      return '';
    }
    let truncatedMessage = message
      .split(' ')
      .splice(-13 * 2)
      .join(' ');
    if (truncatedMessage.length > 72 * 2) {
      truncatedMessage = message
        .split(' ')
        .splice(-12 * 2)
        .join(' ');
    } else if (truncatedMessage.length < 60 * 2) {
      truncatedMessage = message
        .split(' ')
        .splice(-14 * 2)
        .join(' ');
    }
    return truncatedMessage;
  }
  /**
   * Updates the content of the currently active caption subtitle
   * @param  message Caption content
   * @return
   */
  updateContent(data: any) {
    this.data = data;
    const message = data.punctuated.transcript;
    // Update Text in `closed-captioning-text`
    this.message = this.truncateMessage(message);
    if (this.textTrack) {
      let cue: VTTCue;
      if (this.textTrack.cues.length > 0) {
        cue = this.textTrack.cues[this.textTrack.cues.length - 1] as VTTCue;
      } else {
        cue = new VTTCue(
          this.videoElement.currentTime,
          this.videoElement.currentTime + 1,
          this.message
        );
        cue.startTime = this.videoElement.currentTime;
      }
      cue.endTime = this.videoElement.currentTime + 1;
      cue.text = this.message;
      this.textTrack.addCue(cue);
    }
    symblEvents.emit('caption', 'onCaptionUpdated', this);
  }
  /**
   * The speaker has finished speaking and the caption is ready to be disposed
   * @param  message final message for the caption
   * @return
   */
  finalize(message: string): void {
    this.contentSpan = message;
  }
  /**
   * Kills the caption
   * @param  killNow if true, the caption will be immediately removed instead of fading out
   * @return void
   */
  kill(killNow: boolean): void {
    currentCaption = null;
    if (this.element) {
      this.element.classList.add('fade-out');
      // this.element.className = this.element.className + ' fade-out';
      if (killNow) {
        this.element.style.display = 'none';
        this.element.remove();
      } else {
        setTimeout(() => {
          this.element.style.display = 'none';
          this.element.remove();
        }, 1000);
      }
    }
  }
}

let ssCount = 0;
class SymblSocket {
  id: number = ssCount++;
  userName: string = null; /** User name of the client **/
  private bufferSize: number = 8192; /** Buffer size of the audio stream **/
  ws: WebSocket = null; /** The websocket connection **/
  connected: boolean = true; /** Whether the socket connection is open **/
  closed: boolean = false; /** Whether the socket connection is closed **/
  requestStarted: boolean =
    false; /** Whether the initial start request has been made **/
  credentials: any = false;
  _conversationId: string = null;
  gainNode: GainNode = null;
  config: {
    confidenceThreshold: number /** Minimum confidence value for an insight to be detected **/;
    languageCode: string;
    insightsEnabled: boolean;
    trackers: Array<{ name: string; vocabulary: Array<string> }>;
  } = null;
  observer: {
    captionObservers: {
      onCaptioningToggled: {
        (callback: (isEnabled: boolean, caption?: Caption) => void): void;
      }[];
      onCaptionCreated: (callback: any) => void;
      onCaptionUpdated: { (callback: (caption: Caption) => void): void }[];
    };
    insightObservers: {
      onInsightResult: { (callback: () => void): void };
    };
    topicObservers: {
      onTopicResult: { (callback: () => void): void };
    };
    trackerObservers: {
      onTrackerResult: { (callback: () => void): void };
    };
    transcriptObservers: {
      onTranscriptCreated: {
        (callback: (transcript: Transcript) => void): void;
      };
    };
  };
  constructor(
    config: {
      confidenceThreshold: number;
      languageCode: string;
      insightsEnabled: boolean;
      trackers: Array<{ name: string; vocabulary: Array<string> }>;
    },
    credentials: {
      attendeeId: string /** UUID of the Chime attendee **/;
      userName?: string /** Name of the Chime Attendee **/;
      meetingId: string /** UUID of the Chime meeting **/;
      meeting?: string /** Name of the Chime meeting **/;
    }
  ) {
    this.id = ssCount++;
    this.config = config;
    this.credentials = credentials;
    this.userName = this.credentials.userName;
    // const self = this;
    ws.onmessage = (event) => this.onMessage(event);
    ws.onclose = (event) => this.onClose(event);
    ws.onerror = (event) => this.onError(event);
  }
  parseMessage(message: any) {
    const data = JSON.parse(message);
    if (data.type === 'insight_response') {
      data.insights.forEach((insight: any) => {
        new Insight({ ...insight, symblEvents });
      });
      return;
    }
    if (data.type === 'topic_response') {
      data.topics.forEach((topic: any) => {
        new Topic({ ...topic, symblEvents });
      });
      return;
    }
    if (data.type === 'tracker_response') {
      data.trackers.forEach((tracker: any) => {
        new Tracker({ ...tracker, symblEvents });
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
        if (data.message && data.message.isFinal) {
          new TranscriptItem({ ...data.message, symblEvents });
        }
        if (currentCaption) {
          currentCaption.updateContent(data.message);
        } else {
          console.info('Creating first caption');
          currentCaption = new Caption({ ...data.message, currentCaption });
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
  /**
   * Sends a start request, that begins a recognition request.
   */
  startRequest(): void {
    console.info('Starting request');
    if (this.requestStarted) {
      console.info('Trying to start request. Must stop request first');
      return;
    }
    this.requestStarted = true;
    ws.send(
      JSON.stringify({
        type: 'start_request',
        insightTypes: this.config.insightsEnabled
          ? ['question', 'action_item']
          : [],
        trackers: this.config.trackers,
        config: {
          confidenceThreshold: this.config.confidenceThreshold || 0.5,
          // "timezoneOffset": 480, // Your timezone offset from UTC in minutes
          languageCode: this.config.languageCode
            ? this.config.languageCode
            : 'en-US',
          speechRecognition: {
            encoding: 'LINEAR16',
            sampleRateHertz: 44100, // Make sure the correct sample rate is provided for best results
          },
          meetingTitle: this.credentials.meeting, // Set meeting name
        },
        speaker: {
          userId: this.credentials.attendeeId,
          name: this.credentials.userName,
        },
      })
    );
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
        const inputData =
          e.inputBuffer.getChannelData(0) || new Float32Array(this.bufferSize);
        const targetBuffer = new Int16Array(inputData.length);
        // eslint-disable-next-line functional/no-loop-statement
        for (let index = inputData.length; index > 0; index--) {
          targetBuffer[index] = 32767 * Math.min(1, inputData[index]);
        }
        // Send to websocket
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(targetBuffer.buffer);
        }
      };
    };

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
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
    } else {
      return false;
    }
  }
  /**
   * Sends a stop request that stops recognition requests.
   */
  stopRequest(): void {
    console.warn('Stopping request');
    if (!this.requestStarted) {
      console.log('Cannot stop request. Request has not started');
      return;
    }
    this.requestStarted = false;
    ws.send(
      JSON.stringify({
        type: 'stop_request',
      })
    );
  }
  close(): Promise<string> {
    console.info('Symbl closing');
    return new Promise((resolve, reject) => {
      if (!this.closed) {
        ws.addEventListener('close', (e: Event) => {
          console.info('Symbl Connection Closed', e);
          resolve('Closed');
        });
        ws.close();
      } else {
        reject('Failed to close websocket');
      }
    });
  }
}

export class Symbl {
  static ACCESS_TOKEN: string =
    null; /** Access token generated using Symbl App ID and Secret **/
  static events: SymblEvents = symblEvents;
  static transcripts: Transcript = transcript;
  static state: string = 'DISCONNECTED'; /** State of Symbl's connectors **/
  public credentials: {
    attendeeId: string;
    userName: string;
    meetingId: string;
    meeting: string;
  };
  public meeting: any = null;
  isMuted: boolean = false; /** Whether the user is on mute **/
  config?: {
    confidenceThreshold: number /** Minimum confidence needed for an insight to be created **/;
    languageCode: string /** language code for the meeting - can be `en-US, en-AU, en-GB, es-ES, de-DE, nl-NL, it-IT, fr-FR, fr-CA, ja-JP` **/;
    insightsEnabled: boolean /** Whether to enable real-time insights **/;
    trackers: Array<{ name: string; vocabulary: Array<string> }>;
  } = {
    // Symbl Config
    confidenceThreshold: 0.5,
    languageCode: 'en-US',
    insightsEnabled: true,
    trackers: [],
  };
  url: string = null; /** Realtime API endpoint **/
  meetingId: string = null; /** UUID of the Chime meeting **/
  constructor(
    chime: {
      attendeeId: string /** UUID of the Chime attendee **/;
      userName: string /** Name of the Chime Attendee **/;
      meetingId: string /** UUID of the Chime meeting **/;
      meeting: string /** Name of the Chime meeting **/;
    },
    config?: {
      confidenceThreshold: number /** Minimum confidence needed for an insight to be created **/;
      languageCode: string /** language code for the meeting - can be `en-US, en-AU, en-GB, es-ES, de-DE, nl-NL, it-IT, fr-FR, fr-CA, ja-JP` **/;
      insightsEnabled: boolean /** Whether to enable real-time insights **/;
      trackers: Array<{ name: string; vocabulary: Array<string> }>;
    }
  ) {
    this.credentials = chime;
    this.meetingId = chime.meetingId;
    this.meeting = chime.meeting;
    console.log('credentials', this.credentials, 'meetingId', this.meetingId);

    // this.videoContainerId = videoContainerId;
    if (!Symbl.ACCESS_TOKEN) {
      throw new Error('Cannot connect to symbl. Access token undefined');
    }
    if (!chime.meetingId) {
      throw new Error('Chime Meeting ID not provided.');
    }
    this.url = `wss://api.symbl.ai/v1/realtime/insights/${chime.meetingId}?access_token=${Symbl.ACCESS_TOKEN}`;

    if (config) {
      this.config = config;
    }
  }
  /**
   * Toggle closed captioning on or off.
   * @param force Sets the captioning to a state rather than toggling. If true, the captions
   */
  toggleClosedCaptioning(force?: boolean): void {
    Caption.toggleCaptions(force);
  }
  /**
   * Subscribes to closed captioning events
   * @param  handler contains events that may be subscribed to
   * @return         function that unsubscribes handler
   */
  subscribeToCaptioningEvents(handler: {
    onCaptioningToggled: (callback: any) => void;
    onCaptionCreated: (callback: any) => void;
    onCaptionUpdated: (callback: any) => void;
  }): any {
    return symblEvents.subscribe('caption', handler);
  }

  /**
   * [subscribeToInsightEvents description]
   * @param  handler contains handler emitted when an insight is created.
   * @return         [description]
   */
  subscribeToInsightEvents(handler: {
    onInsightCreated: (callback: any) => void;
  }): any {
    return symblEvents.subscribe('insight', handler);
  }

  subscribeToTranscriptEvents(handler: {
    onTranscriptCreated: (callback: any) => void;
  }): any {
    return symblEvents.subscribe('transcript', handler);
  }
  subscribeToTopicEvents(handler: {
    onTopicCreated: (callback: any) => void;
  }): any {
    return symblEvents.subscribe('topic', handler);
  }
  subscribeToTrackerEvents(handler: {
    onTrackerCreated: (callback: any) => void;
  }): any {
    return symblEvents.subscribe('tracker', handler);
  }
  /**
   * Get's Symbl's conversationId
   * @return      Symbl Websocket conversation id.
   */
  get conversationId(): string {
    if (!symblSocket) {
      throw new Error(
        'Cannot retrieve conversation ID. Symbl is not connected.'
      );
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
  /**
   * Disconnect the Symbl adapter
   */
  disconnect(): void {
    try {
      symblSocket.close();
    } catch (err) {
      console.error('Error on Symbl Disconnect', err);
    }
  }
  /**
   * Connects Symbl to the real-time meeting room
   * @return Promise that resolves with an instance of the Symbl Socket class after connection
   */
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
  /**
   * Sends a `stop_recognition` event.
   * @return
   */
  stop(): void {
    if (symblSocket) {
      if (symblSocket.requestStarted) {
        symblSocket.stopRequest();
        symblSocket.close();
        symblSocket = null;
      }
    }
  }
  /**
   * Retrieves the meeting summary URL.
   * @return Promise that resolves the Meeting Summary URL.
   */
  async getSummaryUrl(): Promise<string> {
    const res = await fetch(
      `https://api.symbl.ai/v1/conversations/${this.conversationId}/experiences`,
      {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': Symbl.ACCESS_TOKEN,
        },
        mode: 'cors',
        body: JSON.stringify({
          name: 'verbose-text-summary',
        }),
      }
    );
    const data = await res.json();
    return Promise.resolve(data.url);
  }
}
