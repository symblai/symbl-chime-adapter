/* eslint-disable @typescript-eslint/no-explicit-any */

import { hashCode } from '../utils/hashCode';

/* It creates an insight object that is used to display the insights in the UI. */
export class Insight {
  data: {
    assignee: {
      name?: string /** Name of the user the action item has been assigned to **/;
      userId: string /** id of the user the action item is assigned to **/;
      id: string;
    };
    payload: {
      content: string;
      contentType: string;
    };
    hints?: [
      {
        key: string;
        value: number;
      }
    ];
    from?: {
      id: string;
      userId: string;
    } /** User from whom the action item was assigned **/;
    tags?: {
      text: string /** Tag text **/;
      type: string /** Type of tag **/;
    };
    id: string /** ID of the insight **/;
    //text: string; /** Insight text **/
    type: string /** Type of the insight - action_item, question, follow_up **/;
    confidence?: number /** Accuracy quotient of the insight **/;
  } = null;
  id: string = null; /** Insight ID specific to the object **/
  _element: HTMLDivElement = null;

  constructor(data: any) {
    this.data = data;
    this.id = '' + hashCode(data.text + data.confidence);
    //   console.info('Creating insight', data, insights.includes(data));
    data.symblEvents.emit('insight', 'onInsightCreated', this);
  }

  /* The below code is creating a div element with a class of card and a class of card-body. */
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
        type = 'Question';
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
    const content = this.data.payload.content;
    const insightElementStr = `<div class="card text-white ${color} mb-3" style="max-width: 18rem; margin: 10px;">
              <div class="card-header">${type}</div>
              <div class="card-body">
                  <p class="card-text">${content}</p>
                  <p class="card-text"><small class="text">${footer}</small></p>
              </div>
          </div>`;
    const element = document.createElement('div');
    element.innerHTML = insightElementStr;
    element.id = this.id;
    this.element = element;
    return element;
  }
  /**
   * Hints are applicable to `follow up` action items. They include information about whether it was a definitive
   * @return [Array] follow up hints
   */
  get hints(): [{ key: string; value: number | boolean }] | void {
    if (this.data && this.data.hints) {
      return this.data.hints;
    }
  }
  get type(): string {
    // action_item || question || follow_up
    return this.data.type;
  }

  /**
   * The assignee of the insight
   * @return {assignee}
   */
  get assignee(): { name?: string; userId: string; id: string } {
    return this.data.assignee;
  }
  /**
   * User that assigned the action item.
   * @return [description]
   */
  get from(): { name?: string; id: string; userId: string } {
    return this.data.from;
  }
  /**
   * ID of the conversational insight generated in the conversation
   * @return ID of the insight
   */
  get insightId(): string {
    return this.data.id;
  }
  /**
   * Content of the insight.
   * @return Insight content
   */
  get text(): string {
    return this.data.payload.content;
  }
  /**
   * Element that is added to the container via the add function
   * @return Insight Element
   */
  get element(): HTMLDivElement {
    return this._element;
  }
  /**
   * Sets the element for the insight
   * @param  element [HTMLDivElement] HTML
   * @return         [description]
   */
  set element(element: HTMLDivElement) {
    this._element = element;
  }
  /**
   * Add the element to the container and scroll to the bottom of the container
   * @param {HTMLElement} [container=null] - HTMLElement = null
   */
  add(container: HTMLElement = null) {
    if (container && this.element) {
      container.append(this.element);
      container.scroll(0, 1000000);
    }
  }
  /**
   * Remove the element from the DOM
   */
  remove() {
    this.element.remove();
  }
}
