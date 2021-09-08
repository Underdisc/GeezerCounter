const {Client, Intents} = require('discord.js');
const client = new Client({intents : [
  Intents.FLAGS.GUILDS,
  Intents.FLAGS.GUILD_MESSAGES ]});
const fs = require('fs');
const config = require('./config.json');

function FindWord(dictionary, word)
{
  let result = new Object();
  result.entry = null;
  result.index = 0;
  if (dictionary.length === 0)
  {
    return result;
  }
  let min = 0;
  let max = dictionary.length;
  while(min !== max)
  {
    let maxMinDiff = max - min
    result.index = min + Math.floor(maxMinDiff / 2);
    let entry = dictionary[result.index];
    if (entry.word === word)
    {
      result.entry = entry;
      return result;
    }
    if (word < entry.word)
    {
      max = result.index;
    } else
    {
      result.index += 1;
      min = result.index;
    }
  }
  return result
}

function AddWord(dictionary, word)
{
  word = word.toLowerCase();
  let findResult = FindWord(dictionary, word);
  if (findResult.entry === null)
  {
    let newEntry = new Object();
    newEntry.word = word;
    newEntry.count = 1;
    let lowDictionary = dictionary.slice(0, findResult.index);
    lowDictionary.push(newEntry);
    let highDictionary = dictionary.slice(findResult.index, dictionary.length);
    dictionary = lowDictionary.concat(highDictionary);
    return dictionary;
  }
  findResult.entry.count += 1;
  return dictionary;
}

function IsWord(text)
{
  for (let i = 0; i < text.length; ++i)
  {
    let wordCharacter =
      ('a' <= text[i] && text[i] <= 'z') ||
      ('A' <= text[i] && text[i] <= 'Z') ||
      text[i] === '\'';
    if (!wordCharacter)
    {
      return false;
    }
  }
  return true;
}

function StripPunctuation(text)
{
  if (text[0] === '"')
  {
    text = text.slice(1, text.length);
  }
  switch (text[text.length - 1])
  {
  case '?':
  case '!':
  case '.':
  case ',':
  case '"':
    text = text.slice(0, text.length - 1);
  }
  return text;
}

function SplitText(text, delimiter)
{
  let groups = [];
  let groupStart = 0;
  let groupEnd = text.indexOf(delimiter);
  while (groupEnd !== -1)
  {
    if (groupStart !== groupEnd)
    {
      groups.push(text.slice(groupStart, groupEnd));
      groupStart = groupEnd + 1;
    } else
    {
      ++groupStart;
    }
    groupEnd = text.indexOf(delimiter, groupStart);
  }
  if (groupStart !== groupEnd)
  {
    groups.push(text.slice(groupStart, text.length));
  }
  return groups;
}

function ProcessText(text)
{
  let dictionary = JSON.parse(fs.readFileSync('./dictionary.json'));
  let words = SplitText(text, ' ');
  for (let i = 0; i < words.length; ++i)
  {
    let word = StripPunctuation(words[i]);
    if (word.length > 0 && IsWord(word))
    {
      dictionary = AddWord(dictionary, word);
    }
  }
  fs.writeFileSync(
    './dictionary.json',
    JSON.stringify(dictionary, null, 2),
    null);
}

function ProcessCommand(text)
{
  let argv = SplitText(text, ' ');
  if (argv[0] === 'count')
  {
    if (argv.length != 2)
    {
      return 'count expects one argument.';
    }
    let dictionary = JSON.parse(fs.readFileSync('./dictionary.json'));
    let word = argv[1].toLowerCase();
    let findResult = FindWord(dictionary, word);
    let count = 0;
    if (findResult.entry !== null)
    {
      count = findResult.entry.count;
    }
    return word + ' count: ' + count.toString();
  }
  return 'That\'s not a command, you old geezer.';
}

client.once('ready', () => {
  console.log('Logged in as ' + client.user.tag);
});

client.on('messageCreate', message => {
  if (message.content[0] === '/')
  {
    let output = ProcessCommand(
      message.content.slice(1, message.content.length));
    message.reply(output);
    return;
  }
  let correctName = message.author.username === config.username;
  let correctDiscriminator =
      message.author.discriminator === config.discriminator;
  if (correctName && correctDiscriminator)
  {
    ProcessText(message.content);
  }
});

client.login(config.token);
