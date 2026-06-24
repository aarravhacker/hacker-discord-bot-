const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('first-message')
    .setDescription('Get the first message in a channel')
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Channel to check').setRequired(false)
    ),
  cooldown: 10,
  aliases: ['firstmsg', 'first'],
  prefix: true,

  async execute(interaction, args) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    if (!channel.isTextBased()) {
      return interaction.reply({
        embeds: [errorEmbed('That is not a text channel.')],
        ephemeral: true,
      });
    }

    try {
      let firstMsg = null;
      let lastId = null;

      for (let i = 0; i < 10; i++) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;

        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) break;

        firstMsg = messages.last();
        lastId = messages.last().id;
      }

      if (!firstMsg) {
        return interaction.reply({
          embeds: [errorEmbed('Could not find the first message.')],
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
      .setColor('#5865f2')
      .setTitle('First Message')
      .addFields(
        { name: 'Author', value: firstMsg.author.tag, inline: true },
        { name: 'Created', value: `<t:${Math.floor(firstMsg.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Link', value: `[Click here](${firstMsg.url})` }
      )
      .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({
        embeds: [errorEmbed('Failed to fetch first message.')],
        ephemeral: true,
      });
    }
  },
};
