const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidcount')
    .setDescription('View or reset raid join count')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption(opt =>
      opt.setName('reset').setDescription('Reset the raid count')
    ),
  cooldown: 5,
  aliases: ['racount'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const guildData = await getGuild(guild.id);
      let antiraidConfig = JSON.parse(guildData.antiraid_config || '{}');

      const shouldReset = isSlash
        ? interaction.options?.getBoolean('reset')
        : interaction.content.split(' ')[1]?.toLowerCase() === 'reset';

      if (shouldReset) {
        antiraidConfig.raidCount = 0;
        antiraidConfig.raidJoinTimestamps = [];
        await updateGuild(guild.id, { antiraid_config: JSON.stringify(antiraidConfig) });

        const embed = successEmbed('Raid Count Reset', '✅ Raid join count has been reset to 0.');
        if (isSlash) {
          await interaction.reply({ embeds: [embed] });
        } else {
          await interaction.reply({ embeds: [embed] });
        }
      } else {
        const count = antiraidConfig.raidCount || 0;
        const embed = infoEmbed('Raid Count', `Current raid join count: **${count}**`);
        if (isSlash) {
          await interaction.reply({ embeds: [embed] });
        } else {
          await interaction.reply({ embeds: [embed] });
        }
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to check raid count.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
