const AWS = require("aws-sdk");

const eb = new AWS.EventBridge({
  endpoint: "http://127.0.0.1:5656",
  region: "localhost",
});

const say = async () => {
  console.log("publish event...");
  await eb
    .putEvents({
      Entries: [
        {
          Source: "aws.sls",
          DetailType: "OfflineEventBridge",
          Detail: JSON.stringify({ say: "hello" }),
        },
      ],
    })
    .promise();
};

module.exports = { say };
