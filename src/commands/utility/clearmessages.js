const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearmessages')
    .setDescription('Clear the bot\'s messages in this channel'),
  cooldown: 10,
  aliases: ['clearbot', 'purgebot'],
  prefix: true,

  async execute(interaction, args) {
    if (!interaction.channel.permissionsFor(interaction.guild.members.me).has('ManageMessages')) {
      return interaction.reply({
        embeds: [errorEmbed('I need the Manage Messages permission.')],
        ephemeral: true,
      });
    }

    try {
      const fetched = await interaction.channel.messages.fetch({ limit: 100 });
      const botMessages = fetched.filter(m => m.author.id === interaction.client.user.id);

      if (botMessages.size === 0) {
        return interaction.reply({
          embeds: [errorEmbed('No bot messages found in the last 100 messages.')],
          ephemeral: true,
        });
      }

      const deleted = await interaction.channel.bulkDelete(botMessages, true);

      return interaction.reply({
        embeds: [successEmbed(`Deleted ${deleted.size} bot message(s).`)],
        ephemeral: true,
      });
    } catch (err) {
      console.error(err);
      return interaction.reply({
        embeds: [errorEmbed('Failed to delete messages.')],
        ephemeral: true,
      });
    }
  },
};
