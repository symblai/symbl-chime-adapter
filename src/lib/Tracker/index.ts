/* eslint-disable functional/no-this-expression */
/* eslint-disable functional/prefer-readonly-type */
/* eslint-disable functional/no-class */
/* eslint-disable functional/immutable-data */
import { hashCode } from '../utils/hashCode';
export class Tracker {
  data: {
    name: string;
    matches: [
      {
        type: string;
        value: string;
        messageRefs: [
          {
            id?: string;
            text?: string;
            offset?: number;
          }
        ];
      }
    ];
    insightRefs: [
      {
        text?: string;
        type?: string;
        offset?: number;
      }
    ];
  } = null;
  id: string = null; /** Insight ID specific to the object **/
  _element: HTMLDivElement = null;

  constructor(data: any) {
    this.data = null;
    this.id = null; /** Insight ID specific to the object **/
    this._element = null;
    this.data = data;
    this.id = '' + hashCode(this.data.name);
    //   console.info('Creating Tracker', data, trackers.includes(data));
    data.symblEvents.emit('tracker', 'onTrackerCreated', this);
  }
  createElement(): HTMLElement {
    const name = this.data.name;

    const element = document.createElement('span');
    element.className = 'trackers-tab';
    element.style.fontSize = '12px';
    element.style.color = 'rgb(1,0,0)';
    element.style.display = 'inline-block';
    element.style.margin = '0px 3px';
    element.style.verticalAlign = 'middle';
    element.style.cursor = 'default';
    element.innerText = name;
    element.id = this.id;
    return element;
  }

  get name() {
    return this.data.name;
  }
  get matches() {
    return this.data.matches;
  }
  get elementId() {
    return this.id;
  }
}
