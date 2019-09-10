// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler } = require('botbuilder');

class MyBot extends ActivityHandler {
  /**
   *
   * @param {ConversationState} conversationState
   * @param {UserState} userState
   * @param {Dialog} dialog
   */
  constructor(conversationState, userState, itemsDialog) {
    super();
    if (!conversationState) throw new Error('[Bot]: Missing parameter. conversationState is required');
    if (!userState) throw new Error('[Bot]: Missing parameter. userState is required');
    if (!itemsDialog) throw new Error('[Bot]: Missing parameter. itemsDialog is required');
    this.conversationState = conversationState;
    this.userState = userState;
    this.itemsDialog = itemsDialog;
    this.dialogState = this.conversationState.createProperty('DialogState');

    // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
    this.onMessage(async (context, next) => {
      let userWord = await context.activity.text;
      switch (userWord) {
        case '遅い':
        case 'まだ':
          await context.sendActivity(`どうも相済みません、いま出たとこです。`);
          break;
        case 'db':
          await context.sendActivity(this.itemsDialog.id);
          break;
        default:
          // Run the Dialog with the new message Activity.
          await this.itemsDialog.run(context, this.dialogState);
      }
      // By calling next() you ensure that the next BotHandler is run.
      await next();
    });

    // onDialog fires at the end of the event emission process, and should be used to handle Dialog activity.
    this.onDialog(async (context, next) => {
      // Save any state changes. The load happened during the execution of the Dialog.
      await this.conversationState.saveChanges(context, false);
      await this.userState.saveChanges(context, false);
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;
      for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
        if (membersAdded[cnt].id !== context.activity.recipient.id) {
          await context.sendActivity('ありがとうございます。出前迅速長寿庵です。ご注文ですか？');
        }
      }
      // By calling next() you ensure that the next BotHandler is run.
      await next();
    });
  }
}

module.exports.MyBot = MyBot;
