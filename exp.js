const { Items } = require('./primitives/items');

let items = new Items();

parseInt('101', 10);

async function test_1() {
  await items.readCSV();
  console.log(items.menu['ざるそば'].price);
  console.log(items.names);
}

test_1();
