# sls-offline-aws-eventbridge

## How to use it

1. install from npm:

   ```
   yarn add sls-offline-aws-eventbridge

   ```

2. add config in serverless.yml

   ```
   plugins:
       - serverless-offline
       - sls-offline-aws-eventbridge

   custom:
       sls-offline-aws-eventbridge:
           port: 5656

   ```

3. init event bridge with the custom port:5656

   ```
   const eb = new AWS.EventBridge({
    endpoint: "http://127.0.0.1:5656",
    region: "localhost",
   });
   ```

4. write sayHello func to publish event

   ```
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
   ```

5. write a func to handler the event

   ```
   const say = async (event) => {
       const { detail } = event;
       console.log("Handler say:", detail);
   };
   ```

6. config sls functions

   ```
   functions:
   sayHello:
       handler: src/hello.say

   handlerSay:
       handler: src/handler.say
       events:
       - eventBridge:
           pattern:
               source:
               - aws.sls
               detail-type:
               - OfflineEventBridge
   ```

7. start offline

   ```
   sls offline  --lambdaPort 7072
   ```

8. after start, invoke sayHello func

   ```
       sls invoke local -f sayHello
   ```

9. after invoke local func, the eventbridge will print the event details.

10. All the sources are put in sample/sample1-hello.
