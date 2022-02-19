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
];

const constructMessageFromStep = (message, options) => `
  ${message}

  ${options.map(({ message }, index) => `${index}. ${message}`)}
`;

exports.handler = async (event, context) => {
  try {
    const {
      event_data: {
        subscriber_id: subscriberId,
        from_number: fromNumber,
        body,
      },
    } = JSON.parse(event.body);

    console.log('body: ', body)

    const { POSTSCRIPT_SECRET } = process.env;

    console.log('subscriberId: ', subscriberId)

    const data = await axios.get(
      `https://api.postscript.io/api/v2/subscribers/${subscriberId}`,
      {
        headers: { Authorization: `Bearer ${POSTSCRIPT_SECRET}` },
      },
    );

    console.log('data: ', data)

    const {
      data: {
        properties: { subscriberFlowStep = 1 } = {},
      },
    } = data

    console.log('subscriberFlowStep: ', subscriberFlowStep)

    // Check if the response includes the number of an option
    const nextFlowStepId = flowSteps[subscriberFlowStep].options.find(
      (option, index) => body.includes(index),
    ).nextStepId;

    console.log('nextFlowStepId: ', nextFlowStepId)

    const nextFlowStep = flowSteps.find(({ id }) => nextFlowStepId === id);

    console.log('nextFlowStep: ', nextFlowStep)

    // Send message to subscriber
    const newMessageBody = constructMessageFromStep(nextFlowStep.message, nextFlowStep.options)

    console.log('newMessageBody: ', newMessageBody)

    const result = await axios.post('https://api.postscript.io/api/v2/message_requests', {
      body: newMessageBody,
      subscriber_id: subscriberId,
      category: 'promotional'
    }, {
      headers: { Authorization: `Bearer ${POSTSCRIPT_SECRET}` },
    })

    console.log('result: ', result)

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.log(err);

    // Send different message to subscriber asking them to retry the step

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create subscriber' }),
    };
  }
};
