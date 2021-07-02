const WebSocket = require('ws')
const chalk = require('chalk');

const url = 'wss://ws-feed.pro.coinbase.com';
const connection = new WebSocket(url);

const long = 26;
const short = 12;
const sampleTimeInSeconds = 1;
const prices = [];
const feeRate = .0035;
let allPrices = [];
let cash = 1000;
let hasPosition = false;
let lastPositionPrice = null;
let lastTime = null;

const subscription = {
    "type": "subscribe",
    "product_ids": [
        "BTC-USD"
    ],
    "channels": [
        "ticker"
    ]
}

connection.onopen = () => {
    console.log("connection opened");
    console.log('------------------------------------------------------------------------------')
    connection.send(JSON.stringify(subscription));
}

connection.onmessage = e => {
    const data = JSON.parse(e.data);

    if (data.type === 'ticker') {
        let time = new Date(data.time);
        const price = parseFloat(data.price);

        allPrices.push(price);

        if (lastTime == null || (time.getTime() - lastTime.getTime()) / 1000 > sampleTimeInSeconds) {
            if (prices.length === long) {
                const shortEma = getEma(prices, short);
                const longEma = getEma(prices, long);

                if (shortEma > longEma && !hasPosition && lastPositionPrice !== price) {
                    console.log("BUY :", price, '\t' + data.time, `\tEMA${short}: ${shortEma.toFixed(2)} EMA${long}: ${longEma.toFixed(2)}`);
                    hasPosition = true;
                    lastPositionPrice = price;
                    let fee = cash * feeRate;
                    cash -= fee;
                } else if (shortEma < longEma && hasPosition && lastPositionPrice !== price) {
                    console.log("SELL:", price, '\t' + data.time, `\tEMA${short}: ${shortEma.toFixed(2)} EMA${long}: ${longEma.toFixed(2)}`);
                    hasPosition = false;
                    let percentChange = 1 - lastPositionPrice / price;
                    let profitLoss = cash * percentChange;
                    cash += profitLoss;
                    profitLoss > 0 ? console.log(chalk.green(profitLoss.toFixed(2))) : console.log(chalk.red(profitLoss.toFixed(2)));
                    let fee = cash * feeRate;
                    cash -= fee;
                    console.log("total cash: " + cash.toFixed(2));
                    console.log('------------------------------------------------------------------------------')
                    lastPositionPrice = price;
                }

                prices.shift();
            }

            const avgPrice = avg(allPrices);
            allPrices = [];
            prices.push(avgPrice);
            lastTime = time;
        }
    }
}

function avg(data) {
    var total = 0;
    for (var i = 0; i < data.length; i++) {
        total += data[i];
    }
    return total / data.length;
}

function getEma(data, range) {
    var k = 2 / (range + 1);
    emaArray = [data[0]];
    for (var i = 1; i < data.length; i++) {
        emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
    }
    return emaArray[emaArray.length - 1];
}