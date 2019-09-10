// 品物一覧（つまりメニュー）

const path = require('path');
const util = require('util');
const parse = require('csv-parse/lib/sync');
const fs = require('fs');
const prf = util.promisify(fs.readFile);


// 個々の注文品
class Item {
  constructor(name, price) {
    this.name = name;
    this.price = price;
  }
}


// 注文品一覧
class Items {
  constructor() {
    this.recs = {};
    this.menu = {};
    this.names = [];
    this.readCSV();
  }
  readCSV() {
    return new Promise((resolve) => {
      const data = path.join(__dirname, '../resource/items.csv');
      prf(data).then((buf) => {
        this.recs = parse(buf, {
          columns: true,
          skip_empty_lines: true,
        });
        this.recs.forEach(( i ) => {
          this.menu[i.name] = new Item(i.name, i.price);
        });
        Object.keys(this.menu).forEach(( key ) => {
          this.names.push(this.menu[key].name);
        });
        resolve('finished');
      }).catch((err) => {
        throw err;
      });
    });
  }
}

module.exports = {
  Items,
  Item,
};
