# mediawiki-based-adv
An MediaWiki-text-based adventure. <sup>(Because making weird things is fun.)</sup>

This is just a fun little bot that takes some information from MediaWiki (in this case, English wikipedia) articles
and uses them as a chatbot response.

The bot attempts to use the words in responses as a context for what article it should grab its next response from, but
is very willing to fallback onto random responses too.

---

## Going on an Adventure?

The bot can be run by cloning this repo, installing the npm packages, and starting the script.

    $ git clone https://github.com/clavin/mediawiki-based-adv.git
    $ cd mediawiki-based-adv

    $ npm install
    $ npm start

And ta-da! You now should have a prompt to interact with the bot.

## Example Conversation
*Lines prefixed with `>` are my input.*

    John 'Jackie' Cantwell (21 November 1923 – died 1989) was a Scottish footballer who played for Hibernian, Dumbarton, Morton and Stenhousemuir. References.

    > Hey, I know a person with the name cantwell! They really CANT WELL, hAHAHAha!

    Professional career. Obelmejias won eight fights in a row, all by knockout, before being given a rematch by Hagler. The second time around, Hagler defeated Obelmejias by a knockout in five rounds at Sanremo, Italy.

    > Sounds tougher than hockey!!

    The FoGC has also made it that creek restoration is a part of any development effort along the path of this small river. References. Friends of Baxter Creek is a community organization in El Cerrito, California. The friends created along with the city of El Cerrito "Baxter Creek Gateway Park" along the Ohlone Greenway and the Richmond Greenway. The group was created by those passionate about restoring Baxter Creek in El Cerrito and Richmond, California.

    > Wow, what a bunch of tree huggers. I say we just get rid of all water on Earth, because who needs it anyway.
