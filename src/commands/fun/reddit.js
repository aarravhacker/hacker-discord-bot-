const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const subreddits = [
  'memes', 'dankmemes', 'ProgrammerHumor', 'gaming', 'funny',
  'aww', 'pics', 'todayilearned', 'mildlyinteresting', 'worldnews'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reddit')
    .setDescription('Get a random post from Reddit')
    .addStringOption(option =>
      option.setName('subreddit').setDescription('Specific subreddit to fetch from')
    ),
  cooldown: 5,
  aliases: ['reddit', 'r'],
  prefix: true,
  async execute(interaction, args) {
    const subreddit = interaction.options?.getString('subreddit') || args?.[0] || subreddits[Math.floor(Math.random() * subreddits.length)];

    try {
      const response = await fetch(`https://www.reddit.com/r/${subreddit}/random.json`);
      const data = await response.json();

      if (!data || !data[0] || !data[0].data || !data[0].data.children[0]) {
        return interaction.reply({ embeds: [errorEmbed('Could not fetch post from Reddit.')] });
      }

      const post = data[0].data.children[0].data;

      const embed = successEmbed(post.title)
        .setDescription(post.selftext || 'No text content')
        .setURL(`https://reddit.com${post.permalink}`)
        .addField('Subreddit', `r/${post.subreddit}`, true)
        .addField('Upvotes', `${post.ups}`, true)
        .addField('Comments', `${post.num_comments}`, true)
        .setColor(0xFF4500);

      if (post.thumbnail && post.thumbnail.startsWith('http')) {
        embed.setThumbnail(post.thumbnail);
      }

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('An error occurred while fetching Reddit post.')] });
    }
  }
};
