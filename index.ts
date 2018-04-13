import { createInterface as createReadline } from 'readline';

import chalk from 'chalk';

import MediaWikiAdventureBot from './lib/MediaWikiAdventureBot';

// Create the bot.
const bot = new MediaWikiAdventureBot('https://en.wikipedia.org/w/api.php');

async function main() {
    const readline = createReadline({
        input: process.stdin,
        output: process.stdout
    });

    readline.addListener('close', () => readline.close());

    // Output a starter message to get the thought juices flowing for the user.
    console.log(chalk.yellowBright(await bot.respond('')));

    const talkLoop = () => {
        readline.question('> ', async userText => {
            console.log('');
            console.log(chalk.yellowBright(await bot.respond(userText)));
            talkLoop();
        });
    }
    talkLoop();
}
main();
