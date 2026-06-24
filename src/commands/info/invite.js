const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get the bot invite link'),
  cooldown: 5,
  aliases: ['addbot', 'join'],
  prefix: true,
  async execute(interaction) {
      try {
            const clientId = interaction.client.user.id;
            const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;

            const embed = new EmbedBuilder()
              .setTitle('📨 Invite Me!')
              .setDescription(`[Click here to invite ${interaction.client.user.username}](${inviteUrl})`)
              .setColor(config.embedColors?.success || 0x00ff00)
              .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
              .setFooter({ text: 'Thanks for inviting!' });

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};