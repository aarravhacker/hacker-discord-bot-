const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidnotify')
    .setDescription('Configure raid notification settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(opt =>
      opt.setName('role').setDescription('Role to notify during raids')
    )
    .addBooleanOption(opt =>
      opt.setName('dm').setDescription('DM admins during raids')
    ),
  cooldown: 5,
  aliases: ['ranotify'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      const guildData = await getGuild(guild.id);
      let antiraidConfig = JSON.parse(guildData.antiraid_config || '{}');

      if (isSlash) {
        const role = interaction.options?.getRole('role');
        const dm = interaction.options?.getBoolean('dm');
        if (role) antiraidConfig.notifyRole = role.id;
        if (dm !== null) antiraidConfig.notifyDM = dm;
      } else {
        const args = interaction.content.split(' ').slice(1);
        if (args[0]) {
          antiraidConfig.notifyRole = args[0].replace(/[<@&>]/g, '');
        }
        if (args[1]) {
          antiraidConfig.notifyDM = args[1].toLowerCase() === 'true' || args[1] === '1';
        }
      }

      await updateGuild(guild.id, { antiraid_config: JSON.stringify(antiraidConfig) });

      const embed = successEmbed(
        'Raid Notification Settings',
        `**Notify Role:** ${antiraidConfig.notifyRole ? `<@&${antiraidConfig.notifyRole}>` : 'Not set'}\n` +
        `**DM Admins:** ${antiraidConfig.notifyDM ? '✅ Yes' : '❌ No'}`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to update raid notification settings.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
