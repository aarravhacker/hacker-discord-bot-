const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { successEmbed, errorEmbed, warningEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdownrole')
    .setDescription('Set a role to bypass lockdown')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(opt =>
      opt.setName('role').setDescription('Role to bypass lockdown').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['ldrole'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;

    try {
      let roleId;

      if (isSlash) {
        roleId = interaction.options?.getRole('role').id;
      } else {
        const args = interaction.content.split(' ').slice(1);
        if (!args[0]) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Usage: lockdownrole <role>')] });
        }
        roleId = args[0].replace(/[<@&>]/g, '');
      }

      const role = guild.roles.cache.get(roleId);
      if (!role) {
        return interaction.reply({ embeds: [errorEmbed('Error', 'Role not found.')] });
      }

      const guildData = await getGuild(guild.id);
      let lockdownConfig = JSON.parse(guildData.lockdown_config || '{}');
      lockdownConfig.bypassRole = roleId;
      await updateGuild(guild.id, { lockdown_config: JSON.stringify(lockdownConfig) });

      const embed = successEmbed(
        'Lockdown Bypass Role',
        `✅ Bypass role set to <@&${roleId}>.`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to set lockdown bypass role.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
