const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Gets the bot invite link')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['invitebot', 'addbot'],
  prefix: true,
  async execute(interaction) {
      try {
            const client = interaction.client;
            const invite = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

            const embed = new EmbedBuilder()
              .setTitle('Invite Me!')
              .setDescription(`[Click here to invite me to your server](${invite})`)
              .setColor(config.embedColors.success)
              .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
              .setTimestamp();

            interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};