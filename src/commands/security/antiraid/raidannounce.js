const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidannounce')
    .setDescription('Announce a raid alert to the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('message').setDescription('Announcement message').setRequired(true)
    ),
  cooldown: 30,
  aliases: ['raannounce'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      let message;

      if (isSlash) {
        message = interaction.options?.getString('message');
      } else {
        const args = interaction.content.split(' ').slice(1).join(' ');
        if (!args) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Please provide an announcement message.')] });
        }
        message = args;
      }

      const embed = warningEmbed('⚠️ Raid Alert', message);

      await guild.systemChannel?.send({ embeds: [embed] }).catch(() => { });

      const successEmbedMsg = successEmbed('Raid Announcement', '✅ Raid announcement sent to the system channel.');
      if (isSlash) {
        await interaction.reply({ embeds: [successEmbedMsg] });
      } else {
        await interaction.reply({ embeds: [successEmbedMsg] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to send raid announcement.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
