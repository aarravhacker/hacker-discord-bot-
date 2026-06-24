const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { addSecurityLog } = require('../../../db/securityRepository');
const { successEmbed, errorEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiinvite')
    .setDescription('Toggle antiinvite protection')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['ai', 'inviteguard'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const user = isSlash ? interaction.user : interaction.author;

    try {
      const guildData = await getGuild(guild.id);
      let antilinkConfig = JSON.parse(guildData.antilink_config || '{}');
      const newState = !antilinkConfig.antiInvite;

      antilinkConfig.antiInvite = newState;
      await updateGuild(guild.id, { antilink_config: JSON.stringify(antilinkConfig) });

      await addSecurityLog({
        guild_id: guild.id,
        user_id: user.id,
        action: newState ? 'antiinvite_enabled' : 'antiinvite_disabled',
        type: 'antilink',
        details: JSON.stringify({ enabled: newState })
      });

      const embed = successEmbed(
        'Antiinvite Protection',
        newState ? '✅ Antiinvite protection has been **enabled**.' : '❌ Antiinvite protection has been **disabled**.'
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to toggle antiinvite protection.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
