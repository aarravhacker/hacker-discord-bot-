const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidcaptcha')
    .setDescription('Configure captcha verification for raid protection')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption(opt =>
      opt.setName('enabled').setDescription('Enable captcha verification').setRequired(true)
    )
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Channel for captcha verification')
    ),
  cooldown: 5,
  aliases: ['racaptcha'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const guildData = await getGuild(guild.id);
      let antiraidConfig = JSON.parse(guildData.antiraid_config || '{}');

      let enabled;
      let channelId;

      if (isSlash) {
        enabled = interaction.options?.getBoolean('enabled');
        channelId = interaction.options?.getChannel('channel')?.id;
      } else {
        const args = interaction.content.split(' ').slice(1);
        enabled = args[0]?.toLowerCase() === 'true' || args[0] === '1';
        channelId = args[1]?.replace(/[<#>]/g, '');
      }

      antiraidConfig.captchaEnabled = enabled;
      if (channelId) antiraidConfig.captchaChannel = channelId;

      await updateGuild(guild.id, { antiraid_config: JSON.stringify(antiraidConfig) });

      const embed = successEmbed(
        'Raid Captcha Configuration',
        `**Captcha Verification:** ${enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
        (channelId ? `**Channel:** <#${channelId}>` : '')
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to configure captcha verification.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
