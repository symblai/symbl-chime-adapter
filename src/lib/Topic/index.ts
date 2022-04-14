/* eslint-disable @typescript-eslint/no-explicit-any */
import { hashCode } from '../utils/hashCode';

/* `Topic` is a class that represents a topic in a conversation */
export class Topic {
  data: {
    id: string;
    messageReferences: [
      {
        id: string;
        relation: string;
      }
    ];
    phrases: string;
    rootWords: [
      {
        text: string /** Tag text **/;
      }
    ];
    score: number /** ID of the topic **/;
    type: string /** Type of the topic - action_item, question, follow_up **/;
  } = null;

  id: string = null; /** Insight ID specific to the object **/
  _element: HTMLSpanElement = null;

  constructor(data: any) {
    this.data = null;
    this.id = null; /** Insight ID specific to the object **/
    this._element = null;
    this.data = data;
    this.id = '' + hashCode(this.data.phrases);
    //   console.info('Creating Topic', data, topics.includes(data));
    data.symblEvents.emit('topic', 'onTopicCreated', this);
  }

  /**
   * Create a span element with the text of the topic and the id of the topic
   * @returns The `createElement()` method returns an HTML element.
   */
  createElement(): HTMLSpanElement {
    const content = this.data.phrases;

    const element = document.createElement('span');
    element.className = 'topics-tab';
    element.style.fontSize = '12px';
    element.style.color = 'rgb(1,0,0)';
    element.style.display = 'inline-block';
    element.style.margin = '0px 3px';
    element.style.verticalAlign = 'middle';
    element.style.cursor = 'default';
    element.innerText = content;
    element.id = this.id;
    return element;
  }

  get type(): string {
    // action_item || question || follow_up
    return this.data.type;
  }

  get topicId() {
    return this.data.id;
  }

  get score() {
    return this.data.score;
  }
  get phrases() {
    return this.data.phrases;
  }
}
