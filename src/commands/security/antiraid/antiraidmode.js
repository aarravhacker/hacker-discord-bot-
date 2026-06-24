const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraidmode')
    .setDescription('Set antiraid protection mode')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('mode').setDescription('Protection mode').setRequired(true)
        .addChoices(
          { name: 'strict', value: 'strict' },
          { name: 'moderate', value: 'moderate' },
          { name: 'lenient', value: 'lenient' },
          { name: 'custom', value: 'custom' }
        )
    ),
  cooldown: 5,
  aliases: ['armode'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      let mode;

      if (isSlash) {
        mode = interaction.options?.getString('mode');
      } else {
        mode = interaction.content.split(' ')[1]?.toLowerCase();
        if (!mode || !['strict', 'moderate', 'lenient', 'custom'].includes(mode)) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Usage: antiraidmode <strict|moderate|lenient|custom>')] });
        }
      }

      const guildData = await getGuild(guild.id);
      let antiraidConfig = JSON.parse(guildData.antiraid_config || '{}');

      const modes = {
        strict: { joinThreshold: 3, timeWindow: 5000, action: 'ban' },
        moderate: { joinThreshold: 5, timeWindow: 10000, action: 'kick' },
        lenient: { joinThreshold: 10, timeWindow: 15000, action: 'mute' },
        custom: antiraidConfig
      };

      antiraidConfig = { ...modes[mode], mode };
      await updateGuild(guild.id, { antiraid_config: JSON.stringify(antiraidConfig) });

      const embed = successEmbed(
        'Antiraid Mode Updated',
        `**Mode:** ${mode}\n` +
        (mode !== 'custom' ?
          `**Join Threshold:** ${antiraidConfig.joinThreshold}\n` +
          `**Time Window:** ${antiraidConfig.timeWindow / 1000}s\n` +
          `**Action:** ${antiraidConfig.action}` :
          'Using custom settings.')
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to update antiraid mode.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
