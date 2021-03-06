/* eslint-disable @typescript-eslint/no-var-requires */
const axios = require('axios');

const flowSteps = [
  {
    id: 1,
    message: `You're a frog on a log in a bog. So...`,
    options: [
      {
        message: 'Leap left to lilly pad',
        nextStepId: 2,
      },
      {
        message: 'Slip in for a dip',
        nextStepId: 3,
      },
    ],
  },
  {
    id: 2,
    message: `Toad!`,
    options: [
      {
        message: 'Leap back to your log',
        nextStepId: 1,
      },
      {
        message: 'Stay to talk to toad',
        nextStepId: 4,
      },
    ],
  },
  {
    id: 3,
    message: `Dip: Splish splash I was taking a bathe. You see an army of frogs swimming by.`,
    options: [
      {
        message: 'Dry off on the log',
        nextStepId: 1,
      },
      {
        message: 'Try to join the group',
        nextStepId: 5,
      },
    ],
  },
  {
    id: 4,
    message: `Oh no!! Cane toad is now having frog legs for lunch. Your legs!`,
    options: [
      {
        message: 'Try again',
        nextStepId: 1,
      }
    ],
  },
  {
    id: 5,
    message: `You have fun swimming until you make it to the bank. A fellow frog says he can hook you up half off a shirt. What size are you?`,
    options: [
      {
        message: `S`,
        nextStepId: 6,
      },
      {
        message: `M`,
        nextStepId: 6,
      },
      {
        message: `L`,
        nextStepId: 7,
      },
      {
        message: `XL`,
        nextStepId: 8,
      },
    ],
  },
];

const constructMessageFromStep = (message, options) => `
  ${message}

  ${options.map(({ message }, index) => `${index}. ${message}`)}
`;

const DEFAULT_KEYWORD = 'GAVINFOSTERSHOPSAVE10'

exports.handler = async (event, context) => {
  try {
    const {
      event_data: {
        subscriber_id: subscriberId,
        from_number: fromNumber,
        body,
      },
    } = JSON.parse(event.body);

    const { POSTSCRIPT_SECRET } = process.env;

    const { data } = await axios.get(
      `https://api.postscript.io/api/v2/subscribers/${subscriberId}`,
      {
        headers: { Authorization: `Bearer ${POSTSCRIPT_SECRET}` },
      },
    );

    const subscriberFlowStepId = data?.properties?.subscriberFlowStepId || 0

    const currentFlowStep = flowSteps.find(step => step.id === subscriberFlowStepId)

    // Check if the response includes the number of an option
    const flowStep = currentFlowStep.options.find(
      (option, index) => body.includes(index),
    );

    // Resend current text if not
    const nextFlowStepId = flowStep?.nextStepId || subscriberFlowStepId

    const nextFlowStep = flowSteps.find(({ id }) => nextFlowStepId === id);

    // Send message to subscriber
    const newMessageBody = constructMessageFromStep(nextFlowStep.message, nextFlowStep.options)

    const { data: messageResponseData } = await axios.post('https://api.postscript.io/api/v2/message_requests', {
      body: newMessageBody,
      subscriber_id: subscriberId,
      category: 'promotional'
    }, {
      headers: { Authorization: `Bearer ${POSTSCRIPT_SECRET}` },
    })

    // Updating subscriber
    await axios.put(`https://api.postscript.io/api/v2/subscribers/${subscriberId}`, {
      phone_number: fromNumber,
      origin: 'other',
      keyword: DEFAULT_KEYWORD,
      properties: {
        ...data?.properties,
        subscriberFlowStep: nextFlowStepId
      }
    }, {
      headers: { Authorization: `Bearer ${POSTSCRIPT_SECRET}` },
    })

    return {
      statusCode: 200,
      body: JSON.stringify(messageResponseData),
    };
  } catch (err) {
    console.log(err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create subscriber' }),
    };
  }
};
