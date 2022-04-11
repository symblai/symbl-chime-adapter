/* eslint-disable @typescript-eslint/no-explicit-any */
export class TranscriptItem {
  message: string = null; /** Content of the transcript **/
  userName: string = null; /** Name of the transcript speaker **/
  id: string = null; /** Transcript id **/
  userId: string =
    null; /** Email address of the speaker for the transcript item **/
  timeStamp: Date = new Date(); /** Time when the transcript was received **/
  dismissed: boolean;

  constructor(data: {
    isFinal: true;
    payload: any;
    punctuated: {
      transcript: string;
      type: 'recognition_result';
    };
    user: {
      id: string /** User ID **/;
      name: string /** Transcript item user name **/;
      userId: string;
    };
    duration: {
      /** Duration of the transcription **/
      startTime: string /** Start time of audio being transcribed **/;
      endTime: string /** End time of the audio being transcribed **/;
    };
    type: string;
    dismissed: boolean;
    symblEvents: any;
  }) {
    if (data && data.isFinal !== true) {
      throw new Error('Message is not final transcript response');
    }

    this.message = data.punctuated.transcript;
    this.userName = data.user.name;
    this.id = data.user.id;
    this.userId = data.user.userId;
    data.symblEvents.emit('transcript', 'onTranscriptCreated', this);
  }
}

export class Transcript {
  lines: Array<TranscriptItem> = []; /** Full transcript with timestamps **/
  // constructor() {}

  /**
   * Add a line to the transcript
   * @param {TranscriptItem} transcriptItem - TranscriptItem
   */
  addLine(transcriptItem: TranscriptItem): void {
    this.lines.unshift(transcriptItem);
  }

  /**
   * Prints all the lines in the chat
   * @returns The string of all the messages.
   */
  printAll(): string {
    let content = '';
    this.lines.forEach((line) => {
      content = content + `${line.userName}: ${line.message}\n`;
    });
    return content;
  }
}
