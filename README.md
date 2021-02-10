# Symbl.ai for Amazon Chime's Adapter

============================

[![websocket](https://img.shields.io/badge/symbl-websocket-brightgreen)](https://docs.symbl.ai/docs/streamingapi/overview/introduction)

Symbl's APIs empower developers to enable: 

- **Real-time** analysis of free-flowing discussions to automatically surface highly relevant summary discussion topics, contextual insights, suggestive action items, follow-ups, decisions, and questions.\
- **Voice APIs** that makes it easy to add AI-powered conversational intelligence to either [telephony][telephony] or [WebSocket][websocket] interfaces.
- **Conversation APIs** that provide a REST interface for managing and processing your conversation data.
- **Summary UI** with a fully customizable and editable reference experience that indexes a searchable transcript and shows generated actionable insights, topics, timecodes, and speaker information.

<hr />

## Enable Symbl.ai to Run on Your Amazon Chime's Adapter

Enable Symbl.ai's real-time WebSocket's adapter for Amazon Chime

 * [Setup](#setup)
 * [Integration](#integration)
 * [Conclusion](#conclusion)
 * [Community](#community)


## Setup

Sign up for a free account at Symbl.ai [here][signup]. If you are new to Symbl.a, check out the [introduction][api_overview] on the docs or feel free to try out APIs with [Postman][postman]. 

## Integration 

### Install symbl-chime-adapter

To get started you will need to add the symbl-chime-adapter to your node dependencies.


``` bash
npm install --save symbl-chime-adapter
```

### Symbl Credentials
Create an account in the Symbl Console if you have not done so already.

After you login, you will find your appId and appSecret on the home page.

Create a .env file in demos/browser and demos/serverless/src that includes your appId and appSecret as shown below.

``` bash
SYMBL_APP_ID=<xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx>
SYMBL_APP_SECRET=<xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx>
```
The App ID and App Secret are used to authenticate your session with Symbl by generating an access token. 

Your App ID and Secret should not be shared or posted publicly.

## Initialization
The Symbl adapter should be initialized after connecting to your Chime video conference.

To connect each Chime participant to Symbl, it is best practice to generate the client’s access token on your backend service.

After the token is generated it can be returned along with the chime meeting configuration as shown below. For a full example of this, please see this page of our chime demo application.

```typescript
const res = await fetch(`https://api.symbl.ai/oauth2/token:generate`, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({
        type: 'application',
        appId: symblAppId,
        appSecret: symblAppSecret,
      }),
    });
    accessToken = await res.json();
    
    return response(200, 'application/json', JSON.stringify({
    JoinInfo: {
      Meeting: meeting,
      Attendee: attendee,
      Symbl: accessToken,
    },
  }, null, 2));
};
```
After the token is generated and returned by your server, the Symbl Access Token can be applied by setting the static property ACCESS_TOKEN of the Symbl class.


``` bash
Symbl.ACCESS_TOKEN = joinInfo.Symbl.accessToken;
```
After the access token has been set and your client has joined the Chime meeting, you can instantiate the Symbl class.

The Symbl constructor takes two parameters:

#### chime

| Field               | Type    | Description                                                                                                                 |
|---------------------|---------|-----------------------------------------------------------------------------------------------------------------------------|
| attendeeId          | string  | Attendee unique identifier                                                                                                  |
| userName            | string  | Attendee name                                                                                                               |
| meetingId           | string  | Unique meeting identifier                                                                                                   |
| meeting             | string  | Name of meeting                                                                                                             |

#### options
| Field               | Type    | Description                                                                                                                 |
|---------------------|---------|-----------------------------------------------------------------------------------------------------------------------------|
| confidenceThreshold | double  | default: 0.5 - Minimum required confidence for insight to be recognized.                                                    |
| languageCode        | array   | Array of comma separated strings. Valid language codes en-US, en-GB, en-AU, it-IT, nl-NL, fr-FR, fr-CA, de-DE, es-US, ja-JP |
| insightsEnabled     | boolean | default: true - True if insights should be generated for conversation.                                                      |

 Whether or not to generate insights.

``` Typescript
  this.symbl = new Symbl(
      {
          attendeeId: this.configuration.credentials.attendeeId,
          userName: this.configuration.credentials.externalUserId.split('#').pop(),
          meetingId: this.configuration.credentials.meetingId,
          meeting: this.meeting,
      }, {
          confidenceThreshold: 0.5,
          languageCode: 'en-US',
          insightsEnabled: true,
      }
  );
  // subscribe to realtime event publishers (see below)
  this.symbl.start();
  ```
## Subscribe to Realtime Events
Learn how to subscribe to Symbl’s conversational insights and transcription.

There are three different event types that you can subscribe through with Symbl’s Conversational AI Adapter for Chime.

* Closed Captions
* Transcripts
* Insights


### Closed Captions

Realtime closed captioning is enabled by default and provides realtime transcription of your audio content. Closed captioning tracks can be added to any video element through the callback handler to your Symbl instance.

#### Handler

| Field   | Type   | Description     |
|---------|--------|-----------------|
| id      | string | Insight ID      |
| text    | string | Insight content |
| asignee | object | Assignee Object |

The handler can be added using the `subscribeToCaptioningEvents` function of the Symbl instance.

``` typescript
const captioningHandler = {
    onCaptioningToggled: (ccEnabled: boolean) => {
        // Implement
    },
    onCaptionCreated: (caption: Caption) => {
        console.warn('Caption created', caption);
        // Retrieve the video element that you wish to add the subtitle tracks to.
        const activeVideoElement = getActiveVideoElement() as HTMLVideoElement;
        if (activeVideoElement) {
            caption.setVideoElement(activeVideoElement);
        }
    },
    onCaptionUpdated: (caption: Caption) => {
        const activeVideoElement = getActiveVideoElement() as HTMLVideoElement;
        
        caption.setVideoElement(activeVideoElement);
    },
};
symbl.subscribeToCaptioningEvents(captioningHandler);
```
Setting the video element that subtitles will be superimposed over should be done by calling the setVideoElement function on the Caption class.

If your video chat application has alternating primary video tiles, this can be used to change which element is active.

### Realtime Insights
Realtime insights are generated as Symbl processes the conversation in your video chat platform.

When an Insight is detected by Symbl and the onInsightCreated event is emitted, an Insight object is passed to the callback function provided in the Insight handler.

The Insight class holds data about the insight generated.

#### Insight Class Attributes

| Field   | Type   | Description     |
|---------|--------|-----------------|
| id      | string | Insight ID      |
| text    | string | Insight content |
| asignee | object | Assignee Object |

### Handler

The Symbl adapter exposes a handler function, subscribeToInsightEvents, that has a callback function onInsightCreated.

Insights are enabled by default, but can be manually disabled through the insightsEnabled parameter in the config of the Symbl constructor.

``` typescript
new Symbl(chimeConfiguration, {insightsEnabled: true});
```

Subscribing to the Insight publisher is achieved by passing a handler to the subscribeToInsightEvents function of your Symbl instance.

#### Example

When an insight event is emitted from the onInsightCreated handler, you can use the Insight object returned and either use the createElement function to create a default element or you can use the data included in the Insight object returned in the handlers callback to create your own element, capture the data and store as a metric, etc…

``` typescript
const insightHandler = {
    onInsightCreated: (insight: Insight) => {
    
        // Creates a predesigned insight element
        const element = insight.createElement();
        
        // Customize any styling
        element.classList.add('mx-auto');
        element.style.width = '98%';
        
        /** OR create your own element
        insight.element = document.createElement('div');
        insight.element.innerHTML = `<div style="width: auto; height: 400px">
                                 <h3 style="font-width: 400;">
                                     ${insight.type}
                                 </h3>
                                 <br>
                                 <h2>
                                     ${insight.text}
                                 </h2>
                              </div>`;          
        **/
        
        // Retrieve container you wish to add insights to.
        const insightContainer = document.getElementById('receive-insight');
        
        // Call add on the insight object to add it to DIV
        insight.add(insightContainer);
    }
};
// Subscribe to realtime insight events using the handler created above
this.symbl.subscribeToInsightEvents(insightHandler);
```


## Realtime Transcripts
Realtime transcripts differ slightly from realtime closed-captioning. A Transcript object is created when after speech is no longer detected.

### Attributes
| Field     | Type   | Description                  |
|-----------|--------|------------------------------|
| message   | string | Speech content               |
| userName  | string | Speaker Name                 |
| userId    | string | Speaker Id                   |
| timestamp | Date   | Time of the transcript event |

### Handler
The Transcript handler has only one event, onTranscriptCreated. Each time a speaker finishes speaking a Transcript object is generated.

Subscribing to the transcript publisher is achieved by passing a handler to the subscribeToTranscriptEvents function of your Symblinstance.

#### Example

``` typescript
const transcriptHandler = {
    onTranscriptCreated: (transcript: Transcript) => {
      // Handle transcript item
    }
};
this.symbl.subscribeToTranscriptEvents(transcriptHandler);
```

## Generating Meeting Summary URL
To generate a meeting summary URL, you need only to call the getSummaryUrlfunction of your Symbl instance.


```typescript
const meetingSummaryUrl = await symbl.getSummaryUrl();
```
## Conclusion 

Your application now enables Symbl.ai to run on top of Amazon Chime's adapter. 

## Community 

 If you are having trouble, check out our [API overview](api_overview) or test your endpoints in [Postman](postman).If you have any questions, feel free to reach out to us at devrelations@symbl.ai or through our [Community Slack][slack] or our [developer community][developer_community]. 

This guide is actively developed, and we love to hear from you! Please feel free to [create an issue][issues] or [open a pull request][pulls] with your questions, comments, suggestions and feedback. If you liked our integration guide, please star our repo!


This library is released under the [MIT License][license]

[license]: LICENSE.txt
[telephony]: https://docs.symbl.ai/?&_ga=2.164569275.526040298.1609788827-1505817196.1609788827#voice-api
[websocket]: https://docs.symbl.ai/?_ga=2.96332568.526040298.1609788827-1505817196.1609788827#ws-voice-api-realtime-websocket
[developer_community]: https://community.symbl.ai/?_ga=2.134156042.526040298.1609788827-1505817196.1609788827
[slack]: https://join.slack.com/t/symbldotai/shared_invite/zt-4sic2s11-D3x496pll8UHSJ89cm78CA
[signup]: https://platform.symbl.ai/?_ga=2.63499307.526040298.1609788827-1505817196.1609788827
[issues]: https://github.com/
[pulls]: https://github.com/

[api_overview]: https://docs.symbl.ai/docs/
[postman]: https://docs.symbl.ai/docs/tools/postman/
