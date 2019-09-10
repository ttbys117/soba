// 注文品を聞く
//

// csvファイルから品物一覧を読み込むクラス
const {Items} = require('../primitives/items');

// SDKで提供されるダイアログ
const {
  ChoiceFactory,
  ChoicePrompt,
  ComponentDialog,
  ConfirmPrompt,
  DialogSet,
  DialogTurnStatus,
  NumberPrompt,
  TextPrompt,
  WaterfallDialog,
} = require('botbuilder-dialogs');


const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const USER_PROFILE = 'USER_PROFILE';
const SINGLE_ITEM_DIALOG = 'WATERFALL_DIALOG';


// ComponentDialogとは？
// https://docs.microsoft.com/en-us/javascript/api/botbuilder-dialogs/componentdialog?view=botbuilder-ts-latest
class ItemsDialog extends ComponentDialog {
  constructor(userState) {
    super('ItemsDialog');

    this.userProfile = userState.createProperty(USER_PROFILE);

    this.addDialog(new TextPrompt(NAME_PROMPT));
    this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
    // https://docs.microsoft.com/en-us/javascript/api/botbuilder-dialogs/choiceprompt?view=botbuilder-ts-latest
    this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
    this.addDialog(new NumberPrompt(NUMBER_PROMPT, this.agePromptValidator));

    // Q: 以下は何をしているか
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
    // https://blog.bitsrc.io/understanding-call-bind-and-apply-methods-in-javascript-33dbf3217be
    // https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-dialog-manage-conversation-flow?view=azure-bot-service-4.0&tabs=javascript
    this.addDialog(new WaterfallDialog(SINGLE_ITEM_DIALOG, [
      this.sinamonoStep.bind(this),
      this.amountStep.bind(this),
      this.amtOkStep.bind(this),
      this.loopStep.bind(this),
      this.lastStep.bind(this),
    ]));
    // A: 新しいWaterfallDialogを作り、その引数にこのクラスのクラスメソッドの配列を渡している。
    // bindは、渡したクラスメソッド（のコピー）内で`this`が
    // 常にこのクラス (ItemsDialog)を参照することを保証するために使われている。

    // ダイアログの中で保持・参照する値
    // ダイアログ1回ならthisのプロパティでいいが、同じ応答を繰り返す場合にはDialogContextのプロパティにする
    this.settledItems = 'settled-items';

    this.initialDialogId = SINGLE_ITEM_DIALOG;
    // TODO: 複数の品物の注文に対応。
              // -> 繰り返し部分を独立のDialogとする

    // お品書き作成
    this.items = new Items();

  }


  /**
   * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
   * If no dialog is active, it will start the default dialog.
   * @param {*} turnContext
   * @param {*} accessor
   */
  async run(turnContext, accessor) {
    const dialogSet = new DialogSet(accessor);
    dialogSet.add(this);

    const dialogContext = await dialogSet.createContext(turnContext);
    const results = await dialogContext.continueDialog();
    if (results.status === DialogTurnStatus.empty) {
      await dialogContext.beginDialog(this.id);
    }
  }

  // 各ステップを記述する。
  async sinamonoStep(step) {
    // ダイアログの初期値に配列が渡されたらそれを確定した品物とし、そうでなければ確定した品物を空の配列にする
    // https://docs.microsoft.com/en-us/javascript/api/botbuilder-dialogs/waterfallstepcontext?view=botbuilder-ts-latest
    const itemsList = Array.isArray(step.options)? step.options: [];
    step.values[this.settledItems] = itemsList;

    // await this.items.readCSV();
    return await step.prompt(CHOICE_PROMPT, {
      prompt: 'どれにしますか。',
      choices: ChoiceFactory.toChoices(this.items.names),
    });
  }

  async amountStep(step) {
    const n = step.result.value;
    this['item'] = this.items.menu[n];
    step.values.name = n;
    return await step.prompt(CHOICE_PROMPT, {
      prompt: `${ n }は１つ${ this.items.menu[n].price }円です。\nいくつご注文ですか？`,
      choices: ChoiceFactory.toChoices(['1', '2', '3', '4', '5']),
    });
  }

  async amtOkStep(step) {
    const amt = parseInt(step.result.value, 10);
    step.values.amount = amt;
    const i = this.items.menu[step.values.name];
    let msg = `${ i.name }が${ amt }つで${ i.price * amt }円になります。\n`;
    await step.context.sendActivity(msg);
    return await step.prompt(CHOICE_PROMPT, {
      prompt: 'よろしいですか？',
      choices: ChoiceFactory.toChoices(['はい', 'いいえ']),		// 注意：ここで「`」を使わないこと
    })
  }

  async loopStep(step) {
    const yesno = step.result.value;
    if (yesno !== 'はい') {
      // この回を破棄してやり直し
      return await step.replaceDialog(SINGLE_ITEM_DIALOG);
    }   
    let items = step.values[this.settledItems];
    items.push({item: this.item, amount:step.values.amount});
    return await step.prompt(CHOICE_PROMPT, {
      prompt: 'ほかにご注文はありますか？',
      choices: ChoiceFactory.toChoices(['はい', 'いいえ']),		// 注意：ここで「`」を使わないこと
    })
  }

  async lastStep(step) {
    const list = step.values[this.settledItems];
    const yesno = step.result.value;
    if (yesno === 'はい') {
      // 次の品物へ
      return await step.replaceDialog(SINGLE_ITEM_DIALOG, list);
    } else {
      return await step.endDialog(list);
    }
  }
}

module.exports.ItemsDialog = ItemsDialog;
